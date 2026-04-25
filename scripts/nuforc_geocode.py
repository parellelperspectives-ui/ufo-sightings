"""
NUFORC Geocoder & Cleaner
=========================
Reads the raw NUFORC JSON, cleans location strings, geocodes unique locations
via Nominatim (OpenStreetMap – free, no API key), and outputs a lean JSON
ready for your dashboard.

Usage:
    pip install requests tqdm
    python nuforc_geocode.py --input nuforc_raw.json --output nuforc_clean.json

Options:
    --input     Path to the raw NUFORC JSON file
    --output    Path for the cleaned output JSON (default: nuforc_clean.json)
    --cache     Path to geocoding cache file (default: geocode_cache.json)
    --delay     Seconds between Nominatim requests (default: 1.1 — respects ToS)
    --resume    Resume from a previous interrupted run using the cache
"""

import json
import re
import time
import argparse
import sys
import os
from pathlib import Path

try:
    import requests
    from tqdm import tqdm
except ImportError:
    print("Missing dependencies. Run:  pip install requests tqdm")
    sys.exit(1)


# ──────────────────────────────────────────────
# 1. LOCATION STRING CLEANER
# ──────────────────────────────────────────────

def clean_location(raw: str) -> str:
    """
    Normalize messy NUFORC location strings into something Nominatim can parse.

    Examples:
      "Huntsville, TX, USA"                          → "Huntsville, TX, USA"
      "Wollongong (Australia), , Australia"           → "Wollongong, Australia"
      "Soulatge (near St. Paul) (France), , France"  → "Soulatge, France"
      "Kiev (Ukraine), , Ukraine"                    → "Kiev, Ukraine"
      "Toronto (Australia), , Australia"             → "Toronto, Australia"
    """
    if not raw or not isinstance(raw, str):
        return ""

    s = raw.strip()

    # Remove all parenthetical groups: "(near St. Paul)", "(Australia)", etc.
    s = re.sub(r'\([^)]*\)', '', s)

    # Collapse multiple commas and whitespace into a single comma+space
    s = re.sub(r'(\s*,\s*){2,}', ', ', s)

    # Remove leading/trailing commas and spaces
    s = s.strip(' ,')

    # Collapse internal multiple spaces
    s = re.sub(r'  +', ' ', s)

    return s


# ──────────────────────────────────────────────
# 2. NOMINATIM GEOCODER  (OpenStreetMap – free)
# ──────────────────────────────────────────────

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    # Nominatim requires a descriptive User-Agent (not a browser string)
    "User-Agent": "NUFORC-dashboard-geocoder/1.0 (personal research project)"
}

def geocode(location: str, delay: float = 1.1) -> dict | None:
    """
    Geocode a single location string via Nominatim.
    Returns {"lat": float, "lon": float} or None on failure.
    Always waits `delay` seconds to respect Nominatim's 1 req/sec ToS.
    """
    if not location:
        return None

    params = {
        "q": location,
        "format": "json",
        "limit": 1,
    }

    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()

        if results:
            return {
                "lat": float(results[0]["lat"]),
                "lon": float(results[0]["lon"]),
            }
        return None

    except Exception as e:
        print(f"\n  ⚠ Geocoding error for '{location}': {e}")
        return None

    finally:
        time.sleep(delay)


# ──────────────────────────────────────────────
# 3. DATE CLEANER
# ──────────────────────────────────────────────

def clean_date(raw: str) -> str | None:
    """
    Extract YYYY-MM-DD from strings like:
      "2014-09-21 13:00:00 Local"
      "2001-07-29 23:59:00 Local"
    Returns None if unparseable.
    """
    if not raw or not isinstance(raw, str):
        return None
    match = re.match(r'(\d{4}-\d{2}-\d{2})', raw.strip())
    return match.group(1) if match else None


# ──────────────────────────────────────────────
# 4. RECORD BUILDER
# ──────────────────────────────────────────────

