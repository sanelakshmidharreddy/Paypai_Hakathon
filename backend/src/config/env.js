const path = require('path');

// Load backend/.env first, then fall back to root cwd .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // PayPal Sandbox REST API
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    isConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  },

  // OpenAI (Prepared for Prompt 2)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    isConfigured: Boolean(process.env.OPENAI_API_KEY),
  },

  // Database
  database: {
    filePath: process.env.DATABASE_FILE || './data/transactions.db',
  },
};

module.exports = config;

