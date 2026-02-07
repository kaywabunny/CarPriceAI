# Price prediction post-processing rules

All rules that modify or guard the predicted price bands in `predict_price()` (in execution order).  
Source: `backend/ml/price_helper.py`.

---

## A. In-pipeline (before `out` dict is built)

Applied to band variables `green_low`, `green_median`, `green_high`, `yellow`, `red_low`, `red_median`, `red_high`.

### 1. Band-width clamp (inline)
- **When:** Always.
- **What:** If `red_high > yellow * 1.35` or `green_low < yellow * 0.65`, set `bandwidth_clamped = True` (no band change here; used for confidence later).

### 2. Red cap from green (inline)
- **When:** Always.
- **What:** `cap = green_low * 1.85`. If `red_high > cap`, set `red_high = cap` and recompute `red_low`, `red_median` from yellow/red_high.

### 3. Luxury high-mileage penalty — `_apply_luxury_high_mileage_penalty`
- **When:** LEXUS, BMW, MERCEDES/MERCEDES-BENZ, AUDI only; economy (MAZDA, TOYOTA, HONDA, NISSAN) and Mazda CX-3 skipped.
- **What:** If mileage ≥ 450k km: multiply all bands by 0.85; if ≥ 300k: multiply by 0.92. Preserves relative band spacing.

### 4. Mileage monotonic correction — `_apply_mileage_monotonic_correction`
- **When:** Always (same make/model/year/trim; higher mileage must not yield higher price).
- **What:** Baseline 100k km; for mileage > baseline apply depreciation per 10k (segment slope, cap −40%); for mileage < baseline apply premium (cap +10%). High-mileage band 300k–450k gets extra penalty. Ensures price(mileage₂) ≤ price(mileage₁) when mileage₂ > mileage₁.

### 5. Low sample size clamp — `_apply_low_sample_size_clamp`
- **When:** `sample_size` ≤ 3.
- **What:** `red_high = min(red_high, yellow * 1.12)`, `red_median = min(red_median, yellow * 1.08)`; then fix red band ordering.

### 6. Age-based clamp — `_apply_age_based_clamp`
- **When:** `car_age` (current_year − year) ≥ 10.
- **What:** `red_median = min(red_median, yellow * 1.08)`, `red_high = min(red_high, yellow * 1.12)`; ensure red band ordering.

### 7. Old-car red cap (inline, 10+ years)
- **When:** `car_age >= 10` and `green_median > 0`.
- **What:** `cap = green_median * 1.35`. If `red_high > cap`, cap `red_high` and nudge `red_median`/`red_low` to preserve ordering.

### 8. No-comparables tightening — `_apply_no_comparables_tightening`
- **When:** `sample_size == 0` only (explicit 0).
- **What:** Tighten all bands around yellow: green 85–95% of yellow, red 102–108% of yellow; preserve ordering.

### 9. Ensure band ordering — `_ensure_band_ordering`
- **When:** Always (after all band adjustments above).
- **What:** Enforce strict ordering: `green_low ≤ green_median ≤ green_high ≤ yellow ≤ red_low ≤ red_median ≤ red_high`; nudge/sort if broken.

### 10. Minimum red band width (sparse) — `_ensure_min_bandwidth_sparse`
- **When:** `sample_size` 1–3.
- **What:** If red span < `yellow * 0.06`, expand red band to that minimum width around red_median; then call `_ensure_band_ordering` again if expanded.

### 11. Final segment cap (inline)
- **When:** `segment_cap` is set (e.g. Mazda 2 ≤ 650k THB).
- **What:** If any band > segment_cap, scale all bands down by `segment_cap / max_price` to keep relative structure.

### 12. Commercial vehicle (BENZ SPRINTER / VITO) — inline
- **When:** Brand BENZ, model SPRINTER or VITO, `sample_size < 2`.
- **What:** `green_high = min(green_high, yellow * 0.95)`, `red_low = max(red_low, yellow * 1.05)`; then `_ensure_band_ordering`.

### 13. Yellow vs group median sanity (inline)
- **When:** `gmed` is available and `yellow > gmed * (1 + max_deviation)`.
- **What:** Scale all bands down so yellow is within `gmed * (1 + max_deviation)`.  
- **Low-data tightening:** When `sample_size <= 1`, max_deviation = 15% (yellow cap 1.15×gmed). When `sample_size <= 2`, 25%. Otherwise 40–50% by confidence.

