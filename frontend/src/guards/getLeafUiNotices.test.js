import { getLeafUiNotices } from './getLeafUiNotices';

const LEAF_META = { make: 'NISSAN', model: 'LEAF', year: 2020 };

describe('getLeafUiNotices', () => {
  it('LEAF row with sample_size=0 and estimate_basis=fallback_no_comparables shows banner (Samples: 0 in UI)', () => {
    const row = { sample_size: 0, estimate_basis: 'fallback_no_comparables', confidence: 0.2 };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(out).not.toBeNull();
    expect(out.banner).not.toBeUndefined();
    expect(out.banner.titleKey).toBe('result.leafBanner.title');
    expect(out.banner.messageKey).toBe('result.leafBanner.message');
  });

  it('LEAF row with sample_size=4 and red_high >= yellow*1.5 shows wide-range note', () => {
    const row = {
      sample_size: 4,
      estimate_basis: 'based_on_comparable_listings',
      yellow: 400000,
      red_high: 620000,
    };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(out).not.toBeNull();
    expect(out.notes).toContain('result.leafWideRangeNote.message');
  });

  it('LEAF row with mileage_km_num >= 300000 shows high-mileage note', () => {
    const row = {
      sample_size: 2,
      mileage_km_num: 320000,
    };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(out).not.toBeNull();
    expect(out.notes).toContain('result.leafHighMileageNote.message');
  });

  it('Non-LEAF model never shows banner/notes even if sample_size=0', () => {
    const row = { sample_size: 0, estimate_basis: 'fallback_no_comparables' };
    expect(getLeafUiNotices(row, { make: 'NISSAN', model: 'KICKS', year: 2020 })).toBeNull();
    expect(getLeafUiNotices(row, { make: 'NISSAN', model: 'SENTRA', year: 2020 })).toBeNull();
    expect(getLeafUiNotices(row, { make: 'TOYOTA', model: 'LEAF', year: 2020 })).toBeNull();
  });

  it('LEAF with fallback due to ui_notice extremely_limited_data + estimate_basis fallback shows banner', () => {
    const row = {
      sample_size: 1,
      ui_notice: 'extremely_limited_data',
      estimate_basis: 'fallback_no_comparables',
    };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(out?.banner).toBeDefined();
  });

  it('LEAF with sample_size>0 and red_high < yellow*1.5 does not add wide-range note', () => {
    const row = {
      sample_size: 4,
      yellow: 500000,
      red_high: 600000,
    };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(!out?.notes?.includes('result.leafWideRangeNote.message')).toBe(true);
  });

  it('LEAF with mileage < 300000 does not add high-mileage note', () => {
    const row = { sample_size: 2, mileage_km_num: 200000 };
    const out = getLeafUiNotices(row, LEAF_META);
    expect(!out?.notes?.includes('result.leafHighMileageNote.message')).toBe(true);
  });
});
