/**
 * Lightweight API Client for interacting with the backend API
 * Supports both local dev proxy and production Vercel/Render deployments
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiRequest(endpoint, options = {}) {
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
    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }

    if (!response.ok) {
      const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.code = data.code;
      error.interpreted = data.interpreted;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${url}]:`, err);
    throw err;
  }
}
