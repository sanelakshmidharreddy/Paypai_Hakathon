const transactionService = require('../services/transactionService');
const logger = require('../utils/logger');

/**
 * Get aggregated dashboard statistics with filter support (Prompt 3)
 */
function getStats(req, res, next) {
  try {
    const { status, dateFrom, dateTo, errorCategory } = req.query;
    const stats = transactionService.getDashboardStats({
      status,
      dateFrom,
      dateTo,
      errorCategory,
    });

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get dashboard stats:', error);
    next(error);
  }
}

/**
 * Get activity timelines and failure breakdown with filter support (Prompt 3)
 */
function getActivity(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const activity = transactionService.getPaymentActivity({
      dateFrom,
      dateTo,
    });

    res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    logger.error('Failed to get payment activity:', error);
    next(error);
  }
}

module.exports = {
  getStats,
  getActivity,
};
