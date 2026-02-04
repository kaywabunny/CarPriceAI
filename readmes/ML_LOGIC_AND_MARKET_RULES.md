# ML Logic & Market Rules

This document explains **how the pricing ML works**, **why this design is suitable for the project**, and **all market rules / guardrails** applied in `price_helper.py` to keep estimates sane when data is sparse.

---

## Part 1: ML Flow and Why It’s Designed This Way

### 1.1 High-level pipeline

1. **Request** → make, model, year, mileage_km_num, submodel/trim, etc.
2. **Feature build** → `_add_features(req)` normalizes inputs, clips mileage to [0, 450k], and builds categorical + numeric + engineered features.
3. **Raw prediction** → Three LightGBM quantile models predict **log(price)** at q20, q50, q80; convert to THB via `exp`.
4. **Blend with group median** → q50 is blended with (brand, model, year) group median (default 30% weight) for stability.
5. **Sanity caps** → q20 ≥ 0.65×q50, q80 ≤ 1.75×q50; q50 clipped to ±35% of group median when available.
6. **Year-distance depreciation** → Non-ML discount for older years (e.g. 4% per year gap, cap 40%) so 2016 ≠ 2019 when data is thin.
7. **Band construction** → Green (q20→q50), yellow (q50), red (q50→q80) with fixed ratios; optional band-width and red cap (e.g. red_high ≤ green_low × 1.85).
8. **Market rules** → All post-processing rules below (mileage monotonicity, sample-size/age clamps, model-specific guardrails, etc.).
9. **Ordering & rounding** → Ensure green_low ≤ … ≤ red_high; round to 1k/5k THB; set confidence, estimate_basis, sample_size, ui_notice.

### 1.2 Why LightGBM quantile regression?

- **Quantiles (q20, q50, q80)** give a **range** (green–yellow–red) instead of a single point, which fits “good deal / market / higher price” and reflects uncertainty.
- **LightGBM** handles mixed categorical (brand, model, submodel, gear, color) and numeric (year, mileage, age, log_mileage, etc.) well, trains fast, and is robust with moderate data size.
- **Log(price)** target keeps errors relative and avoids predicting negative or extreme prices; THB rounding (1k &lt; 1M, 5k ≥ 1M) keeps outputs readable.

### 1.3 Why blend with group median?

- **Sparse data**: Many (brand, model, year) cells have few or no listings. The raw model can extrapolate poorly; blending (e.g. 30%) toward the **group median** (from training data) anchors estimates to observed market levels.
- **Interpretability**: Group medians are “average listing price for this make/model/year”; blending makes the output clearly tied to that reference.
- **Stability**: Reduces sensitivity to single weird listings or thin trim-level data.

### 1.4 Why so many post-processing rules?

- **Market reality**: Listings are sparse and uneven (e.g. luxury vs economy, old vs new, niche trims). The ML sees whatever is in the training set; it doesn’t know “older car should be cheaper than newer” or “red band shouldn’t be 2× yellow when we have 1 listing.”
- **Guardrails** encode domain rules (monotonicity in mileage/year, caps on red band for old/low-sample cases, model-specific fixes) so that **even when data is sparse**, outputs stay plausible and ordered. They don’t replace the ML; they correct the worst failures and keep the UX consistent.

### 1.5 Why this is a good fit for the project

- **Sparse, heterogeneous data** → Quantiles + group-median blend + many small guardrails avoid wild swings and keep estimates usable where data is thin.
- **Transparency** → Confidence, estimate_basis, sample_size, and ui_notice communicate data quality; band structure is simple (green / yellow / red).
- **No retrain needed for rules** → New market rules can be added in `price_helper.py` without retraining the models, so the system can be tuned as the product evolves.

---

## Part 2: All Market Rules (from `price_helper.py`)

Below is a **catalog of every market rule / guardrail** applied after the raw ML output. Order of application matches the code flow where relevant.

---

### 2.1 Pre-prediction (early exits / blocks)

