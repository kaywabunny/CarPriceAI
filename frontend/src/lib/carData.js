/**
 * Car lookup data extracted from brand_model_series_lookup.xlsx
 * This data is used for the cascading dropdowns (Make → Model → Trim)
 * 
 * In production, this would be fetched from the backend database.
 */

export const CAR_DATA = [
  // AUDI
  { brand: "AUDI", model: "A4", series: "UNKNOWN" },
  { brand: "AUDI", model: "A5", series: "UNKNOWN" },
  { brand: "AUDI", model: "Q5", series: "UNKNOWN" },
  { brand: "AUDI", model: "Q7", series: "UNKNOWN" },
  { brand: "AUDI", model: "RS4", series: "UNKNOWN" },
  { brand: "AUDI", model: "TT", series: "2.0 QUATTRO COUPE -QUARO 4 WD" },
  { brand: "AUDI", model: "TT", series: "UNKNOWN" },
  
  // BENTLEY
  { brand: "BENTLEY", model: "FLYING SPUR", series: "UNKNOWN" },
  
  // BENZ / MERCEDES-BENZ
  { brand: "BENZ", model: "A-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "B-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "C-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "CLA-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "CLS-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "E-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "EQS-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "GLA-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "GLC-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "GLE-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "ML-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "S-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "SLK-CLASS", series: "UNKNOWN" },
  { brand: "BENZ", model: "SPRINTER", series: "UNKNOWN" },
  { brand: "BENZ", model: "VITO", series: "UNKNOWN" },
  
  // BMW - Selected popular models with trims
  { brand: "BMW", model: "116 I", series: "116 I 1.6" },
  { brand: "BMW", model: "116 I", series: "116 I 1.6 M SPORT" },
  { brand: "BMW", model: "118 I", series: "118 I 1.5 M SPORT" },
  { brand: "BMW", model: "118 I", series: "118 I 1.5 SPORT" },
  { brand: "BMW", model: "320 D", series: "2.0 LUXURY (F30)" },
  { brand: "BMW", model: "320 D", series: "2.0 M SPORT (F30)" },
  { brand: "BMW", model: "320 D", series: "2.0 M SPORT (G20) (CKD)" },
  { brand: "BMW", model: "320 D", series: "2.0 SPORT (F30)" },
  { brand: "BMW", model: "320 I", series: "2.0 LUXURY (F30)" },
  { brand: "BMW", model: "320 I", series: "2.0 M SPORT (F30)" },
  { brand: "BMW", model: "320 I", series: "2.0 SPORT (F30)" },
  { brand: "BMW", model: "330 E", series: "2.0 M SPORT (G20) (CKD)" },
  { brand: "BMW", model: "330 I", series: "2.0 M SPORT (G20) (CBU)" },
  { brand: "BMW", model: "520 D", series: "2.0 M SPORT (G30) (CKD)" },
  { brand: "BMW", model: "520 D", series: "2.0 LUXURY (G30)" },
  { brand: "BMW", model: "530 E", series: "2.0 M SPORT (G30) (CKD)" },
  { brand: "BMW", model: "X1", series: "UNKNOWN" },
  { brand: "BMW", model: "X3", series: "UNKNOWN" },
  { brand: "BMW", model: "X5", series: "UNKNOWN" },
  { brand: "BMW", model: "SERIES 3", series: "UNKNOWN" },
  { brand: "BMW", model: "SERIES 5", series: "UNKNOWN" },
  
  // BYD
  { brand: "BYD", model: "DOLPHIN", series: "UNKNOWN" },
  { brand: "BYD", model: "ATTO 3", series: "UNKNOWN" },
  { brand: "BYD", model: "SEAL", series: "UNKNOWN" },
  
  // CHEVROLET
  { brand: "CHEVROLET", model: "AVEO", series: "AVEO 1.4 LS" },
  { brand: "CHEVROLET", model: "AVEO", series: "AVEO 1.6 LT" },
  { brand: "CHEVROLET", model: "CAPTIVA", series: "CAPTIVA 1.5 PREMIER (MY19)" },
  { brand: "CHEVROLET", model: "CAPTIVA", series: "CAPTIVA 2.0 LTZ" },
  { brand: "CHEVROLET", model: "COLORADO", series: "UNKNOWN" },
  { brand: "CHEVROLET", model: "CRUZE", series: "CRUZE 1.8 LT" },
  { brand: "CHEVROLET", model: "CRUZE", series: "CRUZE 1.8 LTZ" },
  { brand: "CHEVROLET", model: "TRAILBLAZER", series: "TRAILBLAZER 2.8 LTZ" },
  { brand: "CHEVROLET", model: "TRAILBLAZER", series: "UNKNOWN" },
  
  // FORD
  { brand: "FORD", model: "ECOSPORT", series: "ECOSPORT 1.5 TITANIUM AUTO" },
  { brand: "FORD", model: "ECOSPORT", series: "ECOSPORT 1.5 TREND AUTO" },
  { brand: "FORD", model: "EVEREST", series: "EVEREST 2.0 TURBO TITANIUM" },
  { brand: "FORD", model: "EVEREST", series: "EVEREST 2.0 BI-TURBO TITANIUM+ 4WD" },
  { brand: "FORD", model: "EVEREST", series: "UNKNOWN" },
  { brand: "FORD", model: "RANGER", series: "RANGER 2.2 XLT" },
  { brand: "FORD", model: "RANGER", series: "RANGER 2.0 WILDTRAK" },
  { brand: "FORD", model: "RANGER", series: "UNKNOWN" },
  { brand: "FORD", model: "FOCUS", series: "UNKNOWN" },
  
  // HONDA
  { brand: "HONDA", model: "ACCORD", series: "ACCORD 2.0 EL" },
  { brand: "HONDA", model: "ACCORD", series: "ACCORD 2.4 EL" },
  { brand: "HONDA", model: "ACCORD", series: "ACCORD 1.5 TURBO EL" },
  { brand: "HONDA", model: "ACCORD", series: "UNKNOWN" },
  { brand: "HONDA", model: "BR-V", series: "BR-V 1.5 SV" },
  { brand: "HONDA", model: "BR-V", series: "BR-V 1.5 E" },
  { brand: "HONDA", model: "CITY", series: "CITY 1.0 TURBO SV" },
  { brand: "HONDA", model: "CITY", series: "CITY 1.5 V" },
  { brand: "HONDA", model: "CITY", series: "CITY 1.5 SV" },
  { brand: "HONDA", model: "CITY", series: "UNKNOWN" },
  { brand: "HONDA", model: "CIVIC", series: "CIVIC 1.5 TURBO" },
  { brand: "HONDA", model: "CIVIC", series: "CIVIC 1.8 EL" },
  { brand: "HONDA", model: "CIVIC", series: "CIVIC 2.0 TYPE R" },
  { brand: "HONDA", model: "CIVIC", series: "UNKNOWN" },
  { brand: "HONDA", model: "CR-V", series: "CR-V 2.4 EL 4WD" },
  { brand: "HONDA", model: "CR-V", series: "CR-V 1.5 TURBO" },
  { brand: "HONDA", model: "CR-V", series: "UNKNOWN" },
  { brand: "HONDA", model: "HR-V", series: "HR-V 1.8 EL" },
  { brand: "HONDA", model: "HR-V", series: "HR-V 1.8 E" },
  { brand: "HONDA", model: "HR-V", series: "UNKNOWN" },
  { brand: "HONDA", model: "JAZZ", series: "JAZZ 1.5 V" },
  { brand: "HONDA", model: "JAZZ", series: "JAZZ 1.5 SV" },
  { brand: "HONDA", model: "JAZZ", series: "UNKNOWN" },
  
  // HYUNDAI
  { brand: "HYUNDAI", model: "H-1", series: "H-1 2.5 ELITE" },
  { brand: "HYUNDAI", model: "H-1", series: "UNKNOWN" },
  { brand: "HYUNDAI", model: "KONA", series: "KONA ELECTRIC" },
  { brand: "HYUNDAI", model: "KONA", series: "UNKNOWN" },
  { brand: "HYUNDAI", model: "IONIQ 5", series: "UNKNOWN" },
  { brand: "HYUNDAI", model: "TUCSON", series: "UNKNOWN" },
  { brand: "HYUNDAI", model: "STARGAZER", series: "UNKNOWN" },
  
  // ISUZU
  { brand: "ISUZU", model: "D-MAX", series: "D-MAX 1.9 HI-LANDER" },
  { brand: "ISUZU", model: "D-MAX", series: "D-MAX 3.0 V-CROSS" },
  { brand: "ISUZU", model: "D-MAX", series: "UNKNOWN" },
  { brand: "ISUZU", model: "MU-X", series: "MU-X 1.9" },
  { brand: "ISUZU", model: "MU-X", series: "MU-X 3.0" },
  { brand: "ISUZU", model: "MU-X", series: "UNKNOWN" },
  
  // KIA
  { brand: "KIA", model: "CARNIVAL", series: "CARNIVAL 2.2 SX" },
  { brand: "KIA", model: "CARNIVAL", series: "UNKNOWN" },
  { brand: "KIA", model: "EV6", series: "UNKNOWN" },
  { brand: "KIA", model: "SORENTO", series: "UNKNOWN" },
  { brand: "KIA", model: "SPORTAGE", series: "UNKNOWN" },
  
  // LEXUS
  { brand: "LEXUS", model: "ES", series: "ES 300H" },
  { brand: "LEXUS", model: "ES", series: "UNKNOWN" },
  { brand: "LEXUS", model: "IS", series: "IS 300" },
  { brand: "LEXUS", model: "IS", series: "UNKNOWN" },
  { brand: "LEXUS", model: "NX", series: "NX 300" },
  { brand: "LEXUS", model: "NX", series: "NX 350H" },
  { brand: "LEXUS", model: "NX", series: "UNKNOWN" },
  { brand: "LEXUS", model: "RX", series: "RX 300" },
  { brand: "LEXUS", model: "RX", series: "RX 350" },
  { brand: "LEXUS", model: "RX", series: "UNKNOWN" },
  
  // MAZDA
  { brand: "MAZDA", model: "2", series: "MAZDA2 1.3 S" },
  { brand: "MAZDA", model: "2", series: "MAZDA2 1.5 XD" },
  { brand: "MAZDA", model: "2", series: "UNKNOWN" },
  { brand: "MAZDA", model: "3", series: "MAZDA3 2.0 SP" },
  { brand: "MAZDA", model: "3", series: "MAZDA3 2.0 S" },
  { brand: "MAZDA", model: "3", series: "UNKNOWN" },
  { brand: "MAZDA", model: "CX-3", series: "CX-3 2.0 SP" },
  { brand: "MAZDA", model: "CX-3", series: "UNKNOWN" },
  { brand: "MAZDA", model: "CX-30", series: "CX-30 2.0 SP" },
  { brand: "MAZDA", model: "CX-30", series: "UNKNOWN" },
  { brand: "MAZDA", model: "CX-5", series: "CX-5 2.0 SP" },
  { brand: "MAZDA", model: "CX-5", series: "CX-5 2.2 XDL" },
  { brand: "MAZDA", model: "CX-5", series: "UNKNOWN" },
  { brand: "MAZDA", model: "CX-8", series: "UNKNOWN" },
  { brand: "MAZDA", model: "BT-50", series: "UNKNOWN" },
  
  // MG
  { brand: "MG", model: "3", series: "MG3 1.5 X" },
  { brand: "MG", model: "3", series: "UNKNOWN" },
  { brand: "MG", model: "5", series: "MG5 1.5 D" },
  { brand: "MG", model: "5", series: "UNKNOWN" },
  { brand: "MG", model: "HS", series: "MG HS 1.5 X" },
  { brand: "MG", model: "HS", series: "UNKNOWN" },
  { brand: "MG", model: "ZS", series: "MG ZS 1.5 X" },
  { brand: "MG", model: "ZS", series: "MG ZS EV" },
  { brand: "MG", model: "ZS", series: "UNKNOWN" },
  { brand: "MG", model: "EP", series: "UNKNOWN" },
  { brand: "MG", model: "EXTENDER", series: "UNKNOWN" },
  
  // MITSUBISHI
  { brand: "MITSUBISHI", model: "ATTRAGE", series: "ATTRAGE 1.2 GLS" },
  { brand: "MITSUBISHI", model: "ATTRAGE", series: "UNKNOWN" },
  { brand: "MITSUBISHI", model: "MIRAGE", series: "MIRAGE 1.2 GLS" },
  { brand: "MITSUBISHI", model: "MIRAGE", series: "UNKNOWN" },
  { brand: "MITSUBISHI", model: "OUTLANDER", series: "OUTLANDER PHEV" },
  { brand: "MITSUBISHI", model: "OUTLANDER", series: "UNKNOWN" },
  { brand: "MITSUBISHI", model: "PAJERO SPORT", series: "PAJERO SPORT 2.4 GT" },
  { brand: "MITSUBISHI", model: "PAJERO SPORT", series: "UNKNOWN" },
  { brand: "MITSUBISHI", model: "TRITON", series: "TRITON 2.4 GT" },
  { brand: "MITSUBISHI", model: "TRITON", series: "UNKNOWN" },
  { brand: "MITSUBISHI", model: "XPANDER", series: "XPANDER 1.5 GT" },
  { brand: "MITSUBISHI", model: "XPANDER", series: "UNKNOWN" },
  
  // NISSAN
  { brand: "NISSAN", model: "ALMERA", series: "ALMERA 1.0 VL" },
  { brand: "NISSAN", model: "ALMERA", series: "UNKNOWN" },
  { brand: "NISSAN", model: "KICKS", series: "KICKS E-POWER" },
  { brand: "NISSAN", model: "KICKS", series: "UNKNOWN" },
  { brand: "NISSAN", model: "LEAF", series: "UNKNOWN" },
  { brand: "NISSAN", model: "MARCH", series: "MARCH 1.2 E" },
  { brand: "NISSAN", model: "MARCH", series: "UNKNOWN" },
  { brand: "NISSAN", model: "NAVARA", series: "NAVARA 2.3 VL" },
  { brand: "NISSAN", model: "NAVARA", series: "UNKNOWN" },
  { brand: "NISSAN", model: "NOTE", series: "NOTE E-POWER" },
  { brand: "NISSAN", model: "NOTE", series: "UNKNOWN" },
  { brand: "NISSAN", model: "TERRA", series: "TERRA 2.3 VL" },
  { brand: "NISSAN", model: "TERRA", series: "UNKNOWN" },
  { brand: "NISSAN", model: "X-TRAIL", series: "X-TRAIL 2.0 V HYBRID" },
  { brand: "NISSAN", model: "X-TRAIL", series: "UNKNOWN" },
  
  // PORSCHE
  { brand: "PORSCHE", model: "718", series: "718 CAYMAN" },
  { brand: "PORSCHE", model: "718", series: "718 BOXSTER" },
  { brand: "PORSCHE", model: "911", series: "911 CARRERA" },
  { brand: "PORSCHE", model: "911", series: "911 TURBO" },
  { brand: "PORSCHE", model: "911", series: "UNKNOWN" },
  { brand: "PORSCHE", model: "CAYENNE", series: "CAYENNE S" },
  { brand: "PORSCHE", model: "CAYENNE", series: "UNKNOWN" },
  { brand: "PORSCHE", model: "MACAN", series: "MACAN S" },
  { brand: "PORSCHE", model: "MACAN", series: "UNKNOWN" },
  { brand: "PORSCHE", model: "PANAMERA", series: "PANAMERA 4S" },
  { brand: "PORSCHE", model: "PANAMERA", series: "UNKNOWN" },
  { brand: "PORSCHE", model: "TAYCAN", series: "UNKNOWN" },
  
  // SUBARU
  { brand: "SUBARU", model: "BRZ", series: "BRZ 2.0" },
  { brand: "SUBARU", model: "FORESTER", series: "FORESTER 2.0 I-S" },
  { brand: "SUBARU", model: "FORESTER", series: "UNKNOWN" },
  { brand: "SUBARU", model: "OUTBACK", series: "OUTBACK 2.5 I" },
  { brand: "SUBARU", model: "OUTBACK", series: "UNKNOWN" },
  { brand: "SUBARU", model: "XV", series: "XV 2.0 I-P" },
  { brand: "SUBARU", model: "XV", series: "UNKNOWN" },
  
  // SUZUKI
  { brand: "SUZUKI", model: "CELERIO", series: "CELERIO 1.0 GL" },
  { brand: "SUZUKI", model: "CELERIO", series: "UNKNOWN" },
  { brand: "SUZUKI", model: "CIAZ", series: "CIAZ 1.2 GL" },
  { brand: "SUZUKI", model: "CIAZ", series: "UNKNOWN" },
  { brand: "SUZUKI", model: "ERTIGA", series: "ERTIGA 1.5 GX" },
  { brand: "SUZUKI", model: "ERTIGA", series: "UNKNOWN" },
  { brand: "SUZUKI", model: "JIMNY", series: "JIMNY 1.5" },
  { brand: "SUZUKI", model: "JIMNY", series: "UNKNOWN" },
  { brand: "SUZUKI", model: "SWIFT", series: "SWIFT 1.2 GLX" },
  { brand: "SUZUKI", model: "SWIFT", series: "UNKNOWN" },
  { brand: "SUZUKI", model: "XL7", series: "XL7 1.5 GLX" },
  { brand: "SUZUKI", model: "XL7", series: "UNKNOWN" },
  
  // TESLA
  { brand: "TESLA", model: "MODEL 3", series: "UNKNOWN" },
  { brand: "TESLA", model: "MODEL Y", series: "UNKNOWN" },
  { brand: "TESLA", model: "MODEL S", series: "UNKNOWN" },
  { brand: "TESLA", model: "MODEL X", series: "UNKNOWN" },
  
  // TOYOTA - Extensive list
  { brand: "TOYOTA", model: "86 GT", series: "86 GT 2.0 STD" },
  { brand: "TOYOTA", model: "ALPHARD", series: "ALPHARD 2.5 HYBRID" },
  { brand: "TOYOTA", model: "ALPHARD", series: "ALPHARD 3.5 EXECUTIVE LOUNGE" },
  { brand: "TOYOTA", model: "ALPHARD", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "AVANZA", series: "AVANZA 1.5 G" },
  { brand: "TOYOTA", model: "AVANZA", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "CAMRY", series: "CAMRY 2.0 G" },
  { brand: "TOYOTA", model: "CAMRY", series: "CAMRY 2.5 G" },
  { brand: "TOYOTA", model: "CAMRY", series: "CAMRY 2.5 HYBRID" },
  { brand: "TOYOTA", model: "CAMRY", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "C-HR", series: "C-HR 1.8 HYBRID" },
  { brand: "TOYOTA", model: "C-HR", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "COMMUTER", series: "COMMUTER 2.8" },
  { brand: "TOYOTA", model: "COMMUTER", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "COROLLA ALTIS", series: "COROLLA ALTIS 1.6 G" },
  { brand: "TOYOTA", model: "COROLLA ALTIS", series: "COROLLA ALTIS 1.8 ESPORT" },
  { brand: "TOYOTA", model: "COROLLA ALTIS", series: "COROLLA ALTIS 1.8 HYBRID" },
  { brand: "TOYOTA", model: "COROLLA ALTIS", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "COROLLA CROSS", series: "COROLLA CROSS 1.8 HYBRID PREMIUM" },
  { brand: "TOYOTA", model: "COROLLA CROSS", series: "COROLLA CROSS 1.8 SPORT" },
  { brand: "TOYOTA", model: "COROLLA CROSS", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "FORTUNER", series: "FORTUNER 2.4 V" },
  { brand: "TOYOTA", model: "FORTUNER", series: "FORTUNER 2.8 V" },
  { brand: "TOYOTA", model: "FORTUNER", series: "FORTUNER 2.4 LEGENDER" },
  { brand: "TOYOTA", model: "FORTUNER", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "HILUX REVO", series: "HILUX REVO 2.4 E" },
  { brand: "TOYOTA", model: "HILUX REVO", series: "HILUX REVO 2.8 ROCCO" },
  { brand: "TOYOTA", model: "HILUX REVO", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "INNOVA", series: "INNOVA 2.0 G" },
  { brand: "TOYOTA", model: "INNOVA", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "LAND CRUISER", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "PRIUS", series: "PRIUS 1.8 HYBRID" },
  { brand: "TOYOTA", model: "PRIUS", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "SIENTA", series: "SIENTA 1.5 V" },
  { brand: "TOYOTA", model: "SIENTA", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "VELLFIRE", series: "VELLFIRE 2.5 HYBRID" },
  { brand: "TOYOTA", model: "VELLFIRE", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "VIOS", series: "VIOS 1.5 E" },
  { brand: "TOYOTA", model: "VIOS", series: "VIOS 1.5 G" },
  { brand: "TOYOTA", model: "VIOS", series: "VIOS 1.5 J" },
  { brand: "TOYOTA", model: "VIOS", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "YARIS", series: "YARIS 1.2 E" },
  { brand: "TOYOTA", model: "YARIS", series: "YARIS 1.2 G" },
  { brand: "TOYOTA", model: "YARIS", series: "YARIS ATIV 1.2 S" },
  { brand: "TOYOTA", model: "YARIS", series: "UNKNOWN" },
  { brand: "TOYOTA", model: "YARIS CROSS", series: "YARIS CROSS 1.5 HYBRID" },
  { brand: "TOYOTA", model: "YARIS CROSS", series: "UNKNOWN" },
  
  // VOLVO
  { brand: "VOLVO", model: "S60", series: "UNKNOWN" },
  { brand: "VOLVO", model: "S90", series: "UNKNOWN" },
  { brand: "VOLVO", model: "V60", series: "UNKNOWN" },
  { brand: "VOLVO", model: "XC40", series: "XC40 RECHARGE" },
  { brand: "VOLVO", model: "XC40", series: "UNKNOWN" },
  { brand: "VOLVO", model: "XC60", series: "UNKNOWN" },
  { brand: "VOLVO", model: "XC90", series: "UNKNOWN" },
  
  // FERRARI (Luxury)
  { brand: "FERRARI", model: "296 GTB", series: "UNKNOWN" },
  { brand: "FERRARI", model: "488 GTB", series: "UNKNOWN" },
  { brand: "FERRARI", model: "F8 TRIBUTO", series: "UNKNOWN" },
  { brand: "FERRARI", model: "ROMA", series: "UNKNOWN" },
  { brand: "FERRARI", model: "PORTOFINO", series: "UNKNOWN" },
  
  // ORA (EV)
  { brand: "ORA", model: "GOOD CAT", series: "GOOD CAT EV 400 PRO" },
  { brand: "ORA", model: "GOOD CAT", series: "GOOD CAT EV 500 ULTRA" },
  { brand: "ORA", model: "GOOD CAT", series: "UNKNOWN" },
  
  // NETA (EV)
  { brand: "NETA", model: "V", series: "UNKNOWN" },
  
  // GWM
  { brand: "GWM", model: "HAVAL H6", series: "UNKNOWN" },
  { brand: "GWM", model: "ORA GOOD CAT", series: "UNKNOWN" },
];

/**
 * Get unique makes from car data
 * @returns {string[]} Sorted array of unique makes
 */
export const getUniqueMakes = () => {
  return [...new Set(CAR_DATA.map(item => item.brand))].sort();
};

/**
 * Get models for a specific make
 * @param {string} make - Make name
 * @returns {string[]} Sorted array of models
 */
export const getModelsForMake = (make) => {
  return [...new Set(
    CAR_DATA
      .filter(item => item.brand === make)
      .map(item => item.model)
  )].sort();
};

/**
 * Get trims for a specific make and model
 * @param {string} make - Make name
 * @param {string} model - Model name
 * @returns {string[]} Sorted array of trims (excluding UNKNOWN)
 */
export const getTrimsForMakeModel = (make, model) => {
  return [...new Set(
    CAR_DATA
      .filter(item => item.brand === make && item.model === model)
      .map(item => item.series)
      .filter(series => series && series !== 'UNKNOWN')
  )].sort();
};
