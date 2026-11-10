const express = require('express');
const router = express.Router();

const paypalRoutes = require('./paypalRoutes');
const transactionRoutes = require('./transactionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const healthController = require('../controllers/healthController');

// Health check
router.get('/health', healthController.getHealth);

// Mount core modules
router.use('/paypal', paypalRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
