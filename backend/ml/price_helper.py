# price_helper.py
from pathlib import Path
from typing import Tuple
import json
import logging
import joblib
import numpy as np
import pandas as pd
from io import BytesIO

_log = logging.getLogger(__name__)

try:
    # Pillow is used only for generating the optional PNG graph for /price_graph
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover - guarded by requirements
    Image = None
    ImageDraw = None
    ImageFont = None
import os


# --- where the promoted model lives ---
# Note: directory is "model" (singular), not "models" (plural)
MODELS_DIR = Path("model/price_quantiles_v3")

# --- globals loaded at import (safe no-op if missing) ---
_q20 = _q50 = _q80 = None
_gmed_df: pd.DataFrame | None = None
_FEATURES: list[str] = []
_CAT: list[str] = []
_NUM: list[str] = []
_BLEND_W: float = 0.30  # default if not present in feature_config
_SCALE: float = 1.0     # reserved (not used)

# training-time category lists (used to fix LightGBM categorical mismatch)
_PANDAS_CAT_MAP: dict[str, list[str]] = {}

# stored from group-median lookup (transparency)
_LAST_YEAR_WINDOW_USED = 0
_LAST_SAMPLE_SIZE = 0
_LAST_OUTLIERS_REMOVED = 0
# Honda Civic Type R isolation: listings subset (brand/model CIVIC only) for segment median
_civic_listings_df: pd.DataFrame | None = None


def _std_cat(x: str) -> str:
    """Normalize categorical text for inference."""
    if x is None:
        return "UNKNOWN"
    x = str(x).strip()
    if x == "":
        return "UNKNOWN"
    return x.upper()


def _normalize_model_strict(brand: str, model: str) -> str:
    """
    Strict model normalization to prevent collisions.
    Ensures "2" doesn't match "3", "CX-3", "2.0L", etc.
    """
    if not model or model == "UNKNOWN":
        return "UNKNOWN"
    
    model_upper = model.upper().strip()
    
    # Special handling for Mazda to prevent "2" matching "3" or "CX-3"
    if brand == "MAZDA":
        # Ensure "2" is exactly "2" and not matched to other models
        if model_upper in ("2", "MAZDA2", "MAZDA 2"):
            return "2"
        # Normalize other Mazda models
        if model_upper.startswith("CX-"):
            return model_upper  # Keep CX-3, CX-5, etc. as-is
        if model_upper in ("3", "MAZDA3", "MAZDA 3"):
            return "3"
        if model_upper in ("6", "MAZDA6", "MAZDA 6"):
            return "6"
    
    # For other brands, return normalized model
    return model_upper


def _normalize_model_strict(brand: str, model: str) -> str:
    """
    Strict model normalization to prevent collisions.
    Specifically handles cases like "Mazda 2" vs "Mazda 3", "2.0L", "CX-3".
    """
    model_upper = model.upper().strip()
    brand_upper = brand.upper().strip()
    
    # Mazda-specific: ensure "2" only matches Mazda 2, not 2.0L or other variants
    if brand_upper == "MAZDA":
        if model_upper == "2":
            return "2"  # Explicit Mazda 2
        # Reject ambiguous matches that could be 2.0L engine or other models
        if model_upper in ("2.0", "2.0L", "2.0 L", "2.0LITER"):
            return "UNKNOWN"  # Don't match these to Mazda 2
    
    return model_upper


def _extract_pandas_categorical(model) -> list[list[str]] | None:
    """Best-effort: pull training-time pandas categorical lists from a LightGBM model."""
    try:
        booster = getattr(model, "booster_", None)
        if booster is not None:
            pc = getattr(booster, "pandas_categorical", None)
            if pc:
                return pc
        pc = getattr(model, "pandas_categorical", None)
        if pc:
            return pc
    except Exception:
        pass
    return None


def _load_feature_config(dirpath: Path):
    global _FEATURES, _CAT, _NUM, _BLEND_W
    cfg_path = dirpath / "feature_config"
    if cfg_path.is_file():
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    elif (dirpath / "feature_config.json").is_file():
        with open(dirpath / "feature_config.json", "r", encoding="utf-8") as f:
            cfg = json.load(f)
    else:
        cfg = {}

    _FEATURES = cfg.get("features", _FEATURES or ["brand", "model", "year", "mileage_km_num"])
    _CAT = cfg.get("categorical", _CAT or ["brand", "model"])
    _NUM = cfg.get("numeric", _NUM or ["year", "mileage_km_num"])
    _BLEND_W = float(cfg.get("blend_weight", _BLEND_W))


def load_artifacts(dirpath: Path | str = MODELS_DIR, *args, **kwargs):
    """Load model artifacts from disk into globals.

    Compatibility: accepts extra args so admin reload endpoints that pass a path won't break.
    """
    global _q20, _q50, _q80, _gmed_df, _PANDAS_CAT_MAP

    # If caller passed a path positionally, prefer it.
    if args and (dirpath == MODELS_DIR):
        try:
            dirpath = args[0]
        except Exception:
            pass

    d = Path(dirpath)

    # models
    _q20 = joblib.load(d / "q20_lgbm.pkl")
    _q50 = joblib.load(d / "q50_lgbm.pkl")
    _q80 = joblib.load(d / "q80_lgbm.pkl")

    # feature config
    _load_feature_config(d)

    # capture training-time categorical lists (fix for categorical_feature mismatch)
    _PANDAS_CAT_MAP = {}
    cats = _extract_pandas_categorical(_q50) or _extract_pandas_categorical(_q20) or _extract_pandas_categorical(_q80)
    if cats and _CAT:
        for i, col in enumerate(_CAT):
            if i < len(cats):
                _PANDAS_CAT_MAP[col] = list(map(str, cats[i]))

    # group medians (optional)
    gmed_path_csv = d / "group_medians"
    if not gmed_path_csv.suffix:
        gmed_path_csv = gmed_path_csv.with_suffix(".csv")

    if gmed_path_csv.exists():
        _gmed_df = pd.read_csv(gmed_path_csv)
        # normalize keys
        for col in _gmed_df.columns:
            if col.lower() in ("brand", "model", "make"):
                _gmed_df[col] = _gmed_df[col].map(_std_cat)
    else:
        _gmed_df = None

    return True


def is_ready() -> bool:
    return all(m is not None for m in (_q20, _q50, _q80))


def _add_features(req: dict) -> pd.DataFrame:
    """Create a single-row dataframe with the exact feature set the model expects."""
    # base fields (tolerant to keys)
    brand = _std_cat(req.get("make") or req.get("brand"))
    model_raw = req.get("model")
    # Apply strict model normalization to prevent collisions
    model = _normalize_model_strict(brand, model_raw) if model_raw else "UNKNOWN"
    submodel = _std_cat(req.get("trim") or req.get("submodel") or "")
    gear = _std_cat(req.get("gear") or "")
    color = _std_cat(req.get("color") or "")
    engine = _std_cat(req.get("engine") or "")
    year = req.get("year")
    mileage = req.get("mileage_km_num") or req.get("mileage_km") or req.get("mileage")
    try:
        year = int(year) if year is not None else 0
    except Exception:
        year = 0
    try:
        mileage = float(mileage) if mileage is not None else 0.0
    except Exception:
        mileage = 0.0

    # Calculate age (only if model expects it)
    from datetime import datetime
    current_year = datetime.now().year
    age = max(0, current_year - year) if year > 0 else 0

    mileage_value = mileage if mileage else 0.0

        # HARD CAP: keep mileage within training-like range to avoid extrapolation
    MAX_MILEAGE_KM = 450_000
    mileage_value = float(np.clip(mileage_value, 0.0, MAX_MILEAGE_KM))


    row = {
        "brand": brand,
        "model": model,
        "submodel": submodel,
        "gear": gear,
        "color": color,
        "engine": engine,
        "year": year,
        "mileage_km_num": mileage_value,
    }
    df = pd.DataFrame([row])

    # Engineered features the model may expect
    if "age" in _FEATURES:
        df["age"] = age
    if "log_mileage" in _FEATURES:
        df["log_mileage"] = np.log1p(mileage_value)
    if "sqrt_mileage" in _FEATURES:
        df["sqrt_mileage"] = np.sqrt(mileage_value)
    if "mileage_per_year" in _FEATURES:
        df["mileage_per_year"] = mileage_value / max(age, 1) if age > 0 else 0.0
    if "age_x_mileage" in _FEATURES:
        df["age_x_mileage"] = age * mileage_value
    if "mileage_per_age" in _FEATURES:
        df["mileage_per_age"] = mileage_value / max(age, 1) if age > 0 else 0.0
    if "mileage" in _FEATURES and "mileage" not in df.columns:
        df["mileage"] = mileage_value

    # Ensure all categorical fields exist + normalize
    for c in _CAT:
        if c in df.columns:
            df[c] = df[c].map(_std_cat)
        else:
            df[c] = "UNKNOWN"

        # CRITICAL FIX:
        # If the model was trained with pandas categorical lists, force SAME categories.
        cats = _PANDAS_CAT_MAP.get(c)
        if cats:
            v = str(df[c].iloc[0]) if len(df) else "UNKNOWN"
            if v not in cats:
                fallback = "UNKNOWN" if "UNKNOWN" in cats else cats[0]
                df[c] = fallback
            df[c] = pd.Categorical(df[c], categories=cats)
        else:
            # fallback: at least make dtype categorical
            df[c] = df[c].astype("category")

    # Ensure all numeric fields exist
    for n in _NUM:
        if n not in df.columns:
            df[n] = 0.0
        df[n] = pd.to_numeric(df[n], errors="coerce").fillna(0.0)

    # Final column order strictly matches training features
    for f in _FEATURES:
        if f not in df.columns:
            df[f] = "UNKNOWN" if f in _CAT else 0.0

    df = df[_FEATURES]
    return df


def _get_segment_cap(brand: str, model: str) -> float | None:
    """
    Get segment-based price cap for sanity checking.
    Returns maximum reasonable price for the vehicle segment, or None if unknown.
    """
    # B-segment eco cars (Mazda 2, Honda City, Toyota Yaris, etc.)
    b_segment_models = {
        ("MAZDA", "2"),
        ("HONDA", "CITY"),
        ("TOYOTA", "YARIS"),
        ("NISSAN", "ALMERA"),
        ("SUZUKI", "SWIFT"),
        ("MITSUBISHI", "ATTRAGE"),
    }
    
    # C-segment sedans (Mazda 3, Honda Civic, Toyota Corolla, etc.)
    c_segment_models = {
        ("MAZDA", "3"),
        ("HONDA", "CIVIC"),
        ("TOYOTA", "COROLLA"),
        ("NISSAN", "SENTRA"),
    }
    
    brand_model_key = (brand.upper(), model.upper())
    
    if brand_model_key in b_segment_models:
        return 650_000.0  # Max 650k THB for B-segment
    elif brand_model_key in c_segment_models:
        return 1_200_000.0  # Max 1.2M THB for C-segment
    
    return None  # No cap for unknown segments


def _lexus_es_ui_notice(brand: str, model_normalized: str, sample_size: int | None) -> tuple[str | None, str | None]:
    """Lexus ES only: return (ui_notice, ui_notice_detail) by sample_size for UI. No pricing change."""
    is_lexus_es = brand == "LEXUS" and (model_normalized == "ES" or (model_normalized or "").strip().startswith("ES "))
    if not is_lexus_es or sample_size is None:
        return (None, None)
    if int(sample_size) == 0:
        return (
            "lexus_es_no_listings",
            "We couldn't find matching Lexus ES listings in our dataset right now. "
            "This estimate uses a general market baseline, so real prices may vary by trim/condition.",
        )
    if int(sample_size) < 3:
        return (
            "lexus_es_low_sample",
            "Only a few Lexus ES listings were found. Treat this estimate as a rough guide and compare with real listings.",
        )
    return (None, None)


