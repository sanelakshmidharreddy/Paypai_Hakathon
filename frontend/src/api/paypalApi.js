import { apiRequest } from './client';

export const paypalApi = {
  // Get safe public PayPal config (clientId, environment)
  getConfig: () => apiRequest('/paypal/config'),

  // Create a PayPal Order
  createOrder: ({ amount, currency = 'USD', description, customNotes }) =>
    apiRequest('/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, description, customNotes }),
    }),

  // Capture an approved PayPal Order
  captureOrder: (orderId) =>
    apiRequest('/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),

  // Record buyer cancellation
  cancelOrder: (orderId, reason = 'Buyer cancelled checkout') =>
    apiRequest('/paypal/cancel-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, reason }),
    }),

  // Verify server-side order status directly with PayPal
  getOrderStatus: (orderId) => apiRequest(`/paypal/order/${orderId}`),

  // Simulate Sandbox testing scenarios
  simulateScenario: (scenario, amount = 49.99, currency = 'USD') =>
    apiRequest('/paypal/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario, amount, currency }),
    }),
};

