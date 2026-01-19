// Type definitions for the car pricing app
// These are JSDoc-style types that can be easily converted to TypeScript later

/**
 * @typedef {Object} PriceRequest
 * @property {string} make - Car brand/make
 * @property {string} model - Car model
 * @property {number} year - Manufacturing year
 * @property {number} mileage_km_num - Mileage in kilometers
 * @property {string|null} [trim] - Optional trim/series
 */

/**
 * @typedef {Object} PriceResponse
 * @property {number} green_low - Lower bound of "good deal" range
 * @property {number} green_median - Median of "good deal" range
 * @property {number} green_high - Upper bound of "good deal" range
 * @property {number} yellow - Market fair price (median)
 * @property {number} red_low - Lower bound of "overpriced" range
 * @property {number} red_median - Median of "overpriced" range
 * @property {number} red_high - Upper bound of "overpriced" range
 * @property {number} [confidence] - Confidence score (0-1)
 * @property {string} [estimate_basis] - Basis of estimate
 * @property {number} [sample_size] - Number of comparable listings
 */

/**
 * @typedef {Object} DepreciationPoint
 * @property {number} year - Year from purchase
 * @property {number} value - Estimated value at that year
 * @property {number} depreciation_rate - Depreciation percentage
 */

/**
 * @typedef {Object} DepreciationResponse
 * @property {DepreciationPoint[]} series - Array of depreciation data points
 * @property {number} initial_value - Starting value
 * @property {number} total_depreciation - Total depreciation percentage over horizon
 */

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} id - Unique event ID
 * @property {string} session_id - Session ID
 * @property {string} event_name - Event type
 * @property {string} page_url - Current page URL
 * @property {Object} payload - Event-specific data
 * @property {string|null} [prediction_id] - Associated prediction ID
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} CarLookupItem
 * @property {string} brand - Car brand/make
 * @property {string} model - Car model
 * @property {string} series - Trim/series
 */

export const EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  PREDICT_SUBMITTED: 'predict_submitted',
  PREDICT_SUCCESS: 'predict_success',
  PREDICT_ERROR: 'predict_error',
  GRAPH_OPENED: 'graph_opened',
  GRAPH_LOADED: 'graph_loaded',
  GRAPH_ERROR: 'graph_error',
  DEPRECIATION_OPENED: 'depreciation_opened',
  DEPRECIATION_LOADED: 'depreciation_loaded',
  DEPRECIATION_ERROR: 'depreciation_error',
  CTA_CLICKED: 'cta_clicked',
  ADMIN_RELOAD: 'admin_reload',
};

export const PRICE_BANDS = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};