def _is_civic_type_r(submodel: str | None) -> bool:
    """True if submodel indicates Honda Civic Type R (case-insensitive). Isolate Type R from standard Civic."""
    return submodel is not None and "TYPE R" in str(submodel).upper()


def _load_civic_listings() -> bool:
    """Load HONDA CIVIC rows from cleaned_listings for segment median. Returns True if loaded."""
    global _civic_listings_df
    if _civic_listings_df is not None:
        return True
    try:
        path = MODELS_DIR / "cleaned_listings_v3.csv"
        if not path.exists():
            return False
        df = pd.read_csv(path, nrows=None)
        b_col = next((c for c in df.columns if str(c).lower() in {"brand", "make"}), None)
        m_col = next((c for c in df.columns if str(c).lower() == "model"), None)
        if not (b_col and m_col):
            return False
        sub = df[
            (df[b_col].astype(str).str.strip().str.upper() == "HONDA") &
            (df[m_col].astype(str).str.strip().str.upper() == "CIVIC")
        ]
        if sub.empty:
            return False
        _civic_listings_df = sub.copy()
        return True
    except Exception:
        return False


def _lookup_civic_segment_median(year: int, type_r_only: bool) -> float | None:
    """Honda Civic only: median price for segment (Type R only or excluding Type R). No shared aggregation with the other segment."""
    global _LAST_SAMPLE_SIZE, _LAST_YEAR_WINDOW_USED
    _LAST_YEAR_WINDOW_USED = 0
    _LAST_SAMPLE_SIZE = 0
    if not _load_civic_listings() or _civic_listings_df is None or _civic_listings_df.empty:
        return None
    df = _civic_listings_df
    y_col = next((c for c in df.columns if str(c).lower() == "year"), None)
    p_col = next((c for c in df.columns if str(c).lower() == "price"), None)
    sm_col = next((c for c in df.columns if str(c).lower() in {"submodel", "trim"}), None)
    if not (y_col and p_col):
        return None
    df = df.copy()
    df["_year_int"] = pd.to_numeric(df[y_col], errors="coerce").astype("Int64")
    df = df[df["_year_int"].notna() & (df["_year_int"].astype(int) == int(year))]
    if df.empty:
        return None
    if sm_col is not None:
        sub_upper = df[sm_col].astype(str).str.strip().str.upper()
        if type_r_only:
            df = df[sub_upper.str.contains("TYPE R", na=False)]
        else:
            df = df[~sub_upper.str.contains("TYPE R", na=False)]
    else:
        if type_r_only:
            return None
    if df.empty:
        return None
    prices = pd.to_numeric(df[p_col], errors="coerce")
    prices = prices[prices.notna() & (prices > 0)]
    if prices.empty:
        return None
    _LAST_SAMPLE_SIZE = int(len(prices))
    return float(prices.median())


def _lookup_group_median(brand: str, model: str, year: int) -> float | None:
    """Lookup a group median price for (brand, model, year)."""
    global _LAST_YEAR_WINDOW_USED, _LAST_SAMPLE_SIZE
    _LAST_YEAR_WINDOW_USED = 0
    _LAST_SAMPLE_SIZE = 0

    if _gmed_df is None or _gmed_df.empty:
        return None

    df = _gmed_df

    b_col = next((c for c in df.columns if str(c).lower() in {"brand", "make"}), None)
    m_col = next((c for c in df.columns if str(c).lower() == "model"), None)
    y_col = next((c for c in df.columns if str(c).lower() == "year"), None)
    p_col = next((c for c in df.columns if str(c).lower() in {"median_price", "price_median", "median"}), None)
    if not (b_col and m_col and y_col and p_col):
        return None

    count_col = next((c for c in df.columns if str(c).lower() in {"n", "count", "rows", "sample_size", "num_rows"}), None)

    # Use strict model normalization to prevent collisions (e.g., "2" matching "3")
    brand_normalized = _std_cat(brand)
    model_normalized = _normalize_model_strict(brand_normalized, model)

    MIN_COMPS_FOR_STABILITY = 5
    MAX_YEAR_WINDOW = 4

    # Strict matching: exact brand AND exact model (no brand-level fallback)
    sub_all = df[
        (df[b_col].astype(str).str.strip().str.upper() == brand_normalized) &
        (df[m_col].astype(str).str.strip().str.upper() == model_normalized)
    ].copy()

    if sub_all.empty:
        # NO brand-level fallback - return None if exact model not found
        # This prevents Mazda 2 from matching Mazda 3 or brand-level medians
        return None

    sub_all["_year_int"] = pd.to_numeric(sub_all[y_col], errors="coerce").astype("Int64")
    sub_all = sub_all[sub_all["_year_int"].notna()]
    if sub_all.empty:
        return None

    best_sub = None
    best_w = 0
    best_n = 0

    for w in range(0, MAX_YEAR_WINDOW + 1):
        if w == 0:
            sub = sub_all[sub_all["_year_int"].astype(int) == int(year)]
        else:
            lo, hi = int(year) - w, int(year) + w
            sub = sub_all[(sub_all["_year_int"].astype(int) >= lo) & (sub_all["_year_int"].astype(int) <= hi)]

        if sub.empty:
            continue

        if count_col:
            try:
                n = int(pd.to_numeric(sub[count_col], errors="coerce").fillna(0).sum())
            except Exception:
                n = int(len(sub))
        else:
            n = int(len(sub))

        if best_sub is None:
            best_sub, best_w, best_n = sub, w, n
        elif best_n < MIN_COMPS_FOR_STABILITY and n > best_n:
            best_sub, best_w, best_n = sub, w, n

        if n >= MIN_COMPS_FOR_STABILITY:
            best_sub, best_w, best_n = sub, w, n
            break

    if best_sub is None or best_sub.empty:
        return None

    prices = pd.to_numeric(best_sub[p_col], errors="coerce")
    years = pd.to_numeric(best_sub["_year_int"], errors="coerce")
    mask = prices.notna() & years.notna()
    prices = prices[mask]
    years = years[mask]
    if prices.empty:
        return None

    # Robust outlier filtering: winsorize to [P05, P95] or use MAD-based filtering
    # This prevents extreme outliers (e.g., Mazda2 at 3.6M THB) from poisoning group medians
    prices_clean = prices.copy()
    outliers_removed = 0
    
    if len(prices_clean) >= 10:
        # Method 1: Winsorize to 5th and 95th percentiles
        p05, p95 = np.percentile(prices_clean, [5, 95])
        original_count = len(prices_clean)
        prices_clean = prices_clean[(prices_clean >= p05) & (prices_clean <= p95)]
        outliers_removed = original_count - len(prices_clean)
        
        # If still too many outliers, use MAD-based filtering as fallback
        if len(prices_clean) < original_count * 0.5:  # Lost more than 50% of data
            # Revert and use MAD instead
            prices_clean = prices.copy()
            median_price = float(prices_clean.median())
            mad = float(np.median(np.abs(prices_clean - median_price)))  # Median Absolute Deviation
            if mad > 0:
                # Filter to median ± 3*MAD (robust z-score)
                lower_bound = median_price - 3.0 * mad
                upper_bound = median_price + 3.0 * mad
                original_count = len(prices_clean)
                prices_clean = prices_clean[(prices_clean >= lower_bound) & (prices_clean <= upper_bound)]
                outliers_removed = original_count - len(prices_clean)
    
    if prices_clean.empty:
        return None
    
    # Store outlier count in global for debug
    global _LAST_OUTLIERS_REMOVED
    _LAST_OUTLIERS_REMOVED = outliers_removed

    if best_w == 0:
        gmed = float(prices_clean.median())
    else:
        # Re-filter years to match cleaned prices (preserve index alignment)
        # Create a mask for prices that survived cleaning
        price_series = pd.Series(prices.values, index=prices.index)
        year_series = pd.Series(years.values, index=years.index)
        clean_mask = price_series.index.isin(prices_clean.index)
        prices_aligned = price_series[clean_mask]
        years_aligned = year_series[clean_mask]
        
        if len(prices_aligned) != len(prices_clean) or len(prices_aligned) == 0:
            # Fallback: use median if alignment fails
            gmed = float(prices_clean.median())
        else:
            dy = (years_aligned.astype(int) - int(year)).abs()
            wts = 1.0 / (1.0 + dy.astype(float))  # closer years weigh more heavily
            gmed = float(np.average(prices_aligned.astype(float), weights=wts))

    _LAST_YEAR_WINDOW_USED = int(best_w)
    _LAST_SAMPLE_SIZE = int(len(prices_clean))  # Use cleaned sample size
    return gmed


def _lookup_sample_size(brand: str, model: str, year: int) -> int:
    """Return comparable sample size (best-effort)."""
    if _gmed_df is None or _gmed_df.empty:
        return 0

    # if group median was already computed in this request, reuse the last size
    if _LAST_SAMPLE_SIZE:
        return int(_LAST_SAMPLE_SIZE)

    df = _gmed_df
    b_col = next((c for c in df.columns if str(c).lower() in {"brand", "make"}), None)
    m_col = next((c for c in df.columns if str(c).lower() == "model"), None)
    y_col = next((c for c in df.columns if str(c).lower() == "year"), None)
    if not (b_col and m_col and y_col):
        return 0

    count_col = next((c for c in df.columns if str(c).lower() in {"n", "count", "rows", "sample_size", "num_rows"}), None)

    brand_s = str(brand).strip().lower()
    model_s = str(model).strip().lower()

    sub = df[
        (df[b_col].astype(str).str.strip().str.lower() == brand_s) &
        (df[m_col].astype(str).str.strip().str.lower() == model_s) &
        (pd.to_numeric(df[y_col], errors="coerce").fillna(-1).astype(int) == int(year))
    ]

    if sub.empty:
        return 0

    if count_col:
        try:
            return int(pd.to_numeric(sub[count_col], errors="coerce").fillna(0).sum())
        except Exception:
            return int(len(sub))

    return int(len(sub))


def _round_price(price: float) -> int:
    """Round price: 1000 THB if < 1M, else 5000 THB."""
    if price < 1_000_000:
        return int(round(price / 1000) * 1000)
    else:
        return int(round(price / 5000) * 5000)


def _mg_decay_multiplier(km: float) -> float:
    """MG-only sparse-data stabilization fallback: decay curve (baseline at low mileage = 1.0).
    80k → 0.95, 160k → 0.88, 300k → 0.75, 450k → 0.40.
    """
    km = float(km)
    if km <= 20_000:
        return 1.0
    if km <= 80_000:
        return 1.0 + (0.95 - 1.0) * (km - 20_000) / 60_000
    if km <= 160_000:
        return 0.95 + (0.88 - 0.95) * (km - 80_000) / 80_000
    if km <= 300_000:
        return 0.88 + (0.75 - 0.88) * (km - 160_000) / 140_000
    if km <= 450_000:
        return 0.75 + (0.40 - 0.75) * (km - 300_000) / 150_000
    return 0.40


