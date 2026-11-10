const db = require('../database/db');
const { generateTransactionId, generateEventId } = require('../utils/idGenerator');
const { PAYMENT_STATUSES } = require('../config/paypal');
const logger = require('../utils/logger');

/**
 * Add a timeline event to a transaction record
 */
function appendTimelineEvent(currentTimelineJson, eventType, title, details = {}, status = 'info') {
  let events = [];
  try {
    events = currentTimelineJson ? JSON.parse(currentTimelineJson) : [];
  } catch {
    events = [];
  }

  const newEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    type: eventType,
    title,
    details,
    status, // info, success, warning, error
  };

  events.push(newEvent);
  return JSON.stringify(events);
}

/**
 * Create a new pending transaction upon PayPal Order creation
 */
function createTransaction({ paypalOrderId, amount, currency = 'USD', customerNotes = null }) {
  const id = generateTransactionId();
  const now = new Date().toISOString();

  const initialTimeline = appendTimelineEvent(
    null,
    'ORDER_CREATED',
    'PayPal Checkout Order Created',
    { orderId: paypalOrderId, amount: parseFloat(amount), currency },
    'info'
  );

  const stmt = db.prepare(`
    INSERT INTO transactions (
      id, paypal_order_id, amount, currency, payment_status, paypal_status,
      timeline, customer_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    paypalOrderId,
    parseFloat(amount),
    currency.toUpperCase(),
    PAYMENT_STATUSES.CREATED,
    'CREATED',
    initialTimeline,
    customerNotes,
    now,
    now
  );

  logger.info(`Transaction initialized in database: ${id} (Order: ${paypalOrderId})`);
  return getTransactionById(id);
}

/**
 * Get transaction by internal ID
 */
function getTransactionById(id) {
  const stmt = db.prepare(`SELECT * FROM transactions WHERE id = ?`);
  const row = stmt.get(id);
  if (!row) return null;
  return formatTransaction(row);
}

/**
 * Get transaction by PayPal Order ID
 */
function getTransactionByOrderId(orderId) {
  const stmt = db.prepare(`SELECT * FROM transactions WHERE paypal_order_id = ?`);
  const row = stmt.get(orderId);
  if (!row) return null;
  return formatTransaction(row);
}

/**
 * Format raw SQLite row into parsed JSON objects
 */
function formatTransaction(row) {
  if (!row) return null;
  return {
    ...row,
    error_details: row.error_details ? safeJsonParse(row.error_details) : null,
    raw_paypal_response: row.raw_paypal_response ? safeJsonParse(row.raw_paypal_response) : null,
    timeline: row.timeline ? safeJsonParse(row.timeline) : [],
  };
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Record buyer approval on PayPal
 */
function recordBuyerApproval(orderId, payerData = {}) {
  const existing = getTransactionByOrderId(orderId);
  if (!existing) {
    logger.warn(`Cannot record buyer approval: transaction with order ${orderId} not found.`);
    return null;
  }

  // Prevent modifying completed or terminal states
  if (existing.payment_status === PAYMENT_STATUSES.COMPLETED) {
    logger.warn(`Order ${orderId} already completed; ignoring approval signal.`);
    return existing;
  }

  const now = new Date().toISOString();
  const payerEmail = payerData.email_address || payerData.email || existing.payer_email;
  const payerName = payerData.name ? `${payerData.name.given_name || ''} ${payerData.name.surname || ''}`.trim() : existing.payer_name;
  const payerId = payerData.payer_id || existing.payer_id;

  const updatedTimeline = appendTimelineEvent(
    JSON.stringify(existing.timeline),
    'BUYER_APPROVED',
    'Buyer Approved Payment on PayPal',
    { payerEmail, payerId },
    'info'
  );

  const stmt = db.prepare(`
    UPDATE transactions SET
      payment_status = ?,
      paypal_status = ?,
      payer_email = COALESCE(?, payer_email),
      payer_name = COALESCE(?, payer_name),
      payer_id = COALESCE(?, payer_id),
      timeline = ?,
      updated_at = ?
    WHERE paypal_order_id = ?
  `);

  stmt.run(
    PAYMENT_STATUSES.APPROVED,
    'APPROVED',
    payerEmail,
    payerName,
    payerId,
    updatedTimeline,
    now,
    orderId
  );

  return getTransactionByOrderId(orderId);
}

/**
 * Record successful PayPal order capture
 * Prevents duplicate captures and distinguishes between COMPLETED and PENDING (eCheck/review)
 */
function recordCaptureSuccess(orderId, captureResult) {
  const existing = getTransactionByOrderId(orderId);
  const now = new Date().toISOString();
  const rawData = captureResult.data;

  // Extract capture details from PayPal response representation
  const purchaseUnit = rawData.purchase_units?.[0];
  const captureObj = purchaseUnit?.payments?.captures?.[0];
  const captureId = captureObj?.id || null;
  const captureStatus = captureObj?.status || rawData.status;

  // Determine final status
  let finalStatus = PAYMENT_STATUSES.COMPLETED;
  let statusDetailMessage = 'Payment captured and funds received.';
  let eventType = 'CAPTURE_COMPLETED';
  let eventStatus = 'success';

  if (captureStatus === 'PENDING') {
    finalStatus = PAYMENT_STATUSES.PENDING;
    const reason = captureObj?.status_details?.reason || 'Awaiting clearance or fraud review';
    statusDetailMessage = `Payment pending: ${reason}`;
    eventType = 'CAPTURE_PENDING';
    eventStatus = 'warning';
  }

  // Extract payer information if available
  const payer = rawData.payer || {};
  const payerEmail = payer.email_address || existing?.payer_email || null;
  const payerName = payer.name ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim() : existing?.payer_name || null;
  const payerId = payer.payer_id || existing?.payer_id || null;

  const currentTimeline = existing ? JSON.stringify(existing.timeline) : null;
  const updatedTimeline = appendTimelineEvent(
    currentTimeline,
    eventType,
    statusDetailMessage,
    {
      captureId,
      paypalStatus: captureStatus,
      amount: captureObj?.amount?.value || purchaseUnit?.amount?.value,
      currency: captureObj?.amount?.currency_code || purchaseUnit?.amount?.currency_code,
    },
    eventStatus
  );

  if (existing) {
    const stmt = db.prepare(`
      UPDATE transactions SET
        paypal_capture_id = ?,
        payment_status = ?,
        paypal_status = ?,
        payer_email = COALESCE(?, payer_email),
        payer_name = COALESCE(?, payer_name),
        payer_id = COALESCE(?, payer_id),
        raw_paypal_response = ?,
        timeline = ?,
        updated_at = ?
      WHERE paypal_order_id = ?
    `);

    stmt.run(
      captureId,
      finalStatus,
      captureStatus,
      payerEmail,
      payerName,
      payerId,
      JSON.stringify(rawData),
      updatedTimeline,
      now,
      orderId
    );
  } else {
    // If somehow not created yet, insert full record
    const id = generateTransactionId();
    const amountVal = parseFloat(captureObj?.amount?.value || purchaseUnit?.amount?.value || 0);
    const curr = captureObj?.amount?.currency_code || purchaseUnit?.amount?.currency_code || 'USD';

    const stmt = db.prepare(`
      INSERT INTO transactions (
        id, paypal_order_id, paypal_capture_id, amount, currency,
        payment_status, paypal_status, payer_email, payer_name, payer_id,
        raw_paypal_response, timeline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      orderId,
      captureId,
      amountVal,
      curr,
      finalStatus,
      captureStatus,
      payerEmail,
      payerName,
      payerId,
      JSON.stringify(rawData),
      updatedTimeline,
      now,
      now
    );
  }

  logger.success(`Transaction record updated to ${finalStatus} for order ${orderId} (Capture: ${captureId})`);
  return getTransactionByOrderId(orderId);
}

