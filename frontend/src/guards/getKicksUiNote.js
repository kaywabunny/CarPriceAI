/**
 * Nissan Kicks UI-only safety notices (no pricing or API changes).
 * Returns null or { messageKey, variant, secondaryMessageKey? } for a subtle info note
 * when estimate is based on limited data, and optionally an E-POWER vs petrol clarification.
 *
 * Scope: make === "NISSAN" AND model.toUpperCase() === "KICKS" only.
 *
 * @param {object} resultRow - One result row: sample_size, confidence, estimate_basis, ui_notice
 * @param {object} requestMeta - Request context: { make, model, submodel }
 * @returns {null|{ messageKey: string, variant: 'e_power'|'petrol', secondaryMessageKey?: string }}
 */
export function getKicksUiNote(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase() : '';
  if (make !== 'NISSAN' || model !== 'KICKS') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;
  const estimateBasis = resultRow.estimate_basis;
  const uiNotice = resultRow.ui_notice;
  const submodelStr = requestMeta.submodel != null ? String(requestMeta.submodel).trim() : '';

  const limitedNotices = ['extremely_limited_data', 'limited_market_data'];
  const showNote =
    (sampleSize != null && sampleSize <= 2) ||
    (confidence != null && confidence < 0.4) ||
    (uiNotice && limitedNotices.includes(uiNotice)) ||
    (estimateBasis && String(estimateBasis).toLowerCase().startsWith('fallback'));

  if (!showNote) return null;

  const isEpower = submodelStr && String(submodelStr).toUpperCase().includes('E-POWER');
  const noTrim =
    !submodelStr ||
    submodelStr === '' ||
    String(submodelStr).toLowerCase().includes('none') ||
    String(submodelStr).toLowerCase().includes('not sure');

  const messageKey = isEpower
    ? 'result.kicksLimitedNote.ePower'
    : 'result.kicksLimitedNote.petrol';

  const out = { messageKey, variant: isEpower ? 'e_power' : 'petrol' };
  if (noTrim) {
    out.secondaryMessageKey = 'result.kicksEpowerVsPetrol.message';
  }
  return out;
}
