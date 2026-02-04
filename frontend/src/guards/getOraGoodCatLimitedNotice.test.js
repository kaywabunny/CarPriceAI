import { getOraGoodCatLimitedNotice } from './getOraGoodCatLimitedNotice';

describe('getOraGoodCatLimitedNotice', () => {
  it('returns notice when ORA GOODCAT and estimate_basis is fallback_no_comparables', () => {
    const row = { estimate_basis: 'fallback_no_comparables' };
    const meta = { make: 'ORA', model: 'GOODCAT' };
    const out = getOraGoodCatLimitedNotice(row, meta);
    expect(out).not.toBeNull();
    expect(out.titleKey).toBe('result.oraGoodCatLimitedNotice.title');
    expect(out.bodyKey).toBe('result.oraGoodCatLimitedNotice.body');
  });

  it('returns null when ORA GOODCAT but estimate_basis is not fallback_no_comparables', () => {
    const row = { estimate_basis: 'based_on_comparable_listings' };
    const meta = { make: 'ORA', model: 'GOODCAT' };
    expect(getOraGoodCatLimitedNotice(row, meta)).toBeNull();
  });

  it('returns null for non-ORA make', () => {
    const row = { estimate_basis: 'fallback_no_comparables' };
    expect(getOraGoodCatLimitedNotice(row, { make: 'BYD', model: 'GOODCAT' })).toBeNull();
    expect(getOraGoodCatLimitedNotice(row, { make: 'NISSAN', model: 'GOODCAT' })).toBeNull();
  });

  it('returns null for non-GOODCAT model', () => {
    const row = { estimate_basis: 'fallback_no_comparables' };
    expect(getOraGoodCatLimitedNotice(row, { make: 'ORA', model: 'DOLPHIN' })).toBeNull();
  });

  it('normalizes make/model case and spacing (GOOD CAT / GOODCAT)', () => {
    const row = { estimate_basis: 'fallback_no_comparables' };
    expect(getOraGoodCatLimitedNotice(row, { make: 'ora', model: 'Good Cat' })).not.toBeNull();
    expect(getOraGoodCatLimitedNotice(row, { make: 'ORA', model: 'GOODCAT' })).not.toBeNull();
    expect(getOraGoodCatLimitedNotice(row, { make: 'ORA', model: 'GOOD CAT' })).not.toBeNull();
  });
});