| Rule | Trigger | Effect |
|------|--------|--------|
| **High-performance / low-data block** | Certain high-performance models (e.g. Audi RS) when data is insufficient | Return `unsupported_model`; no price bands. Avoids misleading estimates on very thin data. |
| **Audi TT &lt; 2019** | AUDI, TT, year &lt; 2019 | Return `pricing_unavailable` (extreme distortion from rare/import/RS variants). |
| **BENZ EQS-CLASS &lt; 2021** | BENZ/MERCEDES-BENZ, EQS-CLASS, year &lt; 2021 | Return “not produced in selected year”. |
| **BENZ GLC-CLASS &lt; 2015** | BENZ, GLC-CLASS, year &lt; 2015 | Same (not produced). |
| **BENZ GLE-CLASS &lt; 2016** | BENZ, GLE-CLASS, year &lt; 2016 | Same. |
| **BENZ ML-CLASS ≥ 2016** | BENZ, ML-CLASS, year ≥ 2016 | Return “discontinued and renamed to GLE-CLASS”. |
| **BENZ SLK-CLASS ≥ 2016** | BENZ, SLK-CLASS, year ≥ 2016 | Return “discontinued and renamed to SLC-CLASS”. |
| **BMW 320d trim/year** | BMW, 320d, trim not produced in selected year (e.g. G20 CKD &lt; 2019, F30 &gt; 2018) | Return “trim not produced in selected year”. |
| **BYD Seal production** | BYD, Seal, year before production start | Return “model not in production for selected year”. |
| **Ferrari 296 GTB &lt; 2022** | Ferrari, 296 GTB, year &lt; 2022 | Return “not in production for selected year”. |
| **Bentley Flying Spur (no listings)** | BENTLEY, FLYING SPUR, sample_size = 0 | Return `pricing_unavailable` (limited, spec-dependent listings). |

These rules **block** pricing for known bad or unsupported model/year combinations so the ML is never run in those cases.

---

### 2.2 Core post-prediction rules (bands already built)

| Rule | Trigger | Effect |
|------|--------|--------|
| **Luxury high-mileage penalty** | LEXUS, BMW, MERCEDES, AUDI (not economy makes); mileage ≥ 300k or ≥ 450k | Uniform multiplier on all bands: 0.92 at ≥300k, 0.85 at ≥450k. Reduces unrealistic highs for very high mileage luxury cars. Economy (e.g. MAZDA, TOYOTA, HONDA, NISSAN) and CX-3 are excluded. |
| **Mileage monotonic correction** | Any mileage ≠ 100k baseline | Ensures price decreases as mileage increases: baseline at 100k km, then depreciation (segment slope, cap 40%) above baseline and premium (cap 10%) below. **High-mileage 300k–450k**: extra 0–7% penalty so 450k &lt; 300k (avoids 300k/450k collapse). |
| **Low sample-size clamp** | sample_size ≤ 3 | red_median ≤ yellow×1.08, red_high ≤ yellow×1.12; preserve red ordering. Tames volatility when few comparables. |
| **Age-based clamp** | vehicle_age ≥ 10 | red_median ≤ yellow×1.08, red_high ≤ yellow×1.12. Old cars don’t get an unrealistically wide red band. |
| **Old-car safeguard** | vehicle_age ≥ 10 | red_high ≤ green_median×1.35; if needed, nudge red_median/red_low to preserve ordering. |
| **No-comparables tightening** | sample_size = 0 | Tighten all bands around yellow (e.g. green 85–95% of yellow, red 102–108%). Fallback estimates stay conservative. |
| **Band ordering** | After any step | `_ensure_band_ordering`: enforce green_low ≤ green_median ≤ green_high ≤ yellow ≤ red_low ≤ red_median ≤ red_high; minimal nudges if violated. |
| **Minimum red band width (sparse)** | sample_size 1–3 | If red span &lt; yellow×0.06, expand red band to at least that width so bands aren’t unrealistically tight. |

---

### 2.3 Segment and band-width rules

