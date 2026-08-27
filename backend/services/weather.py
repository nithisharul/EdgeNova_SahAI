"""
sahAI - Live weather lookup (Open-Meteo)
=========================================

Fills in the three climate inputs the crop model needs - temperature, humidity
and rainfall - so the farmer only has to supply soil values.

WHY OPEN-METEO
--------------
Free, no API key, no signup. That matters: a key that takes an hour to activate
is a bad thing to discover mid-hackathon. Data comes from national weather
services at 2-11km resolution.

Licence note: Open-Meteo is free for non-commercial use (CC BY-NC 4.0) and asks
that applications exceeding 10,000 requests/day get in touch. Fine for a demo;
worth revisiting if sahAI ever ships commercially.

PRIMARY PATH IS GPS
-------------------
The app should send latitude/longitude straight from the phone. Place-name
lookup exists as a fallback for when GPS is denied or unavailable, and costs an
extra API call.

FAILING SAFELY MATTERS MORE THAN THE FEATURE
--------------------------------------------
Venue wifi dies. APIs rate-limit. Every function here raises WeatherUnavailable
rather than propagating a raw network error, so the route can fall back to
asking the farmer to type the three values. A crop advisor that 500s without
internet is worse than one that asks a question.

RAINFALL IS AN APPROXIMATION
----------------------------
The crop model was trained on a rainfall figure that behaves like a monthly
total, so we sum daily precipitation over a lookback window (default 30 days).
That is the closest honest mapping available - it is not the same quantity the
dataset authors measured. Do not present it as precise.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

import httpx

log = logging.getLogger(__name__)

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

REQUEST_TIMEOUT = 6.0      # seconds; fail fast rather than hang the request
RAINFALL_LOOKBACK_DAYS = 30

# Crop-model input bounds. Anything outside these means we misread the API.
SANE_RANGES = {
    "temperature": (-5.0, 55.0),
    "humidity": (0.0, 100.0),
    "rainfall": (0.0, 1000.0),
}


class WeatherUnavailable(Exception):
    """Raised when weather could not be fetched for any reason.

    Callers should catch this and fall back to manual entry, never 500.
    """


def _clamp(name: str, value: float) -> float:
    lo, hi = SANE_RANGES[name]
    return max(lo, min(hi, float(value)))


def geocode(place: str) -> dict:
    """Place name -> coordinates. Fallback path when GPS is unavailable.

    Biased to India because sahAI is deployed there and 'Salem' is otherwise
    ambiguous (there is a well-known Salem in Oregon).
    """
    if not place or not place.strip():
        raise WeatherUnavailable("No place name given.")

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            resp = client.get(GEOCODE_URL, params={
                "name": place.strip(),
                "count": 5,
                "language": "en",
                "format": "json",
            })
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.warning("Geocoding failed for %r: %s", place, e)
        raise WeatherUnavailable(f"Could not look up '{place}'. Check your connection.")

    results = data.get("results") or []
    if not results:
        raise WeatherUnavailable(
            f"Could not find a place called '{place}'. Check the spelling, or "
            f"enter the weather values manually."
        )

    # Prefer an Indian match if one exists, else take the top hit.
    match = next((r for r in results if r.get("country_code") == "IN"), results[0])

    return {
        "latitude": float(match["latitude"]),
        "longitude": float(match["longitude"]),
        "resolved_name": match.get("name"),
        "admin1": match.get("admin1"),
        "country": match.get("country"),
    }


def fetch_weather(latitude: float, longitude: float) -> dict:
    """Current temperature/humidity plus recent rainfall total for a location."""
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise WeatherUnavailable("Latitude/longitude out of range.")

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            current = client.get(FORECAST_URL, params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m",
                "timezone": "auto",
            })
            current.raise_for_status()
            cur = current.json().get("current") or {}

            end = date.today() - timedelta(days=1)   # archive lags ~1 day
            start = end - timedelta(days=RAINFALL_LOOKBACK_DAYS)
            hist = client.get(ARCHIVE_URL, params={
                "latitude": latitude,
                "longitude": longitude,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "daily": "precipitation_sum",
                "timezone": "auto",
            })
            hist.raise_for_status()
            daily = (hist.json().get("daily") or {}).get("precipitation_sum") or []
    except httpx.HTTPError as e:
        log.warning("Weather fetch failed for %s,%s: %s", latitude, longitude, e)
        raise WeatherUnavailable(
            "Weather service is unreachable. Please enter temperature, humidity "
            "and rainfall manually."
        )
    except (ValueError, KeyError) as e:
        log.warning("Unexpected weather payload: %s", e)
        raise WeatherUnavailable("Weather service returned unexpected data.")

    temperature = cur.get("temperature_2m")
    humidity = cur.get("relative_humidity_2m")
    if temperature is None or humidity is None:
        raise WeatherUnavailable("Weather service did not return temperature or humidity.")

    rain_values = [v for v in daily if v is not None]
    rainfall = sum(rain_values)

    return {
        "temperature": round(_clamp("temperature", temperature), 1),
        "humidity": round(_clamp("humidity", humidity), 1),
        "rainfall": round(_clamp("rainfall", rainfall), 1),
        "source": "open-meteo",
        "latitude": latitude,
        "longitude": longitude,
        "rainfall_basis": (
            f"Total precipitation over the last {len(rain_values)} days. The crop "
            f"model expects a monthly-scale rainfall figure, so this is a close "
            f"approximation rather than the exact quantity it was trained on."
        ),
        "rainfall_days_counted": len(rain_values),
    }


def resolve_weather(
    latitude: float | None = None,
    longitude: float | None = None,
    place: str | None = None,
) -> dict:
    """GPS first, place name second. Raises WeatherUnavailable if neither works."""
    if latitude is not None and longitude is not None:
        weather = fetch_weather(latitude, longitude)
        weather["located_by"] = "gps"
        return weather

    if place:
        location = geocode(place)
        weather = fetch_weather(location["latitude"], location["longitude"])
        weather["located_by"] = "place_name"
        weather["resolved_location"] = location
        return weather

    raise WeatherUnavailable(
        "Provide either latitude and longitude, or a place name."
    )