# Extract (brand, model, submodel) from cleaned_listings_v3.csv for frontend carData.js
# Excludes: ISUZU, LAND ROVER (and "LAND"), COUPE AWD, SEAL (bad data)
import csv
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "backend/model/price_quantiles_v3/cleaned_listings_v3.csv"
EXCLUDE_BRANDS = {
    "ISUZU", "LAND ROVER", "LAND", "COUPE AWD", "SEAL",
    "\u0e2e\u0e38\u0e19\u0e44\u0e14",  # ฮุนได (Thai Hyundai duplicate)
    "PEUGEOT",
}

def main():
    rows = []
    with open(CSV_PATH, encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            b = (row.get("brand") or "").strip().upper()
            m = (row.get("model") or "").strip()
            s = (row.get("submodel") or "").strip() or "UNKNOWN"
            if b and m and b not in EXCLUDE_BRANDS:
                rows.append((b, m, s))

    seen = set()
    unique = []
    for b, m, s in rows:
        k = (b, m, s)
        if k not in seen:
            seen.add(k)
            unique.append((b, m, s))

    # Build CAR_DATA as list of { brand, model, series }
    car_data = [{"brand": b, "model": m, "series": s} for b, m, s in unique]
    # Sort by brand, then model, then series
    car_data.sort(key=lambda x: (x["brand"], x["model"], x["series"]))

    def esc(s):
        return s.replace("\\", "\\\\").replace('"', '\\"')

    # Output as JS module
    lines = [
        "/**",
        " * Car lookup data extracted from cleaned_listings_v3.csv",
        " * Used for cascading dropdowns (Make -> Model -> Trim)",
        " * Excludes: Isuzu, Land Rover, Coupe AWD, and invalid brands.",
        " */",
        "",
        "export const CAR_DATA = [",
    ]
    for item in car_data:
        lines.append(f'  {{ brand: "{item["brand"]}", model: "{esc(item["model"])}", series: "{esc(item["series"])}" }},')
    lines.append("];")
    lines.append("")
    lines.append("/**")
    lines.append(" * Get unique makes from car data")
    lines.append(" * @returns {string[]} Sorted array of unique makes")
    lines.append(" */")
    lines.append("export const getUniqueMakes = () => {")
    lines.append("  return [...new Set(CAR_DATA.map(item => item.brand))].sort();")
    lines.append("};")
    lines.append("")
    lines.append("/**")
    lines.append(" * Get models for a specific make")
    lines.append(" * @param {string} make - Make name")
    lines.append(" * @returns {string[]} Sorted array of models")
    lines.append(" */")
    lines.append("export const getModelsForMake = (make) => {")
    lines.append("  return [...new Set(")
    lines.append("    CAR_DATA")
    lines.append("      .filter(item => item.brand === make)")
    lines.append("      .map(item => item.model)")
    lines.append("  )].sort();")
    lines.append("};")
    lines.append("")
    lines.append("/**")
    lines.append(" * Get trims for a specific make and model")
    lines.append(" * @param {string} make - Make name")
    lines.append(" * @param {string} model - Model name")
    lines.append(" * @returns {string[]} Sorted array of trims (excluding UNKNOWN)")
    lines.append(" */")
    lines.append("export const getTrimsForMakeModel = (make, model) => {")
    lines.append("  return [...new Set(")
    lines.append("    CAR_DATA")
    lines.append("      .filter(item => item.brand === make && item.model === model)")
    lines.append("      .map(item => item.series)")
    lines.append("      .filter(series => series && series !== 'UNKNOWN')")
    lines.append("  )].sort();")
    lines.append("};")

    out_path = Path(__file__).resolve().parent.parent / "frontend/src/lib/carData.js"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Also write summary for confirmation
    from collections import defaultdict
    by_brand = defaultdict(lambda: defaultdict(set))
    for b, m, s in unique:
        by_brand[b][m].add(s)
    summary_path = Path(__file__).resolve().parent.parent / "readmes/car_data_brands_models_summary.txt"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("BRANDS (excluded: Isuzu, Land Rover, Coupe AWD, Seal, Land, ฮุนได, Peugeot)\n")
        f.write("=" * 60 + "\n")
        for b in sorted(by_brand.keys()):
            f.write(f"\n{b} ({len(by_brand[b])} models)\n")
            for m in sorted(by_brand[b].keys()):
                trims = [t for t in by_brand[b][m] if t != "UNKNOWN"]
                f.write(f"  - {m}: {len(trims)} trims" + (" + UNKNOWN" if "UNKNOWN" in by_brand[b][m] else "") + "\n")
    print("Wrote", out_path)
    print("Wrote summary", summary_path)
    print("Total entries:", len(car_data))
    print("Brands:", len(by_brand))

if __name__ == "__main__":
    main()
