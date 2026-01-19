/**
 * API Layer for Car Pricing Tool
 * 
 * This file contains mock implementations that simulate the real API.
 * When connecting to a real backend, replace the mock functions with actual API calls.
 * 
 * Expected Backend Endpoints:
 * - POST /api/predict - Get price prediction
 * - POST /api/price-graph - Get price graph image
 * - POST /api/depreciation - Get depreciation data
 * - POST /api/track - Track analytics event
 * - GET /api/meta/makes - Get all makes
 * - GET /api/meta/models?make=X - Get models for a make
 * - GET /api/meta/trims?make=X&model=Y - Get trims for make+model
 * - POST /api/admin/reload-model - Reload ML model
 */

import { v4 as uuidv4 } from 'uuid';
import { getSessionId } from './analytics';
import { CAR_DATA } from './carData';

// Base URL - will be used when connecting to real backend
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

// Flag to switch between mock and real API
const USE_MOCK = true;

/**
 * Helper to get headers with session ID
 */
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-session-id': getSessionId(),
});

/**
 * Simulate network delay for realistic mock behavior
 */
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate mock price response based on inputs
 */
const generateMockPriceResponse = (request) => {
  // Base price calculation (simplified mock logic)
  const currentYear = new Date().getFullYear();
  const age = currentYear - request.year;
  const mileageFactor = request.mileage_km_num / 10000;
  
  // Mock base prices by brand (in THB)
  const brandPrices = {
    'TOYOTA': 800000,
    'HONDA': 750000,
    'NISSAN': 650000,
    'MAZDA': 700000,
    'BMW': 1500000,
    'BENZ': 1800000,
    'AUDI': 1400000,
    'FORD': 600000,
    'CHEVROLET': 550000,
    'ISUZU': 700000,
    'MITSUBISHI': 650000,
    'SUZUKI': 500000,
    'SUBARU': 900000,
    'PORSCHE': 5000000,
    'FERRARI': 15000000,
    'LEXUS': 2000000,
    'MERCEDES-BENZ': 1800000,
  };

  const basePrice = brandPrices[request.make?.toUpperCase()] || 600000;
  
  // Depreciation: ~15% first year, ~10% subsequent years
  const depreciationRate = age === 0 ? 0 : (0.15 + (age - 1) * 0.08);
  const ageDepreciation = Math.min(depreciationRate, 0.70);
  
  // Mileage depreciation: ~2% per 10,000 km
  const mileageDepreciation = Math.min(mileageFactor * 0.02, 0.30);
  
  const totalDepreciation = Math.min(ageDepreciation + mileageDepreciation, 0.80);
  const marketPrice = basePrice * (1 - totalDepreciation);
  
  // Generate price bands around market price
  const yellow = Math.round(marketPrice);
  
  return {
    green_low: Math.round(yellow * 0.88),
    green_median: Math.round(yellow * 0.90),
    green_high: Math.round(yellow * 0.92),
    yellow: yellow,
    red_low: Math.round(yellow * 1.10),
    red_median: Math.round(yellow * 1.14),
    red_high: Math.round(yellow * 1.18),
    confidence: Math.random() * 0.3 + 0.6, // 0.6-0.9
    estimate_basis: 'based_on_comparable_listings',
    sample_size: Math.floor(Math.random() * 50) + 10,
  };
};

/**
 * Generate mock depreciation data
 */
const generateMockDepreciation = (request) => {
  const horizonYears = request.horizon_years || 6;
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - request.year;
  
  // Mock initial value
  const initialValue = 1000000; // 1M THB as base
  
  const series = [];
  let currentValue = initialValue;
  
  for (let i = 0; i <= horizonYears; i++) {
    const yearFromNow = vehicleAge + i;
    // Depreciation curve: steeper early, flattens later
    const annualDepreciation = yearFromNow === 0 ? 0 : 
      yearFromNow === 1 ? 0.15 : 
      yearFromNow <= 3 ? 0.12 : 
      yearFromNow <= 5 ? 0.08 : 0.05;
    
    if (i > 0) {
      currentValue = currentValue * (1 - annualDepreciation);
    }
    
    series.push({
      year: i,
      year_label: `Year ${i}`,
      value: Math.round(currentValue),
      depreciation_rate: i === 0 ? 0 : annualDepreciation * 100,
      cumulative_depreciation: Math.round((1 - currentValue / initialValue) * 100),
    });
  }
  
  return {
    series,
    initial_value: initialValue,
    total_depreciation: Math.round((1 - currentValue / initialValue) * 100),
    make: request.make,
    model: request.model,
    year: request.year,
  };
};

// ============================================================
// PUBLIC API FUNCTIONS
// ============================================================

/**
 * Get price prediction
 * @param {Object} request - { make, model, year, mileage_km_num, trim? }
 * @returns {Promise<Object>} Price prediction response
 */
export const predictPrice = async (request) => {
  if (USE_MOCK) {
    await mockDelay(800);
    const response = generateMockPriceResponse(request);
    return {
      ...response,
      prediction_id: uuidv4(),
    };
  }
  
  const res = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  
  if (!res.ok) {
    throw new Error(`Prediction failed: ${res.statusText}`);
  }
  
  return res.json();
};

/**
 * Get price graph image
 * @param {Object} request - { make, model, year, mileage_km_num, trim? }
 * @returns {Promise<string>} Base64 encoded image or blob URL
 */
