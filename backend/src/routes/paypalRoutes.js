const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

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

module.exports = router;
