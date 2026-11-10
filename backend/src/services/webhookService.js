const db = require('../database/db');
const transactionService = require('./transactionService');
const paypalService = require('./paypalService');
const { generateEventId } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const { PAYMENT_STATUSES } = require('../config/paypal');

/**
 * Check if a webhook event ID has already been processed (Idempotency)
 */
function isEventProcessed(eventId) {
  const stmt = db.prepare(`SELECT event_id FROM webhook_events WHERE event_id = ?`);
  const row = stmt.get(eventId);
  return Boolean(row);
}

/**
 * Record a webhook event in the SQLite audit log
 */
function recordWebhookEvent({
  eventId,
  eventType,
  resourceId,
  resourceType,
  summary,
  verificationStatus,
  payload,
}) {
  const stmt = db.prepare(`
    INSERT INTO webhook_events (
      event_id, event_type, resource_id, resource_type, summary,
      verification_status, payload, processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    eventId,
    eventType,
    resourceId,
    resourceType,
    summary,
    verificationStatus,
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

/**
 * Process verified PayPal Webhook Event
 * Safely updates SQLite transaction state without false assumptions
 */
async function processWebhookEvent(event, verificationStatus = 'VERIFIED') {
  const { id: eventId, event_type: eventType, resource, summary } = event;

  // 1. Idempotency Check
  if (isEventProcessed(eventId)) {
    logger.warn(`Duplicate webhook event ignored: ${eventId} (${eventType})`);
    return {
      status: 'IGNORED_DUPLICATE',
      eventId,
      eventType,
      message: 'This webhook event was already processed previously.',
    };
  }

  logger.paypal(`Processing webhook event [${eventType}] - Resource ID: ${resource?.id}...`);

  let affectedTransaction = null;
  const resourceId = resource?.id || null;
  const resourceType = event.resource_type || 'UNKNOWN';

  // Extract order or capture references
  let orderId = null;
  let captureId = null;

  if (resourceType === 'checkout-order' || eventType.startsWith('CHECKOUT.ORDER')) {
    orderId = resource?.id;
  } else if (resourceType === 'capture' || eventType.startsWith('PAYMENT.CAPTURE')) {
    captureId = resource?.id;
    // Find matching order in custom_id or supplementary_data or DB search
    if (resource?.supplementary_data?.related_ids?.order_id) {
      orderId = resource.supplementary_data.related_ids.order_id;
    } else if (resource?.custom_id) {
      orderId = resource.custom_id;
    }
  }

  // Find transaction in local database
  if (orderId) {
    affectedTransaction = transactionService.getTransactionByOrderId(orderId);
  }
  if (!affectedTransaction && captureId) {
    const searchStmt = db.prepare(`SELECT * FROM transactions WHERE paypal_capture_id = ?`);
    const row = searchStmt.get(captureId);
    if (row) affectedTransaction = transactionService.getTransactionById(row.id);
  }

  // Handle specific PayPal webhook event types
  switch (eventType) {
    // 1. Buyer approved order on PayPal
    case 'CHECKOUT.ORDER.APPROVED': {
      if (affectedTransaction) {
        affectedTransaction = transactionService.recordBuyerApproval(affectedTransaction.paypal_order_id, resource?.payer);
        appendWebhookTimeline(affectedTransaction.id, eventType, 'Webhook: Buyer Approved Order', {
          eventId,
          payer: resource?.payer?.email_address,
        }, 'info');
      }
      break;
    }

    // 2. Payment approval reversed or expired
    case 'CHECKOUT.PAYMENT-APPROVAL.REVERSED': {
      if (affectedTransaction && affectedTransaction.payment_status !== PAYMENT_STATUSES.COMPLETED) {
        affectedTransaction = transactionService.recordOrderCancelled(affectedTransaction.paypal_order_id, {
          reason: summary || 'Payment approval was reversed or timed out.',
        });
        appendWebhookTimeline(affectedTransaction.id, eventType, 'Webhook: Approval Reversed', {
          eventId,
          summary,
        }, 'warning');
      }
      break;
    }

    // 3. Payment captured and funds received
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const targetOrderId = orderId || affectedTransaction?.paypal_order_id;
      if (targetOrderId) {
        affectedTransaction = transactionService.recordCaptureSuccess(targetOrderId, {
          data: {
            id: targetOrderId,
            status: 'COMPLETED',
            purchase_units: [{
              amount: resource?.amount,
              payments: { captures: [resource] },
            }],
            payer: resource?.payer,
          },
        });
        appendWebhookTimeline(affectedTransaction.id, eventType, 'Webhook: Payment Capture Completed', {
          eventId,
          captureId: resource?.id,
          amount: resource?.amount?.value,
          currency: resource?.amount?.currency_code,
        }, 'success');
      }
      break;
    }

    // 4. Payment capture pending (eCheck or risk review)
    case 'PAYMENT.CAPTURE.PENDING': {
      const targetOrderId = orderId || affectedTransaction?.paypal_order_id;
      const pendingReason = resource?.status_details?.reason || 'eCheck or banking settlement pending';

      if (targetOrderId) {
        affectedTransaction = transactionService.recordCaptureSuccess(targetOrderId, {
          data: {
            id: targetOrderId,
            status: 'PENDING',
            purchase_units: [{
              amount: resource?.amount,
              payments: { captures: [resource] },
            }],
          },
        });
        appendWebhookTimeline(affectedTransaction.id, eventType, `Webhook: Capture Pending (${pendingReason})`, {
          eventId,
          reason: pendingReason,
        }, 'warning');
      }
      break;
    }

    // 5. Payment capture denied
    case 'PAYMENT.CAPTURE.DENIED': {
      const targetOrderId = orderId || affectedTransaction?.paypal_order_id;
      const declineReason = resource?.status_details?.reason || 'Payment capture was denied by PayPal risk filters or processor.';

      if (targetOrderId) {
        affectedTransaction = transactionService.recordCaptureFailure(targetOrderId, {
          interpreted: {
            code: 'TRANSACTION_REFUSED',
            title: 'Payment Capture Denied',
            description: declineReason,
            cause: 'PayPal risk filters or issuing bank refused the settlement.',
            merchantGuidance: 'Do not ship merchandise. Advise customer to use another payment instrument.',
            customerFriendlyMessage: 'This transaction was denied by PayPal. Please try another payment method.',
            retryable: false,
          },
          data: resource,
        });
        appendWebhookTimeline(affectedTransaction.id, eventType, 'Webhook: Payment Capture Denied', {
          eventId,
          reason: declineReason,
        }, 'error');
      }
      break;
    }

    // 6. Payment refunded
    case 'PAYMENT.CAPTURE.REFUNDED': {
      if (affectedTransaction) {
        appendWebhookTimeline(affectedTransaction.id, eventType, 'Webhook: Payment Capture Refunded', {
          eventId,
          refundId: resource?.id,
          amount: resource?.amount?.value,
        }, 'warning');
      }
      break;
    }

    default:
      logger.info(`Received unhandled webhook event: ${eventType} (Event ID: ${eventId})`);
      break;
  }

  // Record into webhook_events log
  recordWebhookEvent({
    eventId,
    eventType,
    resourceId,
    resourceType,
    summary: summary || eventType,
    verificationStatus,
    payload: event,
  });

  return {
    status: 'PROCESSED',
    eventId,
    eventType,
    verificationStatus,
    affectedTransactionId: affectedTransaction?.id || null,
    message: `Successfully processed webhook event: ${eventType}`,
  };
}

/**
 * Append timeline event to a transaction from a webhook signal
 */
function appendWebhookTimeline(transactionId, eventType, title, details, status = 'info') {
  try {
    const row = db.prepare(`SELECT timeline FROM transactions WHERE id = ?`).get(transactionId);
    let timeline = [];
    try {
      timeline = row?.timeline ? JSON.parse(row.timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: eventType,
      title,
      details,
      status,
    });

    db.prepare(`UPDATE transactions SET timeline = ?, updated_at = ? WHERE id = ?`).run(
      JSON.stringify(timeline),
      new Date().toISOString(),
      transactionId
    );
  } catch (err) {
    logger.error('Failed to append webhook timeline event:', err);
  }
}

/**
 * List received webhook events
 */
function listWebhookEvents(limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM webhook_events
    ORDER BY processed_at DESC
    LIMIT ?
  `);
  return stmt.all(limit).map((row) => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload) : null,
  }));
}

module.exports = {
  processWebhookEvent,
  isEventProcessed,
  listWebhookEvents,
};

