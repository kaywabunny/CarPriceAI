/**
 * Production year rules: make/model → valid years.
 * Frontend-only: restricts year dropdown and blocks submit for years not in production.
 *
 * Format per entry:
 * - Single range: { make, model, startYear, endYear }
 * - Non-continuous: { make, model, ranges: [[start,end], [start,end], ...] }
 */

const PRODUCTION_RULES = [
  // --- AUDI (TL;DR: A4→2023 then A5; A5 meaning changes 2024; Q5/Q7 safe; RS4 non-continuous; TT discontinued 2023) ---
  { make: 'AUDI', model: 'A4', startYear: 1994, endYear: 2023 }, // Renamed to A5 in 2024
  { make: 'AUDI', model: 'A5', startYear: 2007, endYear: 2025 }, // Meaning changes in 2024
  { make: 'AUDI', model: 'Q5', startYear: 2008, endYear: 2025 }, // Safe
  { make: 'AUDI', model: 'Q7', startYear: 2005, endYear: 2025 }, // Safe
  {
    make: 'AUDI',
    model: 'RS4',
    ranges: [
      [2000, 2001],   // B5
      [2006, 2008],   // B7
      [2012, 2015],   // B8
      [2018, 2025],   // B9 — non-continuous
    ],
  },
  { make: 'AUDI', model: 'TT', startYear: 1998, endYear: 2023 }, // Discontinued 2023

  // --- BMW ---
  { make: 'BMW', model: '116i', startYear: 2004, endYear: 2019 },   // discontinued after 2019
  { make: 'BMW', model: '118i', startYear: 2007, endYear: 2025 },
  { make: 'BMW', model: '320d', startYear: 1998, endYear: 2025 },
  { make: 'BMW', model: '320i', startYear: 1998, endYear: 2025 },
  { make: 'BMW', model: '330i', startYear: 2000, endYear: 2025 },
  { make: 'BMW', model: '330e', startYear: 2016, endYear: 2025 },  // plug-in hybrid, F30 & G20
  { make: 'BMW', model: '520d', startYear: 2005, endYear: 2025 },
  { make: 'BMW', model: '530e', startYear: 2017, endYear: 2025 },  // plug-in hybrid
  { make: 'BMW', model: 'X1', startYear: 2009, endYear: 2025 },
  { make: 'BMW', model: 'X3', startYear: 2003, endYear: 2025 },
  { make: 'BMW', model: 'X5', startYear: 1999, endYear: 2025 },
  { make: 'BMW', model: 'SERIES 3', startYear: 1995, endYear: 2025 },
  { make: 'BMW', model: 'SERIES 5', startYear: 1995, endYear: 2025 },

  // --- BENTLEY ---
  { make: 'BENTLEY', model: 'FLYING SPUR', startYear: 2005, endYear: 2025 }, // 2005–2013 Continental Flying Spur, 2014+ Flying Spur

  // --- BYD ---
  { make: 'BYD', model: 'ATTO 3', startYear: 2022, endYear: 2025 },
  { make: 'BYD', model: 'DOLPHIN', startYear: 2023, endYear: 2025 },
  { make: 'BYD', model: 'SEAL', startYear: 2023, endYear: 2025 },

  // --- CHEVROLET ---
  { make: 'CHEVROLET', model: 'AVEO', startYear: 2003, endYear: 2012 },   // discontinued 2012
  { make: 'CHEVROLET', model: 'CAPTIVA', startYear: 2006, endYear: 2025 }, // original 2006–2018; rebadged Wuling MY19+ 2019–2025
  { make: 'CHEVROLET', model: 'COLORADO', startYear: 2004, endYear: 2025 },
  { make: 'CHEVROLET', model: 'CRUZE', startYear: 2009, endYear: 2017 },   // discontinued 2017
  { make: 'CHEVROLET', model: 'TRAILBLAZER', startYear: 2012, endYear: 2023 }, // PPV/SUV Thailand

  // --- FERRARI ---
  { make: 'FERRARI', model: '296 GTB', startYear: 2022, endYear: 2025 },
  { make: 'FERRARI', model: '488 GTB', startYear: 2015, endYear: 2019 },   // discontinued 2019
  { make: 'FERRARI', model: 'F8 TRIBUTO', startYear: 2019, endYear: 2023 }, // discontinued 2023
  { make: 'FERRARI', model: 'PORTOFINO', startYear: 2017, endYear: 2023 },  // discontinued 2023
  { make: 'FERRARI', model: 'ROMA', startYear: 2020, endYear: 2025 },

  // --- FORD ---
  { make: 'FORD', model: 'ECOSPORT', startYear: 2013, endYear: 2022 },   // discontinued 2022
  { make: 'FORD', model: 'EVEREST', startYear: 2003, endYear: 2025 },
  { make: 'FORD', model: 'FOCUS', startYear: 1998, endYear: 2018 },      // discontinued Thailand 2018
  { make: 'FORD', model: 'RANGER', startYear: 1998, endYear: 2025 },

  // --- GWM (Great Wall Motor) ---
  { make: 'GWM', model: 'ORA GOOD CAT', startYear: 2021, endYear: 2025 },  // also ORA Funky Cat in some markets
  { make: 'GWM', model: 'HAVAL H6', startYear: 2021, endYear: 2025 },

  // --- HONDA (Thailand market-safe) ---
  { make: 'HONDA', model: 'ACCORD', startYear: 1990, endYear: 2025 },
  { make: 'HONDA', model: 'BR-V', startYear: 2016, endYear: 2025 },
  { make: 'HONDA', model: 'CITY', startYear: 1996, endYear: 2025 },
  { make: 'HONDA', model: 'CIVIC', startYear: 1990, endYear: 2025 },
  { make: 'HONDA', model: 'CR-V', startYear: 1996, endYear: 2025 },
  { make: 'HONDA', model: 'HR-V', startYear: 2014, endYear: 2025 },
  { make: 'HONDA', model: 'JAZZ', startYear: 2003, endYear: 2025 },   // Thailand/Asia market

  // --- HYUNDAI ---
  { make: 'HYUNDAI', model: 'H-1', startYear: 2008, endYear: 2025 },
  { make: 'HYUNDAI', model: 'IONIQ 5', startYear: 2021, endYear: 2025 },  // EV; hard min
  { make: 'HYUNDAI', model: 'KONA', startYear: 2018, endYear: 2025 },
  { make: 'HYUNDAI', model: 'STARGAZER', startYear: 2022, endYear: 2025 }, // hard min
  { make: 'HYUNDAI', model: 'TUCSON', startYear: 2004, endYear: 2025 },

  // --- ISUZU ---
  { make: 'ISUZU', model: 'D-MAX', startYear: 2002, endYear: 2025 },
  { make: 'ISUZU', model: 'MU-X', startYear: 2013, endYear: 2025 },

  // --- KIA ---
  { make: 'KIA', model: 'CARNIVAL', startYear: 1998, endYear: 2025 },   // Thailand = Carnival; Sedona in some markets
  { make: 'KIA', model: 'EV6', startYear: 2021, endYear: 2025 },        // EV-only, year-gated
  { make: 'KIA', model: 'SORENTO', startYear: 2002, endYear: 2025 },
  { make: 'KIA', model: 'SPORTAGE', startYear: 1993, endYear: 2025 },   // long-running global model

  // --- LEXUS ---
  { make: 'LEXUS', model: 'ES', startYear: 1989, endYear: 2025 },
  { make: 'LEXUS', model: 'IS', startYear: 1998, endYear: 2025 },
  { make: 'LEXUS', model: 'NX', startYear: 2014, endYear: 2025 },   // hard min_year; NX200/NX300/NX350h within window
  { make: 'LEXUS', model: 'RX', startYear: 1998, endYear: 2025 },

  // --- MAZDA ---
  { make: 'MAZDA', model: '2', startYear: 2003, endYear: 2025 },       // Mazda2/Demio; Thailand strong
  { make: 'MAZDA', model: '3', startYear: 2003, endYear: 2025 },      // replaced 323; hatch & sedan
  { make: 'MAZDA', model: 'BT-50', startYear: 2006, endYear: 2025 },
  { make: 'MAZDA', model: 'CX-3', startYear: 2015, endYear: 2025 },   // does not exist pre-2015
  { make: 'MAZDA', model: 'CX-30', startYear: 2019, endYear: 2025 },
  { make: 'MAZDA', model: 'CX-5', startYear: 2012, endYear: 2025 },
  { make: 'MAZDA', model: 'CX-8', startYear: 2017, endYear: 2025 },   // 3-row; never existed earlier

  // --- MG ---
  { make: 'MG', model: '3', startYear: 2011, endYear: 2025 },         // global hatch; Thailand data mostly 2015+
  { make: 'MG', model: '5', startYear: 2015, endYear: 2025 },        // sedan; Thailand sales from ~2015
  { make: 'MG', model: 'EP', startYear: 2020, endYear: 2025 },        // EV wagon; hard min_year
  { make: 'MG', model: 'EXTENDER', startYear: 2019, endYear: 2025 },  // pickup
  { make: 'MG', model: 'HS', startYear: 2018, endYear: 2025 },        // SUV / HS PHEV; does not exist before 2018
  { make: 'MG', model: 'ZS', startYear: 2017, endYear: 2025 },       // includes ZS EV

  // --- MITSUBISHI ---
  { make: 'MITSUBISHI', model: 'ATTRAGE', startYear: 2013, endYear: 2025 },  // Mirage sedan; Thailand strong
  { make: 'MITSUBISHI', model: 'MIRAGE', startYear: 2012, endYear: 2025 },   // hatchback; huge sample sizes
  { make: 'MITSUBISHI', model: 'PAJERO SPORT', startYear: 2008, endYear: 2025 },
  { make: 'MITSUBISHI', model: 'OUTLANDER', startYear: 2007, endYear: 2025 },  // hard min 2007; PHEV from ~2013
  { make: 'MITSUBISHI', model: 'TRITON', startYear: 2005, endYear: 2025 },   // Triton naming stabilized ~2005
  { make: 'MITSUBISHI', model: 'XPANDER', startYear: 2017, endYear: 2025 },  // MPV; hard block, no older equivalents

  // --- NETA (EV) ---
  { make: 'NETA', model: 'V', startYear: 2022, endYear: 2025 },

  // --- ORA (GWM EV brand; Thailand 2021+) ---
  { make: 'ORA', model: 'GOOD CAT', startYear: 2021, endYear: 2025 },

  // --- NISSAN ---
  { make: 'NISSAN', model: 'ALMERA', startYear: 2011, endYear: 2025 },   // replaced Sunny; B-segment Thailand
  { make: 'NISSAN', model: 'KICKS', startYear: 2020, endYear: 2025 },    // Thailand = e-Power era; hard min
  { make: 'NISSAN', model: 'LEAF', startYear: 2018, endYear: 2025 },    // Thailand market late; EV
  { make: 'NISSAN', model: 'MARCH', startYear: 2010, endYear: 2025 },   // Micra globally, March in Thailand
  { make: 'NISSAN', model: 'NAVARA', startYear: 2005, endYear: 2025 },  // D40 → NP300; name stable
  { make: 'NISSAN', model: 'NOTE', startYear: 2014, endYear: 2025 },    // Thailand from ~2014; e-Power later
  { make: 'NISSAN', model: 'TERRA', startYear: 2018, endYear: 2025 },   // Navara-based SUV; hard min
  { make: 'NISSAN', model: 'X-TRAIL', startYear: 2008, endYear: 2025 }, // hard min 2008; Thailand thin pre-2008

  // --- PORSCHE ---
  { make: 'PORSCHE', model: '718', startYear: 2016, endYear: 2025 },     // 718 naming from 2016 (Boxster/Cayman)
  { make: 'PORSCHE', model: '911', startYear: 1990, endYear: 2025 },   // pre-1990 = classic, limited data
  { make: 'PORSCHE', model: 'CAYENNE', startYear: 2003, endYear: 2025 },
  { make: 'PORSCHE', model: 'MACAN', startYear: 2014, endYear: 2025 },  // no earlier generation
  { make: 'PORSCHE', model: 'PANAMERA', startYear: 2009, endYear: 2025 },
  { make: 'PORSCHE', model: 'TAYCAN', startYear: 2019, endYear: 2025 },  // first full EV; hard min

  // --- SUBARU ---
  { make: 'SUBARU', model: 'BRZ', startYear: 2012, endYear: 2025 },       // Toyota/Subaru; hard min
  { make: 'SUBARU', model: 'FORESTER', startYear: 1997, endYear: 2025 },
  { make: 'SUBARU', model: 'OUTBACK', startYear: 1995, endYear: 2025 },  // Legacy Outback earlier; unified
  { make: 'SUBARU', model: 'XV', startYear: 2012, endYear: 2025 },      // Crosstrek in some markets; XV in Thailand

  // --- SUZUKI ---
  { make: 'SUZUKI', model: 'CELERIO', startYear: 2014, endYear: 2025 },  // Thailand from ~2014; hard min
  { make: 'SUZUKI', model: 'CIAZ', startYear: 2015, endYear: 2025 },    // ASEAN; hard min
  { make: 'SUZUKI', model: 'ERTIGA', startYear: 2013, endYear: 2025 },   // MPV Thailand; hard min
  { make: 'SUZUKI', model: 'JIMNY', startYear: 2005, endYear: 2025 },  // Thailand data sparse before ~2005
  { make: 'SUZUKI', model: 'SWIFT', startYear: 2005, endYear: 2025 },   // modern Swift Thailand-relevant; hard min
  { make: 'SUZUKI', model: 'XL7', startYear: 2020, endYear: 2025 },     // Ertiga-based; no older gen; hard min

  // --- TESLA ---
  { make: 'TESLA', model: 'MODEL 3', startYear: 2017, endYear: 2025 },  // very common
  { make: 'TESLA', model: 'MODEL S', startYear: 2012, endYear: 2025 },  // safe
  { make: 'TESLA', model: 'MODEL X', startYear: 2015, endYear: 2025 },  // safe
  { make: 'TESLA', model: 'MODEL Y', startYear: 2020, endYear: 2025 },  // hard block earlier

  // --- TOYOTA ---
  { make: 'TOYOTA', model: '86 GT', startYear: 2012, endYear: 2025 },   // renamed to GR 86
  { make: 'TOYOTA', model: 'ALPHARD', startYear: 2002, endYear: 2025 },
  { make: 'TOYOTA', model: 'AVANZA', startYear: 2003, endYear: 2025 },
  { make: 'TOYOTA', model: 'CAMRY', startYear: 1990, endYear: 2025 },  // long-running
  { make: 'TOYOTA', model: 'C-HR', startYear: 2016, endYear: 2025 },   // hard min
  { make: 'TOYOTA', model: 'COMMUTER', startYear: 1987, endYear: 2025 }, // van logic
  { make: 'TOYOTA', model: 'COROLLA ALTIS', startYear: 2000, endYear: 2025 }, // Thai-specific
  { make: 'TOYOTA', model: 'COROLLA CROSS', startYear: 2020, endYear: 2025 }, // hard min
  { make: 'TOYOTA', model: 'FORTUNER', startYear: 2004, endYear: 2025 },
  { make: 'TOYOTA', model: 'HILUX REVO', startYear: 2015, endYear: 2025 },  // ≠ Hilux; hard min
  { make: 'TOYOTA', model: 'INNOVA', startYear: 2004, endYear: 2025 },
  { make: 'TOYOTA', model: 'LAND CRUISER', startYear: 1990, endYear: 2025 },
  { make: 'TOYOTA', model: 'PRIUS', startYear: 1997, endYear: 2025 },   // hard min
  { make: 'TOYOTA', model: 'SIENTA', startYear: 2003, endYear: 2025 },
  { make: 'TOYOTA', model: 'VELLFIRE', startYear: 2008, endYear: 2025 },
  { make: 'TOYOTA', model: 'VIOS', startYear: 2002, endYear: 2025 },
  { make: 'TOYOTA', model: 'YARIS', startYear: 2000, endYear: 2025 },   // ≠ Yaris Cross
  { make: 'TOYOTA', model: 'YARIS CROSS', startYear: 2020, endYear: 2025 }, // hard min; ≠ Yaris

  // --- VOLVO ---
  { make: 'VOLVO', model: 'S60', startYear: 2000, endYear: 2025 },
  { make: 'VOLVO', model: 'S90', startYear: 2016, endYear: 2025 },   // hard min
  { make: 'VOLVO', model: 'V60', startYear: 2010, endYear: 2025 },
  { make: 'VOLVO', model: 'XC40', startYear: 2017, endYear: 2025 },  // hard min
  { make: 'VOLVO', model: 'XC60', startYear: 2008, endYear: 2025 },
  { make: 'VOLVO', model: 'XC90', startYear: 2002, endYear: 2025 },

  // --- MERCEDES-BENZ ---
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', startYear: 1997, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'B-CLASS', startYear: 2005, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', startYear: 1993, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'CLA-CLASS', startYear: 2013, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'CLS-CLASS', startYear: 2004, endYear: 2023 }, // discontinued 2023, replaced by CLE
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', startYear: 1995, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'EQS-CLASS', startYear: 2021, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'GLA-CLASS', startYear: 2014, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'GLC-CLASS', startYear: 2015, endYear: 2025 }, // before 2015: GLK-Class
  { make: 'MERCEDES-BENZ', model: 'GLE-CLASS', startYear: 2016, endYear: 2025 }, // before 2016: ML-Class
  { make: 'MERCEDES-BENZ', model: 'ML-CLASS', startYear: 1997, endYear: 2015 },   // renamed to GLE 2016
  { make: 'MERCEDES-BENZ', model: 'S-CLASS', startYear: 1972, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'SLK-CLASS', startYear: 1996, endYear: 2020 }, // discontinued; replaced by SLC 2016–2020
  { make: 'MERCEDES-BENZ', model: 'SPRINTER', startYear: 1995, endYear: 2025 },
  { make: 'MERCEDES-BENZ', model: 'VITO', startYear: 1996, endYear: 2025 },
];

