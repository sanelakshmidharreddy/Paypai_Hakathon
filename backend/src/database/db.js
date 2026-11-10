const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const logger = require('../utils/logger');

// Resolve path to SQLite database file
const dbFilePath = path.resolve(process.cwd(), config.database.filePath);
const dbDir = path.dirname(dbFilePath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info(`Created database directory at: ${dbDir}`);
}

const db = new DatabaseSync(dbFilePath);
logger.info(`Connected to SQLite database at: ${dbFilePath}`);

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      paypal_order_id TEXT UNIQUE,
      paypal_capture_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      payment_status TEXT NOT NULL,
      paypal_status TEXT,
      payer_email TEXT,
      payer_name TEXT,
      payer_id TEXT,
      error_code TEXT,
      error_message TEXT,
      error_details TEXT,
      raw_paypal_response TEXT,
      timeline TEXT,
      customer_notes TEXT,
      ai_analysis_status TEXT DEFAULT 'pending',
      ai_analysis_summary TEXT,
      ai_recovery_recommendation TEXT,
      ai_merchant_action TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_paypal_order_id ON transactions (paypal_order_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions (payment_status);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  logger.info('Database schema verified and ready.');
}

initSchema();

module.exports = db;