def apply_mg_stabilization(make_normalized: str, results: list) -> None:
    """MG-only sparse-data stabilization fallback: when green_median is flat across mileage and
    data is sparse, apply a controlled mileage decay to bands. Modifies results in place.
    """
    if make_normalized != "MG":
        return
    mileage_points_count = len(results)
    if mileage_points_count < 3:
        return
    # All results same make/model/year so sample_size same for first valid result
    r0 = results[0]
    sample_size = r0.get("sample_size")
    if sample_size is None or sample_size > 2:
        return
    valid = [
        r for r in results
        if r.get("green_median") is not None
        and r.get("status") not in ("pricing_unavailable", "unsupported_model")
    ]
    if len(valid) < 3:
        return
    green_medians = [float(r["green_median"]) for r in valid]
    g_max, g_min = max(green_medians), min(green_medians)
    if g_max <= 0:
        return
    flatness = (g_max - g_min) / g_max
    if flatness > 0.05:
        return
    conf = r0.get("confidence")
    ui_notice = r0.get("ui_notice")
    if conf is not None and float(conf) > 0.35 and ui_notice not in ("extremely_limited_data", "limited_market_data"):
        return
    # Trigger: apply stabilization
    _log.debug(
        "MG-only sparse-data stabilization fallback: applying mileage decay (make=MG, sample_size=%s, points=%s)",
        sample_size,
        mileage_points_count,
    )
    baseline_result = min(valid, key=lambda r: float(r["mileage_km_num"]))
    baseline_mileage = float(baseline_result["mileage_km_num"])
    baseline_green = float(baseline_result["green_median"])
    baseline_factor = _mg_decay_multiplier(baseline_mileage)
    if baseline_factor <= 0:
        return
    band_keys = ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high")
    for r in valid:
        mileage = float(r["mileage_km_num"])
        factor = _mg_decay_multiplier(mileage) / baseline_factor  # 1.0 at lowest mileage
        curr_green = float(r["green_median"])
        if curr_green <= 0:
            continue
        scale = (baseline_green * factor) / curr_green
        for key in band_keys:
            if r.get(key) is not None:
                r[key] = _round_price(float(r[key]) * scale)
    # Ensure prices strictly decreasing as mileage increases
    valid_sorted = sorted(valid, key=lambda r: float(r["mileage_km_num"]))
    for i in range(1, len(valid_sorted)):
        prev, curr = valid_sorted[i - 1], valid_sorted[i]
        for key in band_keys:
            if prev.get(key) is not None and curr.get(key) is not None:
                if curr[key] > prev[key]:
                    curr[key] = prev[key]
    for r in valid:
        r["mg_sparse_fallback_applied"] = True


def _get_mileage_slope(brand: str, model: str) -> float:
    """
    Determine depreciation slope based on vehicle segment.
    Returns depreciation rate per 10k km above baseline.
    """
    # Premium brands: gentler depreciation (1.0% per 10k)
    premium_brands = {"BMW", "BENZ", "MERCEDES-BENZ", "AUDI", "LEXUS", "PORSCHE", "FERRARI"}
    # Economy brands: steeper depreciation (2.0% per 10k)
    economy_brands = {"SUZUKI", "DAIHATSU", "MITSUBISHI", "CHEVROLET", "FORD"}
    
    brand_upper = brand.upper() if brand else ""
    if brand_upper in premium_brands:
        return 0.010  # 1.0% per 10k km
    elif brand_upper in economy_brands:
        return 0.020  # 2.0% per 10k km
    else:
        return 0.015  # 1.5% per 10k km (default)


def _apply_luxury_high_mileage_penalty(
    brand: str,
    mileage_km: float,
    green_low: float,
    green_median: float,
    green_high: float,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
    model: str | None = None,
) -> Tuple[float, float, float, float, float, float, float]:
    """
    Apply penalty multipliers for luxury brands with very high mileage.
    This reduces unrealistic volatility for luxury cars with extreme mileage.
    Economy brands (MAZDA, TOYOTA, HONDA, NISSAN) never receive this penalty;
    they still receive old-vehicle red clamps, economy year separation, year-distance depreciation, and fallback guards.
    """
    brand_upper = brand.upper().strip() if brand else ""
    model_upper = (model or "").upper().strip()
    # Explicit guardrail: CX-3 is non-luxury; skip luxury mileage penalties to prevent future over-tightening.
    if brand_upper == "MAZDA" and model_upper in ("CX-3", "CX3"):
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    # Economy brands never receive luxury high-mileage penalty.
    economy_makes = {"MAZDA", "TOYOTA", "HONDA", "NISSAN"}
    if brand_upper in economy_makes:
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    # Luxury high-mileage penalty: LEXUS, BMW, MERCEDES, AUDI only; uniform multiplier preserves band spacing.
    luxury_makes = {"LEXUS", "BMW", "MERCEDES", "MERCEDES-BENZ", "MERCEDES BENZ", "AUDI"}
    if brand_upper not in luxury_makes:
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    
    if mileage_km >= 450_000:
        multiplier = 0.85
    elif mileage_km >= 300_000:
        multiplier = 0.92
    else:
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    
    # Apply multiplier to all bands so relative band spacing is preserved.
    green_low *= multiplier
    green_median *= multiplier
    green_high *= multiplier
    yellow *= multiplier
    red_low *= multiplier
    red_median *= multiplier
    red_high *= multiplier
    
    return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)


# --- OLD-CAR PRICING EDGE CASES (age 15–20+): analysis ---
# Where age>=10 rules live: _apply_age_based_clamp (red_median/red_high vs yellow), old-car safeguard
# (red_high vs green_median*1.35), year-distance depreciation (total_penalty cap 0.40). Why 15–20+ still
# too high/wide: (1) year-distance cap stops at 40% so 15–20y get same as 10y; (2) sample_size None
# skips sparse-data clamps so unknown-N gets no tightening; (3) no extra spread-tightening for old+sparse.
# Depreciation caps: total_penalty = min(year_gap*0.04, 0.40) — does not increase past 10 years.
# sample_size=None: _apply_low_sample_size_clamp and _apply_no_comparables_tightening treat None as
# "sufficient data" and skip; _ensure_min_bandwidth_sparse skips. So unknown sample never triggers
# sparse logic. Treating None as 0 fixes that without changing behavior when sample_size is known.


def _apply_low_sample_size_clamp(
    sample_size: int | None,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
) -> Tuple[float, float, float]:
    """
    Clamp red bands for low sample sizes to reduce unrealistic volatility.
    
    If sample_size <= 3 (or None, treated as 0):
    - red_high = min(red_high, yellow * 1.12)
    - red_median = min(red_median, yellow * 1.08)
    - Ensure ordering within red band
    """
    # Fix A: treat unknown sample size as extremely limited so sparse-data logic triggers
    effective_ss = 0 if sample_size is None else sample_size
    if effective_ss > 3:
        # Sample size is sufficient, no clamping needed
        return (red_low, red_median, red_high)
    
    # Apply clamps
    red_high = min(red_high, yellow * 1.12)
    red_median = min(red_median, yellow * 1.08)
    
    # Ensure ordering within red band: red_low <= red_median <= red_high
    # If clamping broke ordering, fix by sorting/redesigning
    if red_low > red_median:
        # red_low exceeded red_median, adjust red_low down
        red_low = min(red_low, red_median * 0.95)
    if red_median > red_high:
        # red_median exceeded red_high, adjust red_median down
        red_median = min(red_median, red_high * 0.95)
    
    # Final check: ensure strict ordering
    if not (red_low <= red_median <= red_high):
        # If still broken, use proportional spacing
        red_low = yellow + 0.10 * (red_high - yellow)
        red_median = yellow + 0.50 * (red_high - yellow)
    
    return (red_low, red_median, red_high)


def _apply_age_based_clamp(
    car_age: int,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
) -> Tuple[float, float, float]:
    """
    Clamp red bands for old cars (age >= 10 years) to reduce unrealistic volatility.
    
    If car_age >= 10:
    - red_median = min(red_median, yellow * 1.08)
    - red_high = min(red_high, yellow * 1.12)
    - Ensure ordering within red band (green < yellow < red preserved).
    """
    if car_age < 10:
        return (red_low, red_median, red_high)
    
    # Old-vehicle red band clamp: cap red so older cars don't show unrealistically wide upper band.
    red_median = min(red_median, yellow * 1.08)
    red_high = min(red_high, yellow * 1.12)
    
    # Ensure ordering within red band: red_low <= red_median <= red_high
    if red_low > red_median:
        red_low = min(red_low, red_median * 0.95)
    if red_median > red_high:
        red_median = min(red_median, red_high * 0.95)
    
    # Final check: ensure strict ordering
    if not (red_low <= red_median <= red_high):
        # If still broken, use proportional spacing
        red_low = yellow + 0.10 * (red_high - yellow)
        red_median = yellow + 0.50 * (red_high - yellow)
    
    return (red_low, red_median, red_high)


def _apply_no_comparables_tightening(
    sample_size: int | None,
    yellow: float,
    green_low: float,
    green_median: float,
    green_high: float,
    red_low: float,
    red_median: float,
    red_high: float,
) -> Tuple[float, float, float, float, float, float]:
    """
    Tighten band spread when there are 0 comparable listings.
    
    This makes fallback estimates conservative and not overly optimistic.
    Only triggers when sample_size is 0 or unknown (None treated as 0 for conservative estimate).
    """
    # Fix A: treat None as 0 so zero-comparables tightening and UI notices apply when unknown
    if sample_size is not None and sample_size != 0:
        return (green_low, green_median, green_high, red_low, red_median, red_high)
    
    # If yellow is missing/0, fail open (keep current behavior)
    if yellow is None or yellow <= 0:
        return (green_low, green_median, green_high, red_low, red_median, red_high)
    
    # Tighten bands around yellow (reduce volatility for fallback estimates)
    green_low = yellow * 0.85
    green_median = yellow * 0.90
    green_high = yellow * 0.95
    red_low = yellow * 1.02
    red_median = yellow * 1.05
    red_high = yellow * 1.08
    
    # Sanity check: ensure no band is <= 0
    green_low = max(green_low, 1.0)
    green_median = max(green_median, 1.0)
    green_high = max(green_high, 1.0)
    red_low = max(red_low, 1.0)
    red_median = max(red_median, 1.0)
    red_high = max(red_high, 1.0)
    
    # Ensure ordering is preserved
    if not (green_low <= green_median <= green_high <= yellow <= red_low <= red_median <= red_high):
        # If ordering is broken, use proportional spacing
        green_low = yellow * 0.85
        green_median = yellow * 0.90
        green_high = yellow * 0.95
        red_low = yellow * 1.02
        red_median = yellow * 1.05
        red_high = yellow * 1.08
    
    return (green_low, green_median, green_high, red_low, red_median, red_high)


def _ensure_min_bandwidth_sparse(
    sample_size: int | None,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
) -> Tuple[float, float, float, bool]:
    """
    When sample_size is low (1–3), enforce a minimum red band width to avoid
    unrealistically tight bands. min_red_span = yellow * 0.06.
    Expand symmetrically around red_median if available, else yellow.
    Preserve ordering (red_low >= yellow * 1.02 if possible).
    Returns (red_low, red_median, red_high, bandwidth_expanded).
    """
    # Fix A: treat unknown sample size as 0 so sparse logic can apply
    effective_ss = 0 if sample_size is None else sample_size
    if effective_ss >= 4:
        return (red_low, red_median, red_high, False)
    if yellow is None or yellow <= 0:
        return (red_low, red_median, red_high, False)

    min_red_span = yellow * 0.06
    current_span = red_high - red_low
    if current_span >= min_red_span:
        return (red_low, red_median, red_high, False)

    center = red_median if (red_median is not None and np.isfinite(red_median)) else yellow
    half = min_red_span / 2.0
    target_low = center - half
    target_high = center + half

    red_low_new = max(target_low, yellow * 1.02)
    red_high_new = red_low_new + min_red_span
    red_median_new = (red_low_new + red_high_new) / 2.0

    if red_median_new < red_low_new:
        red_median_new = red_low_new
    if red_median_new > red_high_new:
        red_median_new = red_high_new

    return (red_low_new, red_median_new, red_high_new, True)


