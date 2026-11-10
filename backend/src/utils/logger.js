/**
 * Structured Console Logger with timestamps and contextual indicators
 */

function formatTimestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (msg, meta) => {
    console.log(`[${formatTimestamp()}] [INFO] ${msg}`, meta !== undefined ? meta : '');
  },
  success: (msg, meta) => {
    console.log(`[${formatTimestamp()}] [SUCCESS] \x1b[32m${msg}\x1b[0m`, meta !== undefined ? meta : '');
  },
  warn: (msg, meta) => {
    console.warn(`[${formatTimestamp()}] [WARN] \x1b[33m${msg}\x1b[0m`, meta !== undefined ? meta : '');
  },
  error: (msg, meta) => {
    console.error(`[${formatTimestamp()}] [ERROR] \x1b[31m${msg}\x1b[0m`, meta !== undefined ? meta : '');
  },
  paypal: (msg, meta) => {
    console.log(`[${formatTimestamp()}] [PAYPAL-API] \x1b[36m${msg}\x1b[0m`, meta !== undefined ? meta : '');
  },
};

module.exports = logger;