| Rule | Trigger | Effect |
|------|--------|--------|
| **Segment cap (B/C segment)** | Make/model in known B-segment (e.g. Mazda 2, Honda City, Yaris, Almera, Swift, Attrage) or C-segment (e.g. Mazda 3, Civic, Corolla, Sentra) | B: cap 650k THB; C: cap 1.2M THB. If any band exceeds cap, scale all bands down proportionally. Keeps eco/sedan segments within plausible range. |
| **Band-width clamp** | red_high &gt; yellow×1.35 or green_low &lt; yellow×0.65 | Set `bandwidth_clamped = true`; later red cap (red_high ≤ green_low×1.85) and confidence reduction apply. Prevents extreme spreads. |
| **Red cap vs green** | red_high &gt; green_low×1.85 | Cap red_high at green_low×1.85 and recompute red_low/red_median from yellow. |

---

### 2.4 Year-ordering and economy rules

| Rule | Trigger | Effect |
|------|--------|--------|
| **Fallback year-ordering** | estimate_basis = fallback_no_comparables, year &gt; 0 | Fetch result for year+1; scale current result so older year ≤ newer/1.05 (yellow; if vehicle_age ≥ 10 also green_median). Avoids older year &gt; newer when there are no comparables. |
| **Rule A – Economy year separation** | estimate_basis = market_trends, sample_size ≤ 3, make in {MAZDA, TOYOTA, HONDA, NISSAN} | Fetch result for year+1; if older green_median &gt; newer/1.05, scale older bands down so older ≤ newer/1.05. Stops economy cars from collapsing across years when data is sparse. |

---

### 2.5 Model-specific guardrails

| Rule | Trigger | Effect |
|------|--------|--------|
| **NISSAN ALMERA** | NISSAN, ALMERA | Red clamps: if sample_size ≤ 3 then red_median ≤ yellow×1.10, red_high ≤ yellow×1.15; if vehicle_age ≥ 10 then red ≤ yellow×1.08/1.12; if no trim and year ≤ 2019 then same red caps (generation separation). Then enforce band ordering. |
| **NISSAN NOTE E-POWER** | NISSAN, NOTE, submodel contains “E-POWER”, sample_size ≤ 1 | Fetch base NOTE (no trim); enforce green_median ≥ base_green_median×1.05 via uniform scale; preserve ordering. Stops E-POWER from collapsing to base NOTE price with 0–1 samples. |
| **BENZ SPRINTER & VITO** | BENZ, SPRINTER or VITO, sample_size &lt; 2 | Slightly narrow bands around yellow (green_high ≤ yellow×0.95, red_low ≥ yellow×1.05); re-apply band ordering. Commercial vehicles with very few comparables. |
| **MG stabilization (multi-mileage)** | MG, multiple mileage results, flat green_median across mileages, sparse data | Apply mileage decay curve so higher mileage gets lower price (used in batch/multi-mileage response only). |

---

### 2.6 Post-output guards and metadata

| Rule | Trigger | Effect |
|------|--------|--------|
| **BYD Dolphin (fallback + no comparables)** | BYD, DOLPHIN, sample_size = 0, estimate_basis = fallback_no_comparables | Return `pricing_unavailable` (“not produced in selected year”) to avoid showing fallback for invalid year. |
| **BMW X1 outlier guard** | BMW, X1, green_median &gt; 2M THB | Return `pricing_unavailable` (insufficient/inconsistent data). Temporary safety net until X1 data improves. |
| **Max deviation from group median** | Group median available, yellow &gt; gmed×(1 + max_deviation) | Scale all bands down so yellow stays within 40–50% of group median (higher allowance when confidence &lt; 0.6). Avoids single bad predictions far from market. |
| **Confidence / estimate_basis** | By sample_size and comparables | sample_size = 0 → estimate_basis = fallback_no_comparables, confidence = 0.20; else by buckets (e.g. 1→0.30, 2→0.45, 5→0.60, 10→0.75, 20→0.85). market_trends caps confidence at 0.45; bandwidth_clamped reduces confidence. |
| **ui_notice / data_quality** | sample_size, make/model | e.g. extremely_limited_data (≤1), limited_market_data (≤2), high_spec_variance (BENZ S-CLASS, 2020+, &lt;4), commercial_vehicle_pricing (SPRINTER/VITO), no_comparables. UI-only; no change to band values. |

---

### 2.6 Feature and lookup rules (supporting the above)

