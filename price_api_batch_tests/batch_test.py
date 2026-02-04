# price_api_batch_tests/batch_test.py
# ---------------------------------------------------------------------------
# DISPOSABLE BATCH TEST SCRIPT - Safe to delete this entire folder.
# No imports from main project. Uses only: stdlib + requests.
# ---------------------------------------------------------------------------

import csv
import json
import os
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# CONFIG (edit only this section)
# ---------------------------------------------------------------------------
make = "VOLVO"
model = "XC90"
submodel = None # or e.g. "1.5"
years = "2010,2014,2016,2019,2022,2024"
mileage_km_num = "20000,80000,160000,300000,450000"
base_url = "http://localhost:8000"
endpoint = "/price"
request_timeout_seconds = 30
sleep_between_calls_seconds = 0.5
max_retries = 2
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(SCRIPT_DIR, "outputs")
RAW_JSON_DIR = os.path.join(OUTPUTS_DIR, "raw_json")
CSV_DIR = os.path.join(OUTPUTS_DIR, "csv")
SUMMARY_CSV_PATH = os.path.join(CSV_DIR, "summary.csv")


def _post(url: str, payload: dict, timeout: int) -> dict:
    """POST JSON to url; return parsed JSON. Raises on HTTP or timeout."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _safe_filename_part(s: str | None) -> str:
    """Safe for filenames: strip and replace space/slash/backslash and chars invalid on Windows."""
    if s is None or str(s).strip() == "":
        return "none"
    s = str(s).strip()
    for c in (" ", "/", "\\", ":", "*", "?", '"', "<", ">", "|"):
        s = s.replace(c, "_")
    return s or "none"


def _rows_from_response(make: str, model: str, submodel: str | None, year: int, response: dict) -> list[dict]:
    """Turn API response (single result or results array) into list of row dicts for CSV."""
    sub = _safe_filename_part(submodel) if submodel else "none"
    rows = []
    if "results" in response and isinstance(response["results"], list):
        for r in response["results"]:
            mileage = r.get("mileage_km_num", "")
            rows.append({
                "make": make,
                "model": model,
                "submodel": submodel or "",
                "year": year,
                "mileage_km_num": mileage,
                "green_low": r.get("green_low", ""),
                "green_median": r.get("green_median", ""),
                "green_high": r.get("green_high", ""),
                "yellow": r.get("yellow", ""),
                "red_low": r.get("red_low", ""),
                "red_median": r.get("red_median", ""),
                "red_high": r.get("red_high", ""),
                "estimate_basis": r.get("estimate_basis", ""),
                "confidence": r.get("confidence", ""),
                "sample_size": r.get("sample_size", ""),
                "bandwidth_clamped": r.get("bandwidth_clamped", ""),
                "bandwidth_expanded_sparse": r.get("bandwidth_expanded_sparse", ""),
                "ui_notice": r.get("ui_notice", ""),
            })
    else:
        r = response
        rows.append({
            "make": make,
            "model": model,
            "submodel": submodel or "",
            "year": year,
            "mileage_km_num": r.get("mileage_km_num", ""),
            "green_low": r.get("green_low", ""),
            "green_median": r.get("green_median", ""),
            "green_high": r.get("green_high", ""),
            "yellow": r.get("yellow", ""),
            "red_low": r.get("red_low", ""),
            "red_median": r.get("red_median", ""),
            "red_high": r.get("red_high", ""),
            "estimate_basis": r.get("estimate_basis", ""),
            "confidence": r.get("confidence", ""),
            "sample_size": r.get("sample_size", ""),
            "bandwidth_clamped": r.get("bandwidth_clamped", ""),
            "bandwidth_expanded_sparse": r.get("bandwidth_expanded_sparse", ""),
            "ui_notice": r.get("ui_notice", ""),
        })
    return rows


def main():
    os.makedirs(RAW_JSON_DIR, exist_ok=True)
    os.makedirs(CSV_DIR, exist_ok=True)

    # Normalize submodel: treat empty string as None so payload/CSV/filename are consistent
    submodel_use = str(submodel).strip() if submodel is not None and str(submodel).strip() else None

    year_strs = [y.strip() for y in years.split(",") if y.strip()]
    url = base_url.rstrip("/") + "/" + endpoint.lstrip("/")
    all_rows = []
    all_json_results = []  # one entry per year: { year, request, response }
    csv_headers = [
        "make", "model", "submodel", "year", "mileage_km_num",
        "green_low", "green_median", "green_high", "yellow",
        "red_low", "red_median", "red_high",
        "estimate_basis", "confidence", "sample_size",
        "bandwidth_clamped", "bandwidth_expanded_sparse", "ui_notice",
    ]

    for year_str in year_strs:
        try:
            year = int(year_str)
        except ValueError:
            print(f"Skip invalid year: {year_str!r}")
            continue

        payload = {
            "make": make,
            "model": model,
            "year": year,
            "mileage_km_num": mileage_km_num,
        }
        if submodel_use is not None:
            payload["submodel"] = submodel_use

        last_error = None
        response = None
        for attempt in range(max_retries + 1):
            try:
                response = _post(url, payload, request_timeout_seconds)
                break
            except urllib.error.HTTPError as e:
                last_error = e
                try:
                    body = e.read().decode("utf-8")
                    response = {"_error": str(e), "_body": body}
                except Exception:
                    response = {"_error": str(e)}
                break
            except urllib.error.URLError as e:
                last_error = e
                if attempt < max_retries:
                    time.sleep(sleep_between_calls_seconds)
                    continue
                response = {"_error": str(e)}
                break
            except Exception as e:
                last_error = e
                if attempt < max_retries:
                    time.sleep(sleep_between_calls_seconds)
                    continue
                response = {"_error": str(e)}
                break

        all_json_results.append({"year": year, "request": payload, "response": response})

        if "_error" not in response:
            rows = _rows_from_response(make, model, submodel_use, year, response)
            all_rows.extend(rows)

        time.sleep(sleep_between_calls_seconds)

    # One JSON file per run with all years
    sub_part = _safe_filename_part(submodel_use)
    json_name = f"{make}_{model}_{sub_part}.json"
    json_path = os.path.join(RAW_JSON_DIR, json_name)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"results": all_json_results}, f, indent=2, ensure_ascii=False)
    print(f"Wrote {json_path} ({len(all_json_results)} years)")

    with open(SUMMARY_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=csv_headers)
        w.writeheader()
        w.writerows(all_rows)
    print(f"Wrote {SUMMARY_CSV_PATH} ({len(all_rows)} rows)")


if __name__ == "__main__":
    main()
