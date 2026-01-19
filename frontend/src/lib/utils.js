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
 * @param {number} endYear - Ending year (default current year + 1)
 * @returns {number[]} Array of years
 */
export const getYearOptions = (startYear = 1990, endYear = new Date().getFullYear() + 1) => {
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
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