/**
 * Optional UI notices for make/model (translation keys).
 * Key: normalized "MAKE|MODEL", value: translation key for productionNotice.*
 */
const PRODUCTION_NOTICES = {
  'AUDI|A4': 'productionNotice.audi.a4',
  'AUDI|A5': 'productionNotice.audi.a5',
  'AUDI|Q7': 'productionNotice.audi.q7',
  'AUDI|RS4': 'productionNotice.audi.rs4',
  'AUDI|TT': 'productionNotice.audi.tt',
  'BMW|116I': 'productionNotice.bmw.116i',
  'BMW|118I': 'productionNotice.bmw.118i',
  'BMW|330E': 'productionNotice.bmw.330e',
   // BMW SUV / generic series notices
  'BMW|X1': 'productionNotice.bmw.x1',
  'BMW|X5': 'productionNotice.bmw.x5',
  'BMW|SERIES3': 'productionNotice.bmw.series3',
  'BMW|SERIES5': 'productionNotice.bmw.series5',
  'BENTLEY|FLYINGSPUR': 'productionNotice.bentley.flyingSpur',
  'CHEVROLET|CAPTIVA': 'productionNotice.chevrolet.captiva',
  'FERRARI|296GTB': 'productionNotice.ferrari.296gtb',
  'MERCEDES-BENZ|CLA-CLASS': 'productionNotice.mercedes.claClass',
  'MERCEDES-BENZ|CLS-CLASS': 'productionNotice.mercedes.clsClass',
  'MERCEDES-BENZ|EQS-CLASS': 'productionNotice.mercedes.eqsClass',
  'MERCEDES-BENZ|GLA-CLASS': 'productionNotice.mercedes.glaClass',
  'MERCEDES-BENZ|GLC-CLASS': 'productionNotice.mercedes.glcClass',
  'MERCEDES-BENZ|GLE-CLASS': 'productionNotice.mercedes.gleClass',
  'MERCEDES-BENZ|ML-CLASS': 'productionNotice.mercedes.mlClass',
  'MERCEDES-BENZ|SLK-CLASS': 'productionNotice.mercedes.slkClass',
  'MERCEDES-BENZ|SPRINTER': 'productionNotice.mercedes.sprinter',
  'MERCEDES-BENZ|VITO': 'productionNotice.mercedes.vito',
  'MITSUBISHI|OUTLANDER': 'productionNotice.mitsubishi.outlander',
  'NISSAN|X-TRAIL': 'productionNotice.nissan.xtrail',
  'PORSCHE|911': 'productionNotice.porsche.911',
  'SUBARU|OUTBACK': 'productionNotice.subaru.outback',
};

