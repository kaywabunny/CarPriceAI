/**
 * ORA GOOD CAT (EV) model-specific UI notice when fallback pricing is used.
 * UI-only: no pricing or API changes. Improves transparency for limited EV market data.
 *
 * Trigger: make = ORA, model = GOODCAT, estimate_basis = fallback_no_comparables.
 *
 * @param {object} resultRow - One result row: estimate_basis
 * @param {object} requestMeta - Request context: { make, model }
 * @returns {null|{ titleKey: string, bodyKey: string }}
 */
export function getOraGoodCatLimitedNotice(resultRow, requestMeta) {
  if (!resultRow || !requestMeta) return null;

  const make = requestMeta.make != null ? String(requestMeta.make).trim().toUpperCase() : '';
  const model = requestMeta.model != null ? String(requestMeta.model).trim().toUpperCase().replace(/\s+/g, ' ') : '';

  if (make !== 'ORA') return null;
  const modelNorm = model.replace(/\s+/g, '');
  if (modelNorm !== 'GOODCAT') return null;

  const estimateBasis = resultRow.estimate_basis;
  if (estimateBasis !== 'fallback_no_comparables') return null;

  return {
    titleKey: 'result.oraGoodCatLimitedNotice.title',
    bodyKey: 'result.oraGoodCatLimitedNotice.body',
  };
}
