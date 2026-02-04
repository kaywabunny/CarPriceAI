import { getKicksUiNote } from './getKicksUiNote';

const KICKS_META = { make: 'NISSAN', model: 'KICKS' };

describe('getKicksUiNote', () => {
  it('Nissan Kicks E-POWER row with sample_size=1 shows E-POWER message (Samples shown in UI via showSamplesInHeader)', () => {
    const resultRow = { sample_size: 1, confidence: 0.35, estimate_basis: 'market_trends' };
    const note = getKicksUiNote(resultRow, { ...KICKS_META, submodel: 'E-POWER 1.2' });
    expect(note).not.toBeNull();
    expect(note.messageKey).toBe('result.kicksLimitedNote.ePower');
    expect(note.variant).toBe('e_power');
  });

  it('Nissan Kicks petrol row with sample_size=2 shows petrol message (Samples: 2 in UI)', () => {
    const resultRow = { sample_size: 2, confidence: 0.45, estimate_basis: 'based_on_comparable_listings' };
    const note = getKicksUiNote(resultRow, { ...KICKS_META, submodel: '1.0 VL' });
    expect(note).not.toBeNull();
    expect(note.messageKey).toBe('result.kicksLimitedNote.petrol');
    expect(note.variant).toBe('petrol');
  });

  it('Nissan Kicks row with sample_size=5 and confidence>=0.4 shows no note', () => {
    const resultRow = { sample_size: 5, confidence: 0.5, estimate_basis: 'based_on_comparable_listings' };
    const note = getKicksUiNote(resultRow, { ...KICKS_META, submodel: '1.0 VL' });
    expect(note).toBeNull();
  });

  it('Non-Nissan never shows any note', () => {
    const resultRow = { sample_size: 1, confidence: 0.3 };
    expect(getKicksUiNote(resultRow, { make: 'TOYOTA', model: 'KICKS', submodel: '' })).toBeNull();
    expect(getKicksUiNote(resultRow, { make: 'HONDA', model: 'KICKS', submodel: '' })).toBeNull();
  });

  it('Non-Kicks never shows any note', () => {
    const resultRow = { sample_size: 1, confidence: 0.3 };
    expect(getKicksUiNote(resultRow, { make: 'NISSAN', model: 'SENTRA', submodel: '' })).toBeNull();
    expect(getKicksUiNote(resultRow, { make: 'NISSAN', model: 'ALMERA', submodel: '' })).toBeNull();
  });

  it('handles model casing variations (KICKs -> KICKS)', () => {
    const resultRow = { sample_size: 1, confidence: 0.3 };
    const note = getKicksUiNote(resultRow, { make: 'NISSAN', model: 'KICKs', submodel: 'E-POWER' });
    expect(note).not.toBeNull();
    expect(note.variant).toBe('e_power');
  });

  it('returns secondaryMessageKey when submodel is None/Not sure (E-POWER vs petrol clarification)', () => {
    const resultRow = { sample_size: 1, confidence: 0.3 };
    const noteEmpty = getKicksUiNote(resultRow, { ...KICKS_META, submodel: '' });
    expect(noteEmpty?.secondaryMessageKey).toBe('result.kicksEpowerVsPetrol.message');
    const noteNone = getKicksUiNote(resultRow, { ...KICKS_META, submodel: 'None / Not sure' });
    expect(noteNone?.secondaryMessageKey).toBe('result.kicksEpowerVsPetrol.message');
  });

  it('no secondaryMessageKey when submodel is specified (e.g. E-POWER or petrol trim)', () => {
    const resultRow = { sample_size: 1, confidence: 0.3 };
    const noteEpower = getKicksUiNote(resultRow, { ...KICKS_META, submodel: 'E-POWER' });
    expect(noteEpower?.secondaryMessageKey).toBeUndefined();
    const notePetrol = getKicksUiNote(resultRow, { ...KICKS_META, submodel: '1.0 VL' });
    expect(notePetrol?.secondaryMessageKey).toBeUndefined();
  });
});
