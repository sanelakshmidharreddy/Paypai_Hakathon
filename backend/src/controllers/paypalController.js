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
    openaiConfigured: config.openai.isConfigured,
    environment: 'sandbox',
  });
}

/**
 * Simulate Sandbox Testing Scenarios (Extended for Prompt 2 Testing Requirements)
 */
async function simulateScenario(req, res, next) {
  try {
    const { scenario, amount = 49.99, currency = 'USD' } = req.body;
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
    } else if (scenario === 'DECLINE' || scenario === 'INSTRUMENT_DECLINED') {
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
          details: [{ issue: 'INSTRUMENT_DECLINED', description: 'The requested action could not be completed because the card was declined by issuing bank.' }],
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockDecline);
    } else if (scenario === 'CARD_EXPIRED' || scenario === 'EXPIRED_CARD') {
      const mockExpired = {
        interpreted: {
          code: 'CARD_EXPIRED',
          title: 'Payment Card Expired',
          description: 'The expiration date associated with the selected payment instrument has passed.',
          cause: 'Card expired or invalid date registered in customer PayPal wallet.',
          merchantGuidance: 'Prompt customer to update card details in their PayPal wallet.',
          customerFriendlyMessage: 'The card used for this payment has expired. Please select an alternate unexpired card.',
          retryable: true,
        },
        data: {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The credit card has expired.',
          details: [{ issue: 'CARD_EXPIRED', description: 'The credit card has expired.' }],
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockExpired);
    } else if (scenario === 'ORDER_ALREADY_CAPTURED' || scenario === 'ALREADY_CAPTURED') {
      const mockAlreadyCaptured = {
        interpreted: {
          code: 'ORDER_ALREADY_CAPTURED',
          title: 'Order Already Captured',
          description: 'Order has already been captured. Double billing prevented.',
          cause: 'Duplicate payment request received.',
          merchantGuidance: 'No action needed. Payment already succeeded.',
          customerFriendlyMessage: 'This order has already been captured successfully.',
          retryable: false,
        },
        data: {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'Order is already captured.',
          details: [{ issue: 'ORDER_ALREADY_CAPTURED', description: 'Order is already captured.' }],
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockAlreadyCaptured);
    } else if (scenario === 'NETWORK_TIMEOUT' || scenario === 'TIMEOUT') {
      const mockTimeout = {
        interpreted: {
          code: 'NETWORK_TIMEOUT',
          title: 'Network Timeout / Connection Interrupted',
          description: 'Connection to PayPal timed out before response was received.',
          cause: 'Temporary network packet loss or DNS resolution latency.',
          merchantGuidance: 'Verify status via GET /v2/checkout/orders/{id} before attempting any retry.',
          customerFriendlyMessage: 'A network timeout occurred while confirming your payment.',
          retryable: false,
        },
        data: {
          name: 'NETWORK_TIMEOUT',
          message: 'Connection timed out while waiting for PayPal response.',
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockTimeout);
    } else if (scenario === 'PAYEE_ACCOUNT_RESTRICTED' || scenario === 'RESTRICTED_ACCOUNT') {
      const mockRestricted = {
        interpreted: {
          code: 'PAYEE_ACCOUNT_RESTRICTED',
          title: 'Merchant Account Restricted by PayPal',
          description: 'PayPal blocked receiving transactions on this merchant account.',
          cause: 'Merchant account verification holds or regulatory compliance flags.',
          merchantGuidance: 'Log in to PayPal Business Dashboard to resolve account alerts.',
          customerFriendlyMessage: 'We are temporarily unable to process payments via PayPal. Please contact support.',
          retryable: false,
        },
        data: {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'Payee account is restricted.',
          details: [{ issue: 'PAYEE_ACCOUNT_RESTRICTED', description: 'Payee account is restricted.' }],
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockRestricted);
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
    } else if (scenario === 'CANCEL' || scenario === 'INCOMPLETE_APPROVAL') {
      finalTxn = transactionService.recordOrderCancelled(simulatedOrderId, {
        reason: 'Buyer aborted checkout flow before authorization.',
      });
    } else if (scenario === 'UNKNOWN_ERROR') {
      const mockUnknown = {
        interpreted: {
          code: 'UNKNOWN_ERROR',
          title: 'Unclassified PayPal Error',
          description: 'An unexpected and unclassified response was received from PayPal.',
          cause: 'Undocumented error or unexpected edge condition.',
          merchantGuidance: 'Inspect raw PayPal response and contact PayPal developer support.',
          customerFriendlyMessage: 'An unexpected issue occurred while processing your payment.',
          retryable: false,
        },
        data: {
          name: 'UNCLASSIFIED_ERROR',
          message: 'Internal processing glitch occurred.',
        },
      };
      finalTxn = transactionService.recordCaptureFailure(simulatedOrderId, mockUnknown);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown simulation scenario: ${scenario}. Supported: SUCCESS, DECLINE, CARD_EXPIRED, PENDING, CANCEL, ALREADY_CAPTURED, NETWORK_TIMEOUT, RESTRICTED_ACCOUNT, UNKNOWN_ERROR.`,
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
