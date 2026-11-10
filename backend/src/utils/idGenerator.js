const crypto = require('crypto');

function generateTransactionId() {
  const random = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now().toString(36);
  return `txn_${timestamp}_${random}`;
}

function generateEventId() {
  const random = crypto.randomBytes(4).toString('hex');
  return `evt_${Date.now().toString(36)}_${random}`;
}

module.exports = {
  generateTransactionId,
  generateEventId,
};

