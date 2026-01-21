/**
 * Private Analytics Client
 * 
 * Sends events to backend for storage without exposing UI dashboard.
 * Uses sendBeacon for non-blocking fire-and-forget requests.
 */

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'car_pricing_session_id';
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

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
 * Send event to backend using sendBeacon (non-blocking) or fetch with keepalive
 * @param {string} eventName - Name of the event
 * @param {Object} props - Event properties
 */
export const trackEvent = (eventName, props = {}) => {
  try {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      props: props,
    };

    const url = `${API_BASE_URL}/api/analytics/event`;
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

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Private Analytics]', eventName, props);
    }
  } catch (e) {
    // Silently fail - analytics should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.error('[Private Analytics Error]', e);
    }
  }
};

// Convenience functions for common events
export const trackPriceCheckSubmit = (data) => {
  trackEvent('price_check_submit', {
    make: data.make,
    model: data.model,
    year: data.year,
    mileage: data.mileage_km_num,
    trim: data.trim || null,
  });
};

export const trackViewPriceGraph = (predictionId) => {
  trackEvent('view_price_graph', { prediction_id: predictionId });
};

export const trackViewDepreciation = (predictionId) => {
  trackEvent('view_depreciation', { prediction_id: predictionId });
};

export const trackCopyResult = (predictionId) => {
  trackEvent('copy_result', { prediction_id: predictionId });
};

export const trackSelectMake = (make) => {
  trackEvent('select_make', { make });
};

export const trackSelectModel = (make, model) => {
  trackEvent('select_model', { make, model });
};

export const trackSelectTrim = (make, model, trim) => {
  trackEvent('select_trim', { make, model, trim });
};
