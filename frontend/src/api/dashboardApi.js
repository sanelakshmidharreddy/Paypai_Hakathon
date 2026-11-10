import { apiRequest } from './client';

export const dashboardApi = {
  // Aggregate overview metrics
  getStats: () => apiRequest('/dashboard/stats'),

  // Timeline activity and top failure categories
  getActivity: () => apiRequest('/dashboard/activity'),

  // System & PayPal sandbox connection health
  getHealth: () => apiRequest('/health'),
};
