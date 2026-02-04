/**
 * Nissan LEAF UI-only safety notices (no pricing or API changes).
 * Returns null or { banner?: { titleKey, messageKey }, notes: string[] } (notes = messageKeys).
 * Scope: make === "NISSAN" AND model === "LEAF" only.
 *
 * @param {object} row - One result row: sample_size, estimate_basis, ui_notice, yellow, red_high, mileage_km_num
 * @param {object} meta - Request context: { make, model, year }
 * @returns {null|{ banner?: { titleKey: string, messageKey: string }, notes: string[] }}
 */
export function getLeafUiNotices(row, meta) {
  if (!row || !meta) return null;

  const make = meta.make != null ? String(meta.make).trim().toUpperCase() : '';
  const model = meta.model != null ? String(meta.model).trim().toUpperCase() : '';
  if (make !== 'NISSAN' || model !== 'LEAF') return null;

  const notes = [];
  let banner = null;

  const sampleSize = row.sample_size != null ? Number(row.sample_size) : undefined;
  const estimateBasis = row.estimate_basis;
  const uiNotice = row.ui_notice;

  // 1) Banner: fallback / no comparables (CRITICAL)
  const isFallback =
    sampleSize === 0 ||
    estimateBasis === 'fallback_no_comparables' ||
    (uiNotice === 'extremely_limited_data' &&
      estimateBasis &&
      String(estimateBasis).toLowerCase().startsWith('fallback'));

  if (isFallback) {
    banner = {
      titleKey: 'result.leafBanner.title',
      messageKey: 'result.leafBanner.message',
    };
  }

  // 2) EV red-band "wide range" note (only when not fallback)
  if (sampleSize != null && sampleSize > 0 && row.yellow != null && row.red_high != null) {
    const yellow = Number(row.yellow);
    const redHigh = Number(row.red_high);
    if (yellow > 0 && redHigh >= yellow * 1.5) {
      notes.push('result.leafWideRangeNote.message');
    }
  }

  // 3) High-mileage EV caution (300k+)
  const mileage = row.mileage_km_num != null ? Number(row.mileage_km_num) : undefined;
  if (mileage != null && mileage >= 300000) {
    notes.push('result.leafHighMileageNote.message');
  }

  if (!banner && notes.length === 0) return null;
  return { banner: banner || undefined, notes };
}
