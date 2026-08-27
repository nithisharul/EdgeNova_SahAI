"""
Fertilizer Recommender route.

POST /recommend-fertilizer -> recommends a fertilizer grade from soil
temperature/humidity/moisture/N-P-K plus soil type and crop type.

Model loading lives in backend/services/agri_pipeline.py, which is the single
place that knows the saved artifact format (fertilizer_model.pth +
fertilizer_preprocessor.joblib).

crop_type accepts either vocabulary:
  * the fertilizer dataset's own names ("Paddy", "Maize", "Pulses", ...)
  * a crop-model output name ("rice", "chickpea", "banana", ...)
Crop-model names are translated first. Crops outside the model's vocabulary
fall back to the guideline table and are tagged source="guideline_table".
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import agri_pipeline as agri

router = APIRouter(tags=["fertilizer"])

VALID_SOIL_TYPES = ["Sandy", "Loamy", "Black", "Red", "Clayey"]


class FertilizerInput(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    nitrogen: float
    potassium: float
    phosphorous: float
    soil_type: str = Field(..., description=f"One of: {VALID_SOIL_TYPES}")
    crop_type: str = Field(..., description="Fertilizer-dataset name or crop-model name")


@router.get("/fertilizer/options")
def fertilizer_options():
    """What the frontend should populate its dropdowns with."""
    try:
        bundle = agri.load_fertilizer_model()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Fertilizer model not trained yet.")

    prep = bundle["preprocessor"]
    cat_encoder = prep.named_transformers_["cat"]
    soil_values, crop_values = [list(c) for c in cat_encoder.categories_]

    return {
        "soil_types": soil_values,
        "crop_types": crop_values,
        "fertilizer_classes": bundle["classes"],
        "guideline_only_crops": sorted(agri.GUIDELINE_FERTILIZER_TABLE.keys()),
    }


@router.post("/recommend-fertilizer")
def recommend_fertilizer(payload: FertilizerInput):
    try:
        bundle = agri.load_fertilizer_model()
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Fertilizer model not trained yet. Run models/train_fertilizer_model.py first.",
        )

    if payload.soil_type not in VALID_SOIL_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown soil_type '{payload.soil_type}'. Known values: {VALID_SOIL_TYPES}",
        )

    raw_crop = payload.crop_type.strip()
    cat_encoder = bundle["preprocessor"].named_transformers_["cat"]
    known_crop_types = list(cat_encoder.categories_[1])

    # Already a fertilizer-dataset crop name?
    if raw_crop in known_crop_types:
        crop_type = raw_crop
        approximate = False
    else:
        mapping = agri.map_crop_to_fertilizer_crop(raw_crop)
        if mapping["supported"]:
            crop_type = mapping["crop_type"]
            approximate = mapping["approximate"]
        else:
            # Not model-supported - try the guideline table before giving up.
            guideline = agri.fertilizer_from_guideline(raw_crop, payload.soil_type)
            if guideline is not None:
                return {
                    "recommended_fertilizer": guideline["fertilizer"],
                    "confidence": None,
                    "source": "guideline_table",
                    "note": guideline["note"],
                    "soil_note": guideline["soil_note"],
                    "crop_type_used": raw_crop,
                }
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unknown crop_type '{raw_crop}'. Known fertilizer-model crops: "
                    f"{known_crop_types}. Guideline-table crops: "
                    f"{sorted(agri.GUIDELINE_FERTILIZER_TABLE.keys())}"
                ),
            )

    result = agri.recommend_fertilizer({
        "Temparature": payload.temperature,
        "Humidity": payload.humidity,
        "Moisture": payload.moisture,
        "Nitrogen": payload.nitrogen,
        "Potassium": payload.potassium,
        "Phosphorous": payload.phosphorous,
        "Soil Type": payload.soil_type,
        "Crop Type": crop_type,
    })

    return {
        "recommended_fertilizer": result["fertilizer"],
        "confidence": result["confidence"],
        "alternatives": result["alternatives"],
        "source": "model",
        "crop_type_used": crop_type,
        "mapping_is_approximate": approximate,
        "soil_note": agri.SOIL_APPLICATION_NOTES.get(payload.soil_type),
    }