| Rule | Trigger | Effect |
|------|--------|--------|
| **Strict model normalization** | All requests | e.g. Mazda “2” vs “3”/“CX-3”/“2.0L” kept distinct; BENZ model names normalized (EQS-CLASS, GLC-CLASS, etc.). Prevents wrong model match. |
| **Honda Civic Type R isolation** | HONDA, CIVIC | Group median from Civic listings split by Type R vs non–Type R so high-value Type R doesn’t pull standard Civic median up. |
| **Mileage slope by segment** | Used in mileage monotonic correction | Premium: 1% per 10k; economy (e.g. SUZUKI, DAIHATSU): 2% per 10k; default 1.5%. |
| **Mileage cap in features** | _add_features | mileage_km_num clipped to [0, 450_000] before log/sqrt/ratio features. |

---

## Summary

- **ML**: LightGBM quantile regression (q20, q50, q80) on log(price), with group-median blend, sanity caps, and band construction. This design fits **sparse, mixed data** and gives **ranges** (green/yellow/red) plus **transparency** (confidence, estimate_basis, sample_size).
- **Market rules**: Do **not** retrain the model; they **stabilize and constrain** outputs when data is thin or skewed. They enforce monotonicity (mileage, year), cap red bands for old/low-sample cases, apply segment caps and band-width limits, and add model-specific fixes (Almera, NOTE E-POWER, Sprinter/Vito, BMW X1, BYD Dolphin, etc.). Together they keep estimates **plausible and ordered** even with sparse data.

All of the above are implemented in **`backend/ml/price_helper.py`**; this document is the single reference for “what the ML does” and “what market rules we apply and why.”

---

# ML Logic & Market Rules (ภาษาไทย)

เอกสารนี้อธิบาย **ว่า ML ราคาทำงานอย่างไร** **ทำไมดีไซน์นี้เหมาะกับโปรเจกต์** และ **กฎตลาด / guardrails ทั้งหมด** ที่ใช้ใน `price_helper.py` เพื่อให้ประมาณการสมเหตุสมผลเมื่อข้อมูลเบาบาง

---

## ส่วนที่ 1: ML Flow และเหตุผลที่ออกแบบแบบนี้

### 1.1 Pipeline ระดับสูง

1. **Request** → make, model, year, mileage_km_num, submodel/trim ฯลฯ
2. **Feature build** → `_add_features(req)` ปรับ input ให้เป็นมาตรฐาน clip mileage อยู่ใน [0, 450k] และสร้าง features แบบ categorical + numeric + engineered
3. **Raw prediction** → โมเดล LightGBM quantile สามตัวทำนาย **log(price)** ที่ q20, q50, q80 แปลงเป็นบาทด้วย `exp`
4. **Blend กับ group median** → q50 ผสมกับ group median (brand, model, year) (น้ำหนักเริ่มต้น 30%) เพื่อความเสถียร
5. **Sanity caps** → q20 ≥ 0.65×q50, q80 ≤ 1.75×q50; q50 ถูก clip อยู่ที่ ±35% ของ group median เมื่อมีค่า
6. **Year-distance depreciation** → ส่วนลดที่ไม่ใช่ ML สำหรับปีเก่า (เช่น 4% ต่อปีที่ห่าง cap 40%) เพื่อให้ 2016 ≠ 2019 เมื่อข้อมูลน้อย
7. **Band construction** → เขียว (q20→q50) เหลือง (q50) แดง (q50→q80) ด้วยอัตราส่วนคงที่; band-width และ red cap (เช่น red_high ≤ green_low × 1.85) ถ้ามี
8. **Market rules** → กฎหลังประมวลผลทั้งหมดด้านล่าง (monotonicity ตาม mileage, sample-size/age clamps, guardrails ตามรุ่น ฯลฯ)
9. **Ordering & rounding** → ให้ green_low ≤ … ≤ red_high ปัดเป็น 1k/5k บาท ตั้ง confidence, estimate_basis, sample_size, ui_notice

### 1.2 ทำไมใช้ LightGBM quantile regression?

