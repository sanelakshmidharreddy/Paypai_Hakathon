/**
 * Deterministic Payment Failure Classification & Evidence Extraction Service
 * Maps PayPal errors and transaction states into concrete evidence categories:
 * - CONFIRMED: Directly established by PayPal API response
 * - POSSIBLE: Reasonable hypotheses supported by domain context, without false certainty
 * - UNKNOWN: Specific details that PayPal does NOT disclose
 */

const OUTCOME_CATEGORIES = {
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  INTERRUPTED: 'INTERRUPTED',
  UNKNOWN: 'UNKNOWN',
};

const RETRY_SAFETY = {
  SAFE_WITH_NEW_METHOD: 'SAFE_WITH_NEW_METHOD', // Safe if customer provides an alternate payment instrument
  DO_NOT_RETRY: 'DO_NOT_RETRY',                 // Duplicate risk or permanent failure (already captured, restricted account)
  VERIFY_FIRST: 'VERIFY_FIRST',                 // Network timeout or pending review: check status before retrying
  SAFE_TO_RETRY: 'SAFE_TO_RETRY',               // Transient glitch or customer cancelled and wants to re-open
  NOT_APPLICABLE: 'NOT_APPLICABLE',             // Transaction is already completed
};

const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',     // Directly backed by an explicit PayPal issue code and debug ID
  MEDIUM: 'MEDIUM', // Inferred from high-level HTTP status or generic response
  LOW: 'LOW',       // Ambiguous error or network timeout without server confirmation
};

/**
 * Deterministic rules catalog for PayPal error issues
 */
