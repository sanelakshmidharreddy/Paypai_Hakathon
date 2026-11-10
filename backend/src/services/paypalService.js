const config = require('../config/env');
const logger = require('../utils/logger');
const { interpretPayPalError } = require('../utils/paypalErrors');

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Generate or return cached PayPal OAuth 2.0 Access Token
 */
async function getAccessToken() {
  const { clientId, clientSecret, baseUrl } = config.paypal;

  if (!clientId || !clientSecret) {
    const error = new Error('PayPal Sandbox credentials missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend .env.');
    error.code = 'PAYPAL_NOT_CONFIGURED';
    throw error;
  }

  // Reuse token if still valid (with 60-second safety buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  logger.paypal(`Fetching OAuth 2.0 token from ${baseUrl}/v1/oauth2/token...`);

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { text: await response.text() };
    }
    logger.error('Failed to obtain PayPal access token:', errorData);
    const error = new Error(errorData.error_description || errorData.message || 'PayPal authentication failed');
    error.status = response.status;
    error.details = errorData;
    throw error;
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  logger.success(`PayPal OAuth 2.0 access token obtained successfully. Expires in ${data.expires_in}s.`);
  return cachedToken;
}

/**
 * Create a PayPal Order with intent CAPTURE
 */
async function createOrder({ amount, currency = 'USD', referenceId = null, customId = null, description = 'Online Merchant Purchase' }) {
  const token = await getAccessToken();
  const { baseUrl } = config.paypal;

  const formattedAmount = parseFloat(amount).toFixed(2);
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: referenceId || `ref_${Date.now()}`,
        description: description,
        custom_id: customId || undefined,
        amount: {
          currency_code: currency.toUpperCase(),
          value: formattedAmount,
        },
      },
    ],
    application_context: {
      brand_name: 'Intelligent Recovery Merchant',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
    },
  };

  logger.paypal(`Creating order for ${currency} ${formattedAmount}...`);

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    logger.error(`PayPal order creation failed [HTTP ${response.status}]:`, responseData);
    const error = new Error(responseData.message || 'PayPal Order creation failed');
    error.status = response.status;
    error.details = responseData;
    error.interpreted = interpretPayPalError(responseData);
    throw error;
  }

  logger.success(`PayPal order created successfully: ${responseData.id} (Status: ${responseData.status})`);
  return responseData;
}

/**
 * Capture an approved PayPal order
 * Handles 200/201 success and gracefully catches 422 declines / instrument issues
 */
async function captureOrder(orderId) {
  const token = await getAccessToken();
  const { baseUrl } = config.paypal;

  logger.paypal(`Attempting capture for order: ${orderId}...`);

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({}),
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (err) {
    logger.error('Failed to parse PayPal capture response as JSON', err);
    throw new Error('Invalid response received from PayPal capture endpoint.');
  }

  // Handle successful capture (200 OK or 201 Created)
  if (response.ok) {
    logger.success(`PayPal order ${orderId} captured with status: ${responseData.status}`);
    return {
      success: true,
      statusCode: response.status,
      data: responseData,
    };
  }

  // Handle expected PayPal capture failure (e.g., 422 INSTRUMENT_DECLINED, TRANSACTION_REFUSED)
  logger.warn(`PayPal capture declined or unprocessable [HTTP ${response.status}]:`, responseData);
  const interpreted = interpretPayPalError(responseData);

  return {
    success: false,
    statusCode: response.status,
    data: responseData,
    interpreted,
  };
}

/**
 * Query official PayPal status for an order
 */
async function getOrderDetails(orderId) {
  const token = await getAccessToken();
  const { baseUrl } = config.paypal;

  logger.paypal(`Fetching order details for: ${orderId}...`);

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const responseData = await response.json();

  if (!response.ok) {
    logger.error(`Failed to fetch order details [HTTP ${response.status}]:`, responseData);
    const error = new Error(responseData.message || 'Failed to retrieve order details from PayPal');
    error.status = response.status;
    error.details = responseData;
    throw error;
  }

  return responseData;
}

/**
 * Test credentials and sandbox connectivity
 */
async function testConnection() {
  try {
    const token = await getAccessToken();
    return {
      connected: true,
      environment: 'sandbox',
      baseUrl: config.paypal.baseUrl,
      hasToken: Boolean(token),
      message: 'Successfully authenticated with PayPal Sandbox OAuth 2.0 API.',
    };
  } catch (err) {
    return {
      connected: false,
      environment: 'sandbox',
      baseUrl: config.paypal.baseUrl,
      error: err.message,
      errorCode: err.code || 'AUTH_FAILURE',
      message: err.message || 'Unable to connect to PayPal Sandbox API.',
    };
  }
}

module.exports = {
  getAccessToken,
  createOrder,
  captureOrder,
  getOrderDetails,
  testConnection,
};

