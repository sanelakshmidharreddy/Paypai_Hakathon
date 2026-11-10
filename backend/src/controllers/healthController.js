const db = require('../database/db');
const paypalService = require('../services/paypalService');
const config = require('../config/env');
const logger = require('../utils/logger');

async function getHealth(req, res) {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbError = null;

  try {
    const testStmt = db.prepare('SELECT 1 as alive');
    testStmt.get();
  } catch (err) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  let paypalHealth = {
    configured: config.paypal.isConfigured,
    connected: false,
    environment: 'sandbox',
    baseUrl: config.paypal.baseUrl,
  };

  if (config.paypal.isConfigured) {
    try {
      paypalHealth = await paypalService.testConnection();
      paypalHealth.configured = true;
    } catch (err) {
      paypalHealth.connected = false;
      paypalHealth.error = err.message;
    }
  } else {
    paypalHealth.message = 'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not provided in .env.';
  }

  const responseTimeMs = Date.now() - startTime;

  res.status(200).json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    database: {
      type: 'SQLite (node:sqlite)',
      status: dbStatus,
      error: dbError,
    },
    paypal: paypalHealth,
    openai: {
      configured: config.openai.isConfigured,
      status: config.openai.isConfigured ? 'ready_for_prompt_2' : 'pending_configuration',
    },
    responseTimeMs,
  });
}

module.exports = {
  getHealth,
};