function _norm(s) {
  return (s || '').toString().trim().toUpperCase();
}

/** Model key for lookup: strip spaces so "116 I" and "116i" both match rule "116i". */
function _normModel(s) {
  return _norm(s).replace(/\s+/g, '');
}

/** API/dropdown may return BENZ or MERCEDES-BENZ; normalize for rule/notice lookup. */
function _makeKey(m) {
  return m === 'BENZ' ? 'MERCEDES-BENZ' : m;
}

/** Pre-built map: "MAKE|MODEL" (normalized) -> rule. Ensures carData variants like "116 I" match. */
function _buildRuleMap() {
  const map = Object.create(null);
  for (const r of PRODUCTION_RULES) {
    const makeKey = _makeKey(_norm(r.make));
    const modelKey = _normModel(r.model);
    const key = `${makeKey}|${modelKey}`;
    if (!map[key]) map[key] = r;
  }
  return map;
}
const _PRODUCTION_RULE_MAP = _buildRuleMap();

/**
 * Get list of valid production years for the year dropdown (sorted descending, capped by maxYear).
 * @param {string} make
 * @param {string} model
 * @param {number} maxYear - e.g. 2025, to cap future years
 * @returns {number[] | null} null = no rule, caller should allow all years
 */
export function getProductionYears(make, model, maxYear = 2025) {
  const m = _norm(make);
  const o = _normModel(model);
  if (!m || !o) return null;
  const makeKey = _makeKey(m);
  const rule = _PRODUCTION_RULE_MAP[`${makeKey}|${o}`] ?? PRODUCTION_RULES.find(
    (r) => _makeKey(_norm(r.make)) === makeKey && _normModel(r.model) === o
  );
  if (!rule) return null;

  const cap = (y) => Math.min(y, maxYear);
  let years = [];

  if (rule.ranges && Array.isArray(rule.ranges)) {
    const set = new Set();
    for (const [start, end] of rule.ranges) {
      for (let y = start; y <= end; y++) set.add(cap(y));
    }
    years = [...set].sort((a, b) => b - a);
  } else {
    const start = Number(rule.startYear);
    const end = cap(Number(rule.endYear));
    for (let y = end; y >= start; y--) years.push(y);
  }

  return years.length ? years : null;
}

