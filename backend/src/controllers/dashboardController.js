const transactionService = require('../services/transactionService');
const logger = require('../utils/logger');

/**
 * Get aggregated dashboard statistics
 */
function getStats(req, res, next) {
  try {
    const stats = transactionService.getDashboardStats();
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
 * Get activity timelines and failure causes
 */
function getActivity(req, res, next) {
  try {
    const activity = transactionService.getPaymentActivity();
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
