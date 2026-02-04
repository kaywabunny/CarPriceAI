import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Thai Baht currency
 * @param {number} value - Number to format
 * @returns {string} Formatted currency string
 */
export const formatTHB = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '฿0';
  }
  return `฿${Math.round(value).toLocaleString('th-TH')}`;
};

/**
 * Format number with comma separators
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString('th-TH');
};

/**
 * Format percentage
 * @param {number} value - Number to format (0-100 or 0-1)
 * @param {boolean} isDecimal - Whether input is decimal (0-1)
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (value, isDecimal = false) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
};

/**
 * Format mileage with km suffix
 * @param {number} km - Kilometers
 * @returns {string} Formatted mileage string
 */
export const formatMileage = (km) => {
  if (km === null || km === undefined || isNaN(km)) {
    return '0 km';
  }
  return `${Math.round(km).toLocaleString('th-TH')} km`;
};

/**
 * Get year options for dropdown
 * @param {number} startYear - Starting year (default 1990)
 * @param {number} endYear - Ending year (default MAX_SUPPORTED_YEAR = 2025)
 * @returns {number[]} Array of years
 */
const MAX_SUPPORTED_YEAR = 2025; // Pricing unavailable for future years beyond 2025
export const getYearOptions = (startYear = 1990, endYear = MAX_SUPPORTED_YEAR) => {
  // Ensure endYear never exceeds MAX_SUPPORTED_YEAR
  const cappedEndYear = Math.min(endYear, MAX_SUPPORTED_YEAR);
  const years = [];
  for (let year = cappedEndYear; year >= startYear; year--) {
    years.push(year);
  }
  return years;
};

/**
 * Get confidence level label
 * @param {number} confidence - Confidence score (0-1)
 * @returns {Object} Label and color class
 */
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.8) {
    return { label: 'High Confidence', color: 'text-green-500', bgColor: 'bg-green-500/10' };
  }
  if (confidence >= 0.6) {
    return { label: 'Good Confidence', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  }
  if (confidence >= 0.4) {
    return { label: 'Moderate Confidence', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
  }
  return { label: 'Low Confidence', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Format date for display
 * @param {string|number|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time
 * @param {string|number|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDate(date);
};

/**
 * Get price size class based on value
 * Returns appropriate font size class to prevent large prices from dominating the card
 * @param {number} value - Price value
 * @returns {string} Tailwind className for font size
 */
export const getPriceSizeClass = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'text-xl leading-tight';
  }
  
  if (value >= 10_000_000) {
    // Very large prices (luxury cars): use smaller, compact size
    return 'text-base leading-tight';
  }
  
  if (value >= 1_000_000) {
    // Large prices: use medium size
    return 'text-lg leading-tight';
  }
  
  // Default size for smaller prices
  return 'text-xl leading-tight';
};

/**
 * BMW 320d trim production year rules (conservative).
 * - G20 (CKD): valid only for year >= 2019.
 * - F30 trims (LUXURY / SPORT / M SPORT (F30)): valid only for 2012–2018.
 * - None / Not sure: always valid.
 * Only enforced for BMW and model in ("320 D", "320d", "320D").
 * @param {string} brand - Make/brand (e.g. "BMW")
 * @param {string} model - Model (e.g. "320d")
 * @param {string} trim - Trim value (e.g. "2.0 M SPORT (G20) (CKD)" or "__NONE__")
 * @param {string|number} year - Production year
 * @returns {boolean} true if trim is valid for the given year (or not applicable)
 */
export const isTrimValidForYear = (brand, model, trim, year) => {
  const brandNorm = (brand || '').toString().trim().toUpperCase();
  const modelNorm = (model || '').toString().trim().toUpperCase().replace(/\s+/g, ' ');
  const trimNorm = (trim || '').toString().trim().toUpperCase();
  const yearNum = typeof year === 'number' ? year : parseInt(year, 10);

  if (brandNorm !== 'BMW') return true;
  const bmw320dModels = ['320 D', '320D'];
  if (!bmw320dModels.includes(modelNorm)) return true;

  if (!trimNorm || trimNorm === '__NONE__' || trimNorm === 'NONE / NOT SURE' || trimNorm === 'ไม่มี / ไม่แน่ใจ') return true;
  if (isNaN(yearNum) || yearNum <= 0) return true;

  if (trimNorm.includes('G20') && trimNorm.includes('CKD')) {
    return yearNum >= 2019;
  }
  if (trimNorm.includes('F30')) {
    return yearNum >= 2012 && yearNum <= 2018;
  }
  return true;
};