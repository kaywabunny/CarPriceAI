from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional, Union, Any
from datetime import date
import math
import uvicorn
from ml.depreciation import DepreciationEstimator
from ml.price_helper import predict_price, load_artifacts, is_ready, MODELS_DIR, render_price_chart, apply_mg_stabilization
from fastapi.responses import Response


def _now_year() -> int:
    """Get current year (shared with depreciation logic)."""
    return date.today().year
app = FastAPI()

# --- request model for POST /price ---
class PriceRequest(BaseModel):
    make: str
    model: str
    year: int
    mileage_km_num: Any  # Accept float, int, or comma-separated string
    submodel: str | None = None
    gear: str | None = None
    color: str | None = None
    
    @field_validator('mileage_km_num', mode='before')
    @classmethod
    def parse_mileage(cls, v: Any) -> Any:
        """Accept both numeric values and comma-separated strings."""
        # If it's already a float or int, return as is
        if isinstance(v, (float, int)):
            return v
        # If it's a string, check if it contains a comma
        if isinstance(v, str):
            # If it contains a comma, keep as string for later parsing
            if ',' in v:
                return v
            # If it's a single number as string, try to convert to float
            try:
                return float(v.strip())
            except ValueError:
                # If conversion fails, return as string (will error in endpoint)
                return v
        # For any other type, try to convert to float
        try:
            return float(v)
        except (ValueError, TypeError):
            return v

# --- the new endpoint: thin hub that delegates to helper ---
@app.post("/price")
def price_post(req: PriceRequest):
    if not is_ready():
        raise HTTPException(status_code=503, detail="Price model not loaded")
    
    # Parse mileage: if string, split on commas; if float, convert to list
    mileage_input = req.mileage_km_num
    if isinstance(mileage_input, str):
        # Split on commas and convert to floats
        try:
            mileages = [float(m.strip()) for m in mileage_input.split(",") if m.strip()]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid mileage format. Expected comma-separated numbers (e.g., '30000,50000,70000')"
            )
        if not mileages:
            raise HTTPException(
                status_code=400,
                detail="No valid mileages provided"
            )
    else:
        # Single float value
        mileages = [float(mileage_input)]
    
    # If only one mileage, return single result (backward compatible)
    if len(mileages) == 1:
        req_dict = req.dict()
        req_dict["mileage_km_num"] = mileages[0]
        result = predict_price(req_dict)
        if result.get("status") == "trim_not_produced_year":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Selected trim was not produced in this year.")
            )
        return result

    # Multiple mileages: return array of results
    results = []
    for mileage in mileages:
        req_dict = req.dict()
        req_dict["mileage_km_num"] = mileage
        result = predict_price(req_dict)
        if result.get("status") == "trim_not_produced_year":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Selected trim was not produced in this year.")
            )
        result["mileage_km_num"] = mileage
        results.append(result)

    # MG-only sparse-data stabilization fallback: apply mileage decay when flat + sparse (multi-mileage only).
    make_normalized = (req.make or "").strip().upper()
    apply_mg_stabilization(make_normalized, results)

    return {
        "results": results,
        "count": len(results)
    }

@app.post("/admin/reload_price_model")
def reload_price_model():
    try:
        load_artifacts(MODELS_DIR)   # uses the path above
        return {"ok": True, "path": str(MODELS_DIR)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health/price_model")
def price_model_health():
    return {"ready": is_ready(), "path": str(MODELS_DIR)}


@app.post("/price_graph")
def price_graph(req: PriceRequest):
    """
    Same body as /price:
      {
        "make": "...",
        "model": "...",
        "year": 2019,
        "mileage_km_num": 30000
      }
    Returns: PNG graph (image/png)
    """
    try:
        if not is_ready():
            raise HTTPException(status_code=503, detail="Price model not loaded")
        
        # Reuse the same calculation used by /price
        bands = predict_price(req.dict())
        
        # Check if model is unsupported or pricing unavailable
        if bands.get("status") in ("unsupported_model", "pricing_unavailable"):
            raise HTTPException(
                status_code=400,
                detail=bands.get("message", "Pricing unavailable for this model")
            )

        # Nice title for the chart
        title = f"{req.year} {req.make} {req.model} • {req.mileage_km_num:,} km"

        png_bytes = render_price_chart(bands, title=title)
        if png_bytes is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate price graph. Pillow may not be installed or chart data is invalid."
            )
        
        return Response(content=png_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating price graph: {str(e)}"
        )
# --- request model for POST /depreciation ---

class DepreciationItem(BaseModel):
    """Request model for depreciation calculation."""
    make: str
    model: str
    year: int
    mileage_km_num: float
    submodel: Optional[str] = None
    horizon_years: int = 5
    market_price: Optional[float] = None  # Optional: user-facing market price (yellow) to use as baseline
    

# Initialize the estimator lazily (only when needed)
# This avoids DB connection errors if DB is not configured
estimator = None

def get_estimator():
    global estimator
    if estimator is None:
        try:
            estimator = DepreciationEstimator()
        except Exception as e:
            # If DB not available, depreciation endpoint will fail gracefully
            raise HTTPException(
                status_code=503,
                detail=f"Depreciation service unavailable: {str(e)}"
            )
    return estimator

