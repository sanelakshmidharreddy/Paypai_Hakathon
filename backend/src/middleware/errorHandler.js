const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    interpreted: err.interpreted || null,
    details: process.env.NODE_ENV === 'development' ? err.details || err.stack : undefined,
  });
}

module.exports = errorHandler;