const CLASSIFICATION_RULES = {
  INSTRUMENT_DECLINED: {
    classification: 'INSTRUMENT_DECLINED',
    outcome: OUTCOME_CATEGORIES.DECLINED,
    title: 'Payment Method Declined by Issuer',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_WITH_NEW_METHOD,
    retrySafetyReason: 'Do not re-attempt with the exact same card. It is safe to allow the customer to choose another card or pay with PayPal balance.',
    confirmedFacts: [
      'PayPal communicated with the buyer financial institution and received an explicit decline.',
      'The transaction capture was rejected by the issuing bank or payment processor.',
      'No funds were transferred from the customer account.',
    ],
    possibleExplanations: [
      'Insufficient account or credit balance at the time of authorization.',
      'Daily card spend or withdrawal limit exceeded.',
      'Card issuer automated anti-fraud security hold on online commerce transactions.',
      'Card may be temporarily frozen or restricted by the issuing bank.',
    ],
    unknownInformation: [
      'The exact internal bank reason is not shared by the card network due to banking privacy regulations.',
      'Whether the customer is aware of an account restriction cannot be confirmed.',
    ],
    merchantAction: 'Allow the customer to retry checkout using an alternate card or PayPal balance. Do not repeatedly charge the declined card.',
    customerAction: 'Select a different card in your PayPal wallet, or contact your card issuer to authorize online transactions.',
    customerMessage: 'Your card was declined by the issuer. To complete your purchase, please select another payment method or alternate card in your PayPal wallet.',
  },

  CARD_EXPIRED: {
    classification: 'CARD_EXPIRED',
    outcome: OUTCOME_CATEGORIES.DECLINED,
    title: 'Payment Card Expired',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_WITH_NEW_METHOD,
    retrySafetyReason: 'Safe to retry immediately as long as the customer provides an unexpired card.',
    confirmedFacts: [
      'The expiration date associated with the selected payment instrument has passed.',
      'PayPal rejected processing because expired payment instruments cannot be debited.',
    ],
    possibleExplanations: [
      'Customer has an outdated card stored in their PayPal wallet.',
      'Replacement card received from bank has not yet been linked.',
    ],
    unknownInformation: [
      'Whether the customer has an updated card available.',
    ],
    merchantAction: 'Prompt the customer to update their card details in their PayPal wallet or choose an unexpired payment method.',
    customerAction: 'Update your card expiration date or select an active, unexpired payment method.',
    customerMessage: 'The card used for this payment has expired. Please update your card expiration date in PayPal or choose an alternate payment method.',
  },

  INSUFFICIENT_FUNDS: {
    classification: 'INSUFFICIENT_FUNDS',
    outcome: OUTCOME_CATEGORIES.DECLINED,
    title: 'Insufficient Funds',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_WITH_NEW_METHOD,
    retrySafetyReason: 'Do not retry until the funding account is topped up or an alternate payment method is chosen.',
    confirmedFacts: [
      'The funding source has insufficient funds to satisfy the order amount.',
      'The transaction was rejected prior to settlement.',
    ],
    possibleExplanations: [
      'Account balance lower than the checkout total.',
      'Pending holds on the customer bank account reduced available balance.',
    ],
    unknownInformation: [
      'Customer current bank balance or when new funds will settle.',
    ],
    merchantAction: 'Allow the customer to select another payment method or retry after funding their account.',
    customerAction: 'Use another payment method or add funds to your account before trying again.',
    customerMessage: 'There were insufficient funds in the selected account to complete this order. Please select an alternate payment method.',
  },

  PAYER_ACTION_REQUIRED: {
    classification: 'PAYER_ACTION_REQUIRED',
    outcome: OUTCOME_CATEGORIES.INTERRUPTED,
    title: 'Customer Action or Strong Authentication Required',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_TO_RETRY,
    retrySafetyReason: 'Safe to retry: Customer must complete 3D Secure, SMS OTP, or bank app biometric confirmation.',
    confirmedFacts: [
      'The payment processor or regulatory framework (such as PSD2 Strong Customer Authentication) requires customer verification.',
      'The transaction was not finalized because authentication was incomplete.',
    ],
    possibleExplanations: [
      'Customer did not finish the 3D Secure verification step in time.',
      'Customer closed the bank SMS OTP prompt prematurely.',
      'Mobile banking app notification was missed.',
    ],
    unknownInformation: [
      'Whether the customer received the bank SMS code or experienced technical issues with their mobile authentication app.',
    ],
    merchantAction: 'Provide an active link or prompt directing the customer to complete the verification step with their bank.',
    customerAction: 'Follow the on-screen instructions in the PayPal popup or your mobile banking app to authenticate the payment.',
    customerMessage: 'Your bank requires additional authentication (such as a 3D Secure one-time code) to approve this payment. Please complete the verification prompt.',
  },

  ORDER_NOT_APPROVED: {
    classification: 'ORDER_NOT_APPROVED',
    outcome: OUTCOME_CATEGORIES.INTERRUPTED,
    title: 'Order Not Approved by Buyer',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_TO_RETRY,
    retrySafetyReason: 'Safe to re-open checkout. The order cannot be captured until the buyer clicks approve in PayPal.',
    confirmedFacts: [
      'A capture request was attempted, but the PayPal Order is in CREATED or SAVED state.',
      'The buyer did not confirm and approve the order in the PayPal payment window.',
    ],
    possibleExplanations: [
      'Buyer accidentally closed the popup window before confirming.',
      'Backend capture was invoked prematurely before the onApprove event was delivered.',
      'Buyer hesitated or navigated away from the payment screen.',
    ],
    unknownInformation: [
      'Whether the customer intended to abort or was interrupted by a browser issue.',
    ],
    merchantAction: 'Ensure capture is only called after the client onApprove callback completes. Prompt customer to finish the approval flow.',
    customerAction: 'Return to checkout and click "Pay Now" or "Agree & Continue" inside the PayPal window.',
    customerMessage: 'Your checkout session was not finalized. Please return to complete and approve your payment.',
  },

  ORDER_ALREADY_CAPTURED: {
    classification: 'ORDER_ALREADY_CAPTURED',
    outcome: OUTCOME_CATEGORIES.COMPLETED,
    title: 'Order Already Captured (Duplicate Protection)',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'CRITICAL: DO NOT RETRY. The payment has already succeeded. Retrying risks double-billing the customer.',
    confirmedFacts: [
      'This PayPal order has already been successfully captured.',
      'Funds have already been collected for this specific order ID.',
      'The server prevented a duplicate charge attempt.',
    ],
    possibleExplanations: [
      'Customer double-clicked the pay button.',
      'Network retry triggered duplicate requests to the capture endpoint.',
    ],
    unknownInformation: [
      'None. Order success is fully established.',
    ],
    merchantAction: 'No payment action needed. Mark order as paid in fulfillment system and check the existing capture ID.',
    customerAction: 'No action needed. Your payment was already received.',
    customerMessage: 'Your payment was successfully received and captured. No further action is required.',
  },

  ORDER_ALREADY_AUTHORIZED: {
    classification: 'ORDER_ALREADY_AUTHORIZED',
    outcome: OUTCOME_CATEGORIES.PENDING,
    title: 'Order Already Authorized',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.VERIFY_FIRST,
    retrySafetyReason: 'Do not create a new order. Capture the existing authorization instead.',
    confirmedFacts: [
      'An authorization hold already exists on the buyer funding source for this order.',
    ],
    possibleExplanations: [
      'The integration was configured for separate authorization and delayed capture.',
    ],
    unknownInformation: [
      'None regarding authorization state.',
    ],
    merchantAction: 'Invoke capture on the existing authorization ID rather than creating a new checkout order.',
    customerAction: 'No action needed by customer; awaiting merchant capture.',
    customerMessage: 'Your payment has been pre-authorized and will be finalized shortly.',
  },

  PAYEE_ACCOUNT_RESTRICTED: {
    classification: 'PAYEE_ACCOUNT_RESTRICTED',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'Merchant Account Restricted by PayPal',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'Do not retry until merchant account restrictions are resolved with PayPal.',
    confirmedFacts: [
      'PayPal blocked transaction receipt due to a restriction on the merchant (payee) account.',
      'The failure was caused on the seller account side, not by the customer.',
    ],
    possibleExplanations: [
      'Merchant account needs identity or tax verification documents.',
      'Merchant account has receiving limits or compliance holds.',
      'Currency receiving settings are not enabled.',
    ],
    unknownInformation: [
      'Specific regulatory or compliance requirement triggering the restriction.',
    ],
    merchantAction: 'Log in to your PayPal Business Dashboard immediately and check Resolution Center / Account Alerts, or contact PayPal Merchant Support.',
    customerAction: 'Please contact the merchant support team or try an alternative checkout method if available.',
    customerMessage: 'We are temporarily unable to process payments via PayPal. Please contact our support team or try another payment method.',
  },

  MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED: {
    classification: 'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'Max Payment Attempts Exceeded',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'This specific PayPal order ID is locked. A new checkout session must be created.',
    confirmedFacts: [
      'Too many failed capture attempts were made against this specific PayPal order ID.',
      'PayPal rejected further attempts on this order ID to protect security.',
    ],
    possibleExplanations: [
      'Customer repeatedly entered incorrect card information or retried declined cards.',
    ],
    unknownInformation: [
      'Customer intent during the repeated attempts.',
    ],
    merchantAction: 'Create a brand new checkout order. Do not reuse the exhausted order ID.',
    customerAction: 'Start a fresh checkout session with an updated payment method.',
    customerMessage: 'The maximum payment attempts for this checkout session was reached. Please start a fresh checkout.',
  },

  INTERNAL_SERVER_ERROR: {
    classification: 'INTERNAL_SERVER_ERROR',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'PayPal Internal Server Error',
    confidenceLevel: CONFIDENCE_LEVELS.MEDIUM,
    retrySafety: RETRY_SAFETY.VERIFY_FIRST,
    retrySafetyReason: 'Verify transaction status via GET /v2/checkout/orders/{id} before attempting any retry.',
    confirmedFacts: [
      'PayPal returned an HTTP 500 or 503 Internal Server Error response.',
      'The issue originated on PayPal infrastructure, not from merchant code or customer bank.',
    ],
    possibleExplanations: [
      'Temporary outage, database failover, or maintenance window within PayPal Sandbox/production.',
    ],
    unknownInformation: [
      'Whether the order reached state changes before the error was thrown.',
    ],
    merchantAction: 'Check PayPal status page, verify order status using the Refresh button, and retry after a brief delay if uncompleted.',
    customerAction: 'Please wait a moment and try again. Our payment provider experienced a temporary server issue.',
    customerMessage: 'A temporary connection issue occurred with PayPal. Please wait a moment and try your checkout again.',
  },

  SERVICE_UNAVAILABLE: {
    classification: 'SERVICE_UNAVAILABLE',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'PayPal Service Unavailable',
    confidenceLevel: CONFIDENCE_LEVELS.MEDIUM,
    retrySafety: RETRY_SAFETY.VERIFY_FIRST,
    retrySafetyReason: 'Wait for PayPal service availability. Check order status before re-attempting.',
    confirmedFacts: [
      'PayPal API returned HTTP 503 Service Unavailable.',
      'PayPal services were temporarily unable to process the request.',
    ],
    possibleExplanations: [
      'PayPal maintenance or transient network congestion.',
    ],
    unknownInformation: [
      'Duration of the downtime.',
    ],
    merchantAction: 'Verify order status with the Refresh button before retrying.',
    customerAction: 'Please try again in a few minutes.',
    customerMessage: 'PayPal is temporarily undergoing maintenance. Please try again shortly.',
  },

  AUTHENTICATION_FAILURE: {
    classification: 'AUTHENTICATION_FAILURE',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'PayPal API Authentication Failure',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'Fix backend configuration first. Client ID or Secret is invalid.',
    confirmedFacts: [
      'PayPal rejected OAuth 2.0 credentials (HTTP 401 Unauthorized).',
      'The client credentials in backend configuration are invalid, revoked, or mismatched.',
    ],
    possibleExplanations: [
      'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET contains a typo.',
      'Live credentials were used against the Sandbox base URL, or vice versa.',
    ],
    unknownInformation: [
      'Customer had no role in this server configuration failure.',
    ],
    merchantAction: 'Verify PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env against your PayPal Developer Dashboard.',
    customerAction: 'Please contact the merchant support team.',
    customerMessage: 'Our payment system is undergoing configuration updates. Please contact customer support.',
  },

  PERMISSION_DENIED: {
    classification: 'PERMISSION_DENIED',
    outcome: OUTCOME_CATEGORIES.FAILED,
    title: 'PayPal API Permission Denied',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'Verify API permissions on the PayPal application in the developer portal.',
    confirmedFacts: [
      'PayPal returned HTTP 403 Forbidden.',
      'The API caller does not have permission to execute this operation.',
    ],
    possibleExplanations: [
      'App permissions or merchant capability not enabled in the PayPal Developer Dashboard.',
    ],
    unknownInformation: [
      'Specific permission scope missing.',
    ],
    merchantAction: 'Review app settings in PayPal Developer Dashboard under App Settings & Permissions.',
    customerAction: 'Please contact merchant support.',
    customerMessage: 'A permissions issue prevented payment processing. Please contact support.',
  },

  NETWORK_TIMEOUT: {
    classification: 'NETWORK_TIMEOUT',
    outcome: OUTCOME_CATEGORIES.INTERRUPTED,
    title: 'Network Timeout / Connection Interrupted',
    confidenceLevel: CONFIDENCE_LEVELS.LOW,
    retrySafety: RETRY_SAFETY.VERIFY_FIRST,
    retrySafetyReason: 'DO NOT BLINDLY RETRY. Query PayPal API to check if the transaction completed before re-attempting.',
    confirmedFacts: [
      'The connection to PayPal timed out or network connection was dropped before receiving a response.',
      'The true server-side state of the order cannot be determined without a status query.',
    ],
    possibleExplanations: [
      'Temporary network packet loss, DNS resolution delay, or proxy latency.',
      'PayPal may have actually processed the capture, but the response was cut off.',
    ],
    unknownInformation: [
      'Whether the payment succeeded or failed on PayPal servers.',
    ],
    merchantAction: 'Use the "Refresh Status" feature to query PayPal GET /v2/checkout/orders/{id}. Only retry if PayPal confirms the order was not captured.',
    customerAction: 'Please check your PayPal account or email to see if you received a confirmation before attempting to pay again.',
    customerMessage: 'A network timeout occurred while confirming your payment. We are verifying the status to prevent duplicate charges.',
  },

  BUYER_CANCELLED: {
    classification: 'BUYER_CANCELLED',
    outcome: OUTCOME_CATEGORIES.CANCELLED,
    title: 'Checkout Cancelled by Buyer',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.SAFE_TO_RETRY,
    retrySafetyReason: 'Safe to retry. No financial attempt was rejected; buyer simply exited the checkout flow.',
    confirmedFacts: [
      'The buyer explicitly closed the PayPal checkout popup or clicked "Cancel and return to merchant".',
      'No card or payment method was declined.',
      'No funds were collected.',
    ],
    possibleExplanations: [
      'Customer decided against completing the purchase.',
      'Customer had questions about taxes, shipping costs, or return policies.',
      'Customer wanted to review items in their cart.',
    ],
    unknownInformation: [
      'Customer personal reason for exiting checkout.',
    ],
    merchantAction: 'This is an abandoned checkout rather than a payment decline. Consider an automated abandoned cart email with support assistance.',
    customerAction: 'If you still wish to purchase, you can return to your cart and resume checkout anytime.',
    customerMessage: 'You cancelled your PayPal checkout session. Your items are saved in your cart if you wish to complete your order.',
  },

  PENDING_REVIEW: {
    classification: 'PENDING_REVIEW',
    outcome: OUTCOME_CATEGORIES.PENDING,
    title: 'Payment Pending Settlement or Review',
    confidenceLevel: CONFIDENCE_LEVELS.HIGH,
    retrySafety: RETRY_SAFETY.DO_NOT_RETRY,
    retrySafetyReason: 'DO NOT RETRY. Payment was accepted by PayPal and is awaiting banking clearance. Do not double-charge the customer.',
    confirmedFacts: [
      'The payment capture status is PENDING.',
      'Funds have not yet settled into the merchant account.',
    ],
    possibleExplanations: [
      'Buyer paid via electronic bank transfer (eCheck) which takes 3-5 business days to clear.',
      'Payment is held for standard anti-fraud compliance or risk review by PayPal.',
      'Merchant settings require manual approval for international or unconfirmed addresses.',
    ],
    unknownInformation: [
      'Exact banking clearance date (typically 2 to 5 business days for eChecks).',
    ],
    merchantAction: 'Do not fulfill physical merchandise or issue digital licenses until PayPal updates status to COMPLETED. Use Refresh to check for clearance.',
    customerAction: 'No further action required. Your bank is transferring the funds to PayPal.',
    customerMessage: 'Your payment is currently pending clearance with your bank. You will receive an email confirmation as soon as funds clear.',
  },

  UNKNOWN_ERROR: {
    classification: 'UNKNOWN_ERROR',
    outcome: OUTCOME_CATEGORIES.UNKNOWN,
    title: 'Unclassified PayPal Error',
    confidenceLevel: CONFIDENCE_LEVELS.LOW,
    retrySafety: RETRY_SAFETY.VERIFY_FIRST,
    retrySafetyReason: 'Inspect transaction details and verify order status before deciding next steps.',
    confirmedFacts: [
      'The transaction could not be completed with the provided information.',
    ],
    possibleExplanations: [
      'An undocumented error response or unusual PayPal Sandbox edge condition.',
    ],
    unknownInformation: [
      'The exact root cause is not recognized by standard error catalogs.',
    ],
    merchantAction: 'Inspect the raw PayPal response payload in transaction details and query PayPal status.',
    customerAction: 'Please try again or contact customer support for assistance.',
    customerMessage: 'An unexpected issue occurred while processing your payment. Please try again or contact support.',
  },
};