/**
 * Record a declined or failed PayPal capture
 */
function recordCaptureFailure(orderId, captureResult) {
  const existing = getTransactionByOrderId(orderId);
  const now = new Date().toISOString();
  const interpreted = captureResult.interpreted || {};
  const rawData = captureResult.data || {};

  // Distinguish DECLINED vs FAILED
  const isDeclined = interpreted.code === 'INSTRUMENT_DECLINED' || interpreted.code === 'TRANSACTION_REFUSED';
  const paymentStatus = isDeclined ? PAYMENT_STATUSES.DECLINED : PAYMENT_STATUSES.FAILED;

  const currentTimeline = existing ? JSON.stringify(existing.timeline) : null;
  const updatedTimeline = appendTimelineEvent(
    currentTimeline,
    isDeclined ? 'PAYMENT_DECLINED' : 'PAYMENT_FAILED',
    interpreted.title || 'Payment Capture Declined',
    {
      code: interpreted.code,
      description: interpreted.description,
      cause: interpreted.cause,
      debugId: interpreted.debugId,
    },
    'error'
  );

  if (existing) {
    const stmt = db.prepare(`
      UPDATE transactions SET
        payment_status = ?,
        paypal_status = ?,
        error_code = ?,
        error_message = ?,
        error_details = ?,
        raw_paypal_response = ?,
        timeline = ?,
        updated_at = ?
      WHERE paypal_order_id = ?
    `);

    stmt.run(
      paymentStatus,
      rawData.name || 'FAILED',
      interpreted.code,
      interpreted.description || interpreted.title,
      JSON.stringify(interpreted),
      JSON.stringify(rawData),
      updatedTimeline,
      now,
      orderId
    );
  }

  logger.warn(`Transaction marked as ${paymentStatus} for order ${orderId} (Error: ${interpreted.code})`);
  return getTransactionByOrderId(orderId);
}

