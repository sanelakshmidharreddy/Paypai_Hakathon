const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');
const webhookController = require('../controllers/webhookController');

// Configuration (public safe endpoint for frontend)
router.get('/config', paypalController.getConfig);

// Order creation & capture flow
router.post('/create-order', paypalController.createOrder);
router.post('/capture-order', paypalController.captureOrder);
router.post('/capture-order/:orderId', paypalController.captureOrder);
router.post('/cancel-order', paypalController.cancelOrder);

// Live server-verified status check
router.get('/order/:orderId', paypalController.getOrderStatus);

// Testing & Sandbox simulation endpoint
router.post('/simulate', paypalController.simulateScenario);

// PayPal Webhooks (Prompt 3)
router.post('/webhook', webhookController.handleWebhook);
router.get('/webhooks', webhookController.getWebhookLogs);
router.post('/webhooks/simulate', webhookController.simulateWebhook);

module.exports = router;