- **Quantiles (q20, q50, q80)** ให้ **ช่วง** (เขียว–เหลือง–แดง) แทนจุดเดียว ตรงกับ "ดีลดี / ตลาด / ราคาสูง" และสะท้อนความไม่แน่นอน
- **LightGBM** จัดการ categorical (brand, model, submodel, gear, color) และ numeric (year, mileage, age, log_mileage ฯลฯ) ได้ดี เทรนเร็ว และทนกับข้อมูลขนาดปานกลาง
- **Log(price)** เป็น target ให้ error เป็นแบบสัมพัทธ์ และไม่ทำนายราคาติดลบหรือสุดขั้ว การปัดบาท (1k < 1M, 5k ≥ 1M) ให้ผลลัพธ์อ่านง่าย

### 1.3 ทำไม blend กับ group median?

- **ข้อมูลเบาบาง**: หลาย cell (brand, model, year) มีรายการน้อยหรือไม่มี โมเดลดิบ extrapolate ได้แย่ การ blend (เช่น 30%) เข้าหา **group median** (จากข้อมูลเทรน) ยึดประมาณการกับระดับตลาดที่สังเกตได้
- **ความเข้าใจได้**: Group median คือ "ราคารายการเฉลี่ยของยี่ห้อ/รุ่น/ปีนี้" การ blend ทำให้ผลลัพธ์ผูกกับจุดอ้างอิงนั้นชัดเจน
- **ความเสถียร**: ลดความไวต่อรายการแปลก ๆ หรือข้อมูล trim-level น้อย

### 1.4 ทำไมมีกฎหลังประมวลผลเยอะ?

- **ความเป็นจริงของตลาด**: รายการเบาบางและไม่สม่ำเสมอ (เช่น luxury vs economy เก่า vs ใหม่ trim แคบ) ML เห็นแค่สิ่งที่อยู่ในชุดเทรน มันไม่รู้ว่า "รถเก่าควรถูกกว่ารถใหม่" หรือ "แถบแดงไม่ควรเป็น 2× เหลืองเมื่อมี 1 รายการ"
- **Guardrails** เข้ารหัสกฎเชิงโดเมน (monotonicity ตาม mileage/year การจำกัดแถบแดงสำหรับเคสเก่า/ตัวอย่างน้อย การแก้ตามรุ่น) เพื่อให้ **แม้ข้อมูลเบาบาง** ผลลัพธ์ยังสมเหตุสมผลและเรียงลำดับได้ ไม่แทนที่ ML แต่แก้ความล้มเหลวที่รุนแรงและให้ UX สม่ำเสมอ

### 1.5 ทำไมเหมาะกับโปรเจกต์นี้

- **ข้อมูลเบาบางและหลากหลาย** → Quantiles + group-median blend + guardrails เล็ก ๆ หลายอัน ลดการแกว่งรุนแรง และให้ประมาณการใช้ได้เมื่อข้อมูลน้อย
- **ความโปร่งใส** → Confidence, estimate_basis, sample_size และ ui_notice สื่อคุณภาพข้อมูล โครงสร้างแถบง่าย (เขียว / เหลือง / แดง)
- **ไม่ต้องเทรนใหม่เมื่อเพิ่มกฎ** → กฎตลาดใหม่เพิ่มใน `price_helper.py` ได้โดยไม่ต้องเทรนโมเดลใหม่ ระบบจึงปรับตามผลิตภัณฑ์ได้

---

## ส่วนที่ 2: กฎตลาดทั้งหมด (จาก `price_helper.py`)

ด้านล่างคือ **รายการกฎตลาด / guardrail ทุกข้อ** ที่ใช้หลังผล ML ดิบ ลำดับการใช้ตรงกับ flow ในโค้ดที่เกี่ยวข้อง

---

### 2.1 ก่อนทำนาย (early exits / blocks)

