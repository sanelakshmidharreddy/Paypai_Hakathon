const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Aggregated stats (totals, success rate, pending, failed)
router.get('/stats', dashboardController.getStats);

// Activity timelines and failure breakdown
router.get('/activity', dashboardController.getActivity);

module.exports = router;