/**
 * Record buyer cancellation (interrupted checkout, closed window)
 * IMPORTANT: Not treated as a card decline
 */
function recordOrderCancelled(orderId, cancellationDetails = {}) {
  const existing = getTransactionByOrderId(orderId);
  const now = new Date().toISOString();

  // If already completed or terminal, don't revert
  if (existing && existing.payment_status === PAYMENT_STATUSES.COMPLETED) {
    logger.warn(`Order ${orderId} already completed; ignoring cancel event.`);
    return existing;
  }

  const currentTimeline = existing ? JSON.stringify(existing.timeline) : null;
  const updatedTimeline = appendTimelineEvent(
    currentTimeline,
    'CHECKOUT_CANCELLED',
    'Checkout Cancelled by Buyer',
    {
      reason: cancellationDetails.reason || 'Buyer exited PayPal checkout window before authorization.',
      timestamp: now,
    },
    'warning'
  );

  if (existing) {
    const stmt = db.prepare(`
      UPDATE transactions SET
        payment_status = ?,
        paypal_status = ?,
        error_code = ?,
        error_message = ?,
        timeline = ?,
        updated_at = ?
      WHERE paypal_order_id = ?
    `);

    stmt.run(
      PAYMENT_STATUSES.CANCELLED,
      'CANCELLED',
      'BUYER_CANCELLED',
      'Buyer closed or cancelled the PayPal checkout session.',
      updatedTimeline,
      now,
      orderId
    );
  }

  logger.info(`Recorded checkout cancellation for order ${orderId}`);
  return getTransactionByOrderId(orderId);
}

/**
 * Filter and paginate transactions
 */
