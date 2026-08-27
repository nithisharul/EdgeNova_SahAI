"""
Crop Advisor routes.

POST /predict-crop   -> recommends a crop from soil/climate parameters
POST /crop-advisory  -> full chain: crop -> fertilizer, in one call

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

router = APIRouter(tags=["crop"])

VALID_SOIL_TYPES = ["Sandy", "Loamy", "Black", "Red", "Clayey"]


# --------------------------------------------------------------------------
# Input constraints. Ranges come from the Crop Recommendation dataset's own
# min/max, widened slightly. Anything outside these is a typo, not a field.
# FastAPI rejects violations with a 422 before any handler code runs.
# --------------------------------------------------------------------------
class CropInput(BaseModel):
    N: float = Field(..., ge=0, le=200, description="Nitrogen ratio in soil")
    P: float = Field(..., ge=0, le=200, description="Phosphorus ratio in soil")
    K: float = Field(..., ge=0, le=250, description="Potassium ratio in soil")
    temperature: float = Field(..., ge=-5, le=55, description="Degrees Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    rainfall: float = Field(..., ge=0, le=1000, description="Rainfall in mm")


class AdvisoryInput(CropInput):
    soil_type: str = Field("Loamy", description=f"One of: {VALID_SOIL_TYPES}")
    moisture: float = Field(45.0, ge=0, le=100, description="Soil moisture %")
    # Fertilizer-model soil test values. A DIFFERENT scale from N/P/K above
    # (crop dataset runs 0-140, fertilizer dataset 4-42), so the two are never
    # reused across models.
    fert_nitrogen: float | None = Field(None, ge=0, le=150)
    fert_potassium: float | None = Field(None, ge=0, le=150)
    fert_phosphorous: float | None = Field(None, ge=0, le=150)


@router.post("/predict-crop")
def predict_crop(payload: CropInput):
    try:
        result = agri.predict_crop(payload.model_dump())
        explanation = agri.explain_crop_prediction(payload.model_dump())
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
    }


@router.post("/crop-advisory")
def crop_advisory(payload: AdvisoryInput):
    """Crop + fertilizer in one call - what the app's home screen should hit."""
    crop_payload = {f: getattr(payload, f) for f in agri.CROP_FEATURES}

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
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Models not trained yet.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))