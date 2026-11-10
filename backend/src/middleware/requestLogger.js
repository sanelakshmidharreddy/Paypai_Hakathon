const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const msg = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(msg);
    } else if (statusCode >= 400) {
      logger.warn(msg);
    } else {
      logger.info(msg);
    }
  });
  next();
}

module.exports = requestLogger;

