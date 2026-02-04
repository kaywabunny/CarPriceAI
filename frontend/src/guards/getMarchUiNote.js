/**
 * Nissan March UI-only informational note when data is sparse (no pricing or API changes).
 * Returns null or { messageKey } for a small info note under the price bands.
 *
 * Scope: make === "NISSAN" AND model === "MARCH" only. No impact on other Nissan models.
 *
 * @param {object} resultRow - One result row: sample_size, confidence, green_low, green_median, green_high, ui_notice
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ messageKey: string }}
 */
export function getMarchUiNote(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase() : '';
  if (make !== 'NISSAN' || model !== 'MARCH') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;
  const gl = resultRow.green_low != null ? Number(resultRow.green_low) : undefined;
  const gm = resultRow.green_median != null ? Number(resultRow.green_median) : undefined;
  const gh = resultRow.green_high != null ? Number(resultRow.green_high) : undefined;
  const uiNotice = resultRow.ui_notice;

  const collapsedGreen = gl != null && gm != null && gh != null && gl === gm && gm === gh;

  const showNote =
    (sampleSize != null && sampleSize <= 3) ||
    (confidence != null && confidence <= 0.45) ||
    collapsedGreen ||
    (uiNotice != null && uiNotice !== '');

  if (!showNote) return null;

  return { messageKey: 'result.marchLimitedNote.message' };
}
