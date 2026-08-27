"""
Fertilizer Recommender route.

POST /recommend-fertilizer -> recommends a fertilizer type from soil
temperature/humidity/moisture/N-P-K plus soil type and crop type,
using the trained PyTorch MLP
(models/train_fertilizer_model.py -> models/fertilizer_model.pt).

This is a separate model from the crop advisor's built-in
FERTILIZER_LOOKUP dict in crop_routes.py -- that lookup is a fallback
for when this model hasn't been trained yet, or for crops missing from
the Fertilizer Prediction dataset.
"""

import os

import joblib
import numpy as np
import torch
import torch.nn as nn
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["fertilizer"])

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
)
NUMERIC_FEATURES = ["temperature", "humidity", "moisture", "nitrogen", "potassium", "phosphorous"]


class FertilizerInput(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    nitrogen: float
    potassium: float
    phosphorous: float
    soil_type: str
    crop_type: str


class FertilizerMLP(nn.Module):
    def __init__(self, in_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, num_classes),
        )

    def forward(self, x):
        return self.net(x)


def load_fertilizer_model():
    paths = {
        "scaler": os.path.join(MODELS_DIR, "fertilizer_scaler.pkl"),
        "label_encoder": os.path.join(MODELS_DIR, "fertilizer_label_encoder.pkl"),
        "soil_encoder": os.path.join(MODELS_DIR, "fertilizer_soil_encoder.pkl"),
        "crop_encoder": os.path.join(MODELS_DIR, "fertilizer_crop_encoder.pkl"),
        "model": os.path.join(MODELS_DIR, "fertilizer_model.pt"),
    }
    if not all(os.path.exists(p) for p in paths.values()):
        return None, None, None, None, None

    scaler = joblib.load(paths["scaler"])
    label_encoder = joblib.load(paths["label_encoder"])
    soil_encoder = joblib.load(paths["soil_encoder"])
    crop_encoder = joblib.load(paths["crop_encoder"])

    in_dim = len(NUMERIC_FEATURES) + 2  # + soil_enc + crop_enc
    model = FertilizerMLP(in_dim=in_dim, num_classes=len(label_encoder.classes_))
    model.load_state_dict(torch.load(paths["model"], map_location="cpu"))
    model.eval()
    return model, scaler, label_encoder, soil_encoder, crop_encoder


fert_model, fert_scaler, fert_label_encoder, fert_soil_encoder, fert_crop_encoder = load_fertilizer_model()


@router.post("/recommend-fertilizer")
def recommend_fertilizer(payload: FertilizerInput):
    if fert_model is None:
        raise HTTPException(
            status_code=503,
            detail="Fertilizer model not trained yet. Run models/train_fertilizer_model.py first.",
        )

    try:
        soil_enc = fert_soil_encoder.transform([payload.soil_type])[0]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown soil_type '{payload.soil_type}'. "
                   f"Known values: {list(fert_soil_encoder.classes_)}",
        )
    try:
        crop_enc = fert_crop_encoder.transform([payload.crop_type])[0]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown crop_type '{payload.crop_type}'. "
                   f"Known values: {list(fert_crop_encoder.classes_)}",
        )

    x = np.array([[
        payload.temperature, payload.humidity, payload.moisture,
        payload.nitrogen, payload.potassium, payload.phosphorous,
        soil_enc, crop_enc,
    ]], dtype=np.float32)
    x_scaled = fert_scaler.transform(x)

    with torch.no_grad():
        logits = fert_model(torch.tensor(x_scaled, dtype=torch.float32))
        pred_idx = logits.argmax(dim=1).item()
        confidence = torch.softmax(logits, dim=1)[0, pred_idx].item()

    fertilizer_name = fert_label_encoder.inverse_transform([pred_idx])[0]

    return {
        "recommended_fertilizer": fertilizer_name,
        "confidence": round(confidence, 3),
    }
