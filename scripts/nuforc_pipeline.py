import re
import time
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup


BASE = "https://nuforc.org"
MONTH_INDEX = f"{BASE}/ndx/?id=event"

PROJECT_ROOT = Path(__file__).resolve().parents[1]

SRC_DATA_DIR = PROJECT_ROOT / "public" / "data"
OUTPUT_DIR = SRC_DATA_DIR / "output"
CACHE_DIR = PROJECT_ROOT / "scripts" / ".cache"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

EXISTING_CSV = SRC_DATA_DIR / "sightings.csv"
SCRAPED_OUTPUT_CSV = OUTPUT_DIR / "nuforc_scraped_2016_2025.csv"
FINAL_OUTPUT_CSV = OUTPUT_DIR / "sightings_merged_2016_2025.csv"

REQUEST_DELAY = 1.5
GEOCODE_DELAY = 1.2
MAX_RETRIES = 3
TIMEOUT = 45

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (compatible; NUFORCDataPipeline/1.0; +https://parallel-perspectives.com/)"
    }
)


# ----------------------------
# HTTP helpers
# ----------------------------

def fetch_html(url: str, use_cache: bool = True) -> str:
    cache_key = re.sub(r"[^a-zA-Z0-9]+", "_", url).strip("_")
    cache_file = CACHE_DIR / f"{cache_key}.html"

    if use_cache and cache_file.exists():
        return cache_file.read_text(encoding="utf-8", errors="ignore")

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = SESSION.get(url, timeout=TIMEOUT)
            response.raise_for_status()
            html = response.text
            cache_file.write_text(html, encoding="utf-8")
            time.sleep(REQUEST_DELAY)
            return html
        except Exception as exc:
            last_error = exc
            time.sleep(REQUEST_DELAY * attempt)

    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def get_soup(url: str, use_cache: bool = True) -> BeautifulSoup:
    return BeautifulSoup(fetch_html(url, use_cache=use_cache), "html.parser")


# ----------------------------
# Parsing helpers
# ----------------------------

def extract_field(page_text: str, label: str) -> Optional[str]:
    match = re.search(rf"{re.escape(label)}:\s*(.+)", page_text)
    return match.group(1).strip() if match else None


def looks_like_verification_page(html: str) -> bool:
    lower = html.lower()
    return "please wait while your request is being verified" in lower or "loader" in lower


def fetch_month_links(start_year: int = 2016, end_year: int = 2025) -> List[Dict[str, str]]:
    months = []

    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            yyyymm = f"{year}{month:02d}"
            months.append({
                "yyyymm": yyyymm,
                "url": f"{BASE}/subndx/?id=e{yyyymm}",
            })

    return months

