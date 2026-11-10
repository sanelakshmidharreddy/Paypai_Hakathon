const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config/env');
const routes = require('./src/routes');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const db = require('./src/database/db');
const { seedDatabase } = require('./src/database/seed');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Permit frontend in dev
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(requestLogger);

// Mount main API
app.use('/api', routes);

// Root informative endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Intelligent PayPal Payment Failure & Recovery API',
    version: '1.0.0',
    hackathon: 'PayPal AI Hackathon',
    documentation: '/api/health',
    status: 'operational',
    paypalStatus: config.paypal.isConfigured ? 'Configured (Sandbox)' : 'Credentials needed in .env',
  });
});

// Global error handler
app.use(errorHandler);

// Auto-seed sample records if database is fresh
try {
  seedDatabase();
} catch (seedErr) {
  logger.warn('Seed initialization error (non-fatal):', seedErr.message);
}

// Start HTTP server
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.success(`=======================================================`);
  logger.success(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`   - API Health: http://localhost:${PORT}/api/health`);
  logger.info(`   - PayPal Client ID: ${config.paypal.clientId ? `${config.paypal.clientId.substring(0, 10)}...` : 'NOT SET'}`);
  logger.info(`   - PayPal Base URL: ${config.paypal.baseUrl}`);
  logger.info(`   - SQLite Database: ${config.database.filePath}`);
  logger.success(`=======================================================`);
});

// Graceful termination
process.on('SIGINT', () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    try {
      db.close();
      logger.info('Database connection closed.');
    } catch {}
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

module.exports = app;

