/**
 * Toyota sports cars (86, GR86, SUPRA) UI-only banner when fallback + newer model + very low confidence.
 * No pricing or API changes. Trigger when ALL are true: estimate_basis fallback_no_comparables, year >= 2022, confidence <= 0.25.
 *
 * @param {object} resultRow - One result row: estimate_basis, confidence
 * @param {object} requestMeta - Request context: { make, model, year }
 * @returns {null|{ messageKey: string }}
 */
export function getToyotaSportsFallbackBanner(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase().replace(/\s+/g, ' ') : '';
  const year = requestMeta.year != null ? Number(requestMeta.year) : undefined;

  if (make !== 'TOYOTA') return null;

  const isSports =
    model === '86' ||
    model === '86 GT' ||
    model === '86GT' ||
    model === 'GR86' ||
    model === 'GR 86' ||
    model === 'SUPRA' ||
    (model.includes('86') && model.length <= 12);

  if (!isSports) return null;

  const estimateBasis = resultRow.estimate_basis;
  const confidence = resultRow.confidence != null ? Number(resultRow.confidence) : undefined;

  const allTrue =
    estimateBasis === 'fallback_no_comparables' &&
    year != null &&
    year >= 2022 &&
    confidence != null &&
    confidence <= 0.25;

  if (!allTrue) return null;

  return { messageKey: 'result.toyotaSportsFallbackBanner.message' };
}
