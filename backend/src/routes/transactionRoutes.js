const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// List transactions with pagination & filters
router.get('/', transactionController.getTransactions);

// Retrieve transaction details by ID or PayPal Order ID
router.get('/:id', transactionController.getTransactionDetails);

// Verify and synchronize status with PayPal REST API
router.post('/:id/sync', transactionController.syncWithPayPal);

module.exports = router;