function listTransactions({
  page = 1,
  limit = 10,
  status = null,
  search = null,
  dateFrom = null,
  dateTo = null,
  sortBy = 'created_at',
  sortOrder = 'DESC',
} = {}) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const validSortColumns = ['created_at', 'amount', 'payment_status', 'updated_at'];
  const sanitizedSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sanitizedOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClauses = [];
  const params = [];

  if (status && status !== 'ALL') {
    whereClauses.push('payment_status = ?');
    params.push(status.toUpperCase());
  }

  if (search && search.trim() !== '') {
    whereClauses.push(`(
      id LIKE ? OR
      paypal_order_id LIKE ? OR
      paypal_capture_id LIKE ? OR
      payer_email LIKE ? OR
      payer_name LIKE ? OR
      error_code LIKE ?
    )`);
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (dateFrom) {
    whereClauses.push('created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    whereClauses.push('created_at <= ?');
    params.push(dateTo);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM transactions ${whereSql}`;
  const countStmt = db.prepare(countSql);
  const countResult = countStmt.get(...params);
  const total = countResult ? countResult.total : 0;

  // Get paginated rows
  const querySql = `
    SELECT * FROM transactions
    ${whereSql}
    ORDER BY ${sanitizedSortBy} ${sanitizedOrder}
    LIMIT ? OFFSET ?
  `;

  const queryStmt = db.prepare(querySql);
  const rows = queryStmt.all(...params, parsedLimit, offset);

  return {
    transactions: rows.map(formatTransaction),
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
}

/**
 * Get dashboard metrics & overview statistics
 */
function getDashboardStats() {
  const statsQuery = db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN payment_status = 'COMPLETED' THEN 1 ELSE 0 END) as successful_count,
      SUM(CASE WHEN payment_status IN ('FAILED', 'DECLINED') THEN 1 ELSE 0 END) as failed_count,
      SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN payment_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN payment_status = 'CREATED' THEN 1 ELSE 0 END) as created_count,
      SUM(CASE WHEN payment_status = 'COMPLETED' THEN amount ELSE 0 END) as total_volume_successful,
      SUM(CASE WHEN payment_status IN ('FAILED', 'DECLINED') THEN amount ELSE 0 END) as total_volume_lost
    FROM transactions
  `);

  const stats = statsQuery.get();

  const total = stats.total_count || 0;
  const successful = stats.successful_count || 0;
  const failed = stats.failed_count || 0;
  const pending = stats.pending_count || 0;
  const cancelled = stats.cancelled_count || 0;
  const created = stats.created_count || 0;
  const totalVolume = stats.total_volume_successful || 0;
  const lostVolume = stats.total_volume_lost || 0;

  const resolvedAttempts = successful + failed;
  const successRate = resolvedAttempts > 0 ? Number(((successful / resolvedAttempts) * 100).toFixed(1)) : 0;
  const recoveryOpportunityRate = total > 0 ? Number((((failed + cancelled) / total) * 100).toFixed(1)) : 0;

  return {
    totalTransactions: total,
    successfulPayments: successful,
    failedPayments: failed,
    pendingPayments: pending,
    cancelledPayments: cancelled,
    inProgressPayments: created,
    successRate,
    recoveryOpportunityRate,
    totalVolumeSuccessful: Number(totalVolume.toFixed(2)),
    totalVolumeLost: Number(lostVolume.toFixed(2)),
  };
}

/**
 * Get payment activity breakdown by day or status for visualization
 */
function getPaymentActivity() {
  // Aggregate daily counts for the last 14 days
  const dailyQuery = db.prepare(`
    SELECT
      SUBSTR(created_at, 1, 10) as date,
      SUM(CASE WHEN payment_status = 'COMPLETED' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN payment_status IN ('FAILED', 'DECLINED') THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN payment_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
      COUNT(*) as total
    FROM transactions
    WHERE created_at >= date('now', '-14 days')
    GROUP BY SUBSTR(created_at, 1, 10)
    ORDER BY date ASC
  `);

  const dailyActivity = dailyQuery.all();

  // Aggregate failure reasons for top failure causes
  const failureReasonsQuery = db.prepare(`
    SELECT
      COALESCE(error_code, 'UNSPECIFIED') as code,
      COUNT(*) as count,
      SUM(amount) as lost_amount
    FROM transactions
    WHERE payment_status IN ('FAILED', 'DECLINED')
    GROUP BY error_code
    ORDER BY count DESC
    LIMIT 5
  `);

  const failureReasons = failureReasonsQuery.all();

  return {
    dailyActivity,
    failureReasons,
  };
}

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionByOrderId,
  recordBuyerApproval,
  recordCaptureSuccess,
  recordCaptureFailure,
  recordOrderCancelled,
  listTransactions,
  getDashboardStats,
  getPaymentActivity,
};