export const getPriceGraph = async (request) => {
  if (USE_MOCK) {
    await mockDelay(1000);
    // Return a placeholder chart image URL
    // In production, this would be a real PNG from the ML service
    return generateMockChartSVG(request);
  }
  
  const res = await fetch(`${API_BASE_URL}/api/price-graph`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get price graph: ${res.statusText}`);
  }
  
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

/**
 * Generate a mock chart as SVG data URL
 */
const generateMockChartSVG = (request) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <text x="400" y="40" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="18" font-weight="bold">
        Price Distribution: ${request.make} ${request.model} (${request.year})
      </text>
      
      <!-- Price bands visualization -->
      <rect x="100" y="100" width="200" height="60" fill="#10b981" rx="4"/>
      <text x="200" y="138" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14">Good Deal Zone</text>
      
      <rect x="300" y="100" width="200" height="60" fill="#f59e0b" rx="4"/>
      <text x="400" y="138" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14">Fair Price</text>
      
      <rect x="500" y="100" width="200" height="60" fill="#f43f5e" rx="4"/>
      <text x="600" y="138" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14">Overpriced Zone</text>
      
      <!-- Mock histogram bars -->
      <rect x="120" y="200" width="40" height="80" fill="#10b981" opacity="0.7"/>
      <rect x="170" y="180" width="40" height="100" fill="#10b981" opacity="0.8"/>
      <rect x="220" y="160" width="40" height="120" fill="#10b981" opacity="0.9"/>
      <rect x="270" y="140" width="40" height="140" fill="#22c55e"/>
      
      <rect x="320" y="120" width="40" height="160" fill="#eab308"/>
      <rect x="370" y="100" width="40" height="180" fill="#f59e0b"/>
      <rect x="420" y="120" width="40" height="160" fill="#eab308"/>
      
      <rect x="470" y="160" width="40" height="120" fill="#f43f5e" opacity="0.9"/>
      <rect x="520" y="180" width="40" height="100" fill="#f43f5e" opacity="0.8"/>
      <rect x="570" y="200" width="40" height="80" fill="#f43f5e" opacity="0.7"/>
      <rect x="620" y="220" width="40" height="60" fill="#f43f5e" opacity="0.6"/>
      
      <!-- X-axis -->
      <line x1="100" y1="320" x2="700" y2="320" stroke="#64748b" stroke-width="2"/>
      <text x="400" y="360" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">Price Range (THB)</text>
      
      <!-- Legend -->
      <text x="400" y="390" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="11">
        Based on ${Math.floor(Math.random() * 50 + 20)} comparable listings in the market
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Get depreciation forecast
 * @param {Object} request - { make, model, year, horizon_years, mileage_km_num }
 * @returns {Promise<Object>} Depreciation data
 */
export const getDepreciation = async (request) => {
  if (USE_MOCK) {
    await mockDelay(600);
    return generateMockDepreciation(request);
  }
  
  const res = await fetch(`${API_BASE_URL}/api/depreciation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get depreciation data: ${res.statusText}`);
  }
  
  return res.json();
};

/**
 * Send analytics event to backend (currently a no-op in mock mode)
 * @param {Object} event - Analytics event data
 */
export const sendTrackEvent = async (event) => {
  if (USE_MOCK) {
    // In mock mode, events are only stored in localStorage
    return { success: true };
  }
  
  const res = await fetch(`${API_BASE_URL}/api/track`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(event),
  });
  
  return res.json();
};

/**
 * Get list of available makes
 * @returns {Promise<string[]>} Array of make names
 */
export const getMakes = async () => {
  if (USE_MOCK) {
    await mockDelay(100);
    const makes = [...new Set(CAR_DATA.map(item => item.brand))].sort();
    return makes;
  }
  
  const res = await fetch(`${API_BASE_URL}/api/meta/makes`, {
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch makes');
  }
  
  return res.json();
};

/**
 * Get models for a specific make
 * @param {string} make - Make name
 * @returns {Promise<string[]>} Array of model names
 */
export const getModels = async (make) => {
  if (USE_MOCK) {
    await mockDelay(100);
    const models = [...new Set(
      CAR_DATA
        .filter(item => item.brand === make)
        .map(item => item.model)
    )].sort();
    return models;
  }
  
  const res = await fetch(`${API_BASE_URL}/api/meta/models?make=${encodeURIComponent(make)}`, {
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch models');
  }
  
  return res.json();
};

/**
 * Get trims for a specific make and model
 * @param {string} make - Make name
 * @param {string} model - Model name
 * @returns {Promise<string[]>} Array of trim names
 */
export const getTrims = async (make, model) => {
  if (USE_MOCK) {
    await mockDelay(100);
    const trims = [...new Set(
      CAR_DATA
        .filter(item => item.brand === make && item.model === model)
        .map(item => item.series)
        .filter(s => s && s !== 'UNKNOWN')
    )].sort();
    return trims;
  }
  
  const res = await fetch(`${API_BASE_URL}/api/meta/trims?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`, {
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch trims');
  }
  
  return res.json();
};

/**
 * Admin: Reload ML model
 * @returns {Promise<Object>} Status response
 */
export const reloadModel = async () => {
  if (USE_MOCK) {
    await mockDelay(2000);
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      message: 'Model reloaded successfully (mock)',
    };
  }
  
  const res = await fetch(`${API_BASE_URL}/api/admin/reload-model`, {
    method: 'POST',
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to reload model');
  }
  
  return res.json();
};

/**
 * Health check
 * @returns {Promise<Object>} Health status
 */
export const healthCheck = async () => {
  if (USE_MOCK) {
    return {
      status: 'healthy',
      ml_service: 'mock',
      database: 'localStorage',
    };
  }
  
  const res = await fetch(`${API_BASE_URL}/api/health`, {
    headers: getHeaders(),
  });
  
  return res.json();
};