@app.get("/test_dep")
def test_dep():
    return {"message": "Depreciation endpoint is ready"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/depreciation")
def depreciation_endpoint(item: DepreciationItem):
    """
    Calculate depreciation for a vehicle.
    
    Args:
        item: DepreciationItem containing vehicle details
    
    Returns:
        Dictionary with vehicle, series, and summary fields formatted for frontend
    """
    # Model-specific production year constraints for BENZ:
    # - EQS-CLASS: not produced before 2021
    # - GLC-CLASS: not produced before 2015
    # - GLE-CLASS: not produced before 2016
    # - ML-CLASS: discontinued and renamed to GLE-CLASS from 2016 onward
    # - SLK-CLASS: discontinued and renamed to SLC-CLASS from 2016 onward
    make_ok = (item.make or "").upper().strip() in ("BENZ", "MERCEDES-BENZ")
    model_norm = (item.model or "").upper().strip().replace(" ", "-")
    if make_ok and model_norm == "EQS-CLASS" and item.year < 2021:
        raise HTTPException(
            status_code=400,
            detail="This model was not produced in the selected year"
        )
    if make_ok and model_norm == "GLC-CLASS" and item.year < 2015:
        raise HTTPException(
            status_code=400,
            detail="This model was not produced in the selected year"
        )
    if make_ok and model_norm == "GLE-CLASS" and item.year < 2016:
        raise HTTPException(
            status_code=400,
            detail="This model was not produced in the selected year"
        )
    if make_ok and model_norm == "ML-CLASS" and item.year >= 2016:
        raise HTTPException(
            status_code=400,
            detail="This model was discontinued and renamed to GLE-CLASS"
        )
    if make_ok and model_norm == "SLK-CLASS" and item.year >= 2016:
        raise HTTPException(
            status_code=400,
            detail="This model was discontinued and renamed to SLC-CLASS"
        )
    try:
        est = get_estimator()
        result = api_yearly_drop(
            make=item.make, 
            model=item.model, 
            year=item.year, 
            mileage_km_num=item.mileage_km_num,
            submodel=item.submodel,
            horizon_years=item.horizon_years,
            estimator=est,
            market_price_baseline=item.market_price  # Pass market price if provided
        )
        return result
    except ValueError as e:
        # Insufficient data or invalid input - return graceful error with explanation
        error_msg = str(e)
        # Check if it's an insufficient data error
        if "Insufficient market data" in error_msg or "Not enough cohort data" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        else:
            # Other validation errors
            raise HTTPException(status_code=400, detail=error_msg)
    except FileNotFoundError as e:
        # Data file not found
        raise HTTPException(
            status_code=503,
            detail=f"Depreciation data unavailable: {str(e)}"
        )
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Depreciation calculation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )


