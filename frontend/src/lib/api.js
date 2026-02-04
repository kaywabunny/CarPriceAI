/**
 * API Layer for Car Pricing Tool
 *
 * This file calls the real FastAPI backend.
 * All pricing logic lives in Python – the frontend only sends inputs and renders results.
 */

import { getSessionId } from './analytics';
import { CAR_DATA } from './carData';

// Base URL – must come from REACT_APP_API_BASE_URL
// In development we default to http://localhost:8000
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

if (!API_BASE_URL) {
  // Fail loudly in non‑development if base URL is missing
  // This will surface immediately during usage.
  // eslint-disable-next-line no-console
  console.error(
    'REACT_APP_API_BASE_URL is not set. Backend calls will fail until this is configured.'
  );
}

/**
 * Helper to get headers with session ID
 */
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-session-id': getSessionId(),
});

/**
 * Helper to perform a JSON fetch and throw on any non‑OK response.
 */
const jsonFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      
      // Try to parse error message from response
      try {
        const errorData = await res.json();
        message = errorData.detail || errorData.message || message;
      } catch {
        // If not JSON, try text
        const text = await res.text().catch(() => '');
        if (text) message = text;
      }
      
      // Provide user-friendly messages for common errors
      if (res.status === 404) {
        message = `Endpoint not found. Please check that the backend is running at ${url}`;
      } else if (res.status === 503) {
        message = 'Price model is not loaded. Please contact support.';
      } else if (res.status === 400) {
        // For insufficient data errors, show the message directly without "Invalid request:" prefix
        if (message.includes('Insufficient market data') || message.includes('Not enough cohort data')) {
          // Keep the message as-is (it's already user-friendly)
        } else {
          message = `Invalid request: ${message}`;
        }
      }
      
      throw new Error(message);
    }

    return res.json();
  } catch (err) {
    // Handle network errors (CORS, connection refused, etc.)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend at ${url}. Please ensure the backend is running.`
      );
    }
    throw err;
  }
};

/**
 * Map UI form data to backend PriceRequest payload.
 * UI shape: { make, model, year, mileage_km_num, trim? }
 * Backend expects: { make, model, year, mileage_km_num, submodel?, gear?, color? }
 */
const toPriceRequest = (request) => ({
  make: request.make,
  model: request.model,
  year: request.year,
  mileage_km_num: request.mileage_km_num,
  submodel: request.trim || null,
  gear: request.gear || null,
  color: request.color || null,
});

/**
 * Get price prediction
 * Backend: POST /price  (entry.PriceRequest -> predict_price)
 */
export const predictPrice = async (request) => {
  const payload = toPriceRequest(request);
  const data = await jsonFetch(`${API_BASE_URL}/price`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return data;
};

/**
 * Get price graph image (PNG)
 * Backend: POST /price_graph  (same body as /price)
 */
export const getPriceGraph = async (request) => {
  const payload = toPriceRequest(request);

  const res = await fetch(`${API_BASE_URL}/price_graph`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const message = text || res.statusText || 'Failed to get price graph';
    throw new Error(message);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

/**
 * Get depreciation forecast
 * Backend: POST /depreciation  (DepreciationItem)
 * Request: { make, model, year, mileage_km_num, horizon_years, trim?, market_price? }
 */
export const getDepreciation = async (request) => {
  const payload = {
    make: request.make,
    model: request.model,
    year: request.year,
    mileage_km_num: request.mileage_km_num,
    submodel: request.trim || null,
    horizon_years: request.horizon_years,
    market_price: request.market_price || null,  // Pass market price (yellow) to align baseline
  };

  const data = await jsonFetch(`${API_BASE_URL}/depreciation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  return data;
};

// ============================================================
// Analytics + Health (server.py, /api prefix)
// ============================================================

/**
 * Send analytics event to backend
 * Backend: POST /api/analytics/event
 */
export const sendAnalyticsEvent = async (event) => {
  const payload = {
    event: event.event,
    timestamp: event.timestamp,
    sessionId: event.sessionId,
    props: event.props || {},
  };

  return jsonFetch(`${API_BASE_URL}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

/**
 * Health check for analytics / DB
 * Backend: GET /api/health
 */
export const apiHealthCheck = async () => {
  return jsonFetch(`${API_BASE_URL}/api/health`, {
    headers: getHeaders(),
  });
};

/**
 * Price model health
 * Backend: GET /health/price_model
 */
export const priceModelHealthCheck = async () => {
  return jsonFetch(`${API_BASE_URL}/health/price_model`, {
    headers: getHeaders(),
  });
};

/**
 * Basic root status
 * Backend: GET /api/status (list) and POST /api/status (create)
 */
export const getStatusChecks = async () => {
  return jsonFetch(`${API_BASE_URL}/api/status`, {
    headers: getHeaders(),
  });
};

export const createStatusCheck = async (client_name) => {
  return jsonFetch(`${API_BASE_URL}/api/status`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ client_name }),
  });
};

/**
 * Admin: Reload ML model
 * Backend: POST /admin/reload_price_model
 */
export const reloadModel = async () => {
  return jsonFetch(`${API_BASE_URL}/admin/reload_price_model`, {
    method: 'POST',
    headers: getHeaders(),
  });
};

// ============================================================
// Metadata helpers (make/model/trim) – local catalogue only
// ============================================================

/**
 * Get list of available makes from local catalogue.
 * This does NOT call the backend and contains no pricing logic.
 */
export const getMakes = async () => {
  const makes = [...new Set(CAR_DATA.map((item) => item.brand))].sort();
  return makes;
};

/**
 * Get models for a specific make from local catalogue.
 */
export const getModels = async (make) => {
  const models = [
    ...new Set(
      CAR_DATA.filter((item) => item.brand === make).map((item) => item.model)
    ),
  ].sort();
  return models;
};

/**
 * Get trims for a specific make and model from local catalogue.
 */
export const getTrims = async (make, model) => {
  const trims = [
    ...new Set(
      CAR_DATA
        .filter((item) => item.brand === make && item.model === model)
        .map((item) => item.series)
        .filter((s) => s && s !== 'UNKNOWN')
    ),
  ].sort();
  return trims;
};
