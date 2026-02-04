import { getMarchUiNote } from './getMarchUiNote';

const MARCH_META = { make: 'NISSAN', model: 'MARCH' };

describe('getMarchUiNote', () => {
  it('Nissan March with sample_size <= 3 shows note', () => {
    const row = { sample_size: 2, confidence: 0.5 };
    const note = getMarchUiNote(row, MARCH_META);
    expect(note).not.toBeNull();
    expect(note.messageKey).toBe('result.marchLimitedNote.message');
  });

  it('Nissan March with confidence <= 0.45 shows note', () => {
    const row = { sample_size: 5, confidence: 0.4 };
    const note = getMarchUiNote(row, MARCH_META);
    expect(note).not.toBeNull();
  });

  it('Nissan March with collapsed green band (green_low == green_median == green_high) shows note', () => {
    const row = { sample_size: 4, confidence: 0.6, green_low: 200000, green_median: 200000, green_high: 200000 };
    const note = getMarchUiNote(row, MARCH_META);
    expect(note).not.toBeNull();
  });

  it('Nissan March with ui_notice shows note', () => {
    const row = { sample_size: 4, ui_notice: 'extremely_limited_data' };
    const note = getMarchUiNote(row, MARCH_META);
    expect(note).not.toBeNull();
  });

  it('Nissan March with sample_size > 3, confidence > 0.45, no collapsed band, no ui_notice returns null', () => {
    const row = { sample_size: 5, confidence: 0.6, green_low: 180000, green_median: 200000, green_high: 220000 };
    const note = getMarchUiNote(row, MARCH_META);
    expect(note).toBeNull();
  });

  it('Non-March Nissan never shows note', () => {
    const row = { sample_size: 1, confidence: 0.3 };
    expect(getMarchUiNote(row, { make: 'NISSAN', model: 'KICKS' })).toBeNull();
    expect(getMarchUiNote(row, { make: 'NISSAN', model: 'LEAF' })).toBeNull();
    expect(getMarchUiNote(row, { make: 'NISSAN', model: 'ALMERA' })).toBeNull();
  });

  it('Non-Nissan never shows note', () => {
    const row = { sample_size: 1, confidence: 0.3 };
    expect(getMarchUiNote(row, { make: 'TOYOTA', model: 'MARCH' })).toBeNull();
  });
});
