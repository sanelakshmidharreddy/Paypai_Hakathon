/**
 * Lightweight API Client for interacting with the backend API
 * Supports both local dev proxy and production Vercel/Render deployments
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiRequest(endpoint, options = {}, retries = 1) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const rawText = await response.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { text: rawText };
    }

    if (!response.ok) {
      // Auto-retry once on Render cold-start / gateway warming (502, 503, 504)
      if (retries > 0 && [502, 503, 504].includes(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return apiRequest(endpoint, options, retries - 1);
      }

      const isHtml = typeof data.text === 'string' && (data.text.includes('<!DOCTYPE') || data.text.includes('<html'));
      const friendlyMessage = isHtml
        ? 'Backend service is starting up on Render. Please wait a moment and click Refresh.'
        : (data.error || data.message || `Request failed with status ${response.status}`);

      const error = new Error(friendlyMessage);
      error.status = response.status;
      error.data = data;
      error.code = data.code;
      error.interpreted = data.interpreted;
      throw error;
    }

    return data;
  } catch (err) {
    if (retries > 0 && err.name === 'TypeError') {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return apiRequest(endpoint, options, retries - 1);
    }
    console.error(`API Error on [${options.method || 'GET'} ${url}]:`, err);
    throw err;
  }
}