def _ensure_band_ordering(
    green_low: float,
    green_median: float,
    green_high: float,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
) -> Tuple[float, float, float, float, float, float, float]:
    """
    Sanity check: ensure monotonic ordering across all bands.
    
    Expected order: green_low <= green_median <= green_high <= yellow <= red_low <= red_median <= red_high
    
    If violated, fix by re-sorting bands minimally (don't crash).
    """
    # Check full ordering
    expected_order = [
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    ]
    
    # Verify ordering
    is_ordered = all(
        expected_order[i] <= expected_order[i + 1]
        for i in range(len(expected_order) - 1)
    )
    
    if is_ordered:
        # Already correctly ordered, return as-is
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    
    # Ordering violated - fix by sorting within each band and ensuring cross-band ordering
    # Fix green band
    green_values = sorted([green_low, green_median, green_high])
    green_low = green_values[0]
    green_median = green_values[1]
    green_high = green_values[2]
    
    # Ensure green_high <= yellow
    if green_high > yellow:
        green_high = yellow * 0.99  # Slightly below yellow
        # Re-sort green band if needed
        green_values = sorted([green_low, green_median, green_high])
        green_low = green_values[0]
        green_median = green_values[1]
        green_high = green_values[2]
    
    # Fix red band
    red_values = sorted([red_low, red_median, red_high])
    red_low = red_values[0]
    red_median = red_values[1]
    red_high = red_values[2]
    
    # Ensure yellow <= red_low
    if yellow > red_low:
        red_low = yellow * 1.01  # Slightly above yellow
        # Re-sort red band if needed
        red_values = sorted([red_low, red_median, red_high])
        red_low = red_values[0]
        red_median = red_values[1]
        red_high = red_values[2]
    
    # Final verification
    final_order = [
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    ]
    is_final_ordered = all(
        final_order[i] <= final_order[i + 1]
        for i in range(len(final_order) - 1)
    )
    
    if not is_final_ordered:
        # Last resort: use proportional spacing based on anchors
        anchors = sorted([green_low, yellow, red_high])
        green_low = anchors[0]
        yellow = anchors[1]
        red_high = anchors[2]
        
        # Recompute intermediate values proportionally
        green_median = green_low + 0.50 * (yellow - green_low)
        green_high = green_low + 0.85 * (yellow - green_low)
        red_low = yellow + 0.15 * (red_high - yellow)
        red_median = yellow + 0.50 * (red_high - yellow)
    
    return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)


def _apply_nissan_almera_guardrails(
    out: dict,
    brand: str,
    model: str,
    year: int,
    submodel: str,
) -> None:
    """
    NISSAN ALMERA only: post-processing guardrails for sparse data and old/gen separation.
    Modifies out in place. Does not change green/yellow except when fixing ordering.
    """
    if (brand or "").upper().strip() != "NISSAN" or (model or "").upper().strip() != "ALMERA":
        return
    if out.get("status") in ("pricing_unavailable", "unsupported_model"):
        return
    band_keys = ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high")
    for k in band_keys:
        if out.get(k) is None:
            return
    try:
        green_low = float(out["green_low"])
        green_median = float(out["green_median"])
        green_high = float(out["green_high"])
        yellow = float(out["yellow"])
        red_low = float(out["red_low"])
        red_median = float(out["red_median"])
        red_high = float(out["red_high"])
    except (TypeError, ValueError):
        return
    sample_size = out.get("sample_size")
    try:
        ss = int(sample_size) if sample_size is not None else None
    except (TypeError, ValueError):
        ss = None
    from datetime import datetime
    current_year = datetime.now().year
    vehicle_age = max(0, current_year - year) if year > 0 else 0
    # 1) Sparse-data red clamps: cap red relative to yellow when sample_size <= 3.
    if ss is not None and ss <= 3:
        red_median = min(red_median, yellow * 1.10)
        red_high = min(red_high, yellow * 1.15)
    # 2) Old-vehicle red clamp: cap red when vehicle_age >= 10 (even if sample_size > 3).
    if vehicle_age >= 10:
        red_median = min(red_median, yellow * 1.08)
        red_high = min(red_high, yellow * 1.12)
    # 3) Generation separation: NO TRIM (<=2019) gets hard ceiling so old-gen doesn't overlap 2020+ 1.0 VL.
    no_trim = (submodel or "").strip().upper() in ("", "NONE", "UNKNOWN")
    if no_trim and year is not None and year <= 2019:
        red_median = min(red_median, yellow * 1.08)
        red_high = min(red_high, yellow * 1.12)
    # 4) Preserve band ordering; nudge minimally upward and keep integers.
    green_low = int(round(green_low))
    green_median = max(int(round(green_median)), green_low)
    if green_median <= green_low:
        green_median = green_low + 1
    green_high = max(int(round(green_high)), green_median)
    if green_high <= green_median:
        green_high = green_median + 1
    yellow = max(int(round(yellow)), green_high)
    if yellow <= green_high:
        yellow = green_high + 1
    red_low = max(int(round(red_low)), yellow)
    if red_low <= yellow:
        red_low = yellow + 1
    red_median = max(int(round(red_median)), red_low)
    if red_median < red_low:
        red_median = red_low + 1
    red_high = max(int(round(red_high)), red_median)
    if red_high < red_median:
        red_high = red_median + 1
    out["green_low"] = green_low
    out["green_median"] = green_median
    out["green_high"] = green_high
    out["yellow"] = yellow
    out["red_low"] = red_low
    out["red_median"] = red_median
    out["red_high"] = red_high


def _should_apply_note_epower_premium(brand: str, model: str, submodel: str, sample_size) -> bool:
    """True iff NISSAN NOTE E-POWER with sample_size <= 1 (sparse trim collapse guardrail)."""
    if (brand or "").upper().strip() != "NISSAN":
        return False
    if (model or "").upper().strip() != "NOTE":
        return False
    sub = (submodel or "").strip().upper()
    if "E-POWER" not in sub:
        return False
    try:
        ss = int(sample_size) if sample_size is not None else None
    except (TypeError, ValueError):
        return False
    return ss is not None and ss <= 1


def _apply_note_epower_premium_to_out(out: dict, base_green_median: float) -> None:
    """
    Enforce green_median >= base_green_median * 1.05 via uniform multiplier; preserve band ordering.
    Sparse trim collapse: E-POWER can otherwise match base NOTE when sample_size <= 1.
    """
    band_keys = ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high")
    current_green = out.get("green_median")
    if current_green is None or float(current_green) <= 0:
        return
    current_green = float(current_green)
    min_green = base_green_median * 1.05
    if current_green >= min_green:
        return
    multiplier = max(1.0, min_green / current_green)
    for k in band_keys:
        if out.get(k) is not None:
            out[k] = _round_price(float(out[k]) * multiplier)
    # Minimal nudge to restore monotonic ordering after rounding
    green_low = out["green_low"]
    green_median = max(out["green_median"], green_low)
    if green_median <= green_low:
        green_median = green_low + 1
    green_high = max(out["green_high"], green_median)
    if green_high <= green_median:
        green_high = green_median + 1
    yellow = max(out["yellow"], green_high)
    if yellow <= green_high:
        yellow = green_high + 1
    red_low = max(out["red_low"], yellow)
    if red_low <= yellow:
        red_low = yellow + 1
    red_median = max(out["red_median"], red_low)
    if red_median < red_low:
        red_median = red_low + 1
    red_high = max(out["red_high"], red_median)
    if red_high < red_median:
        red_high = red_median + 1
    out["green_low"] = green_low
    out["green_median"] = green_median
    out["green_high"] = green_high
    out["yellow"] = yellow
    out["red_low"] = red_low
    out["red_median"] = red_median
    out["red_high"] = red_high


