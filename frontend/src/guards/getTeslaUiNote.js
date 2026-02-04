/**
 * Tesla (all models) UI-only informational note when data is sparse (no pricing or API changes).
 * Returns null or { messageKey } for a small info note under the price bands.
 *
 * Scope: make === "TESLA" only (all models: Model 3, Model Y, Model S, Model X, etc.).
 *
 * @param {object} resultRow - One result row: sample_size, confidence, ui_notice, estimate_basis
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ messageKey: string }}
 */
export function getTeslaUiNote(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  if (make !== 'TESLA') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;
  const uiNotice = resultRow.ui_notice;
  const estimateBasis = resultRow.estimate_basis;

  const limitedNotices = ['limited_market_data', 'extremely_limited_data'];
  const showNote =
    (sampleSize != null && sampleSize <= 3) ||
    (confidence != null && confidence <= 0.35) ||
    (uiNotice && limitedNotices.includes(uiNotice)) ||
    (estimateBasis && String(estimateBasis).toLowerCase().startsWith('fallback'));

  if (!showNote) return null;

  return { messageKey: 'result.teslaLimitedNote.message' };
}
