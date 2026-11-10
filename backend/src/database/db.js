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

// Initialize schema & migrations
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
      latest_analysis_id TEXT,
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

    -- AI Analysis History Table (Prompt 2)
    CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      error_classification TEXT NOT NULL,
      explanation TEXT NOT NULL,
      likely_reason TEXT,
      confirmed_facts TEXT NOT NULL,
      possible_explanations TEXT,
      unknown_information TEXT NOT NULL,
      confidence_level TEXT NOT NULL,
      merchant_action TEXT NOT NULL,
      customer_action TEXT NOT NULL,
      retry_safety TEXT NOT NULL,
      retry_safety_reason TEXT NOT NULL,
      customer_message TEXT NOT NULL,
      model_used TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions (id)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_analyses_transaction_id ON ai_analyses (transaction_id);
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses (created_at DESC);
  `);

  // Ensure columns exist on existing databases
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN latest_analysis_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN ai_analysis_status TEXT DEFAULT 'pending';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN ai_analysis_summary TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN ai_recovery_recommendation TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN ai_merchant_action TEXT;`);
  } catch {}

  logger.info('Database schema verified (including ai_analyses table and column migrations).');
}

initSchema();

module.exports = db;
