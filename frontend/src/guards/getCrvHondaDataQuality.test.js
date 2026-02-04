import { getCrvHondaDataQuality } from './getCrvHondaDataQuality';

const CRV_META = { make: 'HONDA', model: 'CR-V' };

describe('getCrvHondaDataQuality', () => {
  it('returns no-comparables banner when sample_size === 0 or estimate_basis === fallback_no_comparables (Honda CR-V only)', () => {
    const resultRow = { sample_size: 0, estimate_basis: 'fallback_no_comparables', confidence: 0.2 };
    const banner = getCrvHondaDataQuality(resultRow, CRV_META);
    expect(banner).not.toBeNull();
    expect(banner.titleKey).toBe('result.crvDataQuality.noComparables.title');
    expect(banner.messageKey).toBe('result.crvDataQuality.noComparables.message');
  });

  it('returns limited-market banner when sample_size <= 2 (Honda CR-V only)', () => {
    const resultRow = { sample_size: 1, estimate_basis: 'based_on_comparable_listings', confidence: 0.5 };
    const banner = getCrvHondaDataQuality(resultRow, CRV_META);
    expect(banner).not.toBeNull();
    expect(banner.titleKey).toBe('result.crvDataQuality.limitedMarket.title');
    expect(banner.messageKey).toBe('result.crvDataQuality.limitedMarket.message');
  });

  it('returns null when sample_size >= 3 and no limited flags (Honda CR-V)', () => {
    const resultRow = { sample_size: 3, estimate_basis: 'based_on_comparable_listings', confidence: 0.6 };
    const banner = getCrvHondaDataQuality(resultRow, CRV_META);
    expect(banner).toBeNull();
  });

  it('returns null for non-HONDA or non-CR-V (must never show banner)', () => {
    const resultRow = { sample_size: 0, estimate_basis: 'fallback_no_comparables' };
    expect(getCrvHondaDataQuality(resultRow, { make: 'TOYOTA', model: 'CR-V' })).toBeNull();
    expect(getCrvHondaDataQuality(resultRow, { make: 'HONDA', model: 'CIVIC' })).toBeNull();
  });
});
