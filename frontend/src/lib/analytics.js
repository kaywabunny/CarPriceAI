import { v4 as uuidv4 } from 'uuid';
import { EVENT_TYPES } from './types';

const STORAGE_KEYS = {
  SESSION_ID: 'car_pricing_session_id',
  EVENTS: 'car_pricing_events',
};

/**
 * Get or create session ID (safe when localStorage is unavailable)
 * @returns {string} Session ID
 */
export const getSessionId = () => {
  try {
    if (typeof localStorage === 'undefined') return uuidv4();
    let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  } catch (_) {
    return uuidv4();
  }
};

/**
 * Get all stored events
 * @returns {Array} Array of analytics events
 */
export const getStoredEvents = () => {
  try {
    const events = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return events ? JSON.parse(events) : [];
  } catch (e) {
    console.error('Error reading events from localStorage:', e);
    return [];
  }
};

/**
 * Store an event to localStorage
 * @param {Object} event - Event to store
 */
const storeEvent = (event) => {
  try {
    const events = getStoredEvents();
    events.push(event);
    // Keep only last 1000 events to prevent localStorage overflow
    const trimmedEvents = events.slice(-1000);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(trimmedEvents));
  } catch (e) {
    console.error('Error storing event:', e);
  }
};

/**
 * Track an analytics event
 * @param {string} eventName - Type of event
 * @param {Object} payload - Event-specific data
 * @param {string|null} predictionId - Associated prediction ID
 */
export const track = (eventName, payload = {}, predictionId = null) => {
  const event = {
    id: uuidv4(),
    session_id: getSessionId(),
    event_name: eventName,
    page_url: window.location.pathname,
    payload,
    prediction_id: predictionId,
    timestamp: Date.now(),
    created_at: new Date().toISOString(),
  };

  storeEvent(event);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, payload);
  }

  return event;
};

/**
 * Track page view
 * @param {string} pageName - Name of the page
 */
export const trackPageView = (pageName) => {
  return track(EVENT_TYPES.PAGE_VIEW, { page_name: pageName });
};

/**
 * Track CTA click
 * @param {string} buttonName - Name of the button clicked
 * @param {Object} additionalData - Any additional context
 */
export const trackCtaClick = (buttonName, additionalData = {}) => {
  return track(EVENT_TYPES.CTA_CLICKED, { button_name: buttonName, ...additionalData });
};

/**
 * Get analytics summary for dashboard
 * @returns {Object} Summary statistics
 */
export const getAnalyticsSummary = () => {
  const events = getStoredEvents();
  
  const summary = {
    totalEvents: events.length,
    uniqueSessions: new Set(events.map(e => e.session_id)).size,
    eventCounts: {},
    predictions: {
      total: 0,
      successful: 0,
      failed: 0,
    },
    recentEvents: events.slice(-50).reverse(),
    eventsByHour: {},
    topMakes: {},
    topModels: {},
  };

  events.forEach(event => {
    // Count events by type
    summary.eventCounts[event.event_name] = (summary.eventCounts[event.event_name] || 0) + 1;

    // Track prediction stats
    if (event.event_name === EVENT_TYPES.PREDICT_SUCCESS) {
      summary.predictions.total++;
      summary.predictions.successful++;
      
      // Track popular makes/models
      if (event.payload?.make) {
        summary.topMakes[event.payload.make] = (summary.topMakes[event.payload.make] || 0) + 1;
      }
      if (event.payload?.model) {
        summary.topModels[event.payload.model] = (summary.topModels[event.payload.model] || 0) + 1;
      }
    }
    if (event.event_name === EVENT_TYPES.PREDICT_ERROR) {
      summary.predictions.total++;
      summary.predictions.failed++;
    }

    // Events by hour
    const hour = new Date(event.timestamp).getHours();
    summary.eventsByHour[hour] = (summary.eventsByHour[hour] || 0) + 1;
  });

  return summary;
};

/**
 * Clear all stored events (for admin use)
 */
export const clearEvents = () => {
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
};

/**
 * Export events as JSON for download
 * @returns {string} JSON string of all events
 */
export const exportEvents = () => {
  const events = getStoredEvents();
  return JSON.stringify(events, null, 2);
};
