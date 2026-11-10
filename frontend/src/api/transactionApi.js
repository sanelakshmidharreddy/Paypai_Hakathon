import { apiRequest } from './client';

export const transactionApi = {
  // List transactions with filtering & pagination
  getTransactions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/transactions${queryString}`);
  },

  // Get full transaction details (including latest analysis and history)
  getTransactionDetails: (id) => apiRequest(`/transactions/${id}`),

  // Trigger AI Payment Failure & Recovery Analysis (Prompt 2)
  analyzeTransaction: (id) =>
    apiRequest(`/transactions/${id}/analyze`, {
      method: 'POST',
    }),

  // Get AI Analysis History for a transaction (Prompt 2)
  getAnalysisHistory: (id) => apiRequest(`/transactions/${id}/analysis`),

  // Live status refresh against PayPal REST API (Prompt 2)
  refreshStatus: (id) =>
    apiRequest(`/transactions/${id}/refresh`, {
      method: 'POST',
    }),

  // Backwards-compatible alias
  syncWithPayPal: (id) =>
    apiRequest(`/transactions/${id}/refresh`, {
      method: 'POST',
    }),
};
