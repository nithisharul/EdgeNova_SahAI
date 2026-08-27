"""
Crop Advisor routes.

POST /predict-crop   -> recommends a crop from soil/climate parameters
POST /crop-advisory  -> full chain: crop -> fertilizer, in one call
GET  /weather        -> look up live weather for a location (frontend prefill)

WEATHER AUTOFILL
----------------
temperature / humidity / rainfall are optional. Send latitude+longitude (from
the phone's GPS) and they are fetched from Open-Meteo. Send them explicitly and
your values win - an explicit value always beats a fetched one.

If the lookup fails (no internet, bad coordinates, service down) the endpoint
returns 422 asking for the three values manually rather than 500ing. Check
`weather_source` in the response: "manual" or "open-meteo".

Both responses carry a `why` block explaining which inputs drove the model's
choice. All model loading and the crop -> fertilizer vocabulary mapping live in
backend/services/agri_pipeline.py; this file only handles HTTP concerns.

The old FERTILIZER_LOOKUP dict that used to live here has been removed: it was
a third, competing source of fertilizer advice alongside the trained model and
the guideline table. There is now exactly one path per crop.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import agri_pipeline as agri
from backend.services import weather as wx

router = APIRouter(tags=["crop"])

VALID_SOIL_TYPES = ["Sandy", "Loamy", "Black", "Red", "Clayey"]


# --------------------------------------------------------------------------
# Input constraints. Ranges come from the Crop Recommendation dataset's own
# min/max, widened slightly. Anything outside these is a typo, not a field.
# FastAPI rejects violations with a 422 before any handler code runs.
# --------------------------------------------------------------------------
class CropInput(BaseModel):
    # The farmer supplies these - they come from a soil test, not the weather.
    N: float = Field(..., ge=0, le=200, description="Nitrogen ratio in soil")
    P: float = Field(..., ge=0, le=200, description="Phosphorus ratio in soil")
    K: float = Field(..., ge=0, le=250, description="Potassium ratio in soil")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")

    # These three are auto-filled from GPS when omitted. Supplying them wins.
    temperature: float | None = Field(None, ge=-5, le=55, description="Degrees Celsius")
    humidity: float | None = Field(None, ge=0, le=100, description="Relative humidity %")
    rainfall: float | None = Field(None, ge=0, le=1000, description="Rainfall in mm")

    latitude: float | None = Field(None, ge=-90, le=90, description="Phone GPS latitude")
    longitude: float | None = Field(None, ge=-180, le=180, description="Phone GPS longitude")
    place: str | None = Field(None, max_length=100,
                              description="Fallback when GPS is unavailable, e.g. 'Salem'")


class AdvisoryInput(CropInput):
    soil_type: str = Field("Loamy", description=f"One of: {VALID_SOIL_TYPES}")
    moisture: float = Field(45.0, ge=0, le=100, description="Soil moisture %")
    # Fertilizer-model soil test values. A DIFFERENT scale from N/P/K above
    # (crop dataset runs 0-140, fertilizer dataset 4-42), so the two are never
    # reused across models.
    fert_nitrogen: float | None = Field(None, ge=0, le=150)
    fert_potassium: float | None = Field(None, ge=0, le=150)
    fert_phosphorous: float | None = Field(None, ge=0, le=150)


WEATHER_FIELDS = ("temperature", "humidity", "rainfall")


def resolve_climate(payload: "CropInput") -> tuple[dict, dict]:
    """Fill any missing weather field from the location, or explain why not.

    Returns (climate_values, provenance). Explicit values always win over
    fetched ones - we never silently overwrite what the farmer typed.
    """
    supplied = {f: getattr(payload, f) for f in WEATHER_FIELDS}
    missing = [f for f, v in supplied.items() if v is None]

    if not missing:
        return supplied, {"weather_source": "manual", "fetched_fields": []}

    has_location = (
        payload.latitude is not None and payload.longitude is not None
    ) or bool(payload.place)

    if not has_location:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Missing {', '.join(missing)}. Either send latitude and longitude "
                f"(or a place name) so they can be looked up, or enter the values "
                f"manually."
            ),
        )

    try:
        fetched = wx.resolve_weather(
            latitude=payload.latitude,
            longitude=payload.longitude,
            place=payload.place,
        )
    except wx.WeatherUnavailable as e:
        # Degrade to manual entry - never 500 because the network is down.
        raise HTTPException(
            status_code=422,
            detail=f"{e} Missing values: {', '.join(missing)}.",
        )

    climate = {f: (supplied[f] if supplied[f] is not None else fetched[f])
               for f in WEATHER_FIELDS}

    return climate, {
        "weather_source": fetched["source"],
        "located_by": fetched["located_by"],
        # Echo back the coordinates actually used, so the response is
        # self-describing and the UI can show "weather for this point".
        "latitude": fetched["latitude"],
        "longitude": fetched["longitude"],
        "fetched_fields": missing,
        "rainfall_basis": fetched["rainfall_basis"] if "rainfall" in missing else None,
        "resolved_location": fetched.get("resolved_location"),
        "caveat": (
            "Weather is measured at the nearest grid point, not your exact field."
        ),
    }


@router.get("/weather")
def weather_lookup(
    latitude: float | None = None,
    longitude: float | None = None,
    place: str | None = None,
):
    """Prefill the form. The frontend can call this before showing the inputs."""
    try:
        return wx.resolve_weather(latitude=latitude, longitude=longitude, place=place)
    except wx.WeatherUnavailable as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/predict-crop")
def predict_crop(payload: CropInput):
    climate, weather_meta = resolve_climate(payload)
    features = {"N": payload.N, "P": payload.P, "K": payload.K,
                "ph": payload.ph, **climate}

    try:
        result = agri.predict_crop(features)
        explanation = agri.explain_crop_prediction(features)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Crop model not trained yet. Run models/train_crop_model.py first.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mapping = agri.map_crop_to_fertilizer_crop(result["crop"])
    return {
        "recommended_crop": result["crop"],
        "confidence": result["confidence"],
        "alternatives": result["alternatives"],
        "why": explanation,
        "fertilizer_available": (
            mapping["supported"]
            or result["crop"].lower() in agri.GUIDELINE_FERTILIZER_TABLE
        ),
        "inputs_used": features,
        "weather": weather_meta,
    }


@router.post("/crop-advisory")
def crop_advisory(payload: AdvisoryInput):
    """Crop + fertilizer in one call - what the app's home screen should hit."""
    climate, weather_meta = resolve_climate(payload)
    crop_payload = {"N": payload.N, "P": payload.P, "K": payload.K,
                    "ph": payload.ph, **climate}

    fert_npk = None
    if None not in (payload.fert_nitrogen, payload.fert_potassium, payload.fert_phosphorous):
        fert_npk = {
            "Nitrogen": payload.fert_nitrogen,
            "Potassium": payload.fert_potassium,
            "Phosphorous": payload.fert_phosphorous,
        }

    if payload.soil_type not in VALID_SOIL_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown soil_type '{payload.soil_type}'. Known values: {VALID_SOIL_TYPES}",
        )

    try:
        result = agri.full_advisory(
            crop_payload,
            soil_type=payload.soil_type,
            moisture=payload.moisture,
            fert_npk=fert_npk,
        )
        result["why"] = agri.explain_crop_prediction(crop_payload)
        result["inputs_used"] = crop_payload
        result["weather"] = weather_meta
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Models not trained yet.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))