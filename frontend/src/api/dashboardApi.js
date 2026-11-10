import { apiRequest } from './client';

export const dashboardApi = {
  // Aggregate overview metrics with optional filters
  getStats: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && value !== 'ALL') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/dashboard/stats${queryString}`);
  },

  // Timeline activity and top failure categories with date filters
  getActivity: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/dashboard/activity${queryString}`);
  },

  // System & PayPal sandbox connection health
  getHealth: () => apiRequest('/health'),
};
