/**
 * Lightweight API Client for interacting with the backend API
 */

const API_BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
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

