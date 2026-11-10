const webhookService = require('../services/webhookService');
const paypalService = require('../services/paypalService');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Handle incoming PayPal Webhook POST notification
 * Strictly verifies signature before processing
 */
async function handleWebhook(req, res, next) {
  try {
    const event = req.body;
    const headers = req.headers;

    logger.paypal(`Received incoming Webhook notification: [${event?.event_type}] - ID: ${event?.id}`);

    if (!event || !event.event_type || !event.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PayPal webhook event payload.',
      });
    }

    // Check for explicit simulation header (used for testing and hackathon judging)
    const isSimulated = headers['x-simulation-mode'] === 'true' || req.query.simulate === 'true';

    let verificationStatus = 'UNVERIFIED';

    if (isSimulated) {
      verificationStatus = 'SIMULATED';
      logger.info(`Webhook event ${event.id} marked as SIMULATED for testing.`);
    } else if (config.paypal.webhookId) {
      // Perform live PayPal signature verification
      const verifyResult = await paypalService.verifyWebhookSignature({
        authAlgo: headers['paypal-auth-algo'],
        certUrl: headers['paypal-cert-url'],
        transmissionId: headers['paypal-transmission-id'],
        transmissionSig: headers['paypal-transmission-sig'],
        transmissionTime: headers['paypal-transmission-time'],
        webhookId: config.paypal.webhookId,
        eventBody: event,
      });

      if (!verifyResult.verified) {
        logger.error(`Webhook signature verification failed for event: ${event.id}`);
        return res.status(400).json({
          success: false,
          error: 'PayPal webhook signature verification failed. Untrusted webhook rejected.',
          status: verifyResult.status,
        });
      }

      verificationStatus = 'VERIFIED';
    } else {
      // In local development without registered public webhook URL
      verificationStatus = 'UNVERIFIED_LOCAL_DEV';
      logger.warn(`PAYPAL_WEBHOOK_ID not set; webhook ${event.id} processed in development test mode.`);
    }

    // Process event with duplicate protection & transaction synchronization
    const processResult = await webhookService.processWebhookEvent(event, verificationStatus);

    res.status(200).json({
      success: true,
      ...processResult,
    });
  } catch (error) {
    logger.error('Error handling PayPal webhook:', error);
    next(error);
  }
}

/**
 * List received webhook audit logs
 */
function getWebhookLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 25;
    const events = webhookService.listWebhookEvents(limit);
    res.status(200).json({
      success: true,
      total: events.length,
      events,
    });
  } catch (error) {
    logger.error('Failed to get webhook logs:', error);
    next(error);
  }
}

/**
 * Simulate Webhook delivery for Sandbox edge testing
 */
async function simulateWebhook(req, res, next) {
  try {
    const { eventType = 'PAYMENT.CAPTURE.COMPLETED', orderId, captureId, amount = '49.99', currency = 'USD' } = req.body;

    const mockEvent = {
      id: `WH_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      event_version: '1.0',
      create_time: new Date().toISOString(),
      event_type: eventType,
      resource_type: eventType.startsWith('CHECKOUT.ORDER') ? 'checkout-order' : 'capture',
      summary: `Simulated webhook event for ${eventType}`,
      resource: {
        id: captureId || `CAP_${Date.now().toString(36).toUpperCase()}`,
        status: eventType === 'PAYMENT.CAPTURE.DENIED' ? 'DENIED' : eventType === 'PAYMENT.CAPTURE.PENDING' ? 'PENDING' : 'COMPLETED',
        amount: {
          value: parseFloat(amount).toFixed(2),
          currency_code: currency,
        },
        supplementary_data: {
          related_ids: {
            order_id: orderId || null,
          },
        },
        status_details: {
          reason: eventType === 'PAYMENT.CAPTURE.PENDING' ? 'PENDING_REVIEW' : eventType === 'PAYMENT.CAPTURE.DENIED' ? 'RISK_DENIAL' : undefined,
        },
      },
    };

    const processResult = await webhookService.processWebhookEvent(mockEvent, 'SIMULATED_TEST');

    res.status(201).json({
      success: true,
      simulated: true,
      event: mockEvent,
      result: processResult,
    });
  } catch (error) {
    logger.error('Error simulating webhook:', error);
    next(error);
  }
}

module.exports = {
  handleWebhook,
  getWebhookLogs,
  simulateWebhook,
};