def _apply_mileage_monotonic_correction(
    req: dict,
    mileage_km: float,
    green_low: float,
    green_median: float,
    green_high: float,
    yellow: float,
    red_low: float,
    red_median: float,
    red_high: float,
    segment_cap: float | None = None,
) -> Tuple[float, float, float, float, float, float, float]:
    """
    Apply bidirectional monotonic correction to ensure prices decrease with mileage.
    
    Problem: ML model trained on listing prices + sparse data can sometimes
    predict higher prices for higher mileage (illogical). This post-processing
    ensures that for the same make/model/year/trim, higher mileage always
    returns <= lower mileage prices.
    
    Strategy:
    - Use 50,000 km as baseline reference (typical mid-range mileage)
    - Compute baseline price by re-running prediction at 50k km
    - For mileage > baseline: apply depreciation (1.0-2.0% per 10k, capped at -40%)
    - For mileage < baseline: apply premium (capped at +10%)
    - Apply same multiplier to all bands to maintain relative structure
    - Ensures strict monotonicity: price(mileage2) <= price(mileage1) if mileage2 > mileage1
    """
    BASELINE_MILEAGE = 100_000.0  # Changed from 50k to 100k as per requirements
    MAX_PREMIUM = 0.10  # +10% maximum for low mileage
    MAX_DEPRECIATION = 0.40  # -40% maximum for high mileage
    # High-mileage band 300k–450k: extra penalty so price(450k) < price(300k); cap remains 450k
    HIGH_MILEAGE_THRESHOLD_KM = 300_000.0
    HIGH_MILEAGE_RANGE_KM = 150_000.0  # 300k to 450k
    HIGH_MILEAGE_EXTRA_PENALTY = 0.07  # max additional -7% at 450k (within 5–10% range)

    if mileage_km <= 0:
        mileage_km = BASELINE_MILEAGE
    
    # If mileage is exactly at baseline, no correction needed
    if abs(mileage_km - BASELINE_MILEAGE) < 500:
        return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)
    
    # Get segment-based depreciation slope
    brand = _std_cat(req.get("make") or req.get("brand"))
    model = _std_cat(req.get("model"))
    depreciation_per_10k = _get_mileage_slope(brand, model)
    
    # Compute baseline prices at 100k km for the same vehicle
    baseline_req = req.copy()
    baseline_req["mileage_km_num"] = BASELINE_MILEAGE
    
    try:
        # Re-run prediction at baseline mileage (without monotonic correction to avoid recursion)
        brand = _std_cat(req.get("make") or req.get("brand"))
        model = _std_cat(req.get("model"))
        model_normalized_b = _normalize_model_strict(brand, model)
        year = int(req.get("year", 0))
        submodel_b = _std_cat(req.get("trim") or req.get("submodel") or "")

        X_baseline = _add_features(baseline_req)
        log_q20_baseline = float(_q20.predict(X_baseline)[0])
        log_q50_baseline = float(_q50.predict(X_baseline)[0])
        log_q80_baseline = float(_q80.predict(X_baseline)[0])
        
        q20_baseline = np.exp(log_q20_baseline)
        q50_baseline = np.exp(log_q50_baseline)
        q80_baseline = np.exp(log_q80_baseline)
        
        # Apply same blending and caps as main prediction (Civic Type R isolation: segment median)
        if brand == "HONDA" and model_normalized_b == "CIVIC":
            gmed = _lookup_civic_segment_median(year, _is_civic_type_r(submodel_b))
        else:
            gmed = _lookup_group_median(brand, model_normalized_b, year)
        if gmed is not None and np.isfinite(gmed) and gmed > 0:
            blend = float(_BLEND_W)
            q50_baseline = (1.0 - blend) * q50_baseline + blend * gmed
        
        LOW_RATIO = 0.65
        HIGH_RATIO = 1.75
        q20_baseline = max(q20_baseline, q50_baseline * LOW_RATIO)
        q80_baseline = min(q80_baseline, q50_baseline * HIGH_RATIO)
        
        if gmed is not None and np.isfinite(gmed) and gmed > 0:
            q50_baseline = float(np.clip(q50_baseline, 0.65 * gmed, 1.35 * gmed))
            q20_baseline = max(q20_baseline, q50_baseline * LOW_RATIO)
            q80_baseline = min(q80_baseline, q50_baseline * HIGH_RATIO)
        
        # Apply segment cap to baseline if available (prevents unrealistic baseline)
        # But maintain relative structure - scale proportionally if needed
        if segment_cap is not None:
            max_baseline = max(q20_baseline, q50_baseline, q80_baseline)
            if max_baseline > segment_cap:
                scale_factor = segment_cap / max_baseline
                q20_baseline *= scale_factor
                q50_baseline *= scale_factor
                q80_baseline *= scale_factor
        
        # Compute baseline bands
        green_low_baseline = float(q20_baseline)
        yellow_baseline = float(q50_baseline)
        red_high_baseline = float(q80_baseline)
        
        if not (green_low_baseline <= yellow_baseline <= red_high_baseline):
            green_low_baseline, yellow_baseline, red_high_baseline = sorted(
                [green_low_baseline, yellow_baseline, red_high_baseline]
            )
        
        green_median_baseline = green_low_baseline + 0.50 * (yellow_baseline - green_low_baseline)
        green_high_baseline = green_low_baseline + 0.85 * (yellow_baseline - green_low_baseline)
        red_low_baseline = yellow_baseline + 0.15 * (red_high_baseline - yellow_baseline)
        red_median_baseline = yellow_baseline + 0.50 * (red_high_baseline - yellow_baseline)
        
        # Calculate adjustment multiplier based on mileage difference from baseline
        mileage_diff = mileage_km - BASELINE_MILEAGE
        
        if mileage_diff > 0:
            # Above baseline: apply depreciation
            excess_10k_units = mileage_diff / 10_000.0
            depreciation = excess_10k_units * depreciation_per_10k
            # Cap depreciation at MAX_DEPRECIATION
            depreciation = min(depreciation, MAX_DEPRECIATION)
            multiplier = 1.0 - depreciation
        else:
            # Below baseline: apply smooth premium curve
            # Premium tapers from max at very low mileage to 0% at baseline
            # Example: 1k gets ~10% premium, 10k gets ~9%, 50k gets ~5%, 100k gets 0%
            deficit_km = -mileage_diff  # Positive value
            if deficit_km > 0:
                # Smooth curve: premium decreases linearly from max at 0km to 0 at baseline
                # Use a smooth interpolation: premium = MAX_PREMIUM * (1 - mileage/baseline)
                # This ensures 1k > 5k > 10k > 50k > 100k (smooth, not clamped)
                normalized_mileage = mileage_km / BASELINE_MILEAGE  # 0.01 for 1k, 0.1 for 10k, etc.
                # Premium curve: starts at MAX_PREMIUM for very low mileage, tapers to 0 at baseline
                # Use a smooth decay: premium = MAX_PREMIUM * (1 - normalized_mileage)^2
                # This gives more premium to very low mileage, smooth taper
                premium_factor = (1.0 - normalized_mileage) ** 1.5  # Smooth curve
                premium = MAX_PREMIUM * premium_factor
                premium = max(0.0, min(premium, MAX_PREMIUM))  # Clamp to [0, MAX_PREMIUM]
                multiplier = 1.0 + premium
            else:
                multiplier = 1.0
        
        # Apply multiplier to baseline prices to get target prices
        green_low_target = green_low_baseline * multiplier
        green_median_target = green_median_baseline * multiplier
        green_high_target = green_high_baseline * multiplier
        yellow_target = yellow_baseline * multiplier
        red_low_target = red_low_baseline * multiplier
        red_median_target = red_median_baseline * multiplier
        red_high_target = red_high_baseline * multiplier

        # For mileage > 300k: apply extra penalty so 300k and 450k do not collapse to same price
        if mileage_diff > 0 and mileage_km > HIGH_MILEAGE_THRESHOLD_KM:
            extra = (mileage_km - HIGH_MILEAGE_THRESHOLD_KM) / HIGH_MILEAGE_RANGE_KM  # 0 at 300k, 1 at 450k
            high_mileage_factor = 1.0 - HIGH_MILEAGE_EXTRA_PENALTY * min(extra, 1.0)
            green_low_target *= high_mileage_factor
            green_median_target *= high_mileage_factor
            green_high_target *= high_mileage_factor
            yellow_target *= high_mileage_factor
            red_low_target *= high_mileage_factor
            red_median_target *= high_mileage_factor
            red_high_target *= high_mileage_factor

        # Apply target prices (ensures monotonicity and smooth premium curve)
        # For mileage > baseline: clamp to ensure depreciation
        # For mileage < baseline: use target directly (smooth premium, not just clamping)
        if mileage_diff > 0:
            # Above baseline: clamp to ensure depreciation
            green_low = min(green_low, green_low_target)
            green_median = min(green_median, green_median_target)
            green_high = min(green_high, green_high_target)
            yellow = min(yellow, yellow_target)
            red_low = min(red_low, red_low_target)
            red_median = min(red_median, red_median_target)
            red_high = min(red_high, red_high_target)
        else:
            # Below baseline: use target prices directly (smooth premium curve)
            # This ensures 1k > 5k > 10k > 50k smoothly, not all clamped to same value
            green_low = green_low_target
            green_median = green_median_target
            green_high = green_high_target
            yellow = yellow_target
            red_low = red_low_target
            red_median = red_median_target
            red_high = red_high_target
        
    except Exception as e:
        # If baseline computation fails, fall back to simple mileage-based adjustment
        # This ensures we still apply some correction even if baseline fails
        depreciation_per_10k = _get_mileage_slope(brand, model)
        mileage_diff = mileage_km - BASELINE_MILEAGE
        
        if mileage_diff > 0:
            # Above baseline: depreciation
            excess_10k_units = mileage_diff / 10_000.0
            depreciation = min(excess_10k_units * depreciation_per_10k, MAX_DEPRECIATION)
            multiplier = 1.0 - depreciation
            # High-mileage band: extra penalty so 450k < 300k
            if mileage_km > HIGH_MILEAGE_THRESHOLD_KM:
                extra = (mileage_km - HIGH_MILEAGE_THRESHOLD_KM) / HIGH_MILEAGE_RANGE_KM
                multiplier *= 1.0 - HIGH_MILEAGE_EXTRA_PENALTY * min(extra, 1.0)
        else:
            # Below baseline: smooth premium curve (same logic as above)
            if mileage_km > 0:
                normalized_mileage = mileage_km / BASELINE_MILEAGE
                premium_factor = (1.0 - normalized_mileage) ** 1.5
                premium = MAX_PREMIUM * premium_factor
                premium = max(0.0, min(premium, MAX_PREMIUM))
                multiplier = 1.0 + premium
            else:
                multiplier = 1.0

        green_low *= multiplier
        green_median *= multiplier
        green_high *= multiplier
        yellow *= multiplier
        red_low *= multiplier
        red_median *= multiplier
        red_high *= multiplier
    
    return (green_low, green_median, green_high, yellow, red_low, red_median, red_high)


