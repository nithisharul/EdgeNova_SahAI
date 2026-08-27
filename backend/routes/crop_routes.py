"""
Crop Advisor routes.

POST /predict-crop    -> recommends a crop from soil/climate parameters
POST /crop-advisory   -> full chain: crop -> fertilizer, in one call

All model loading and the crop -> fertilizer vocabulary mapping live in
backend/services/agri_pipeline.py. This file only handles HTTP concerns.

The old FERTILIZER_LOOKUP dict that used to live here has been removed: it was
a third, competing source of fertilizer advice alongside the trained model and
the guideline table. There is now exactly one path per crop.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import agri_pipeline as agri

router = APIRouter(tags=["crop"])


class CropInput(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float


class AdvisoryInput(CropInput):
    soil_type: str = Field("Loamy", description="Sandy | Loamy | Black | Red | Clayey")
    moisture: float = Field(45.0, description="Soil moisture %")
    # Fertilizer-model soil test values. Separate from N/P/K above - the two
    # datasets are on different measurement scales, so they are NOT reused.
    fert_nitrogen: float | None = None
    fert_potassium: float | None = None
    fert_phosphorous: float | None = None


@router.post("/predict-crop")
def predict_crop(payload: CropInput):
    try:
        result = agri.predict_crop(payload.model_dump())
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
        "fertilizer_available": (
            mapping["supported"]
            or result["crop"].lower() in agri.GUIDELINE_FERTILIZER_TABLE
        ),
    }


@router.post("/crop-advisory")
def crop_advisory(payload: AdvisoryInput):
    """Crop + fertilizer in one call - what the app's home screen should hit."""
    crop_payload = {
        f: getattr(payload, f)
        for f in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    }

    fert_npk = None
    if None not in (payload.fert_nitrogen, payload.fert_potassium, payload.fert_phosphorous):
        fert_npk = {
            "Nitrogen": payload.fert_nitrogen,
            "Potassium": payload.fert_potassium,
            "Phosphorous": payload.fert_phosphorous,
        }

    try:
        return agri.full_advisory(
            crop_payload,
            soil_type=payload.soil_type,
            moisture=payload.moisture,
            fert_npk=fert_npk,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Models not trained yet.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))