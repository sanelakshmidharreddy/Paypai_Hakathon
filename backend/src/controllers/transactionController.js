const transactionService = require('../services/transactionService');
const paypalService = require('../services/paypalService');
const logger = require('../utils/logger');

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

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    logger.error(`Failed to get transaction details for ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * Perform a live check against PayPal REST API for this order and synchronize database
 */
async function syncWithPayPal(req, res, next) {
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

    // Call PayPal REST API to retrieve live order status
    const liveOrder = await paypalService.getOrderDetails(transaction.paypal_order_id);

    res.status(200).json({
      success: true,
      message: 'Retrieved verified live status from PayPal API.',
      liveStatus: liveOrder.status,
      liveOrder,
      transaction,
    });
  } catch (error) {
    logger.error(`Failed to sync transaction with PayPal:`, error);
    next(error);
  }
}

module.exports = {
  getTransactions,
  getTransactionDetails,
  syncWithPayPal,
};
