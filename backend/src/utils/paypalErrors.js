/**
 * PayPal Error Catalog & Human-Readable Interpreter
 * Maps raw PayPal error codes, issues, and HTTP details to merchant-friendly descriptions.
 */

const PAYPAL_ERROR_CATALOG = {
  INSTRUMENT_DECLINED: {
    code: 'INSTRUMENT_DECLINED',
    title: 'Payment Instrument Declined',
    description: 'The buyer selected card or bank account was declined by the issuing financial institution.',
    cause: 'Insufficient balance, expiration, daily transaction limits, or bank anti-fraud security hold.',
    merchantGuidance: 'Advise customer to choose a different card or pay directly via PayPal balance/linked bank account.',
    customerFriendlyMessage: 'Your card or payment instrument was declined by the issuer. Please select an alternate card or payment method in your PayPal wallet.',
    retryable: true,
  },
  PAYER_ACTION_REQUIRED: {
    code: 'PAYER_ACTION_REQUIRED',
    title: 'Payer Action Required (3D Secure / Authentication)',
    description: 'The buyer must complete an additional verification step with PayPal or their card issuer (such as 3D Secure SMS OTP or identity confirmation).',
    cause: 'Strong Customer Authentication (SCA) or two-factor verification required by European PSD2 / card issuer.',
    merchantGuidance: 'Redirect buyer back to the PayPal approval flow or instruct them to complete mobile bank verification.',
    customerFriendlyMessage: 'Additional authentication is required by your bank to approve this purchase. Please follow the prompt to authenticate.',
    retryable: true,
  },
  TRANSACTION_REFUSED: {
    code: 'TRANSACTION_REFUSED',
    title: 'Transaction Refused by PayPal Risk Engine',
    description: 'PayPal internal risk model declined to process the transaction.',
    cause: 'Suspicious IP address, unusual purchasing pattern, or account safety restriction.',
    merchantGuidance: 'Do not repeatedly re-attempt with the exact same details. Customer should contact PayPal customer service or use another funding source.',
    customerFriendlyMessage: 'This transaction could not be processed by PayPal. Please choose another payment method or contact PayPal support.',
    retryable: false,
  },
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    title: 'Insufficient Funds',
    description: 'The funding source has insufficient funds to cover the transaction amount.',
    cause: 'Account balance lower than order amount.',
    merchantGuidance: 'Suggest buyer top up their balance or pick another card.',
    customerFriendlyMessage: 'There were insufficient funds in the selected account. Please use another card or add funds.',
    retryable: true,
  },
  ORDER_ALREADY_CAPTURED: {
    code: 'ORDER_ALREADY_CAPTURED',
    title: 'Order Already Captured',
    description: 'This PayPal Order ID has already been successfully captured.',
    cause: 'Duplicate payment request received by the server. Double billing was safely prevented.',
    merchantGuidance: 'No action needed; the payment has already succeeded. Check the existing completed transaction record.',
    customerFriendlyMessage: 'This order has already been captured and processed successfully.',
    retryable: false,
  },
  ORDER_NOT_APPROVED: {
    code: 'ORDER_NOT_APPROVED',
    title: 'Order Not Approved by Buyer',
    description: 'Attempted to capture an order before the buyer confirmed and approved it on PayPal.',
    cause: 'Buyer closed the checkout popup prematurely, or network lag caused early capture attempt.',
    merchantGuidance: 'Ensure capture is only triggered from the onApprove client callback.',
    customerFriendlyMessage: 'The payment was not confirmed by the buyer.',
    retryable: true,
  },
  CARD_TYPE_UNSUPPORTED: {
    code: 'CARD_TYPE_UNSUPPORTED',
    title: 'Card Type Unsupported',
    description: 'The card brand or type is not accepted for this merchant account or currency.',
    cause: 'Merchant account limitations or regional restrictions on specific card brands.',
    merchantGuidance: 'Check accepted currencies and credit card brands in PayPal account settings.',
    customerFriendlyMessage: 'This card brand is not supported for this currency. Please use a Visa, Mastercard, or PayPal balance.',
    retryable: true,
  },
  MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED: {
    code: 'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED',
    title: 'Max Payment Attempts Exceeded',
    description: 'The buyer made too many unsuccessful payment attempts for this order.',
    cause: 'Repeated declines or bad attempts.',
    merchantGuidance: 'Create a new order instead of retrying this order ID.',
    customerFriendlyMessage: 'Too many attempts were made for this checkout. Please start a new checkout session.',
    retryable: false,
  },
  BUYER_CANCELLED: {
    code: 'BUYER_CANCELLED',
    title: 'Checkout Cancelled by Buyer',
    description: 'The buyer explicitly closed or cancelled the PayPal payment window without completing the purchase.',
    cause: 'Customer decided not to purchase, encountered unexpected checkout fees, or left the page.',
    merchantGuidance: 'Consider sending an abandoned cart reminder or offering assistance via support.',
    customerFriendlyMessage: 'You cancelled the PayPal checkout session.',
    retryable: true,
  },
  GENERIC_ERROR: {
    code: 'PAYPAL_API_ERROR',
    title: 'PayPal Processing Error',
    description: 'An unexpected response was received from PayPal Sandbox API.',
    cause: 'Temporary sandbox connectivity glitch or configuration discrepancy.',
    merchantGuidance: 'Check API credentials and inspect raw PayPal response payload.',
    customerFriendlyMessage: 'A temporary error occurred while processing your payment. Please try again in a few moments.',
    retryable: true,
  },
};

/**
 * Extracts normalized error details from a raw PayPal REST API error response.
 */
function interpretPayPalError(rawError) {
  let issueCode = 'GENERIC_ERROR';
  let message = rawError?.message || 'An error occurred during payment processing.';
  let details = [];

  // PayPal REST API error responses usually have structure:
  // { name: "UNPROCESSABLE_ENTITY", message: "...", details: [{ issue: "INSTRUMENT_DECLINED", description: "..." }] }
  if (rawError?.details && Array.isArray(rawError.details) && rawError.details.length > 0) {
    const firstDetail = rawError.details[0];
    if (firstDetail.issue) {
      issueCode = firstDetail.issue;
      message = firstDetail.description || rawError.message || message;
    }
    details = rawError.details;
  } else if (rawError?.name) {
    if (PAYPAL_ERROR_CATALOG[rawError.name]) {
      issueCode = rawError.name;
    }
  }

  const catalogEntry = PAYPAL_ERROR_CATALOG[issueCode] || {
    ...PAYPAL_ERROR_CATALOG.GENERIC_ERROR,
    code: issueCode,
    description: message,
  };

  return {
    code: catalogEntry.code,
    title: catalogEntry.title,
    description: catalogEntry.description,
    cause: catalogEntry.cause,
    merchantGuidance: catalogEntry.merchantGuidance,
    customerFriendlyMessage: catalogEntry.customerFriendlyMessage,
    retryable: catalogEntry.retryable,
    rawName: rawError?.name || null,
    rawMessage: rawError?.message || message,
    details: details,
    debugId: rawError?.debug_id || null,
  };
}

module.exports = {
  PAYPAL_ERROR_CATALOG,
  interpretPayPalError,
};