/**
 * Classifies a transaction deterministically based on its fields and PayPal payload
 */
function classifyTransaction(transaction) {
  if (!transaction) {
    return CLASSIFICATION_RULES.UNKNOWN_ERROR;
  }

  const {
    payment_status,
    paypal_status,
    error_code,
    error_message,
    raw_paypal_response,
  } = transaction;

  // 1. Check if completed successfully
  if (payment_status === 'COMPLETED' || paypal_status === 'COMPLETED') {
    return {
      classification: 'PAYMENT_COMPLETED',
      outcome: OUTCOME_CATEGORIES.COMPLETED,
      title: 'Payment Successfully Completed',
      confidenceLevel: CONFIDENCE_LEVELS.HIGH,
      retrySafety: RETRY_SAFETY.NOT_APPLICABLE,
      retrySafetyReason: 'Payment is already finalized. No retry needed.',
      confirmedFacts: [
        `Order was successfully authorized and captured for ${transaction.currency} ${transaction.amount}.`,
        transaction.paypal_capture_id ? `PayPal Capture ID: ${transaction.paypal_capture_id}.` : 'Funds collected.',
      ],
      possibleExplanations: [],
      unknownInformation: [],
      merchantAction: 'Proceed with order fulfillment.',
      customerAction: 'None. Transaction is complete.',
      customerMessage: 'Your payment was received successfully.',
    };
  }

  // 2. Check if pending settlement (eCheck or review)
  if (payment_status === 'PENDING' || paypal_status === 'PENDING') {
    return CLASSIFICATION_RULES.PENDING_REVIEW;
  }

  // 3. Check for buyer cancellation
  if (payment_status === 'CANCELLED' || error_code === 'BUYER_CANCELLED') {
    return CLASSIFICATION_RULES.BUYER_CANCELLED;
  }

  // 4. Match specific error codes from error_code or raw PayPal details
  let detectedCode = error_code;

  if (!detectedCode && raw_paypal_response?.details && Array.isArray(raw_paypal_response.details)) {
    const detail = raw_paypal_response.details.find((d) => d.issue);
    if (detail) detectedCode = detail.issue;
  }

  if (!detectedCode && raw_paypal_response?.name) {
    detectedCode = raw_paypal_response.name;
  }

  // Check matching rule
  if (detectedCode && CLASSIFICATION_RULES[detectedCode]) {
    return CLASSIFICATION_RULES[detectedCode];
  }

  // Fuzzy check for card expiration in message
  if (error_message && /expired/i.test(error_message)) {
    return CLASSIFICATION_RULES.CARD_EXPIRED;
  }

  // Fuzzy check for insufficient funds in message
  if (error_message && /insufficient.*funds/i.test(error_message)) {
    return CLASSIFICATION_RULES.INSUFFICIENT_FUNDS;
  }

  // Check for timeout in error code or message
  if ((error_code && /timeout/i.test(error_code)) || (error_message && /timeout/i.test(error_message))) {
    return CLASSIFICATION_RULES.NETWORK_TIMEOUT;
  }

  // Check for authentication error
  if (error_code === 'PAYPAL_NOT_CONFIGURED' || error_code === 'INVALID_CLIENT' || (error_message && /unauthorized|client credentials/i.test(error_message))) {
    return CLASSIFICATION_RULES.AUTHENTICATION_FAILURE;
  }

  // Default fallback if declined
  if (payment_status === 'DECLINED') {
    return CLASSIFICATION_RULES.INSTRUMENT_DECLINED;
  }

  return CLASSIFICATION_RULES.UNKNOWN_ERROR;
}

module.exports = {
  OUTCOME_CATEGORIES,
  RETRY_SAFETY,
  CONFIDENCE_LEVELS,
  CLASSIFICATION_RULES,
  classifyTransaction,
};

