/**
 * BMW X3 sanity warning (NOT a blocker).
 * Only applies when make=BMW and model=X3. Never suppresses prices.
 * Easy to remove later without touching core pricing logic.
 *
 * @param {object} result - Price API result (single result or { results, count })
 * @param {object} request - Request payload { make, model, ... }
 * @returns {object} Result with optional ui_notice and ui_notice_message
 */
export function applyUiNoticesBMWX3(result, request) {
  if (!result || !request) return result;

  const make = request.make === 'BMW';
  const model = request.model === 'X3';
  if (!make || !model) return result;

  const applyOne = (r) => {
    if (!r || r.status === 'pricing_unavailable' || r.status === 'unsupported_model') return r;
    const greenMedian = r.green_median != null ? Number(r.green_median) : 0;
    const yellow = r.yellow != null ? Number(r.yellow) : 0;
    if (greenMedian > 2_500_000 || yellow > 3_000_000) {
      return {
        ...r,
        ui_notice: 'check_market_data',
        ui_notice_message: 'This estimate looks unusually high for this vehicle. It may be affected by limited or inconsistent listings.',
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
