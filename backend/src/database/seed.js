const db = require('./db');
const logger = require('../utils/logger');
const { PAYMENT_STATUSES } = require('../config/paypal');

function seedDatabase() {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  if (existingCount > 0) {
    logger.info(`Database already contains ${existingCount} transactions. Skipping initial seed.`);
    return;
  }

  logger.info('Seeding database with realistic hackathon sample transactions...');

  const now = Date.now();
  const oneHour = 3600000;
  const oneDay = 86400000;

  const sampleTransactions = [
    {
      id: 'txn_seed_001',
      paypal_order_id: '5X48920194821039A',
      paypal_capture_id: '8BC9381029381023B',
      amount: 149.00,
      currency: 'USD',
      payment_status: PAYMENT_STATUSES.COMPLETED,
      paypal_status: 'COMPLETED',
      payer_email: 'buyer-alex@example.com',
      payer_name: 'Alex Johnson',
      payer_id: 'PAYER_ALEX_12',
      error_code: null,
      error_message: null,
      error_details: null,
      customer_notes: 'Annual Pro Subscription checkout',
      created_at: new Date(now - 3 * oneHour).toISOString(),
      updated_at: new Date(now - 3 * oneHour + 12000).toISOString(),
      timeline: JSON.stringify([
        {
          id: 'evt_seed_1',
          timestamp: new Date(now - 3 * oneHour).toISOString(),
          type: 'ORDER_CREATED',
          title: 'PayPal Checkout Order Created',
          details: { orderId: '5X48920194821039A', amount: 149.00, currency: 'USD' },
          status: 'info',
        },
        {
          id: 'evt_seed_2',
          timestamp: new Date(now - 3 * oneHour + 8000).toISOString(),
          type: 'BUYER_APPROVED',
          title: 'Buyer Approved Payment on PayPal',
          details: { payerEmail: 'buyer-alex@example.com', payerId: 'PAYER_ALEX_12' },
          status: 'info',
        },
        {
          id: 'evt_seed_3',
          timestamp: new Date(now - 3 * oneHour + 12000).toISOString(),
          type: 'CAPTURE_COMPLETED',
          title: 'Payment captured and funds received.',
          details: { captureId: '8BC9381029381023B', paypalStatus: 'COMPLETED', amount: '149.00', currency: 'USD' },
          status: 'success',
        },
      ]),
    },
    {
      id: 'txn_seed_002',
      paypal_order_id: '7Y91827364510294C',
      paypal_capture_id: null,
      amount: 85.50,
      currency: 'USD',
      payment_status: PAYMENT_STATUSES.DECLINED,
      paypal_status: 'UNPROCESSABLE_ENTITY',
      payer_email: 'maria.santos@example.com',
      payer_name: 'Maria Santos',
      payer_id: 'PAYER_MARIA_34',
      error_code: 'INSTRUMENT_DECLINED',
      error_message: 'The requested action could not be completed because the card was declined by issuing bank.',
      error_details: JSON.stringify({
        code: 'INSTRUMENT_DECLINED',
        title: 'Payment Instrument Declined',
        description: 'The buyer selected card or bank account was declined by the issuing financial institution.',
        cause: 'Insufficient balance, expiration, daily transaction limits, or bank anti-fraud security hold.',
        merchantGuidance: 'Advise customer to choose a different card or pay directly via PayPal balance/linked bank account.',
        customerFriendlyMessage: 'Your card was declined by the issuing bank. Please select an alternate card in your PayPal wallet.',
        retryable: true,
      }),
      customer_notes: 'Checkout failed on Visa ending in 4012',
      created_at: new Date(now - 7 * oneHour).toISOString(),
      updated_at: new Date(now - 7 * oneHour + 15000).toISOString(),
      timeline: JSON.stringify([
        {
          id: 'evt_seed_4',
          timestamp: new Date(now - 7 * oneHour).toISOString(),
          type: 'ORDER_CREATED',
          title: 'PayPal Checkout Order Created',
          details: { orderId: '7Y91827364510294C', amount: 85.50, currency: 'USD' },
          status: 'info',
        },
        {
          id: 'evt_seed_5',
          timestamp: new Date(now - 7 * oneHour + 10000).toISOString(),
          type: 'BUYER_APPROVED',
          title: 'Buyer Approved Payment on PayPal',
          details: { payerEmail: 'maria.santos@example.com', payerId: 'PAYER_MARIA_34' },
          status: 'info',
        },
        {
          id: 'evt_seed_6',
          timestamp: new Date(now - 7 * oneHour + 15000).toISOString(),
          type: 'PAYMENT_DECLINED',
          title: 'Payment Instrument Declined',
          details: { code: 'INSTRUMENT_DECLINED', description: 'Bank declined instrument' },
          status: 'error',
        },
      ]),
    },
    {
      id: 'txn_seed_003',
      paypal_order_id: '3K10293847561029D',
      paypal_capture_id: null,
      amount: 42.00,
      currency: 'USD',
      payment_status: PAYMENT_STATUSES.CANCELLED,
      paypal_status: 'CANCELLED',
      payer_email: null,
      payer_name: null,
      payer_id: null,
      error_code: 'BUYER_CANCELLED',
      error_message: 'Buyer closed or cancelled the PayPal checkout session.',
      error_details: null,
      customer_notes: 'Buyer abandoned checkout during PayPal modal review',
      created_at: new Date(now - 14 * oneHour).toISOString(),
      updated_at: new Date(now - 14 * oneHour + 45000).toISOString(),
      timeline: JSON.stringify([
        {
          id: 'evt_seed_7',
          timestamp: new Date(now - 14 * oneHour).toISOString(),
          type: 'ORDER_CREATED',
          title: 'PayPal Checkout Order Created',
          details: { orderId: '3K10293847561029D', amount: 42.00, currency: 'USD' },
          status: 'info',
        },
        {
          id: 'evt_seed_8',
          timestamp: new Date(now - 14 * oneHour + 45000).toISOString(),
          type: 'CHECKOUT_CANCELLED',
          title: 'Checkout Cancelled by Buyer',
          details: { reason: 'Buyer exited checkout before authorization.' },
          status: 'warning',
        },
      ]),
    },
    {
      id: 'txn_seed_004',
      paypal_order_id: '9Z38471029384756E',
      paypal_capture_id: '7XY9928374102938F',
      amount: 220.00,
      currency: 'USD',
      payment_status: PAYMENT_STATUSES.PENDING,
      paypal_status: 'PENDING',
      payer_email: 'david.wilson@example.com',
      payer_name: 'David Wilson',
      payer_id: 'PAYER_DAVID_78',
      error_code: null,
      error_message: 'Payment pending: eCheck clearance awaiting banking settlement',
      error_details: null,
      customer_notes: 'Large order paid via electronic bank transfer (eCheck)',
      created_at: new Date(now - 1 * oneDay).toISOString(),
      updated_at: new Date(now - 1 * oneDay + 20000).toISOString(),
      timeline: JSON.stringify([
        {
          id: 'evt_seed_9',
          timestamp: new Date(now - 1 * oneDay).toISOString(),
          type: 'ORDER_CREATED',
          title: 'PayPal Checkout Order Created',
          details: { orderId: '9Z38471029384756E', amount: 220.00, currency: 'USD' },
          status: 'info',
        },
        {
          id: 'evt_seed_10',
          timestamp: new Date(now - 1 * oneDay + 15000).toISOString(),
          type: 'BUYER_APPROVED',
          title: 'Buyer Approved Payment on PayPal',
          details: { payerEmail: 'david.wilson@example.com' },
          status: 'info',
        },
        {
          id: 'evt_seed_11',
          timestamp: new Date(now - 1 * oneDay + 20000).toISOString(),
          type: 'CAPTURE_PENDING',
          title: 'Payment pending: eCheck awaiting clearance',
          details: { captureId: '7XY9928374102938F', paypalStatus: 'PENDING', amount: '220.00' },
          status: 'warning',
        },
      ]),
    },
    {
      id: 'txn_seed_005',
      paypal_order_id: '2B19283746501928G',
      paypal_capture_id: null,
      amount: 320.00,
      currency: 'USD',
      payment_status: PAYMENT_STATUSES.FAILED,
      paypal_status: 'TRANSACTION_REFUSED',
      payer_email: 'suspect-order@mailtemp.xyz',
      payer_name: 'Test Account',
      payer_id: 'PAYER_RISK_01',
      error_code: 'TRANSACTION_REFUSED',
      error_message: 'PayPal internal risk model declined to process the transaction.',
      error_details: JSON.stringify({
        code: 'TRANSACTION_REFUSED',
        title: 'Transaction Refused by PayPal Risk Engine',
        description: 'PayPal internal risk model declined to process the transaction.',
        cause: 'Suspicious IP address, unusual purchasing pattern, or account safety restriction.',
        merchantGuidance: 'Do not repeatedly re-attempt with identical parameters.',
        retryable: false,
      }),
      customer_notes: 'Automated fraud rule match',
      created_at: new Date(now - 2 * oneDay).toISOString(),
      updated_at: new Date(now - 2 * oneDay + 18000).toISOString(),
      timeline: JSON.stringify([
        {
          id: 'evt_seed_12',
          timestamp: new Date(now - 2 * oneDay).toISOString(),
          type: 'ORDER_CREATED',
          title: 'PayPal Checkout Order Created',
          details: { orderId: '2B19283746501928G', amount: 320.00, currency: 'USD' },
          status: 'info',
        },
        {
          id: 'evt_seed_13',
          timestamp: new Date(now - 2 * oneDay + 18000).toISOString(),
          type: 'PAYMENT_FAILED',
          title: 'Transaction Refused by Risk Filters',
          details: { code: 'TRANSACTION_REFUSED' },
          status: 'error',
        },
      ]),
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO transactions (
      id, paypal_order_id, paypal_capture_id, amount, currency,
      payment_status, paypal_status, payer_email, payer_name, payer_id,
      error_code, error_message, error_details, timeline, customer_notes,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  for (const item of sampleTransactions) {
    insertStmt.run(
      item.id,
      item.paypal_order_id,
      item.paypal_capture_id,
      item.amount,
      item.currency,
      item.payment_status,
      item.paypal_status,
      item.payer_email,
      item.payer_name,
      item.payer_id,
      item.error_code,
      item.error_message,
      item.error_details,
      item.timeline,
      item.customer_notes,
      item.created_at,
      item.updated_at
    );
  }

  logger.success(`Successfully seeded ${sampleTransactions.length} sample transactions!`);
}

// Run immediately if executed directly via node
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