| Rule | Trigger | Effect |
|------|--------|--------|
| **High-performance / low-data block** | รุ่น high-performance บางรุ่น (เช่น Audi RS) เมื่อข้อมูลไม่พอ | คืน `unsupported_model` ไม่มีแถบราคา หลีกเลี่ยงประมาณการ misleading เมื่อข้อมูลน้อยมาก |
| **Audi TT < 2019** | AUDI, TT, year < 2019 | คืน `pricing_unavailable` (ความบิดเบือนจากรุ่น rare/นำเข้า/RS) |
| **BENZ EQS-CLASS < 2021** | BENZ/MERCEDES-BENZ, EQS-CLASS, year < 2021 | คืน "ยังไม่ผลิตในปีที่เลือก" |
| **BENZ GLC-CLASS < 2015** | BENZ, GLC-CLASS, year < 2015 | เหมือนกัน (ยังไม่ผลิต) |
| **BENZ GLE-CLASS < 2016** | BENZ, GLE-CLASS, year < 2016 | เหมือนกัน |
| **BENZ ML-CLASS ≥ 2016** | BENZ, ML-CLASS, year ≥ 2016 | คืน "เลิกผลิตและเปลี่ยนชื่อเป็น GLE-CLASS" |
| **BENZ SLK-CLASS ≥ 2016** | BENZ, SLK-CLASS, year ≥ 2016 | คืน "เลิกผลิตและเปลี่ยนชื่อเป็น SLC-CLASS" |
| **BMW 320d trim/year** | BMW, 320d, trim ไม่ได้ผลิตในปีที่เลือก (เช่น G20 CKD < 2019, F30 > 2018) | คืน "trim ไม่ได้ผลิตในปีที่เลือก" |
| **BYD Seal production** | BYD, Seal, year ก่อนเริ่มผลิต | คืน "รุ่นยังไม่ผลิตในปีที่เลือก" |
| **Ferrari 296 GTB < 2022** | Ferrari, 296 GTB, year < 2022 | คืน "ยังไม่ผลิตในปีที่เลือก" |
| **Bentley Flying Spur (no listings)** | BENTLEY, FLYING SPUR, sample_size = 0 | คืน `pricing_unavailable` (รายการจำกัด ขึ้นกับ spec) |

กฎเหล่านี้ **บล็อก** การให้ราคาสำหรับคู่ model/year ที่รู้ว่าไม่รองรับ เพื่อไม่ให้รัน ML ในเคสเหล่านั้น

---

### 2.2 กฎหลักหลังทำนาย (แถบสร้างแล้ว)

| Rule | Trigger | Effect |
|------|--------|--------|
| **Luxury high-mileage penalty** | LEXUS, BMW, MERCEDES, AUDI (ไม่รวม economy); mileage ≥ 300k หรือ ≥ 450k | คูณแถบทั้งหมด: 0.92 ที่ ≥300k, 0.85 ที่ ≥450k ลดราคาสูงที่ไม่สมจริงสำหรับรถ luxury ไมล์สูง Economy (เช่น MAZDA, TOYOTA, HONDA, NISSAN) และ CX-3 ไม่ใช้ |
| **Mileage monotonic correction** | mileage ใดก็ได้ ≠ baseline 100k | ให้ราคาลดเมื่อ mileage เพิ่ม: baseline ที่ 100k km จากนั้น depreciation (ความชัน segment, cap 40%) เหนือ baseline และ premium (cap 10%) ต่ำกว่า **300k–450k**: Penalty เพิ่ม 0–7% เพื่อให้ 450k < 300k (หลีกเลี่ยงการยุบ 300k/450k) |
| **Low sample-size clamp** | sample_size ≤ 3 | red_median ≤ yellow×1.08, red_high ≤ yellow×1.12 รักษาลำดับแถบแดง ลดความผันผวนเมื่อมี comparable น้อย |
| **Age-based clamp** | vehicle_age ≥ 10 | red_median ≤ yellow×1.08, red_high ≤ yellow×1.12 รถเก่าไม่ได้รับแถบแดงกว้างเกินจริง |
| **Old-car safeguard** | vehicle_age ≥ 10 | red_high ≤ green_median×1.35 ถ้าจำเป็น ปรับ red_median/red_low เล็กน้อยเพื่อรักษาลำดับ |
| **No-comparables tightening** | sample_size = 0 | กระชับแถบทั้งหมดรอบเหลือง (เช่น เขียว 85–95% ของเหลือง แดง 102–108%) ประมาณการ fallback อยู่ฝั่งอนุรักษ์นิยม |
| **Band ordering** | หลังขั้นใดก็ตาม | `_ensure_band_ordering`: บังคับ green_low ≤ green_median ≤ green_high ≤ yellow ≤ red_low ≤ red_median ≤ red_high ปรับน้อยที่สุดถ้าผิด |
| **Minimum red band width (sparse)** | sample_size 1–3 | ถ้า red span < yellow×0.06 ขยายแถบแดงให้กว้างอย่างน้อยเท่านั้น เพื่อไม่ให้แถบแคบเกินจริง |