/**
 * Get production year range for a make/model (single range only; for models with ranges, use getProductionYears).
 * @param {string} make
 * @param {string} model
 * @returns {{ startYear: number, endYear: number } | null} null = no rule or non-continuous
 */
export function getProductionYearRange(make, model) {
  const years = getProductionYears(make, model, 2025);
  if (!years || years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return { startYear: min, endYear: max };
}

/**
 * Whether the given year is in production for this make/model.
 * @param {string} make
 * @param {string} model
 * @param {number|string} year
 * @returns {boolean} true if no rule or year is valid
 */
export function isYearInProduction(make, model, year) {
  const years = getProductionYears(make, model, 2025);
  if (!years) return true;
  const y = typeof year === 'number' ? year : parseInt(year, 10);
  if (Number.isNaN(y)) return false;
  return years.includes(y);
}

/**
 * Get translation key for production notice for this make/model, if any.
 * @param {string} make
 * @param {string} model
 * @returns {string | null} translation key or null
 */
export function getProductionNoticeKey(make, model) {
  const m = _norm(make);
  const o = _normModel(model);
  if (!m || !o) return null;
  const makeKey = _makeKey(m);
  return PRODUCTION_NOTICES[`${makeKey}|${o}`] || PRODUCTION_NOTICES[`${m}|${o}`] || null;
}
