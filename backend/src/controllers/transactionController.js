const transactionService = require('../services/transactionService');
const paypalService = require('../services/paypalService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const db = require('../database/db');

/**
 * List transactions with filtering, search, and pagination
 */
function getTransactions(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      status = null,
      search = null,
      dateFrom = null,
      dateTo = null,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    const result = transactionService.listTransactions({
      page,
      limit,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to retrieve transactions:', error);
    next(error);
  }
}

/**
 * Retrieve transaction details by internal ID or PayPal Order ID
 */
function getTransactionDetails(req, res, next) {
  try {
    const { id } = req.params;

    let transaction = transactionService.getTransactionById(id);
    if (!transaction) {
      transaction = transactionService.getTransactionByOrderId(id);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction not found with identifier: ${id}`,
      });
    }

    // Attach analysis history if available
    const analyses = aiService.getAnalysisHistory(transaction.id);

    res.status(200).json({
      success: true,
      transaction,
      latestAnalysis: analyses[0] || null,
      analysisHistory: analyses,
    });
  } catch (error) {
    logger.error(`Failed to get transaction details for ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * Perform AI Payment Failure & Recovery Analysis (Prompt 2)
 */
async function analyzeTransaction(req, res, next) {
  try {
    const { id } = req.params;

    let transaction = transactionService.getTransactionById(id);
    if (!transaction) {
      transaction = transactionService.getTransactionByOrderId(id);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction not found with identifier: ${id}`,
      });
    }

    const analysis = await aiService.analyzeTransaction(transaction);
    const updatedTxn = transactionService.getTransactionById(transaction.id);

    res.status(200).json({
      success: true,
      analysis,
      transaction: updatedTxn,
    });
  } catch (error) {
    logger.error(`Failed to analyze transaction ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * Retrieve analysis history for a transaction (Prompt 2)
 */
function getAnalysisHistory(req, res, next) {
  try {
    const { id } = req.params;

    let transaction = transactionService.getTransactionById(id);
    if (!transaction) {
      transaction = transactionService.getTransactionByOrderId(id);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction not found with identifier: ${id}`,
      });
    }

    const history = aiService.getAnalysisHistory(transaction.id);

    res.status(200).json({
      success: true,
      transactionId: transaction.id,
      latest: history[0] || null,
      history,
    });
  } catch (error) {
    logger.error(`Failed to get analysis history for ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * Refresh and synchronize status with PayPal REST API (Prompt 2)
 */
async function refreshStatus(req, res, next) {
  try {
    const { id } = req.params;

    let transaction = transactionService.getTransactionById(id);
    if (!transaction) {
      transaction = transactionService.getTransactionByOrderId(id);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction not found with identifier: ${id}`,
      });
    }

    logger.info(`Refreshing live status from PayPal for order: ${transaction.paypal_order_id}...`);

    let liveOrder = null;
    let liveError = null;

    try {
      liveOrder = await paypalService.getOrderDetails(transaction.paypal_order_id);
    } catch (err) {
      liveError = err.message;
    }

    if (liveError) {
      return res.status(200).json({
        success: false,
        message: `PayPal live check error: ${liveError}`,
        transaction,
      });
    }

    // Synchronize status in database if PayPal returned valid order representation
    const liveStatus = liveOrder.status;
    const now = new Date().toISOString();

    let updatedPaymentStatus = transaction.payment_status;
    if (liveStatus === 'COMPLETED') updatedPaymentStatus = 'COMPLETED';
    else if (liveStatus === 'APPROVED') updatedPaymentStatus = 'APPROVED';
    else if (liveStatus === 'VOIDED') updatedPaymentStatus = 'CANCELLED';

    const stmt = db.prepare(`
      UPDATE transactions SET
        paypal_status = ?,
        payment_status = ?,
        raw_paypal_response = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      liveStatus,
      updatedPaymentStatus,
      JSON.stringify(liveOrder),
      now,
      transaction.id
    );

    const refreshed = transactionService.getTransactionById(transaction.id);

    res.status(200).json({
      success: true,
      message: `Verified and refreshed live status from PayPal API: Order is currently ${liveStatus}.`,
      liveStatus,
      transaction: refreshed,
    });
  } catch (error) {
    logger.error(`Failed to refresh status for ${req.params.id}:`, error);
    next(error);
  }
}

module.exports = {
  getTransactions,
  getTransactionDetails,
  analyzeTransaction,
  getAnalysisHistory,
  refreshStatus,
};
