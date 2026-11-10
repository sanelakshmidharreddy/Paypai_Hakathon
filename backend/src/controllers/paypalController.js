const paypalService = require('../services/paypalService');
const transactionService = require('../services/transactionService');
const config = require('../config/env');
const logger = require('../utils/logger');
const { PAYMENT_STATUSES } = require('../config/paypal');

/**
 * Create a new PayPal order and record initial transaction in database
 */
async function createOrder(req, res, next) {
  try {
    const { amount, currency = 'USD', description = 'Store Purchase', customNotes = null } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount. Amount must be a positive number.',
      });
    }

    // Verify PayPal is configured
    if (!config.paypal.isConfigured) {
      return res.status(503).json({
        success: false,
        error: 'PayPal Sandbox credentials not configured. Please supply PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env.',
        code: 'PAYPAL_NOT_CONFIGURED',
      });
    }

    const orderData = await paypalService.createOrder({
      amount: parsedAmount,
      currency,
      description,
    });

    // Record transaction in SQLite database
    const transaction = transactionService.createTransaction({
      paypalOrderId: orderData.id,
      amount: parsedAmount,
      currency,
      customerNotes,
    });

    res.status(201).json({
      success: true,
      orderId: orderData.id,
      status: orderData.status,
      transactionId: transaction.id,
      transaction,
    });
  } catch (error) {
    logger.error('Failed to create PayPal order:', error);
    next(error);
  }
}

/**
 * Capture an approved PayPal order
 * Enforces duplicate capture protection and server-side verification
 */
async function captureOrder(req, res, next) {
  try {
    const orderId = req.params.orderId || req.body.orderId;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: orderId.',
      });
    }

    // Check for existing transaction and enforce duplicate capture prevention
    const existingTxn = transactionService.getTransactionByOrderId(orderId);
    if (existingTxn && existingTxn.payment_status === PAYMENT_STATUSES.COMPLETED) {
      logger.warn(`Duplicate capture prevention triggered for order: ${orderId}`);
      return res.status(200).json({
        success: true,
        alreadyCaptured: true,
        message: 'This PayPal order has already been captured successfully. Duplicate billing prevented.',
        transaction: existingTxn,
      });
    }

    // Call PayPal capture endpoint
    const captureResult = await paypalService.captureOrder(orderId);

    let updatedTxn;
    if (captureResult.success) {
      // Record successful capture or pending capture
      updatedTxn = transactionService.recordCaptureSuccess(orderId, captureResult);
      res.status(200).json({
        success: true,
        status: updatedTxn.payment_status,
        captureId: updatedTxn.paypal_capture_id,
        transaction: updatedTxn,
      });
    } else {
      // Record declined or failed capture
      updatedTxn = transactionService.recordCaptureFailure(orderId, captureResult);
      res.status(422).json({
        success: false,
        status: updatedTxn.payment_status,
        error: updatedTxn.error_message,
        code: updatedTxn.error_code,
        interpreted: captureResult.interpreted,
        transaction: updatedTxn,
      });
    }
  } catch (error) {
    logger.error('Error during PayPal order capture:', error);
    next(error);
  }
}

/**
 * Record buyer cancellation when user closes or exits the PayPal checkout flow
 */
async function cancelOrder(req, res, next) {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: orderId.',
      });
    }

    const transaction = transactionService.recordOrderCancelled(orderId, { reason });

    res.status(200).json({
      success: true,
      message: 'Checkout cancellation successfully logged.',
      transaction,
    });
  } catch (error) {
    logger.error('Failed to record checkout cancellation:', error);
    next(error);
  }
}

/**
 * Get server-verified PayPal order status directly from PayPal REST API
 */
async function getOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId parameter.',
      });
    }

    const liveOrder = await paypalService.getOrderDetails(orderId);
    const dbTransaction = transactionService.getTransactionByOrderId(orderId);

    res.status(200).json({
      success: true,
      orderId,
      liveStatus: liveOrder.status,
      liveData: liveOrder,
      dbTransaction,
    });
  } catch (error) {
    logger.error(`Failed to verify PayPal order status for ${req.params.orderId}:`, error);
    next(error);
  }
}

