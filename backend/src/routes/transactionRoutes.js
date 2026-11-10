const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// List transactions with pagination & filters
router.get('/', transactionController.getTransactions);

// Retrieve transaction details by ID or PayPal Order ID
router.get('/:id', transactionController.getTransactionDetails);

// AI Payment Failure & Recovery Analysis (Prompt 2)
router.post('/:id/analyze', transactionController.analyzeTransaction);

// Get AI Analysis History (Prompt 2)
router.get('/:id/analysis', transactionController.getAnalysisHistory);

// Refresh and synchronize status directly with PayPal REST API (Prompt 2)
router.post('/:id/refresh', transactionController.refreshStatus);
router.post('/:id/sync', transactionController.refreshStatus); // Alias for backwards compatibility

module.exports = router;