---

### 2.3 กฎ segment และ band-width

| Rule | Trigger | Effect |
|------|--------|--------|
| **Segment cap (B/C segment)** | Make/model ใน B-segment (เช่น Mazda 2, Honda City, Yaris, Almera, Swift, Attrage) หรือ C-segment (เช่น Mazda 3, Civic, Corolla, Sentra) | B: cap 650k บาท C: cap 1.2M บาท ถ้าแถบใดเกิน cap ลด scale แถบทั้งหมดตามสัดส่วน ให้ segment eco/sedan อยู่ในช่วงสมเหตุสมผล |
| **Band-width clamp** | red_high > yellow×1.35 หรือ green_low < yellow×0.65 | ตั้ง `bandwidth_clamped = true` ต่อมา red cap (red_high ≤ green_low×1.85) และการลด confidence จะใช้ ป้องกัน spread สุดขั้ว |
| **Red cap vs green** | red_high > green_low×1.85 | จำกัด red_high ที่ green_low×1.85 และคำนวณ red_low/red_median ใหม่จากเหลือง |

---

### 2.4 Year-ordering และกฎ economy

| Rule | Trigger | Effect |
|------|--------|--------|
| **Fallback year-ordering** | estimate_basis = fallback_no_comparables, year > 0 | ดึงผลของ year+1 ปรับ scale ผลปัจจุบันให้ปีเก่า ≤ ปีใหม่/1.05 (เหลือง; ถ้า vehicle_age ≥ 10 รวม green_median) หลีกเลี่ยงปีเก่า > ปีใหม่เมื่อไม่มี comparable |
| **Rule A – Economy year separation** | estimate_basis = market_trends, sample_size ≤ 3, make ใน {MAZDA, TOYOTA, HONDA, NISSAN} | ดึงผลของ year+1 ถ้า green_median ปีเก่า > ปีใหม่/1.05 ลด scale แถบปีเก่าให้ปีเก่า ≤ ปีใหม่/1.05 ป้องกันรถ economy ยุบข้ามปีเมื่อข้อมูลเบาบาง |

---

### 2.5 Model-specific guardrails

| Rule | Trigger | Effect |
|------|--------|--------|
| **NISSAN ALMERA** | NISSAN, ALMERA | Red clamps: ถ้า sample_size ≤ 3 แล้ว red_median ≤ yellow×1.10, red_high ≤ yellow×1.15 ถ้า vehicle_age ≥ 10 แล้ว red ≤ yellow×1.08/1.12 ถ้าไม่มี trim และ year ≤ 2019 ใช้ red cap เดียวกัน (แยก generation) จากนั้นบังคับ band ordering |
| **NISSAN NOTE E-POWER** | NISSAN, NOTE, submodel มี "E-POWER", sample_size ≤ 1 | ดึง NOTE ฐาน (ไม่มี trim) บังคับ green_median ≥ base_green_median×1.05 ด้วย scale สม่ำเสมอ รักษาลำดับ ป้องกัน E-POWER ยุบไปราคา NOTE ฐานเมื่อมี 0–1 ตัวอย่าง |
| **BENZ SPRINTER & VITO** | BENZ, SPRINTER หรือ VITO, sample_size < 2 | แคบแถบเล็กน้อยรอบเหลือง (green_high ≤ yellow×0.95, red_low ≥ yellow×1.05) ใช้ band ordering อีกครั้ง รถเชิงพาณิชย์ที่มี comparable น้อยมาก |
| **MG stabilization (multi-mileage)** | MG, ผลหลาย mileage, green_median แบน across mileages, ข้อมูลเบาบาง | ใช้ mileage decay curve ให้ mileage สูงได้ราคาต่ำกว่า (ใช้ใน batch/multi-mileage response เท่านั้น) |

---

### 2.6 Post-output guards และ metadata

