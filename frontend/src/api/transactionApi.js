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

  // Get full transaction details
  getTransactionDetails: (id) => apiRequest(`/transactions/${id}`),

  // Live sync status with PayPal REST API
  syncWithPayPal: (id) =>
    apiRequest(`/transactions/${id}/sync`, {
      method: 'POST',
    }),
};