### 14. Low-data yellow cap (inline)
- **When:** `sample_size <= 1`, `gmed` is available and positive.
- **What:** If `yellow > gmed * 1.15`, scale all bands so yellow = 1.15×gmed. Prevents extremely high yellow when we have no or one comparable (gmed may be from neighbor years).

### 15. No comparables + no gmed, segment cap (inline)
- **When:** `sample_size == 0`, no `gmed`, `segment_cap` is set (e.g. Mazda 2).
- **What:** If any band exceeds `segment_cap`, scale all bands down so max band = segment_cap. Stops unbounded model output when we have no group median.

---

## B. After `out` is built (modify `out` or return early)

### 16. BYD Dolphin fallback block (return override)
- **When:** Brand BYD, model DOLPHIN, `sample_size === 0` and `estimate_basis === "fallback_no_comparables"`.
- **What:** Return `pricing_unavailable` with message that Dolphin was not produced in selected year (no bands).

### 17. BMW X1 outlier guard (return override)
- **When:** Brand BMW, model X1, `green_median > 2_000_000`.
- **What:** Return `pricing_unavailable` with `estimate_basis: "invalid_outlier_guard"` (no bands).

### 18. Global year-order (all predictions)
- **When:** Valid bands, `year > 0`, not skipping year-order check.
- **What:** Find first valid newer year (year+1, year+2, … up to 15). If older yellow/green_median > newer: for consecutive year use cap `newer * 0.98`, else `newer / 1.05`; scale all bands down so older ≤ cap.

### 19. Fallback year-ordering
- **When:** `estimate_basis == "fallback_no_comparables"`, valid yellow, `year > 0`.
- **What:** Predict year+1; if older yellow > newer/1.05, scale bands down; if vehicle_age ≥ 10 and older green_median > newer/1.05, scale down (same scale).

### 20. Rule A — Economy cars (market_trends, sparse)
- **When:** `estimate_basis == "market_trends"`, `sample_size` ≤ 3, economy make (MAZDA, TOYOTA, HONDA, NISSAN), `year > 0`.
- **What:** Predict year+1; if older yellow or older green_median > newer * 0.98, scale all bands down so older ≤ newer * 0.98.

### 21. NISSAN ALMERA guardrails — `_apply_nissan_almera_guardrails`
- **When:** Brand NISSAN, model ALMERA only.
- **What:** Sparse-data red clamps (sample_size ≤ 3); old-vehicle red clamp (age ≥ 10); no-trim + year ≤ 2019 generation ceiling; then enforce band ordering and round.

### 22. NISSAN NOTE E-POWER premium — `_apply_note_epower_premium_to_out`
- **When:** NISSAN NOTE with "E-POWER" in submodel and `sample_size ≤ 1`.
- **What:** Get base NOTE (no trim) green_median; if current green_median < base * 1.05, scale all bands up by uniform multiplier to enforce green_median ≥ base * 1.05; then fix ordering.

---

## C. Not band-changing (metadata / confidence / UI)

- **Estimate basis:** `fallback_no_comparables` (sample_size 0), `market_trends` (1–4), `based_on_comparable_listings` (5+).
- **Confidence:** By sample_size; capped for fallback (0.20), market_trends (≤ 0.45); reduced if `bandwidth_clamped`.
- **UI / metadata:** `ui_notice`, `ui_footnote`, `data_quality`, KIA EV6 confidence cap, Lexus ES notice, BENZ commercial notice, etc. (no change to price bands).
- **Debug:** `_debug` when `ENABLE_MILEAGE_DEBUG=true` (no change to bands).

---

## Execution order summary

1. Band-width clamp (flag only)  
2. Red cap from green  
3. Luxury high-mileage penalty  
4. Mileage monotonic correction  
5. Low sample size clamp  
6. Age-based clamp  
7. Old-car red cap (10+ years)  
8. No-comparables tightening  
9. Ensure band ordering  
10. Min red bandwidth (sparse) (+ band ordering if expanded)  
11. Segment cap  
12. BENZ SPRINTER/VITO  
13. Yellow vs gmed sanity (tighter max_deviation when sample_size ≤ 1/2)  
14. Low-data yellow cap (sample_size ≤ 1 → yellow ≤ 1.15×gmed)  
15. No comparables + no gmed: cap by segment_cap  
16. Build `out`  
17. BYD Dolphin block (return)  
18. BMW X1 outlier guard (return)  
19. Global year-order  
20. Fallback year-ordering  
21. Rule A (economy market_trends)  
22. NISSAN ALMERA guardrails  
23. NISSAN NOTE E-POWER premium  