| Rule | Trigger | Effect |
|------|--------|--------|
| **BYD Dolphin (fallback + no comparables)** | BYD, DOLPHIN, sample_size = 0, estimate_basis = fallback_no_comparables | คืน `pricing_unavailable` ("ยังไม่ผลิตในปีที่เลือก") เพื่อไม่แสดง fallback สำหรับปีที่ไม่ถูกต้อง |
| **BMW X1 outlier guard** | BMW, X1, green_median > 2M บาท | คืน `pricing_unavailable` (ข้อมูลไม่พอ/ไม่สม่ำเสมอ) กันชนชั่วคราวจนกว่าข้อมูล X1 ดีขึ้น |
| **Max deviation from group median** | มี group median, yellow > gmed×(1 + max_deviation) | ลด scale แถบทั้งหมดให้เหลืองอยู่ภายใน 40–50% ของ group median (อนุญาตสูงขึ้นเมื่อ confidence < 0.6) หลีกเลี่ยงการทำนายผิดเดียวไกลจากตลาด |
| **Confidence / estimate_basis** | ตาม sample_size และ comparables | sample_size = 0 → estimate_basis = fallback_no_comparables, confidence = 0.20 ไม่งั้นตาม bucket (เช่น 1→0.30, 2→0.45, 5→0.60, 10→0.75, 20→0.85) market_trends จำกัด confidence ที่ 0.45 bandwidth_clamped ลด confidence |
| **ui_notice / data_quality** | sample_size, make/model | เช่น extremely_limited_data (≤1), limited_market_data (≤2), high_spec_variance (BENZ S-CLASS, 2020+, <4), commercial_vehicle_pricing (SPRINTER/VITO), no_comparables เฉพาะ UI ไม่เปลี่ยนค่าตัวเลขแถบ |

---

### 2.6 Feature และ lookup rules (สนับสนุนด้านบน)

| Rule | Trigger | Effect |
|------|--------|--------|
| **Strict model normalization** | ทุก request | เช่น Mazda "2" vs "3"/"CX-3"/"2.0L" แยกกัน ชื่อ model BENZ ปรับเป็นมาตรฐาน (EQS-CLASS, GLC-CLASS ฯลฯ) ป้องกันการ match model ผิด |
| **Honda Civic Type R isolation** | HONDA, CIVIC | Group median จากรายการ Civic แยก Type R vs ไม่ใช่ Type R เพื่อไม่ให้ Type R มูลค่าสูงดึง median Civic มาตรฐานขึ้น |
| **Mileage slope by segment** | ใช้ใน mileage monotonic correction | Premium: 1% ต่อ 10k economy (เช่น SUZUKI, DAIHATSU): 2% ต่อ 10k ค่าเริ่มต้น 1.5% |
| **Mileage cap in features** | _add_features | mileage_km_num ถูก clip อยู่ [0, 450_000] ก่อน features log/sqrt/ratio |

---

## สรุป

- **ML**: LightGBM quantile regression (q20, q50, q80) บน log(price) กับ group-median blend, sanity caps และ band construction ดีไซน์นี้เหมาะกับ **ข้อมูลเบาบางและผสม** และให้ **ช่วง** (เขียว/เหลือง/แดง) พร้อม **ความโปร่งใส** (confidence, estimate_basis, sample_size)
- **กฎตลาด**: **ไม่**เทรนโมเดลใหม่ แต่ **ทำให้ผลลัพธ์เสถียรและจำกัด** เมื่อข้อมูลน้อยหรือ skewed บังคับ monotonicity (mileage, year) จำกัดแถบแดงสำหรับเคสเก่า/ตัวอย่างน้อย ใช้ segment caps และ band-width limits และเพิ่มการแก้ตามรุ่น (Almera, NOTE E-POWER, Sprinter/Vito, BMW X1, BYD Dolphin ฯลฯ) รวมกันให้ประมาณการ **สมเหตุสมผลและเรียงลำดับ** แม้ข้อมูลเบาบาง

ทั้งหมดด้านบน implement ใน **`backend/ml/price_helper.py`** เอกสารนี้เป็น reference เดียวสำหรับ "ML ทำอะไร" และ "เราใช้กฎตลาดอะไรและทำไม"
