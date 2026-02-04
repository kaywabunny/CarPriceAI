/**
 * Business Analytics Client
 * 
 * Tracks user interactions for business insights.
 * Stores events in MongoDB via backend /events endpoint.
 * Fire-and-forget (non-blocking).
 */

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'car_pricing_session_id';
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

const APP_VERSION = '1.0.0'; // Update this when releasing new versions

/**
 * Get or create a stable session ID stored in localStorage
 */
const getSessionId = () => {
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Track a business event
 * @param {string} eventName - Event type: "search_submit", "view_price_graph", "view_depreciation", "copy_result", "page_view"
 * @param {Object} vehicleInput - Vehicle data: { make, model, trim?, year, mileage }
 * @param {Object} result - Optional result data from price prediction
 */
export const trackEvent = (eventName, vehicleInput = null, result = null) => {
  try {
    const payload = {
      ts: new Date().toISOString(),
      event: eventName,
      session_id: getSessionId(),
      page: window.location.pathname || "/",
      source: "frontend",
      app_version: APP_VERSION,
    };

    // Add vehicle data if provided
    if (vehicleInput && (vehicleInput.make || vehicleInput.model)) {
      payload.vehicle = {
        make: vehicleInput.make || null,
        model: vehicleInput.model || null,
        trim: vehicleInput.trim || null,
        year: vehicleInput.year || null,
        mileage: vehicleInput.mileage_km_num || vehicleInput.mileage || null,
      };
    }

    // Add result data if provided
    if (result) {
      payload.result = {
        market_price: result.yellow || result.market_price || null,
        green_low: result.green_low || null,
        green_high: result.green_high || null,
        red_low: result.red_low || null,
        red_high: result.red_high || null,
        confidence: result.confidence || null,
        sample_size: result.sample_size || null,
        estimate_basis: result.estimate_basis || null,
      };
    }

    const url = `${API_BASE_URL}/events`;
    const body = JSON.stringify(payload);

    // Use sendBeacon if available (non-blocking, works even on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      // Fallback to fetch with keepalive
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(() => {
        // Silently fail - analytics should not impact user experience
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Business Analytics]', eventName, payload);
    }
  } catch (e) {
    // Silently fail - analytics should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.error('[Business Analytics Error]', e);
    }
  }
};
