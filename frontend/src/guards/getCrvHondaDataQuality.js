/**
 * Honda CR-V data quality banner (UI-only). Scope: make === "HONDA" AND model === "CR-V" only.
 * Returns null or { titleKey, messageKey } for a subtle banner when estimate is based on limited data.
 * Does not change any pricing or API output.
 *
 * @param {object} resultRow - One result row: sample_size, estimate_basis, confidence, ui_notice
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ titleKey: string, messageKey: string }}
 */
export function getCrvHondaDataQuality(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase() : '';
  if (make !== 'HONDA' || model !== 'CR-V') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const estimateBasis = resultRow.estimate_basis;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;
  const uiNotice = resultRow.ui_notice;

  // 1) No comparables / fallback
  if (sampleSize === 0 || estimateBasis === 'fallback_no_comparables') {
    return {
      titleKey: 'result.crvDataQuality.noComparables.title',
      messageKey: 'result.crvDataQuality.noComparables.message',
    };
  }

  // 2) Limited market data
  const limitedNotices = ['extremely_limited_data', 'limited_market_data'];
  if (
    (sampleSize != null && sampleSize <= 2) ||
    (confidence != null && confidence < 0.35) ||
    (uiNotice && limitedNotices.includes(uiNotice))
  ) {
    return {
      titleKey: 'result.crvDataQuality.limitedMarket.title',
      messageKey: 'result.crvDataQuality.limitedMarket.message',
    };
  }

  return null;
}
