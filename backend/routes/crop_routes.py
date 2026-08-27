"""
Crop Advisor route.

POST /predict-crop -> recommends a crop + fertilizer guidance from
soil/climate parameters, using the trained PyTorch MLP
(models/train_crop_model.py -> models/crop_model.pt).
"""

import os

import joblib
import numpy as np
import torch
import torch.nn as nn
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["crop"])

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
)
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

FERTILIZER_LOOKUP = {
    "rice": "80kg N, 40kg P, 40kg K",
    "maize": "120kg N, 60kg P, 40kg K",
    "chickpea": "20kg N, 60kg P, 20kg K",
    "wheat": "100kg N, 50kg P, 25kg K",
    # extend with your full crop list
}


class CropInput(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float


class CropMLP(nn.Module):
    def __init__(self, in_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, num_classes),
        )

    def forward(self, x):
        return self.net(x)


def load_crop_model():
    scaler_path = os.path.join(MODELS_DIR, "crop_scaler.pkl")
    encoder_path = os.path.join(MODELS_DIR, "crop_label_encoder.pkl")
    model_path = os.path.join(MODELS_DIR, "crop_model.pt")

    if not (os.path.exists(scaler_path) and os.path.exists(encoder_path) and os.path.exists(model_path)):
        return None, None, None

    scaler = joblib.load(scaler_path)
    encoder = joblib.load(encoder_path)
    model = CropMLP(in_dim=len(FEATURES), num_classes=len(encoder.classes_))
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    return model, scaler, encoder


# Loaded once at import time -- if it's None, the model just hasn't been
# trained yet (run models/train_crop_model.py).
crop_model, crop_scaler, crop_encoder = load_crop_model()


@router.post("/predict-crop")
def predict_crop(payload: CropInput):
    if crop_model is None:
        raise HTTPException(
            status_code=503,
            detail="Crop model not trained yet. Run models/train_crop_model.py first.",
        )

    x = np.array([[getattr(payload, f) for f in FEATURES]], dtype=np.float32)
    x_scaled = crop_scaler.transform(x)

    with torch.no_grad():
        logits = crop_model(torch.tensor(x_scaled, dtype=torch.float32))
        pred_idx = logits.argmax(dim=1).item()
        confidence = torch.softmax(logits, dim=1)[0, pred_idx].item()

    crop_name = crop_encoder.inverse_transform([pred_idx])[0]
    fertilizer = FERTILIZER_LOOKUP.get(crop_name.lower(), "See local agri-extension office for exact dosage")

    return {
        "recommended_crop": crop_name,
        "confidence": round(confidence, 3),
        "fertilizer_guidance": fertilizer,
    }
