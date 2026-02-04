/**
 * BMW X-Series sanity safeguard (UI-only, no blocking).
 * Applies when make=BMW and model starts with "X" (X1, X3, X5, etc.).
 * If red_high >= 2M AND sample_size <= 2 AND confidence <= 0.4:
 *   add ui_notice and ui_notice_message_key for limited-listings copy.
 * Never suppresses or changes prices. If sample_size >= 3, do nothing.
 * Easy to delete later without touching pricing logic.
 *
 * @param {object} result - Price API result (single result or { results, count })
 * @param {object} request - Request payload { make, model, ... }
 * @returns {object} Result with optional ui_notice and ui_notice_message_key
 */
export function applyBmwXSuvSafeguard(result, request) {
  if (!result || !request) return result;

  const make = request.make === 'BMW';
  const modelStr = request.model != null ? String(request.model).trim().toUpperCase() : '';
  const isBmwX = make && modelStr.startsWith('X');
  if (!isBmwX) return result;

  const applyOne = (r) => {
    if (!r || r.status === 'pricing_unavailable' || r.status === 'unsupported_model') return r;
    const redHigh = r.red_high != null ? Number(r.red_high) : 0;
    const sampleSize = r.sample_size != null ? Number(r.sample_size) : 0;
    const confidence = r.confidence != null ? Number(r.confidence) : 0;
    if (sampleSize >= 3) return r;
    if (redHigh >= 2_000_000 && sampleSize <= 2 && confidence <= 0.4) {
      return {
        ...r,
        ui_notice: 'check_market_data',
        ui_notice_message_key: 'result.checkMarketData.limitedListingsMessage',
      };
    }
    return r;
  };

  if (result.results && Array.isArray(result.results)) {
    return {
      ...result,
      results: result.results.map(applyOne),
    };
  }
  return applyOne(result);
}
