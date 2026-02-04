import { getPorscheLuxuryLimitedNotice } from './getPorscheLuxuryLimitedNotice';

describe('getPorscheLuxuryLimitedNotice', () => {
  const luxuryModels = ['PANAMERA', 'MACAN', 'CAYENNE', '718', '911', 'TAYCAN'];

  it('returns notice when Porsche luxury model and sample_size <= 3', () => {
    const row = { sample_size: 2, confidence: 0.5, ui_notice: null };
    luxuryModels.forEach((model) => {
      const out = getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model });
      expect(out).not.toBeNull();
      expect(out.messageKey).toBe('result.porscheLuxuryLimitedNotice.message');
    });
  });

  it('returns notice when Porsche luxury model and confidence <= 0.45', () => {
    const row = { sample_size: 10, confidence: 0.4, ui_notice: null };
    const out = getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model: '911' });
    expect(out).not.toBeNull();
  });

  it('returns notice when Porsche luxury model and ui_notice is limited_market_data', () => {
    const row = { sample_size: 5, confidence: 0.6, ui_notice: 'limited_market_data' };
    const out = getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model: 'MACAN' });
    expect(out).not.toBeNull();
  });

  it('returns notice when Porsche luxury model and ui_notice is extremely_limited_data', () => {
    const row = { sample_size: 5, confidence: 0.6, ui_notice: 'extremely_limited_data' };
    const out = getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model: 'TAYCAN' });
    expect(out).not.toBeNull();
  });

  it('returns null when Porsche luxury model but none of the limited-data conditions', () => {
    const row = { sample_size: 10, confidence: 0.6, ui_notice: null };
    const out = getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model: '911' });
    expect(out).toBeNull();
  });

  it('returns null for non-Porsche make', () => {
    const row = { sample_size: 1, confidence: 0.3, ui_notice: null };
    expect(getPorscheLuxuryLimitedNotice(row, { make: 'BMW', model: '911' })).toBeNull();
  });

  it('returns null for non-luxury Porsche model', () => {
    const row = { sample_size: 1, confidence: 0.3, ui_notice: null };
    expect(getPorscheLuxuryLimitedNotice(row, { make: 'PORSCHE', model: 'CAYMAN' })).toBeNull();
  });
});