def predict_price(req: dict, _skip_year_order_check: bool = False, _skip_note_epower_premium: bool = False) -> dict:
    """Return green/yellow/red prices with post-prediction sanity caps + transparency."""
    if not is_ready():
        raise RuntimeError("Price model not loaded")

    brand = _std_cat(req.get("make") or req.get("brand"))
    model = _std_cat(req.get("model"))
    
    # Extract year early for model-year specific exclusions
    try:
        year = int(req.get("year"))
    except Exception:
        year = 0
    submodel = _std_cat(req.get("trim") or req.get("submodel") or "")

    # TODO: Replace hardcoded BYD Seal year check with global production-year validation
    # BYD Seal production started in 2022; block year < 2022 before any pricing/fallback.
    # Apply ONLY to make=BYD and model=SEAL. Do not affect other BYD models or brands.
    if brand == "BYD" and model == "SEAL" and year > 0 and year < 2022:
        return {
            "status": "pricing_unavailable",
            "error": "model_not_in_production",
            "message": "BYD Seal was not produced in the selected year. Production started in 2022.",
            "ui_notice": "model_not_in_production",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
        }

    # TODO: Replace with full production-year mapping table. Temporary safeguard.
    # Chevrolet Aveo: production ended → block years after 2018. Only CHEVROLET + AVEO.
    if brand == "CHEVROLET" and model == "AVEO" and year > 2018:
        return {
            "status": "pricing_unavailable",
            "ui_notice": "model_not_produced_in_selected_year",
            "message": "This model was not produced in the selected year.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
        }

    # Chevrolet Captiva: modern Thai-market (rebadged Baojun) starts ~2019. Allow ≤2017 (sparse) and 2019+.
    # Block 2018 only (transition year with no reliable listings). Only CHEVROLET + CAPTIVA.
    if brand == "CHEVROLET" and model == "CAPTIVA" and year == 2018:
        return {
            "status": "pricing_unavailable",
            "ui_notice": "model_not_produced_in_selected_year",
            "message": "This model was not produced in the selected year.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
        }

    # TODO: Remove once global make/model production-year table is implemented. Temporary rule.
    # Ferrari 296 GTB: production began in 2022; block year < 2022. Only FERRARI + 296 GTB.
    if brand == "FERRARI" and model == "296 GTB" and year > 0 and year < 2022:
        return {
            "status": "pricing_unavailable",
            "reason": "Ferrari 296 GTB was not in production for the selected year",
            "message": "This model was not in production for the selected year. Ferrari 296 GTB production began in 2022.",
            "ui_notice": "model_not_in_production",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
        }

    # RS4 is intentionally excluded due to high-performance / low-volume model with sparse data.
    # This is temporary and can be expanded later to other performance models.
    if brand == "AUDI" and model == "RS4":
        # Return controlled response indicating unsupported pricing
        # Skip ML prediction, fallback logic, and post-processing
        return {
            "status": "unsupported_model",
            "reason": "high_performance_insufficient_data",
            "message": "High-performance vehicles have limited listings and highly variable pricing. Automated price estimates are unavailable in the current version to ensure accuracy.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_high_performance",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }
    
    # Audi TT < 2019 is excluded due to extreme market distortion from rare/import/RS variants.
    # Older TT listings are heavily distorted by single-listing samples causing multi-million baht outputs.
    # This produces misleading and impossible prices. TT 2019+ remains supported.
    if brand == "AUDI" and model == "TT" and year > 0 and year < 2019:
        # Return controlled response indicating pricing unavailable for this model-year combination
        # Skip ML prediction, fallback logic, and post-processing
        return {
            "status": "pricing_unavailable",
            "reason": "Insufficient market data for this model and year",
            "message": "Pricing unavailable for this model and year due to inconsistent market data.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }
    
    # BENZ model-specific production year constraints.
    # Other BENZ models and global year handling are unaffected.
    # Accept both BENZ and MERCEDES-BENZ; normalize models so "EQS CLASS", "GLC CLASS", etc. all match.
    _brand_benz = brand in ("BENZ", "MERCEDES-BENZ")
    model_norm = (model or "").upper().strip().replace(" ", "-")
    try:
        _year_int = int(year) if year is not None else 0
    except (TypeError, ValueError):
        _year_int = 0

    # BENZ EQS-CLASS: not produced before 2021.
    if _brand_benz and model_norm == "EQS-CLASS" and _year_int > 0 and _year_int < 2021:
        return {
            "status": "pricing_unavailable",
            "reason": "This model was not produced in the selected year",
            "message": "This model was not produced in the selected year.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }

    # BENZ GLC-CLASS: not produced before 2015.
    if _brand_benz and model_norm == "GLC-CLASS" and _year_int > 0 and _year_int < 2015:
        return {
            "status": "pricing_unavailable",
            "reason": "This model was not produced in the selected year",
            "message": "This model was not produced in the selected year.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }

    # BENZ GLE-CLASS: not produced before 2016.
    if _brand_benz and model_norm == "GLE-CLASS" and _year_int > 0 and _year_int < 2016:
        return {
            "status": "pricing_unavailable",
            "reason": "This model was not produced in the selected year",
            "message": "This model was not produced in the selected year.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }

    # BENZ ML-CLASS: discontinued and renamed to GLE-CLASS from 2016 onward.
    if _brand_benz and model_norm == "ML-CLASS" and _year_int >= 2016:
        return {
            "status": "pricing_unavailable",
            "reason": "This model was discontinued and renamed to GLE-CLASS",
            "message": "This model was discontinued and renamed to GLE-CLASS.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }

    # BENZ SLK-CLASS: discontinued and renamed to SLC-CLASS from 2016 onward.
    if _brand_benz and model_norm == "SLK-CLASS" and _year_int >= 2016:
        return {
            "status": "pricing_unavailable",
            "reason": "This model was discontinued and renamed to SLC-CLASS",
            "message": "This model was discontinued and renamed to SLC-CLASS.",
            "green_low": None,
            "green_median": None,
            "green_high": None,
            "yellow": None,
            "red_low": None,
            "red_median": None,
            "red_high": None,
            "estimate_basis": "unsupported_model_year",
            "confidence": 0.0,
            "sample_size": None,
            "bandwidth_clamped": False,
            "bandwidth_expanded_sparse": False,
        }

    # BMW 3-Series trim production-year validation (330i, 330e, 320i, 320d).
    # G20 generation: 2019+; F30 generation: 2012–2018. Hard validation, no fallback.
    _bmw_3_models = ("330I", "330E", "320I", "320D")
    if brand == "BMW" and model_norm in _bmw_3_models and _year_int > 0:
        submodel_raw = (req.get("trim") or req.get("submodel") or "").strip().upper()
        if "G20" in submodel_raw and _year_int < 2019:
            return {
                "status": "pricing_unavailable",
                "reason": "This trim was not produced in the selected year",
                "message": "This trim was not produced in the selected year.",
                "green_low": None,
                "green_median": None,
                "green_high": None,
                "yellow": None,
                "red_low": None,
                "red_median": None,
                "red_high": None,
                "estimate_basis": "unsupported_model_year",
                "confidence": 0.0,
                "sample_size": None,
                "bandwidth_clamped": False,
                "bandwidth_expanded_sparse": False,
            }
        if "F30" in submodel_raw and (_year_int < 2012 or _year_int > 2018):
            return {
                "status": "pricing_unavailable",
                "reason": "This trim was not produced in the selected year",
                "message": "This trim was not produced in the selected year.",
                "green_low": None,
                "green_median": None,
                "green_high": None,
                "yellow": None,
                "red_low": None,
                "red_median": None,
                "red_high": None,
                "estimate_basis": "unsupported_model_year",
                "confidence": 0.0,
                "sample_size": None,
                "bandwidth_clamped": False,
                "bandwidth_expanded_sparse": False,
            }

    # BMW G30 trim production-year validation (5-Series; isolated, before price estimation).
    # If trim contains "G30" and year < 2017: return status so API can respond with HTTP 400.
    if brand == "BMW" and _year_int > 0 and _year_int < 2017:
        submodel_g30 = (req.get("trim") or req.get("submodel") or "").strip().upper()
        if "G30" in submodel_g30:
            return {
                "status": "trim_not_produced_year",
                "message": "Selected trim was not produced in this year.",
            }

    # Bentley Flying Spur: Check sample size early to skip ML if insufficient data
    # This model has highly spec-dependent pricing and limited listings
    if brand == "BENTLEY" and model == "FLYING SPUR":
        # Get sample size early to determine if pricing should be unavailable
        sample_size_early = _lookup_sample_size(brand, model, year)
        if sample_size_early is not None and sample_size_early < 2:
            # Return controlled response indicating pricing unavailable
            # Skip ML prediction, fallback logic, and post-processing
            return {
                "status": "pricing_unavailable",
                "reason": "Insufficient market data for this model and year",
                "message": "Bentley Flying Spur listings are limited and highly spec-dependent. Automated pricing is unavailable for this model and year to avoid misleading estimates.",
                "green_low": None,
                "green_median": None,
                "green_high": None,
                "yellow": None,
                "red_low": None,
                "red_median": None,
                "red_high": None,
                "estimate_basis": "unsupported_model_year",
                "confidence": 0.0,
                "sample_size": sample_size_early,
                "bandwidth_clamped": False,
                "bandwidth_expanded_sparse": False,
            }

    X = _add_features(req)

    # model quantiles - these are in log space (log(price))
    log_q20 = float(_q20.predict(X)[0])
    log_q50 = float(_q50.predict(X)[0])
    log_q80 = float(_q80.predict(X)[0])

    # Convert from log space to actual price space
    q20 = np.exp(log_q20)
    q50 = np.exp(log_q50)
    q80 = np.exp(log_q80)

    print("=== RAW MODEL OUTPUT (before blend & caps) ===")
    print(f"mileage_km = {req.get('mileage_km_num')}")
    print(f"q20_raw = {q20:,.0f}")
    print(f"q50_raw = {q50:,.0f}")
    print(f"q80_raw = {q80:,.0f}")
    print("=============================================")

    # Get segment cap for later use (but don't apply yet - let mileage correction work first)
    segment_cap = _get_segment_cap(brand, model)
    if segment_cap is not None:
        print(f"Segment cap available: {segment_cap:,.0f} THB for {brand} {model} (will apply after mileage correction)")

    # Use strict model normalization for group median lookup
    model_normalized = _normalize_model_strict(brand, model)

    # Honda Civic Type R isolation: use segment-specific median (Type R vs non-Type R) so they never share aggregation.
    if brand == "HONDA" and model_normalized == "CIVIC":
        gmed = _lookup_civic_segment_median(year, _is_civic_type_r(submodel))
    else:
        gmed = _lookup_group_median(brand, model_normalized, year)

    # optional blend toward group median for stability (light, 30% default)
    # Only blend if we have exact model match (no brand-level fallback)
    if gmed is not None and np.isfinite(gmed) and gmed > 0:
        blend = float(_BLEND_W)
        q50 = (1.0 - blend) * q50 + blend * gmed

    # --- sanity caps around q50 (median) ---
    LOW_RATIO = 0.65   # q20 not lower than 65% of q50
    HIGH_RATIO = 1.75  # q80 not higher than 175% of q50

    q20 = max(q20, q50 * LOW_RATIO)
    q80 = min(q80, q50 * HIGH_RATIO)

    # --- optional: re-anchor to group median window and re-cap ---
    if gmed is not None and np.isfinite(gmed) and gmed > 0:
        # Apply segment cap to group median if available (prevent bad data from affecting results)
        # But allow mileage correction to create variation first
        if segment_cap is not None:
            gmed = min(gmed, segment_cap)
        
        # keep q50 within ±35% of group median
        q50 = float(np.clip(q50, 0.65 * gmed, 1.35 * gmed))
        # re-apply band caps around the (possibly adjusted) q50
        q20 = max(q20, q50 * LOW_RATIO)
        q80 = min(q80, q50 * HIGH_RATIO)

    # --- Year-distance depreciation (non-ML): avoid flat-year issue (e.g. 2016 == 2019). Applies to all models. ---
    if year > 0:
        from datetime import datetime
        anchor_year = datetime.now().year
        # Only depreciate older cars (year < anchor); same model, gap >= 2.
        year_gap = max(0, anchor_year - year)
        if year_gap >= 2:
            # 3–6% per year gap; apply to median before band construction so green_median reflects depreciation.
            penalty_per_year = 0.04  # 4% (middle of 3–6%)
            # Fix B: allow stronger depreciation only for very old cars (15+ years); keep cap at 40% for 10–14y
            penalty_cap = 0.55 if year_gap >= 15 else 0.40
            total_penalty = min(year_gap * penalty_per_year, penalty_cap)
            factor = 1.0 - total_penalty
            q50 = float(q50 * factor)
            q20 = max(q20, q50 * LOW_RATIO)
            q80 = min(q80, q50 * HIGH_RATIO)

    # --- BANDS centered on model quantiles ---
    # Anchors (these are the "true" model-driven points)
    green_low = float(q20)   # q20 anchor
    yellow = float(q50)      # q50 anchor
    red_high = float(q80)    # q80 anchor

    # Enforce ordering (just in case)
    if not (green_low <= yellow <= red_high):
        # fallback to sorted to avoid weird outputs
        green_low, yellow, red_high = sorted([green_low, yellow, red_high])

    # Fill inside the bands by interpolating between anchors
    # Green band lives between q20 -> q50
    green_median = green_low + 0.50 * (yellow - green_low)
    green_high   = green_low + 0.85 * (yellow - green_low)

    # Red band lives between q50 -> q80
    red_low    = yellow + 0.15 * (red_high - yellow)
    red_median = yellow + 0.50 * (red_high - yellow)

    # Optional: if q80 is extremely far from q50, cap it to keep UX sane
    # (uncomment if you want a hard limit)
    # MAX_RED_RATIO = 1.60
    # if red_high > yellow * MAX_RED_RATIO:
    #     red_high = yellow * MAX_RED_RATIO
    #     red_low = yellow + 0.15 * (red_high - yellow)
    #     red_median = yellow + 0.50 * (red_high - yellow)

    # Band-width clamp (prevents extreme spreads)
# Band-width clamp (prevents extreme spreads)
    bandwidth_clamped = False
    if (red_high > yellow * 1.35) or (green_low < yellow * 0.65):
       bandwidth_clamped = True

    # cap extreme upside based on GREEN (condition floor), not YELLOW (market center)
    MAX_RED_MULT = 1.85  # tune as needed
    cap = green_low * MAX_RED_MULT

    if red_high > cap:
        red_high = cap

        # recompute red band after cap
        red_low = yellow + 0.15 * (red_high - yellow)
        red_median = yellow + 0.50 * (red_high - yellow)

    # Calculate car age and get sample size early for post-processing
    from datetime import datetime
    current_year = datetime.now().year
    car_age = max(0, current_year - year) if year > 0 else 0
    mileage_km = float(req.get("mileage_km_num", 0.0))
    sample_size = _lookup_sample_size(brand, model, year)

    # Apply luxury high-mileage penalty multipliers BEFORE clamps
    # This reduces unrealistic volatility for luxury brands with extreme mileage
    (
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    ) = _apply_luxury_high_mileage_penalty(
        brand,
        mileage_km,
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
        model=model,
    )

    # Apply monotonic mileage correction to ensure prices decrease with mileage
    # This fixes cases where sparse training data causes illogical price increases
    (
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    ) = _apply_mileage_monotonic_correction(
        req,
        mileage_km,
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
        segment_cap,  # Pass segment cap so baseline calculation uses it
    )
    
    # Apply low sample size clamp (reduces volatility for small datasets)
    red_low, red_median, red_high = _apply_low_sample_size_clamp(
        sample_size,
        yellow,
        red_low,
        red_median,
        red_high,
    )
    
    # Apply age-based clamp (reduces volatility for old cars)
    red_low, red_median, red_high = _apply_age_based_clamp(
        car_age,
        yellow,
        red_low,
        red_median,
        red_high,
    )
    
    # Old-car safeguard (future-proof): keep red band bounded for vehicles 10+ years old.
    if car_age >= 10 and green_median is not None and float(green_median) > 0:
        cap = float(green_median) * 1.35
        if red_high > cap:
            red_high = cap
            if red_median > red_high:
                red_median = min(red_median, red_high)
            if red_low > red_median:
                red_low = min(red_low, red_median)
    
    # Apply no-comparables tightening (for fallback estimates with 0 listings)
    # This makes estimates conservative when there's no direct market data
    green_low, green_median, green_high, red_low, red_median, red_high = _apply_no_comparables_tightening(
        sample_size,
        yellow,
        green_low,
        green_median,
        green_high,
        red_low,
        red_median,
        red_high,
    )
    
    # Ensure band ordering is correct after all adjustments
    (
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    ) = _ensure_band_ordering(
        green_low,
        green_median,
        green_high,
        yellow,
        red_low,
        red_median,
        red_high,
    )

    # Minimum red band width when sample size is small (1–3) to avoid over-precise bands
    bandwidth_expanded_sparse = False
    red_low, red_median, red_high, bandwidth_expanded_sparse = _ensure_min_bandwidth_sparse(
        sample_size,
        yellow,
        red_low,
        red_median,
        red_high,
    )
    if bandwidth_expanded_sparse:
        (
            green_low,
            green_median,
            green_high,
            yellow,
            red_low,
            red_median,
            red_high,
        ) = _ensure_band_ordering(
            green_low,
            green_median,
            green_high,
            yellow,
            red_low,
            red_median,
            red_high,
        )

    # Final segment cap check after all processing (safety net)
    # This ensures Mazda 2 never exceeds 650k THB regardless of mileage or other adjustments
    # But maintain relative band structure - only cap if any band exceeds the limit
    if segment_cap is not None:
        max_price = max(green_low, green_median, green_high, yellow, red_low, red_median, red_high)
        if max_price > segment_cap:
            # Scale down proportionally to maintain relative structure
            scale_factor = segment_cap / max_price
            green_low *= scale_factor
            green_median *= scale_factor
            green_high *= scale_factor
            yellow *= scale_factor
            red_low *= scale_factor
            red_median *= scale_factor
            red_high *= scale_factor

    # --- Commercial vehicle handling: BENZ SPRINTER & VITO ---
    # Keep pricing enabled regardless of listing count, but slightly constrain bands when comparables are sparse.
    if (
        brand == "BENZ"
        and model in ("SPRINTER", "VITO")
        and sample_size is not None
        and int(sample_size) < 2
        and yellow > 0
    ):
        # Slightly narrow bands around yellow without touching confidence.
        green_high = min(green_high, yellow * 0.95)
        red_low = max(red_low, yellow * 1.05)
        (
            green_low,
            green_median,
            green_high,
            yellow,
            red_low,
            red_median,
            red_high,
        ) = _ensure_band_ordering(
            green_low,
            green_median,
            green_high,
            yellow,
            red_low,
            red_median,
            red_high,
        )

    # Transparency (sample_size already computed above)
    
    # Handle 0 comparable listings case explicitly
    if sample_size is not None and sample_size == 0:
        estimate_basis = "fallback_no_comparables"
        confidence = 0.20  # Cap at 0.2 for no comparables
    elif sample_size >= 5:
        estimate_basis = "based_on_comparable_listings"
    else:
        estimate_basis = "market_trends"

    if sample_size is not None and sample_size == 0:
        confidence = 0.20  # Explicitly cap at 0.2 for no comparables
    elif sample_size >= 20:
        confidence = 0.85
    elif sample_size >= 10:
        confidence = 0.75
    elif sample_size >= 5:
        confidence = 0.60
    elif sample_size >= 2:
        confidence = 0.45
    elif sample_size >= 1:
        confidence = 0.30
    else:
        confidence = 0.20

    # Sanity check: predicted price should not exceed filtered comparable median by more than 30-40%
    # unless confidence is low (moved after confidence calculation)
    if gmed is not None and np.isfinite(gmed) and gmed > 0:
        max_deviation = 0.40 if confidence >= 0.60 else 0.50  # Allow more deviation if low confidence
        if yellow > gmed * (1.0 + max_deviation):
            # Scale down proportionally to bring within reasonable range
            scale_factor = (gmed * (1.0 + max_deviation)) / yellow
            green_low *= scale_factor
            green_median *= scale_factor
            green_high *= scale_factor
            yellow *= scale_factor
            red_low *= scale_factor
            red_median *= scale_factor
            red_high *= scale_factor

    # Cap confidence for fallback cases
    if estimate_basis == "fallback_no_comparables":
        confidence = 0.20  # Explicitly cap at 0.2 for no comparables
    elif estimate_basis == "market_trends":
        confidence = min(confidence, 0.45)

    if bandwidth_clamped:
        confidence = max(0.20, confidence - 0.10)

    # ========== TEMP TEST (2026-02): Toyota Yaris only — sparse-data year guardrail ==========
    # TO REMOVE: Delete from this line down to and including "# ========== END TEMP Toyota Yaris =========="
    # and delete the two "if _yaris_scale_used" lines below that inject debug fields into out. No other code.
    _yaris_scale_used = None
    try:
        if (brand or "").upper().strip() == "TOYOTA" and (model or "").upper().strip() == "YARIS":
            ss = None
            if sample_size is not None:
                try:
                    ss = int(sample_size)
                except (TypeError, ValueError):
                    pass
            sparse = ss is not None and ss <= 3
            if sparse and year is not None and year > 0:
                anchor = 2018
                if year < anchor:
                    years_older = anchor - year
                    # ~5% per year; floor 0.35 so 2006 clearly ≤ 2013 at same mileage
                    scale = 1.0 - 0.05 * min(years_older, 12)
                    scale = max(scale, 0.35)
                else:
                    scale = 1.0
                if scale < 1.0:
                    green_low *= scale
                    green_median *= scale
                    green_high *= scale
                    yellow *= scale
                    red_low *= scale
                    red_median *= scale
                    red_high *= scale
                    (green_low, green_median, green_high, yellow, red_low, red_median, red_high) = _ensure_band_ordering(
                        green_low, green_median, green_high, yellow, red_low, red_median, red_high
                    )
                    _yaris_scale_used = scale
    except Exception:
        _yaris_scale_used = None
    # ========== END TEMP Toyota Yaris ==========

    out = {
        "green_low": _round_price(green_low),
        "green_median": _round_price(green_median),
        "green_high": _round_price(green_high),
        "yellow": _round_price(yellow),
        "red_low": _round_price(red_low),
        "red_median": _round_price(red_median),
        "red_high": _round_price(red_high),

        "estimate_basis": estimate_basis,
        "confidence": round(float(confidence), 2),
        "sample_size": int(sample_size),
        "bandwidth_clamped": bool(bandwidth_clamped),
        "bandwidth_expanded_sparse": bool(bandwidth_expanded_sparse),
    }
    # TEMP: remove these 3 lines when removing the Yaris guardrail block above
    if _yaris_scale_used is not None:
        out["_temp_yaris_year_guardrail"] = True
        out["_temp_yaris_year_scale"] = _yaris_scale_used

    # --- UI metadata flags (no impact on pricing/confidence) ---
    try:
        # Extremely limited data: all brands/models when sample_size <= 1 (UI-only; pricing unchanged).
        if sample_size is not None and int(sample_size) <= 1:
            out["ui_notice"] = "extremely_limited_data"
        # Limited market data: sample_size == 2 (transparency only; no change to pricing/confidence).
        elif sample_size is not None and int(sample_size) <= 2:
            out["ui_notice"] = "limited_market_data"

        # High-variance S-CLASS notice: modern S-CLASS (2020+) with very few comparables.
        if (
            brand == "BENZ"
            and model == "S-CLASS"
            and year is not None
            and int(year) >= 2020
            and sample_size is not None
            and int(sample_size) < 4
        ):
            out["ui_notice"] = "high_spec_variance"

        # Commercial vehicle notice: BENZ SPRINTER & VITO (always show, regardless of listing count).
        if brand == "BENZ" and model in ("SPRINTER", "VITO"):
            out["ui_notice"] = "commercial_vehicle_pricing"

        # TEMP UI NOTE: Chevrolet sparse data (only when already flagged as limited/extremely limited).
        if (
            brand == "CHEVROLET"
            and (sample_size is not None and int(sample_size) <= 2)
            and out.get("ui_notice") in ("extremely_limited_data", "limited_market_data")
        ):
            out["ui_footnote"] = (
                "Pricing is based on limited Chevrolet market data and may be less precise than usual."
            )
            out["ui_footnote_key"] = "result.chevroletSparseFootnote"

        # Global Ferrari UI note: luxury/limited-production vehicles may show wider price ranges.

        # No comparables: optional field for UI to show fallback-specific warning (sample_size == 0).
        if out.get("sample_size") == 0 or out.get("estimate_basis") == "fallback_no_comparables":
            out["data_quality"] = "no_comparables"

        # KIA EV6 only: when fallback/no comparables, force ui_notice and cap confidence (no pricing change).
        if brand == "KIA" and model_normalized == "EV6":
            if out.get("estimate_basis") == "fallback_no_comparables" or out.get("sample_size") == 0:
                out["ui_notice"] = "extremely_limited_data"
                out["confidence"] = min(float(out.get("confidence", 1.0)), 0.2)

        # Lexus ES only: model-specific UI notice by sample_size (no pricing change).
        _lex_notice, _lex_detail = _lexus_es_ui_notice(brand, model_normalized, out.get("sample_size"))
        if _lex_notice is not None:
            out["ui_notice"] = _lex_notice
            out["ui_notice_detail"] = _lex_detail
    except Exception:
        # Never let metadata computation break the main response
        pass

    # --- TEMPORARY: BYD Dolphin invalid production year hard-block ---
    # When sample_size === 0 and estimate_basis === fallback_no_comparables, treat as model not
    # produced in selected year. No hardcoded years; remove when full model-year production table exists.
    if brand == "BYD" and model == "DOLPHIN":
        if out.get("sample_size") == 0 and out.get("estimate_basis") == "fallback_no_comparables":
            return {
                "status": "pricing_unavailable",
                "reason": "BYD Dolphin was not produced in the selected year",
                "message": "BYD Dolphin was not produced in the selected year. Pricing is unavailable for this model and year.",
                "green_low": None,
                "green_median": None,
                "green_high": None,
                "yellow": None,
                "red_low": None,
                "red_median": None,
                "red_high": None,
                "estimate_basis": "fallback_no_comparables",
                "confidence": out.get("confidence"),
                "sample_size": 0,
                "bandwidth_clamped": out.get("bandwidth_clamped", False),
                "bandwidth_expanded_sparse": out.get("bandwidth_expanded_sparse", False),
            }

    # --- TEMPORARY: BMW X1 outlier safety net (isolated, removable when data is reliable) ---
    # Post-estimation guard only. If X1 green_median exceeds 2M THB, treat as invalid outlier
    # and do not return price bands. Once market data improves and X1 prices naturally fall
    # below the threshold, results will pass through without any code change.
    if brand == "BMW" and model == "X1":
        green_median_val = out.get("green_median")
        if green_median_val is not None and green_median_val > 2_000_000:
            mileage_km_num = req.get("mileage_km_num")
            return {
                "status": "pricing_unavailable",
                "message": "Pricing unavailable — insufficient or inconsistent market data for this vehicle.",
                "green_low": None,
                "green_median": None,
                "green_high": None,
                "yellow": None,
                "red_low": None,
                "red_median": None,
                "red_high": None,
                "estimate_basis": "invalid_outlier_guard",
                "ui_notice": "pricing_unavailable_insufficient_data",
                "confidence": out.get("confidence"),
                "sample_size": out.get("sample_size"),
                "bandwidth_clamped": out.get("bandwidth_clamped", False),
                "bandwidth_expanded_sparse": out.get("bandwidth_expanded_sparse", False),
                "mileage_km_num": mileage_km_num,
            }

    # Optional debug fields (can be enabled via environment variable)
    if os.environ.get("ENABLE_MILEAGE_DEBUG", "").lower() == "true":
        try:
            mileage_km_val = float(req.get("mileage_km_num", 0.0))
            depreciation_per_10k = _get_mileage_slope(brand, model)
            mileage_diff = mileage_km_val - 100_000.0  # Updated to 100k baseline
            
            # Calculate adjustment factor
            if mileage_diff > 0:
                excess_10k = mileage_diff / 10_000.0
                adjustment = min(excess_10k * depreciation_per_10k, 0.40)
                multiplier = 1.0 - adjustment
                cap_applied = adjustment >= 0.40
                premium_or_depreciation = -round(adjustment, 4)
            else:
                if mileage_km_val > 0:
                    normalized_mileage = mileage_km_val / 100_000.0
                    premium_factor = (1.0 - normalized_mileage) ** 1.5
                    adjustment = 0.10 * premium_factor
                    adjustment = max(0.0, min(adjustment, 0.10))
                    multiplier = 1.0 + adjustment
                    cap_applied = adjustment >= 0.10
                    premium_or_depreciation = round(adjustment, 4)
                else:
                    multiplier = 1.0
                    cap_applied = False
                    premium_or_depreciation = 0.0
            
            # Get raw model price (before any corrections)
            raw_yellow = np.exp(float(_q50.predict(_add_features(req))[0]))
            
            out["_debug"] = {
                "raw_model_price": round(raw_yellow, 0),
                "group_median_used": round(gmed, 0) if gmed is not None else None,
                "comparable_sample_size": int(sample_size),
                "outliers_removed_count": int(_LAST_OUTLIERS_REMOVED),
                "mileage_adjustment_factor": round(multiplier, 4),
                "baseline_km": 100_000,
                "input_km": int(mileage_km_val),
                "premium_or_depreciation": premium_or_depreciation,
                "cap_applied": cap_applied,
                "final_bands": {
                    "green_low": round(green_low, 0),
                    "green_median": round(green_median, 0),
                    "green_high": round(green_high, 0),
                    "yellow": round(yellow, 0),
                    "red_low": round(red_low, 0),
                    "red_median": round(red_median, 0),
                    "red_high": round(red_high, 0),
                }
            }
        except Exception as e:
            # Log error but don't fail
            print(f"Debug field computation failed: {e}")

    # --- Fallback year-ordering: older year <= newer year / 1.05 (yellow; when vehicle_age >= 10 also green_median) ---
    # Only when estimate_basis == fallback_no_comparables. One lookup (year+1); generic, no model hardcoding.
    if (
        not _skip_year_order_check
        and out.get("estimate_basis") == "fallback_no_comparables"
        and out.get("yellow") is not None
        and out.get("yellow") > 0
        and year > 0
    ):
        try:
            from datetime import datetime
            current_year = datetime.now().year
            vehicle_age = current_year - year
            req_newer = {**req, "year": year + 1}
            result_newer = predict_price(req_newer, _skip_year_order_check=True)
            yellow_newer = None
            green_newer = None
            if result_newer and result_newer.get("status") not in ("pricing_unavailable", "unsupported_model"):
                yellow_newer = result_newer.get("yellow")
                green_newer = result_newer.get("green_median")
            scale = 1.0
            if yellow_newer is not None and yellow_newer > 0:
                yellow_older = out["yellow"]
                if yellow_older > yellow_newer / 1.05:
                    scale = min(scale, (yellow_newer / 1.05) / yellow_older)
            # When fallback + old vehicle: enforce newer_year_green_median >= older_year_green_median * 1.05.
            if vehicle_age >= 10 and green_newer is not None and green_newer > 0 and out.get("green_median") is not None:
                older_green = float(out["green_median"])
                if older_green > green_newer / 1.05:
                    scale = min(scale, (green_newer / 1.05) / older_green)
            if scale < 1.0:
                for key in ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high"):
                    if out.get(key) is not None:
                        out[key] = _round_price(float(out[key]) * scale)
        except Exception:
            pass

    # --- Rule A: Minimum year separation for economy cars (market_trends, sparse data) ---
    # Prevents older and newer economy cars collapsing into the same price tier when data is sparse.
    _economy_makes = {"MAZDA", "TOYOTA", "HONDA", "NISSAN"}
    _sample = out.get("sample_size")
    _ok_sample = _sample is not None and int(_sample) <= 3
    if (
        not _skip_year_order_check
        and out.get("estimate_basis") == "market_trends"
        and _ok_sample
        and (brand or "").upper().strip() in _economy_makes
        and year > 0
        and out.get("green_median") is not None
        and float(out["green_median"]) > 0
    ):
        try:
            req_newer = {**req, "year": year + 1}
            result_newer = predict_price(req_newer, _skip_year_order_check=True)
            green_newer = None
            if result_newer and result_newer.get("status") not in ("pricing_unavailable", "unsupported_model"):
                green_newer = result_newer.get("green_median")
            if green_newer is not None and float(green_newer) > 0:
                older_green = float(out["green_median"])
                if older_green > green_newer / 1.05:
                    scale = (green_newer / 1.05) / older_green
                    for key in ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high"):
                        if out.get(key) is not None:
                            out[key] = _round_price(float(out[key]) * scale)
        except Exception:
            pass

    # NISSAN ALMERA only: sparse-data red clamps, old-vehicle clamp, generation separation; preserve band ordering.
    _apply_nissan_almera_guardrails(out, brand, model, year, submodel)

    # NISSAN NOTE E-POWER only: sparse trim collapse guardrail — enforce minimum hybrid premium vs base NOTE when sample_size <= 1.
    if not _skip_note_epower_premium and _should_apply_note_epower_premium(brand, model, submodel, out.get("sample_size")):
        band_keys = ("green_low", "green_median", "green_high", "yellow", "red_low", "red_median", "red_high")
        if all(out.get(k) is not None for k in band_keys):
            try:
                req_base = {**req, "trim": "", "submodel": ""}
                result_base = predict_price(req_base, _skip_year_order_check=True, _skip_note_epower_premium=True)
                if (
                    result_base
                    and result_base.get("status") not in ("pricing_unavailable", "unsupported_model")
                    and result_base.get("green_median") is not None
                ):
                    base_green = float(result_base["green_median"])
                    _apply_note_epower_premium_to_out(out, base_green)
            except Exception:
                pass

    return out

def render_price_chart(bands: dict, title: str | None = None) -> bytes | None:
    """
    Render a simple price band chart (PNG) for the /price_graph endpoint.

    We intentionally keep this lightweight:
    - No external HTTP calls (uses already-computed `bands`)
    - Uses Pillow only (no heavy plotting stack)
    - Produces a dark themed bar chart with green / yellow / red prices

    Args:
        bands: Dict returned from `predict_price` containing:
               green_median, yellow, red_median (plus other fields we ignore here)
        title: Optional string to display at the top of the chart.

    Returns:
        PNG bytes, or None if Pillow is unavailable.
    """
    if Image is None or ImageDraw is None:
        # Pillow not installed – gracefully degrade so the backend won't crash
        return None

    # Extract key prices; fall back to 0 if missing
    green = float(bands.get("green_median", 0.0))
    yellow = float(bands.get("yellow", 0.0))
    red = float(bands.get("red_median", 0.0))

    prices = [p for p in (green, yellow, red) if p > 0]
    if not prices:
        return None

    max_price = max(prices)

    # Basic canvas
    width, height = 640, 360
    margin_top = 60
    margin_bottom = 60
    margin_left = 80
    margin_right = 40

    img = Image.new("RGB", (width, height), (12, 17, 28))  # dark background
    draw = ImageDraw.Draw(img)

    # Try to get a reasonable font; fall back to default
    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_axis = ImageFont.truetype("arial.ttf", 13)
        font_label = ImageFont.truetype("arial.ttf", 14)
    except Exception:  # pragma: no cover - font availability depends on container
        font_title = ImageFont.load_default()
        font_axis = ImageFont.load_default()
        font_label = ImageFont.load_default()

    # Title
    if title:
        # Use textbbox for newer Pillow versions (textsize is deprecated)
        try:
            bbox = draw.textbbox((0, 0), title, font=font_title)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
        except (AttributeError, TypeError):
            # Fallback for older Pillow versions
            tw, th = draw.textsize(title, font=font_title)
        draw.text(
            ((width - tw) / 2, 16),
            title,
            font=font_title,
            fill=(230, 234, 244),
        )

    # Axes area
    chart_top = margin_top
    chart_bottom = height - margin_bottom
    chart_left = margin_left
    chart_right = width - margin_right

    # Draw horizontal grid lines at 0%, 50%, 100% of max_price
    for frac in (0.0, 0.5, 1.0):
        y = chart_bottom - (chart_bottom - chart_top) * frac
        draw.line([(chart_left, y), (chart_right, y)], fill=(40, 48, 70), width=1)
        label_price = max_price * frac
        label_text = f"฿{int(round(label_price, -3)):,}"
        try:
            bbox = draw.textbbox((0, 0), label_text, font=font_axis)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
        except (AttributeError, TypeError):
            lw, lh = draw.textsize(label_text, font=font_axis)
        draw.text(
            (chart_left - lw - 8, y - lh / 2),
            label_text,
            font=font_axis,
            fill=(150, 160, 190),
        )

    # Bar positions
    bar_width = (chart_right - chart_left) / 6
    centers = [
        chart_left + (chart_right - chart_left) * 1 / 6,
        chart_left + (chart_right - chart_left) * 3 / 6,
        chart_left + (chart_right - chart_left) * 5 / 6,
    ]

    bar_specs = [
        ("Good Deal", green, (34, 197, 94)),   # green
        ("Market", yellow, (234, 179, 8)),     # yellow
        ("High Price", red, (239, 68, 68)),    # red
    ]

    for (label, price, color), cx in zip(bar_specs, centers):
        if price <= 0 or max_price <= 0:
            continue
        frac = min(price / max_price, 1.0)
        bar_height = (chart_bottom - chart_top) * frac
        x0 = cx - bar_width / 2
        x1 = cx + bar_width / 2
        y1 = chart_bottom
        y0 = chart_bottom - bar_height

        # Bar
        draw.rectangle([x0, y0, x1, y1], fill=color)

        # Numeric price above bar
        price_text = f"฿{int(round(price, -3)):,}"
        try:
            bbox = draw.textbbox((0, 0), price_text, font=font_label)
            pw = bbox[2] - bbox[0]
            ph = bbox[3] - bbox[1]
        except (AttributeError, TypeError):
            pw, ph = draw.textsize(price_text, font=font_label)
        draw.text(
            (cx - pw / 2, y0 - ph - 4),
            price_text,
            font=font_label,
            fill=(230, 234, 244),
        )

        # Label below x-axis
        try:
            bbox = draw.textbbox((0, 0), label, font=font_axis)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
        except (AttributeError, TypeError):
            lw, lh = draw.textsize(label, font=font_axis)
        draw.text(
            (cx - lw / 2, chart_bottom + 8),
            label,
            font=font_axis,
            fill=(180, 188, 210),
        )

    # Serialize to PNG bytes
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