/**
 * Return safe public configuration for frontend (clientId only)
 * Never exposes PAYPAL_CLIENT_SECRET
 */
function getConfig(req, res) {
  res.status(200).json({
    success: true,
    clientId: config.paypal.clientId || null,
    baseUrl: config.paypal.baseUrl,
    isConfigured: config.paypal.isConfigured,
    environment: 'sandbox',
  });
}

/**
 * Simulate Sandbox Testing Scenarios
 * Used for demonstrating specific edge cases (INSTRUMENT_DECLINED, PENDING_REVIEW, BUYER_CANCELLED)
 */
async function simulateScenario(req, res, next) {
  try {
    const { scenario, amount = 49.99, currency = 'USD' } = req.body;
    const { generateTransactionId } = require('../utils/idGenerator');
    const { interpretPayPalError } = require('../utils/paypalErrors');

    const simulatedOrderId = `SIM_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Initialize transaction in DB
    const initialTxn = transactionService.createTransaction({
      paypalOrderId: simulatedOrderId,
      amount: parseFloat(amount),
      currency,
      customerNotes: `[SIMULATED SCENARIO: ${scenario}]`,
    });

    let finalTxn;

    if (scenario === 'SUCCESS') {
      const mockCapture = {
        success: true,
        data: {
          id: simulatedOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              amount: { value: parseFloat(amount).toFixed(2), currency_code: currency },
              payments: {
                captures: [
                  {
                    id: `CAP_${Date.now()}_MOCK`,
                    status: 'COMPLETED',
                    amount: { value: parseFloat(amount).toFixed(2), currency_code: currency },
                  },
                ],
              },
            },
          ],
          payer: {
            name: { given_name: 'Sandbox', surname: 'Buyer' },
            email_address: 'sb-buyer@business.example.com',
            payer_id: 'SB_PAYER_12345',
          },
        },
      };
      finalTxn = transactionService.recordCaptureSuccess(simulatedOrderId, mockCapture);
    } else if (scenario === 'DECLINE') {
      const mockDecline = {
        interpreted: interpretPayPalError({
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The instrument presented was declined.',
          details: [
            {
              issue: 'INSTRUMENT_DECLINED',
              description: 'The requested action could not be completed because the card was declined by issuing bank.',
            },
          ],
          debug_id: `dbg_${Date.now()}`,
        }),
        data: {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The instrument presented was declined.',
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockDecline);
    } else if (scenario === 'PENDING') {
      const mockPending = {
        success: true,
        data: {
          id: simulatedOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              amount: { value: parseFloat(amount).toFixed(2), currency_code: currency },
              payments: {
                captures: [
                  {
                    id: `CAP_${Date.now()}_PEND`,
                    status: 'PENDING',
                    status_details: {
                      reason: 'PENDING_REVIEW',
                    },
                    amount: { value: parseFloat(amount).toFixed(2), currency_code: currency },
                  },
                ],
              },
            },
          ],
          payer: {
            name: { given_name: 'Pending', surname: 'Customer' },
            email_address: 'pending-buyer@example.com',
            payer_id: 'SB_PENDING_99',
          },
        },
      };
      finalTxn = transactionService.recordCaptureSuccess(simulatedOrderId, mockPending);
    } else if (scenario === 'CANCEL') {
      finalTxn = transactionService.recordOrderCancelled(simulatedOrderId, {
        reason: 'Buyer deliberately aborted checkout simulation.',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown simulation scenario: ${scenario}. Supported: SUCCESS, DECLINE, PENDING, CANCEL.`,
      });
    }

    res.status(201).json({
      success: true,
      simulated: true,
      scenario,
      orderId: simulatedOrderId,
      transaction: finalTxn,
    });
  } catch (error) {
    logger.error('Error simulating scenario:', error);
    next(error);
  }
}

module.exports = {
  createOrder,
  captureOrder,
  cancelOrder,
  getOrderStatus,
  getConfig,
  simulateScenario,
};
