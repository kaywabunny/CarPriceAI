/**
 * Centralized configuration for price band labels and tooltips
 */
export const PRICE_BAND_COPY = {
  green: {
    title: "Good Deal (Quick Sale)",
    shortTitle: "Good Deal",
    tooltip: "Below typical market price. Likely to sell faster and attract more buyers.",
    icon: "TrendingDown",
  },
  yellow: {
    title: "Market Price (Fair)",
    shortTitle: "Fair Price",
    tooltip: "Near the typical market range. Balanced price for both buyer and seller.",
    badge: "Market Price",
    icon: "Target",
  },
  red: {
    title: "Higher Price (Slower Sale)",
    shortTitle: "Higher Price",
    tooltip: "Above typical market price. Higher margin possible, but may take longer to sell.",
    icon: "TrendingUp",
  },
};

/**
 * Price gauge bar tooltip descriptions
 */
export const PRICE_GAUGE_COPY = {
  lower: "Lower",
  fairPrice: "Fair Price",
  higher: "Higher",
  barTooltip: "Price distribution showing Good Deal (green), Fair Price (yellow), and Higher Price (red) zones.",
};

/**
 * Confidence level labels
 */
export const CONFIDENCE_LABELS = {
  high: { label: 'High Confidence', threshold: 0.8 },
  good: { label: 'Good Confidence', threshold: 0.6 },
  moderate: { label: 'Moderate Confidence', threshold: 0.4 },
  low: { label: 'Low Confidence', threshold: 0 },
};