def parse_month_page(month_url: str) -> List[str]:
    from playwright.sync_api import sync_playwright
    from pathlib import Path

    sighting_urls = set()
    debug_dir = Path("scripts/debug")
    debug_dir.mkdir(parents=True, exist_ok=True)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=False,
                slow_mo=200,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )

            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/123.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1440, "height": 2000},
                locale="en-US",
                java_script_enabled=True,
            )

            page = context.new_page()
            page.goto(month_url, wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(5000)

            previous_count = 0
            stable_rounds = 0
            max_rounds = 30

            for round_num in range(1, max_rounds + 1):
                # parse current DOM
                html = page.content()
                soup = BeautifulSoup(html, "html.parser")

                current_links = set()
                for a in soup.find_all("a", href=True):
                    href = a.get("href", "")
                    if "/sighting/" in href:
                        current_links.add(urljoin(BASE, href))

                sighting_urls.update(current_links)
                current_count = len(sighting_urls)

                print(f"  Scroll round {round_num}: {current_count} unique sighting links")

                # save latest HTML for inspection
                debug_file = debug_dir / f"last_month_page_round_{round_num}.html"
                debug_file.write_text(html, encoding="utf-8")

                if current_count == previous_count:
                    stable_rounds += 1
                else:
                    stable_rounds = 0

                if stable_rounds >= 3:
                    print("  Link count stopped increasing. Ending scroll.")
                    break

                previous_count = current_count

                # scroll down progressively
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(3000)

                # extra nudge in case site loads on incremental scrolling
                page.mouse.wheel(0, 3000)
                page.wait_for_timeout(2000)

            browser.close()

        return sorted(sighting_urls)

    except Exception as exc:
        print(f"  Could not fetch month page {month_url}: {exc}")
        return []

def parse_detail_page(sighting_url: str) -> Dict[str, Optional[str]]:
    soup = get_soup(sighting_url, use_cache=True)
    text = soup.get_text("\n", strip=True)

    occurred = extract_field(text, "Occurred")
    reported = extract_field(text, "Reported")
    duration = extract_field(text, "Duration")
    observers = extract_field(text, "No of observers")
    location = extract_field(text, "Location")
    location_details = extract_field(text, "Location details")
    shape = extract_field(text, "Shape")
    color = extract_field(text, "Color")
    viewed_from = extract_field(text, "Viewed From")
    angle_of_elevation = extract_field(text, "Angle of Elevation")
    characteristics = extract_field(text, "Characteristics")

    posted_match = re.search(r"Posted\s+(\d{4}-\d{2}-\d{2})", text)
    posted = posted_match.group(1) if posted_match else None

    city = None
    state = None
    country = None

    if location:
        parts = [p.strip() for p in location.split(",")]
        if len(parts) >= 3:
            city = parts[0]
            state = parts[1]
            country = parts[2]
        elif len(parts) == 2:
            city = parts[0]
            country = parts[1]
        elif len(parts) == 1:
            city = parts[0]

    comments = extract_comments(text)

    sighting_id_match = re.search(r"id=(\d+)", sighting_url)
    sighting_id = sighting_id_match.group(1) if sighting_id_match else None

    return {
        "sighting_id": sighting_id,
        "sourceUrl": sighting_url,
        "occurred": occurred,
        "reported": reported,
        "posted": posted,
        "duration_raw": duration,
        "observers": observers,
        "location": location,
        "location_details": location_details,
        "city": city,
        "state": state,
        "country": country,
        "shape": shape,
        "color": color,
        "viewed_from": viewed_from,
        "angle_of_elevation": angle_of_elevation,
        "characteristics": characteristics,
        "comments_raw": comments,
    }


def extract_comments(text: str) -> Optional[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    skip_prefixes = (
        "NUFORC UFO Sighting",
        "Occurred:",
        "Reported:",
        "Duration:",
        "No of observers:",
        "Location:",
        "Location details:",
        "Shape:",
        "Color:",
        "Viewed From:",
        "Angle of Elevation:",
        "Characteristics:",
        "Posted ",
        "Copyright ",
        "Skip to content",
        "Posts",
        "Data Bank",
        "Map",
        "Gallery",
        "File a UFO Report",
        "Donate",
        "About Us",
        "Toggle website search",
        "Menu Close",
    )

    comment_lines = []
    for line in lines:
        if line.startswith(skip_prefixes):
            continue
        comment_lines.append(line)

    if not comment_lines:
        return None

    return " ".join(comment_lines).strip()


# ----------------------------
# Normalization
# ----------------------------

def parse_datetime_to_csv_format(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    cleaned = value.replace(" Local", "").replace(" Pacific", "").strip()
    dt = pd.to_datetime(cleaned, errors="coerce")
    if pd.isna(dt):
        return None

    return f"{dt.month}/{dt.day}/{dt.year} {dt.hour:02d}:{dt.minute:02d}"


def parse_date_to_csv_format(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    cleaned = value.replace(" Local", "").replace(" Pacific", "").strip()
    dt = pd.to_datetime(cleaned, errors="coerce")
    if pd.isna(dt):
        return None

    return f"{dt.month}/{dt.day}/{dt.year}"


def normalize_country(country: Optional[str]) -> Optional[str]:
    if not country:
        return None

    c = country.strip()
    mapping = {
        "USA": "United States",
        "US": "United States",
        "U.S.A.": "United States",
        "United States of America": "United States",
        "UK": "United Kingdom",
        "U.K.": "United Kingdom",
    }
    return mapping.get(c, c)


def normalize_state(state: Optional[str], country: Optional[str]) -> Optional[str]:
    if not state:
        return None

    s = state.strip()
    if normalize_country(country) == "United States" and len(s) == 2:
        return s.lower()
    return s


def normalize_city(city: Optional[str]) -> Optional[str]:
    if not city:
        return None
    return city.strip().lower()


def normalize_shape(shape: Optional[str]) -> Optional[str]:
    if not shape:
        return None
    return shape.strip().lower()


def clean_comments(text: Optional[str]) -> Optional[str]:
    if not text:
        return None

    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = cleaned.replace(",", "&#44")
    return cleaned


def duration_to_seconds(duration_text: Optional[str]) -> Optional[int]:
    if not duration_text:
        return None

    s = duration_text.lower().strip()

    vague_words = {"brief", "unknown", "unsure", "instant", "moment", "moments"}
    if s in vague_words:
        return None

    range_match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", s)
    if range_match:
        value = (float(range_match.group(1)) + float(range_match.group(2))) / 2
    else:
        num_match = re.search(r"(\d+(?:\.\d+)?)", s)
        if not num_match:
            if "second" in s:
                value = 1.0
            else:
                return None
        else:
            value = float(num_match.group(1))

    if "day" in s:
        return int(value * 86400)
    if "hour" in s or re.search(r"\bhr\b|\bhrs\b", s):
        return int(value * 3600)
    if "minute" in s or re.search(r"\bmin\b|\bmins\b", s):
        return int(value * 60)
    if "second" in s or re.search(r"\bsec\b|\bsecs\b", s):
        return int(value)

    return None


def duration_to_hm(duration_text: Optional[str], duration_seconds: Optional[int]) -> Optional[str]:
    if duration_text:
        return duration_text.strip()

    if duration_seconds is None:
        return None

    if duration_seconds >= 3600:
        hours = duration_seconds / 3600
        return f"{hours:g} hour" + ("" if math.isclose(hours, 1) else "s")
    if duration_seconds >= 60:
        minutes = duration_seconds / 60
        return f"{minutes:g} minute" + ("" if math.isclose(minutes, 1) else "s")
    return f"{duration_seconds} seconds"


def detail_to_row(detail: Dict[str, Optional[str]]) -> Dict[str, Optional[object]]:
    country = normalize_country(detail.get("country"))
    state = normalize_state(detail.get("state"), country)

    duration_seconds = duration_to_seconds(detail.get("duration_raw"))
    duration_hm = duration_to_hm(detail.get("duration_raw"), duration_seconds)

    # Prefer Reported for datePosted, then Posted
    date_posted = parse_date_to_csv_format(detail.get("reported")) or parse_date_to_csv_format(detail.get("posted"))

    return {
        "datetime": parse_datetime_to_csv_format(detail.get("occurred")),
        "city": normalize_city(detail.get("city")),
        "state": state,
        "country": country,
        "shape": normalize_shape(detail.get("shape")),
        "durationSeconds": duration_seconds,
        "durationHM": duration_hm,
        "comments": clean_comments(detail.get("comments_raw")),
        "datePosted": date_posted,
        "latitude": None,
        "longitude": None,
        "sourceUrl": detail.get("sourceUrl"),
        "sighting_id": detail.get("sighting_id"),
    }


# ----------------------------
# Coordinates
# ----------------------------

def load_existing_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Existing CSV not found: {path}")

    print(f"Loading CSV from: {path}")

    df = pd.read_csv(
        path,
        sep=";",
        dtype=str,
        keep_default_na=False,
        encoding="utf-8",
        engine="python",
        on_bad_lines="warn",
        quotechar='"'
    )

    df.columns = [str(c).strip() for c in df.columns]

    expected_cols = [
        "datetime", "city", "state", "country", "shape",
        "durationSeconds", "durationHM", "comments",
        "datePosted", "latitude", "longitude"
    ]

    missing_cols = [col for col in expected_cols if col not in df.columns]
    if missing_cols:
        raise RuntimeError(f"CSV is missing expected columns: {missing_cols}")

    print(f"Loaded {len(df)} rows")
    return df

def build_coord_lookup(existing_df: pd.DataFrame) -> pd.DataFrame:
    df = existing_df.copy()

    expected = {"city", "state", "country", "latitude", "longitude"}
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"Existing CSV is missing columns: {sorted(missing)}")

    df["city"] = df["city"].astype(str).str.strip().str.lower()
    df["state"] = df["state"].astype(str).str.strip()
    df["country"] = df["country"].astype(str).str.strip()

    df = df.replace({"": pd.NA})
    df = df.dropna(subset=["city", "country", "latitude", "longitude"])

    lookup = (
        df.groupby(["city", "state", "country"], as_index=False)[["latitude", "longitude"]]
        .first()
    )
    return lookup


def fill_coords_from_existing(new_df: pd.DataFrame, coord_lookup: pd.DataFrame) -> pd.DataFrame:
    merged = new_df.merge(
        coord_lookup,
        on=["city", "state", "country"],
        how="left",
        suffixes=("", "_existing"),
    )

    merged["latitude"] = merged["latitude"].replace({None: pd.NA, "": pd.NA}).fillna(merged["latitude_existing"])
    merged["longitude"] = merged["longitude"].replace({None: pd.NA, "": pd.NA}).fillna(merged["longitude_existing"])

    merged = merged.drop(columns=["latitude_existing", "longitude_existing"])
    return merged


def geocode_location(city: Optional[str], state: Optional[str], country: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    if not city and not state and not country:
        return None, None

    query = ", ".join([x for x in [city, state, country] if x])

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "jsonv2", "limit": 1},
            headers={"User-Agent": SESSION.headers["User-Agent"]},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        time.sleep(GEOCODE_DELAY)

        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        return None, None

    return None, None


def geocode_missing_rows(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for idx, row in df.iterrows():
        lat_missing = pd.isna(row["latitude"]) or row["latitude"] in ("", None)
        lon_missing = pd.isna(row["longitude"]) or row["longitude"] in ("", None)

        if lat_missing or lon_missing:
            lat, lon = geocode_location(row.get("city"), row.get("state"), row.get("country"))
            if lat is not None and lon is not None:
                df.at[idx, "latitude"] = lat
                df.at[idx, "longitude"] = lon

    return df


# ----------------------------
# Dedupe / merge
# ----------------------------

def standardize_existing_for_merge(existing_df: pd.DataFrame) -> pd.DataFrame:
    df = existing_df.copy()

    for col in ["datetime", "city", "state", "country", "shape", "durationSeconds", "durationHM", "comments", "datePosted", "latitude", "longitude"]:
        if col not in df.columns:
            df[col] = ""

    df["city"] = df["city"].astype(str).str.strip().str.lower()
    df["state"] = df["state"].astype(str).str.strip()
    df["country"] = df["country"].astype(str).str.strip()
    df["shape"] = df["shape"].astype(str).str.strip().str.lower()
    df["comments"] = df["comments"].astype(str).str.strip()

    return df


def deduplicate_rows(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()

    for col in ["datetime", "city", "state", "country", "comments"]:
        work[col] = work[col].fillna("").astype(str).str.strip()

    work = work.drop_duplicates(
        subset=["datetime", "city", "state", "country", "comments"],
        keep="first",
    ).reset_index(drop=True)

    return work


# ----------------------------
# Main pipeline
# ----------------------------

def scrape_nuforc(
    start_year: int = 2016,
    end_year: int = 2025,
    max_months: Optional[int] = None,
    max_rows_per_month: Optional[int] = None
) -> pd.DataFrame:
    months = fetch_month_links(start_year=start_year, end_year=end_year)

    if max_months is not None:
        months = months[:max_months]

    rows: List[Dict[str, Optional[object]]] = []

    total_months = len(months)
    print(f"Preparing to scrape {total_months} month pages.")

    for idx, month in enumerate(months, start=1):
        month_id = month["yyyymm"]
        month_url = month["url"]

        print(f"\n[{idx}/{total_months}] Month {month_id} -> {month_url}")

        try:
            sighting_urls = parse_month_page(month_url)
        except Exception as exc:
            print(f"  Failed month page: {exc}")
            continue

        if not sighting_urls:
            print("  No sighting URLs found for this month.")
            continue

        if max_rows_per_month is not None:
            sighting_urls = sighting_urls[:max_rows_per_month]

        print(f"  Found {len(sighting_urls)} sighting URLs.")

        for row_idx, sighting_url in enumerate(sighting_urls, start=1):
            try:
                detail = parse_detail_page(sighting_url)
                row = detail_to_row(detail)

                # skip rows that are too empty to be useful
                if not any([
                    row.get("datetime"),
                    row.get("city"),
                    row.get("comments"),
                    row.get("sighting_id")
                ]):
                    print(f"  [{row_idx}/{len(sighting_urls)}] SKIP empty parsed row -> {sighting_url}")
                    continue

                rows.append(row)
                print(f"  [{row_idx}/{len(sighting_urls)}] OK {row.get('sighting_id')} -> {sighting_url}")

            except Exception as exc:
                print(f"  [{row_idx}/{len(sighting_urls)}] FAIL {sighting_url} -> {exc}")

    if not rows:
        return pd.DataFrame(
            columns=[
                "datetime", "city", "state", "country", "shape",
                "durationSeconds", "durationHM", "comments",
                "datePosted", "latitude", "longitude",
                "sourceUrl", "sighting_id",
            ]
        )

    df = pd.DataFrame(rows)

    # remove exact duplicate sighting URLs or IDs if present
    if "sighting_id" in df.columns:
        df = df.drop_duplicates(subset=["sighting_id"], keep="first")

    if "sourceUrl" in df.columns:
        df = df.drop_duplicates(subset=["sourceUrl"], keep="first")

    # enforce column order
    expected_columns = [
        "datetime", "city", "state", "country", "shape",
        "durationSeconds", "durationHM", "comments",
        "datePosted", "latitude", "longitude",
        "sourceUrl", "sighting_id",
    ]
    df = df.reindex(columns=expected_columns)

    print(f"\nFinished scraping. Total rows collected: {len(df)}")

    return df

def run_pipeline(
    existing_csv_path: Path = EXISTING_CSV,
    scraped_output_path: Path = SCRAPED_OUTPUT_CSV,
    final_output_path: Path = FINAL_OUTPUT_CSV,
    start_year: int = 2016,
    end_year: int = 2025,
    geocode_missing: bool = True,
    max_months: Optional[int] = None,
    max_rows_per_month: Optional[int] = None,
) -> None:
    print("Loading existing CSV...")
    print("Using existing CSV:", existing_csv_path)
    print("Exists?", existing_csv_path.exists())

    # 🔍 Debug: inspect first line of file
    with open(existing_csv_path, "r", encoding="latin-1", errors="replace") as f:
        print("First line:", repr(f.readline()))

    existing_df = load_existing_csv(existing_csv_path)
    existing_df = standardize_existing_for_merge(existing_df)

    print("Building coordinate lookup from existing CSV...")
    
    coord_lookup = build_coord_lookup(existing_df)

    print("Scraping NUFORC...")
    scraped_df = scrape_nuforc(
        start_year=start_year,
        end_year=end_year,
        max_months=max_months,
        max_rows_per_month=max_rows_per_month,
    )

    if scraped_df.empty:
        print("No rows scraped. Exiting without writing merged output.")
        return

    print("Filling coordinates from existing CSV...")
    scraped_df = fill_coords_from_existing(scraped_df, coord_lookup)

    if geocode_missing:
        print("Geocoding remaining missing coordinates...")
        scraped_df = geocode_missing_rows(scraped_df)

    scraped_df.to_csv(scraped_output_path, sep=";", index=False, encoding="utf-8")
    print(f"Wrote scraped-only output to: {scraped_output_path}")

    print("Merging with existing CSV...")
    merged_df = pd.concat(
        [
            existing_df[[
                "datetime", "city", "state", "country", "shape",
                "durationSeconds", "durationHM", "comments",
                "datePosted", "latitude", "longitude"
            ]],
            scraped_df[[
                "datetime", "city", "state", "country", "shape",
                "durationSeconds", "durationHM", "comments",
                "datePosted", "latitude", "longitude"
            ]],
        ],
        ignore_index=True,
    )

    print("Deduplicating...")
    merged_df = deduplicate_rows(merged_df)

    merged_df.to_csv(final_output_path, sep=";", index=False, encoding="utf-8")
    print(f"Wrote final merged output to: {final_output_path}")
    print(f"Total merged rows: {len(merged_df)}")
    


if __name__ == "__main__":
    # First test:
    # run_pipeline(
    #     start_year=2025,
    #     end_year=2025,
    #     geocode_missing=False,
    #     max_months=1,
    #     max_rows_per_month=10,
    # )

    # Full run:
    
   run_pipeline(
    start_year=2025,
    end_year=2025,
    geocode_missing=False,
    max_months=1,
    max_rows_per_month=1000,
)