def api_yearly_drop(
    make: str, 
    model: str, 
    year: int, 
    mileage_km_num: float,
    submodel: str = None,
    horizon_years: int = 5,
    estimator=None,
    market_price_baseline: Optional[float] = None
):
    """
    Calculate depreciation using DepreciationEstimator with corrected multiplicative decay logic.
    
    This function ensures:
    - Values always decrease over time (monotonic)
    - Depreciation rates are valid (0-100% loss)
    - Uses multiplicative decay: value[t] = value[t-1] * (1 - rate[t])
    
    Args:
        make: Car brand
        model: Car model
        year: Model year
        mileage_km_num: Current mileage in kilometers
        submodel: Optional submodel/series
        horizon_years: Number of years to project forward
        market_price_baseline: Optional market price (yellow) from price card to use as baseline.
                              If provided, all depreciation values will be computed from this baseline
                              instead of using the internal predicted_price_now.
    
    Returns:
        Dictionary formatted for frontend consumption with:
        - vehicle: vehicle details
        - series: array of year projections with valid depreciation rates
        - summary: summary statistics
    """
    # Convert mileage to int (it's expected as int in the estimator)
    mileage = int(mileage_km_num) if mileage_km_num else None
    
    # Call the estimator
    if estimator is None:
        estimator = get_estimator()
    result = estimator.estimate(
        brand=make,
        model=model,
        year=year,
        mileage=mileage,
        submodel=submodel if submodel else None,
        horizon_years=horizon_years
    )
    
    # Use market price baseline if provided, otherwise use internal predicted price
    # This aligns depreciation with the user-facing market price (yellow) shown in the price card
    internal_baseline = result.predicted_price_now
    
    if market_price_baseline is not None and market_price_baseline > 0:
        initial_price = market_price_baseline
    else:
        # Fallback: use internal predicted price if market price not provided
        initial_price = internal_baseline
    
    # Validate initial price
    if initial_price <= 0:
        raise ValueError("Initial price must be positive")
    
    # Build series array starting with current year (year 0)
    series = []
    series.append({
        "year": 0,
        "year_label": f"{result.year} (Now)",
        "value": round(initial_price, 0),
        "depreciation_rate": 0.0,
        "cumulative_depreciation": 0.0
    })
    
    # Calculate salvage floor (minimum value - 5% of initial or 10,000 THB, whichever is higher)
    salvage_floor = max(0.05 * initial_price, 10000.0)
    
    # Use a tapered, age-aware depreciation curve:
    # - Early years lose value faster
    # - Later years flatten out
    # - Still respects multiplicative decay and global clamps
    current_value = initial_price
    
    # ---- configure base rate from car age ----
    car_age = max(0, _now_year() - result.year)
    # Base annual loss as a decimal (e.g. 0.12 = 12% in year 1)
    # Newer cars depreciate a bit faster, older cars a bit slower.
    if car_age <= 2:
        base_rate = 0.16   # 16% for very new cars
    elif car_age <= 5:
        base_rate = 0.13   # 13% for moderately new cars
    elif car_age <= 8:
        base_rate = 0.10   # 10% for mid‑age cars
    else:
        base_rate = 0.07   # 7% for older cars
    
    # Global clamps for all years
    MIN_RATE = 0.04  # 4% per year minimum (never totally flat)
    MAX_RATE = 0.25  # 25% per year maximum
    base_rate = min(max(base_rate, MIN_RATE), MAX_RATE)
    
    # Decay constant: controls how quickly depreciation slows down over time.
    # Larger k => faster taper; here we pick a moderate 0.2.
    k = 0.2
    
    # We still use annual_projection for calendar year labels / horizon length,
    # but the actual depreciation curve is controlled here for stability.
    for idx, proj in enumerate(result.annual_projection):
        t = idx + 1  # 1-based years ahead
        year_offset = proj["calendar_year"] - result.year
        
        # Continuous time-decay: rate[t] = base_rate * exp(-k * (t-1))
        # Ensures high loss in early years and flatter tail later.
        raw_rate = base_rate * math.exp(-k * (t - 1))
        # Clamp per-year rate to global bounds
        annual_rate = min(max(raw_rate, MIN_RATE), MAX_RATE)
        
        # Apply multiplicative decay: value[t] = value[t-1] * (1 - rate[t])
        next_value = current_value * (1.0 - annual_rate)
        
        # Enforce monotonic decrease: value[t] <= value[t-1]
        next_value = min(next_value, current_value)
        
        # Apply salvage floor: never go below minimum value
        next_value = max(next_value, salvage_floor)
        
        # Annual depreciation relative to previous year:
        #   annual_depr[t] = 1 - (value[t] / value[t-1])
        if current_value > 0:
            annual_depr = 1.0 - (next_value / current_value)
        else:
            annual_depr = 0.0
        annual_depr = min(max(annual_depr, 0.0), 1.0)
        
        # Cumulative depreciation from initial value:
        #   total_depr[t] = 1 - (value[t] / initial_value)
        if initial_price > 0:
            cumulative_depr = 1.0 - (next_value / initial_price)
        else:
            cumulative_depr = 0.0
        cumulative_depr = min(max(cumulative_depr, 0.0), 1.0)  # Clamp to [0, 1]
        
        # Store values (UI expects negative percentages for display)
        series.append({
            "year": year_offset,
            "year_label": str(proj["calendar_year"]),
            "value": round(next_value, 0),
            "depreciation_rate": round(-annual_depr * 100.0, 2),          # e.g. -12.3
            "cumulative_depreciation": round(-cumulative_depr * 100.0, 2)  # e.g. -35.0
        })
        
        # Update for next iteration
        current_value = next_value
    
    # Calculate total depreciation from final value
    final_price = series[-1]["value"] if len(series) > 1 else initial_price
    total_depr = 1.0 - (final_price / initial_price) if initial_price > 0 else 0.0
    total_depr = min(max(total_depr, 0.0), 1.0)  # Clamp to [0, 1]
    total_depreciation = round(-total_depr * 100.0, 2)  # Display as negative percentage
    
    # Return frontend-friendly format
    return {
        "vehicle": {
            "brand": result.brand,
            "model": result.model,
            "trim": result.submodel,
            "year": result.year,
            "mileage": result.mileage
        },
        "series": series,
        "summary": {
            "current_estimated_price": round(initial_price, 0),
            "one_year_drop": round(initial_price - series[1]["value"], 0) if len(series) > 1 else 0,
            "three_year_drop": round(initial_price - series[3]["value"], 0) if len(series) > 3 else 0,
            "method": "market_trends",  # Using statistical model from market data
            "sample_size": result.sample_size,
            "confidence": min(1.0, max(0.3, result.sample_size / 100.0))  # Confidence based on sample size
        },
        "initial_value": round(initial_price, 0),
        "total_depreciation": total_depreciation,
        # Include debug info for transparency
        "_debug": {
            "km_per_year_assumed": result.km_per_year_assumed,
            "notes": result.notes,
            "lower_now": round(result.lower_now, 0),
            "upper_now": round(result.upper_now, 0),
            "salvage_floor": round(salvage_floor, 0)
        }
    }


if __name__ == "__main__":
    print("Reloading Price Model - Start Up")
    reload_price_model()
    uvicorn.run(app, host="0.0.0.0", port=8000)