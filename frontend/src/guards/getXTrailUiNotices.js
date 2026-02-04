/**
 * Nissan X-TRAIL UI-only notices when data is sparse (no pricing or API changes).
 * Returns null or { messageKey, tooltipKey?, trimNoteKey? } for notices under bands and optional tooltip.
 *
 * Scope: make === "NISSAN" AND model === "X-TRAIL" only.
 *
 * @param {object} resultRow - One result row: sample_size, ui_notice, bandwidth_clamped
 * @param {object} requestMeta - Request context: { make, model, submodel }
 * @returns {null|{ messageKey?: string, tooltipKey?: string, trimNoteKey?: string }}
 */
export function getXTrailUiNotices(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase().replace(/\s+/g, ' ') : '';
  const modelNorm = model === 'X-TRAIL' || model === 'XTRAIL' ? 'X-TRAIL' : model;
  if (make !== 'NISSAN' || modelNorm !== 'X-TRAIL') return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : undefined;
  const uiNotice = resultRow.ui_notice;
  const bandwidthClamped = resultRow.bandwidth_clamped === true;
  const submodelStr = requestMeta.submodel != null ? String(requestMeta.submodel).trim() : '';

  const hasLimited =
    (sampleSize != null && sampleSize <= 2) ||
    (uiNotice && String(uiNotice).toLowerCase().includes('limited'));

  if (!hasLimited && !bandwidthClamped) return null;

  const out = {};

  if (uiNotice === 'extremely_limited_data') {
    out.messageKey = 'result.xtrailExtremelyLimited.message';
  } else if (hasLimited) {
    out.messageKey = 'result.xtrailLimitedData.message';
  }

  if (bandwidthClamped) {
    out.tooltipKey = 'result.xtrailBandwidthClamped.tooltip';
  }

  const trimSpecified =
    submodelStr &&
    submodelStr !== '' &&
    !submodelStr.toLowerCase().includes('none') &&
    !submodelStr.toLowerCase().includes('not sure');
  if (trimSpecified && hasLimited) {
    out.trimNoteKey = 'result.xtrailTrimLimited.message';
  }

  if (!out.messageKey && !out.tooltipKey && !out.trimNoteKey) return null;
  return out;
}
