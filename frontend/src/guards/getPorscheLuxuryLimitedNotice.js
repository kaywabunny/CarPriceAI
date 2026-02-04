/**
 * Porsche luxury/performance models: UI-only info notice when trim-level data is limited.
 * No pricing, bands, or confidence changes. Shown once per estimate.
 *
 * Trigger: make === PORSCHE, model in (PANAMERA, MACAN, CAYENNE, 718, 911, TAYCAN),
 * AND (sample_size <= 3 OR confidence <= 0.45 OR ui_notice in limited_market_data | extremely_limited_data).
 *
 * @param {object} resultRow - One result row: sample_size, confidence, ui_notice
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ messageKey: string }}
 */
const PORSCHE_LUXURY_MODELS = new Set(['PANAMERA', 'MACAN', 'CAYENNE', '718', '911', 'TAYCAN']);

export function getPorscheLuxuryLimitedNotice(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase().replace(/\s+/g, '') : '';

  if (make !== 'PORSCHE') return null;
  if (!PORSCHE_LUXURY_MODELS.has(model)) return null;

  const sampleSize = resultRow.sample_size != null ? Number(resultRow.sample_size) : null;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : null;
  const uiNotice = resultRow.ui_notice != null ? String(resultRow.ui_notice) : '';

  const limitedData =
    (sampleSize !== null && sampleSize <= 3) ||
    (confidence !== null && confidence <= 0.45) ||
    uiNotice === 'limited_market_data' ||
    uiNotice === 'extremely_limited_data';

  if (!limitedData) return null;

  return { messageKey: 'result.porscheLuxuryLimitedNotice.message' };
}
