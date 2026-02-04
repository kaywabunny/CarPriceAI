/**
 * Nissan Terra UI-only informational note when data is sparse (no pricing or API changes).
 * Returns null or { messageKey } for a small info note under the price bands.
 *
 * Scope: make === "NISSAN" AND model === "TERRA" only. No impact on other Nissan models.
 *
 * @param {object} resultRow - One result row: sample_size, confidence, ui_notice, estimate_basis
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ messageKey: string }}
 */
export function getTerraUiNote(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase() : '';
  if (make !== 'NISSAN' || model !== 'TERRA') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;
  const uiNotice = resultRow.ui_notice;
  const estimateBasis = resultRow.estimate_basis;

  const limitedNotices = ['limited_market_data', 'extremely_limited_data'];
  const showNote =
    (sampleSize != null && sampleSize <= 2) ||
    (confidence != null && confidence <= 0.35) ||
    (uiNotice && limitedNotices.includes(uiNotice)) ||
    (estimateBasis && String(estimateBasis).toLowerCase().startsWith('fallback'));

  if (!showNote) return null;

  return { messageKey: 'result.terraLimitedNote.message' };
}