def build_record(raw: dict, coords: dict | None) -> dict | None:
    """
    Map a raw NUFORC record to the lean dashboard schema.
    Returns None if the record lacks the minimum required fields.
    """
    date = clean_date(raw.get("Occurred") or raw.get("occurred"))
    location = raw.get("Location") or raw.get("location") or ""

    # Skip records with no usable date or location
    if not date or not location.strip():
        return None

    record = {
        "id":       raw.get("Sighting") or raw.get("sighting"),
        "date":     date,
        "location": location,
        "shape":    raw.get("Shape") or raw.get("shape") or None,
        "duration": raw.get("Duration") or raw.get("duration") or None,
        "observers":raw.get("No of observers") or raw.get("observers") or None,
        "characteristics": raw.get("Characteristics") or [],
        "summary":  raw.get("Summary") or raw.get("summary") or None,
        "lat":      coords["lat"] if coords else None,
        "lon":      coords["lon"] if coords else None,
    }

    return record


# ──────────────────────────────────────────────
# 5. MAIN PIPELINE
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Clean & geocode NUFORC JSON dataset")
    parser.add_argument("--input",  required=True, help="Path to raw NUFORC JSON")
    parser.add_argument("--output", default="nuforc_clean.json", help="Output file path")
    parser.add_argument("--cache",  default="geocode_cache.json", help="Geocode cache file")
    parser.add_argument("--delay",  type=float, default=1.1, help="Delay between requests (sec)")
    args = parser.parse_args()

    # ── Load raw data ──
    print(f"📂 Loading {args.input} …")
    with open(args.input, encoding="utf-8") as f:
        raw_data = json.load(f)

    # Handle both top-level array and {"data": [...]} wrapper
    if isinstance(raw_data, dict):
        records = raw_data.get("data") or raw_data.get("records") or list(raw_data.values())[0]
    else:
        records = raw_data

    print(f"   {len(records):,} raw records loaded.")

    # ── Load geocode cache (allows resuming interrupted runs) ──
    cache_path = Path(args.cache)
    if cache_path.exists():
        with open(cache_path, encoding="utf-8") as f:
            cache: dict = json.load(f)
        print(f"🗂  Geocode cache loaded: {len(cache):,} entries.")
    else:
        cache = {}

    def save_cache():
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)

    # ── Collect unique cleaned locations ──
    print("\n🔍 Collecting unique locations …")
    unique_locations: set[str] = set()
    for r in records:
        loc = r.get("Location") or r.get("location") or ""
        cleaned = clean_location(loc)
        if cleaned:
            unique_locations.add(cleaned)

    to_geocode = [loc for loc in sorted(unique_locations) if loc not in cache]
    print(f"   {len(unique_locations):,} unique locations total.")
    print(f"   {len(to_geocode):,} not yet in cache → will geocode now.")

    if to_geocode:
        print(f"\n🌍 Geocoding via Nominatim (≈{len(to_geocode) * args.delay / 60:.0f} min estimated) …")
        print("   You can safely Ctrl+C — progress is saved to cache after each batch.\n")

        try:
            for i, loc in enumerate(tqdm(to_geocode, unit="loc")):
                coords = geocode(loc, delay=args.delay)
                # Store result (None means "tried but failed" — won't retry)
                cache[loc] = coords

                # Save cache every 50 requests
                if (i + 1) % 50 == 0:
                    save_cache()

        except KeyboardInterrupt:
            print("\n⏸  Interrupted. Saving cache …")

        save_cache()
        print(f"\n   Cache saved to {args.cache}")

    # ── Build output records ──
    print("\n⚙️  Building output records …")
    output = []
    skipped_no_date_loc = 0
    skipped_no_coords = 0
    coords_found = 0

    for r in tqdm(records, unit="rec"):
        loc = r.get("Location") or r.get("location") or ""
        cleaned_loc = clean_location(loc)
        coords = cache.get(cleaned_loc)  # None if not found or geocoding failed

        record = build_record(r, coords)
        if record is None:
            skipped_no_date_loc += 1
            continue

        if coords is None:
            skipped_no_coords += 1
        else:
            coords_found += 1

        output.append(record)

    # ── Write output ──
    print(f"\n💾 Writing {args.output} …")
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    # ── Summary ──
    total = len(records)
    print(f"""
✅ Done!
   Raw records:          {total:>8,}
   Output records:       {len(output):>8,}
   With coordinates:     {coords_found:>8,}  ({coords_found/len(output)*100:.1f}%)
   No coordinates (kept):{skipped_no_coords:>8,}  ({skipped_no_coords/len(output)*100:.1f}%)
   Skipped (no date/loc):{skipped_no_date_loc:>8,}
   Output file:          {args.output}
   Cache file:           {args.cache}
""")


if __name__ == "__main__":
    main()