"""
sahAI - Crop -> Fertilizer pipeline bridge
===========================================

Single source of truth for loading both agronomy models and for translating
between them. crop_routes.py and fertilizer_routes.py should import from here
rather than each re-declaring model classes and file paths.

WHY THIS MODULE EXISTS
----------------------
The crop model and the fertilizer model come from two unrelated public datasets
that do not share a vocabulary:

  * Crop model predicts ~22 crops  (rice, chickpea, banana, coffee, ...)
  * Fertilizer model only accepts 11 (Paddy, Maize, Cotton, Pulses, ...)

Direct string overlap is essentially just Maize and Cotton. Passing a raw crop
label straight into the fertilizer model does NOT raise - OneHotEncoder is
configured with handle_unknown="ignore", so an unrecognised crop silently
becomes an all-zero block and the model returns a confident-looking prediction
driven by NPK alone. That is a silent-wrong-answer bug, so every crossing of
the boundary goes through map_crop_to_fertilizer_crop() below.

Where no agronomic equivalent exists (fruit/plantation crops), we return None
and the API tells the user to pick a crop type manually. Failing loudly beats
inventing a fertilizer recommendation.

SCALE WARNING
-------------
Both datasets have N/P/K columns but they are NOT on the same measurement basis
(crop set runs far higher). Do not forward NPK from a crop request into a
fertilizer request - collect the fertilizer model's own soil-test values.
Note also the column ORDER trap: the crop model uses N, P, K but the fertilizer
dataset lists Nitrogen, Potassium, Phosphorous (K before P). We always pass a
named DataFrame, never a positional array, so ordering cannot silently swap.
"""

from __future__ import annotations

import os
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

# models/ sits next to backend/ at the project root
_HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

CROP_FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
FERT_NUMERIC = ["Temparature", "Humidity", "Moisture", "Nitrogen", "Potassium", "Phosphorous"]
FERT_CATEGORICAL = ["Soil Type", "Crop Type"]
FERT_FEATURES = FERT_NUMERIC + FERT_CATEGORICAL

# --------------------------------------------------------------------------
# Vocabulary adapter: crop model output -> fertilizer model "Crop Type" input.
# None means "no agronomic equivalent in the fertilizer dataset" -> ask the user.
# --------------------------------------------------------------------------
CROP_NAME_MAP: dict[str, Optional[str]] = {
    "rice": "Paddy",
    "maize": "Maize",
    "cotton": "Cotton",
    "jute": "Cotton",          # loose: fibre-crop proxy, flagged as approximate
    "coconut": "Oil seeds",
    "chickpea": "Pulses",
    "kidneybeans": "Pulses",
    "pigeonpeas": "Pulses",
    "mothbeans": "Pulses",
    "mungbean": "Pulses",
    "blackgram": "Pulses",
    "lentil": "Pulses",
    # Fruit / plantation crops have no counterpart in the fertilizer dataset.
    "banana": None,
    "mango": None,
    "grapes": None,
    "apple": None,
    "orange": None,
    "papaya": None,
    "pomegranate": None,
    "watermelon": None,
    "muskmelon": None,
    "coffee": None,
}

# Mappings we want the UI to label as approximate rather than exact.
APPROXIMATE_MAPPINGS = {"jute", "coconut"}

# --------------------------------------------------------------------------
# Guideline table for the 10 crops the fertilizer model cannot handle.
#
# These are NOT model predictions. They are general horticultural guidance
# expressed using the same 7 fertilizer grades the model outputs, so the API
# response shape stays identical. Every response from this path is tagged
# source="guideline_table" so the UI (and you) can always tell them apart.
#
# Deliberately no kg/ha dosages: real fruit-crop rates depend on tree age and
# spacing, which we do not collect. Grade only, plus a short note.
# --------------------------------------------------------------------------
GUIDELINE_FERTILIZER_TABLE = {
    "banana":      ("17-17-17", "Heavy feeder. Apply in split doses through the growing season."),
    "mango":       ("10-26-26", "Higher P and K supports flowering and fruit set."),
    "grapes":      ("10-26-26", "Potassium-leaning grade suits berry development."),
    "apple":       ("17-17-17", "Balanced grade; apply before bud break."),
    "orange":      ("17-17-17", "Balanced grade; split across two applications."),
    "papaya":      ("17-17-17", "Fast-growing; frequent light applications work better than one heavy dose."),
    "pomegranate": ("10-26-26", "Higher P and K during fruit development."),
    "watermelon":  ("20-20",    "Balanced N-P early, taper nitrogen once fruit sets."),
    "muskmelon":   ("20-20",    "Balanced N-P early, taper nitrogen once fruit sets."),
    "coffee":      ("17-17-17", "Balanced grade; apply with the onset of rains."),
}

# Soil type changes how fertilizer should be applied, not which grade to use.
SOIL_APPLICATION_NOTES = {
    "Sandy":  "Sandy soil drains fast - split into more, smaller applications to limit leaching.",
    "Loamy":  "Loamy soil holds nutrients well - standard split application is fine.",
    "Black":  "Black soil retains moisture - avoid over-application, it holds nutrients longer.",
    "Red":    "Red soil is often low in nitrogen and organic matter - pair with organic manure.",
    "Clayey": "Clayey soil drains slowly - apply when the field is not waterlogged.",
}


class CropMLP(nn.Module):
    """Must stay architecturally identical to models/train_crop_model.py."""

    def __init__(self, in_dim: int, num_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, num_classes),
        )

    def forward(self, x):
        return self.net(x)


class FertilizerMLP(nn.Module):
    """Must stay architecturally identical to models/train_fertilizer_model.py."""

    def __init__(self, input_dim: int, num_classes: int, hidden=(64, 32), dropout=0.2):
        super().__init__()
        layers = []
        prev = input_dim
        for h in hidden:
            layers += [nn.Linear(prev, h), nn.BatchNorm1d(h), nn.ReLU(), nn.Dropout(dropout)]
            prev = h
        layers.append(nn.Linear(prev, num_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


_crop_bundle = None
_fert_bundle = None


def load_crop_model():
    """Crop artifacts are three separate files (state_dict + scaler + encoder)."""
    global _crop_bundle
    if _crop_bundle is not None:
        return _crop_bundle

    scaler = joblib.load(os.path.join(MODELS_DIR, "crop_scaler.pkl"))
    encoder = joblib.load(os.path.join(MODELS_DIR, "crop_label_encoder.pkl"))
    state = torch.load(os.path.join(MODELS_DIR, "crop_model.pt"), map_location="cpu")

    model = CropMLP(len(CROP_FEATURES), len(encoder.classes_))
    model.load_state_dict(state)
    model.eval()

    _crop_bundle = {"model": model, "scaler": scaler, "encoder": encoder}
    return _crop_bundle


def load_fertilizer_model():
    """Fertilizer artifacts are a metadata-carrying .pth + one joblib dict."""
    global _fert_bundle
    if _fert_bundle is not None:
        return _fert_bundle

    ckpt = torch.load(os.path.join(MODELS_DIR, "fertilizer_model.pth"), map_location="cpu")
    prep = joblib.load(os.path.join(MODELS_DIR, "fertilizer_preprocessor.joblib"))

    model = FertilizerMLP(ckpt["input_dim"], ckpt["num_classes"], hidden=tuple(ckpt["hidden"]))
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    _fert_bundle = {
        "model": model,
        "preprocessor": prep["preprocessor"],
        "encoder": prep["label_encoder"],
        "classes": ckpt["classes"],
    }
    return _fert_bundle


def predict_crop(payload: dict, top_k: int = 3) -> dict:
    """payload keys: N, P, K, temperature, humidity, ph, rainfall"""
    b = load_crop_model()
    missing = [f for f in CROP_FEATURES if f not in payload]
    if missing:
        raise ValueError(f"Missing crop features: {missing}")

    row = pd.DataFrame([{f: float(payload[f]) for f in CROP_FEATURES}])
    x = torch.tensor(b["scaler"].transform(row.values), dtype=torch.float32)
    with torch.no_grad():
        probs = torch.softmax(b["model"](x), dim=1)[0]

    k = min(top_k, len(probs))
    top = torch.topk(probs, k)
    alts = [
        {"crop": b["encoder"].classes_[i], "confidence": round(float(p), 4)}
        for p, i in zip(top.values, top.indices)
    ]
    return {"crop": alts[0]["crop"], "confidence": alts[0]["confidence"], "alternatives": alts}


# Plain-language names for the model's 7 inputs, for explanations.
FEATURE_LABELS = {
    "N": "nitrogen in the soil",
    "P": "phosphorus in the soil",
    "K": "potassium in the soil",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "soil pH",
    "rainfall": "rainfall",
}


def explain_crop_prediction(payload: dict, top_k: int = 3) -> dict:
    """Why did the model pick this crop?

    Uses gradient x input attribution: how much does the score for the winning
    crop change as each input is nudged? Large magnitude means the input
    mattered. Sign tells you the direction - positive means this value pushed
    the model TOWARDS this crop, negative means it pushed away despite the crop
    still winning overall.

    This is a genuine attribution over the trained network, not a hand-written
    rule. But it explains the MODEL, not agronomy: it says which numbers drove
    the output, not why that crop is agriculturally right for the field.
    """
    b = load_crop_model()
    row = pd.DataFrame([{f: float(payload[f]) for f in CROP_FEATURES}])
    x_scaled = b["scaler"].transform(row.values)

    x = torch.tensor(x_scaled, dtype=torch.float32, requires_grad=True)
    logits = b["model"](x)
    probs = torch.softmax(logits, dim=1)[0]
    pred_idx = int(probs.argmax())

    b["model"].zero_grad()
    logits[0, pred_idx].backward()

    # gradient x input, in scaled space, so features are comparable
    attribution = (x.grad[0] * x[0]).detach().numpy()
    total = float(np.abs(attribution).sum()) or 1.0

    factors = []
    for name, attr, raw in zip(CROP_FEATURES, attribution, row.values[0]):
        factors.append({
            "feature": name,
            "label": FEATURE_LABELS[name],
            "value": round(float(raw), 2),
            "influence": round(float(abs(attr) / total), 4),
            "direction": "supports" if attr > 0 else "counts against",
        })
    factors.sort(key=lambda f: f["influence"], reverse=True)

    crop = b["encoder"].classes_[pred_idx]
    top = factors[:top_k]
    supporting = [f for f in top if f["direction"] == "supports"]

    if supporting:
        phrase = " and ".join(f"{f['label']} ({f['value']})" for f in supporting[:2])
        summary = f"{crop.title()} was recommended mainly because of your {phrase}."
    else:
        summary = (
            f"{crop.title()} scored highest overall, but no single input strongly "
            f"favoured it - the recommendation is a close call."
        )

    return {
        "summary": summary,
        "top_factors": top,
        "all_factors": factors,
        "method": "gradient x input attribution",
        "caveat": (
            "This explains which inputs drove the model's output. It is not "
            "agronomic advice about why the crop suits your field."
        ),
    }


def map_crop_to_fertilizer_crop(crop: str) -> dict:
    """Translate a crop-model label into a fertilizer-model 'Crop Type'."""
    key = str(crop).strip().lower()
    if key not in CROP_NAME_MAP:
        return {
            "crop_type": None,
            "supported": False,
            "approximate": False,
            "reason": f"'{crop}' is not a recognised crop-model output.",
        }
    mapped = CROP_NAME_MAP[key]
    if mapped is None:
        return {
            "crop_type": None,
            "supported": False,
            "approximate": False,
            "reason": (
                f"The fertilizer dataset has no category for '{crop}'. "
                f"Please choose a crop type manually."
            ),
        }
    return {
        "crop_type": mapped,
        "supported": True,
        "approximate": key in APPROXIMATE_MAPPINGS,
        "reason": None,
    }


def recommend_fertilizer(payload: dict, top_k: int = 3) -> dict:
    """payload keys: Temparature, Humidity, Moisture, Nitrogen, Potassium,
    Phosphorous, Soil Type, Crop Type (already mapped)."""
    b = load_fertilizer_model()
    missing = [f for f in FERT_FEATURES if f not in payload]
    if missing:
        raise ValueError(f"Missing fertilizer features: {missing}")

    row = pd.DataFrame([{f: payload[f] for f in FERT_FEATURES}])
    for c in FERT_NUMERIC:
        row[c] = row[c].astype(float)

    x = torch.tensor(b["preprocessor"].transform(row).astype("float32"))
    with torch.no_grad():
        probs = torch.softmax(b["model"](x), dim=1)[0]

    k = min(top_k, len(probs))
    top = torch.topk(probs, k)
    alts = [
        {"fertilizer": b["encoder"].classes_[i], "confidence": round(float(p), 4)}
        for p, i in zip(top.values, top.indices)
    ]
    return {"fertilizer": alts[0]["fertilizer"], "confidence": alts[0]["confidence"], "alternatives": alts}


def fertilizer_from_guideline(crop: str, soil_type: str = None) -> Optional[dict]:
    """Table lookup for crops the fertilizer model cannot handle.

    Returns the same shape as recommend_fertilizer() plus a source tag, or None
    if the crop isn't in the table either.
    """
    key = str(crop).strip().lower()
    if key not in GUIDELINE_FERTILIZER_TABLE:
        return None

    grade, note = GUIDELINE_FERTILIZER_TABLE[key]
    soil_note = SOIL_APPLICATION_NOTES.get(str(soil_type).strip()) if soil_type else None

    return {
        "fertilizer": grade,
        "confidence": None,          # not a model output - no probability to report
        "alternatives": [],
        "source": "guideline_table",
        "note": note,
        "soil_note": soil_note,
    }


def full_advisory(crop_payload: dict, soil_type: str, moisture: float,
                  fert_npk: dict = None) -> dict:
    """End-to-end: soil/climate -> crop -> fertilizer (model or guideline table).

    fert_npk carries the fertilizer model's own Nitrogen/Potassium/Phosphorous
    soil-test values. They are NOT reused from crop_payload (different scales).
    Only needed when the crop is model-supported; guideline crops don't use them.
    """
    crop_result = predict_crop(crop_payload)
    crop_name = crop_result["crop"]
    mapping = map_crop_to_fertilizer_crop(crop_name)

    # --- Path A: crop is in the fertilizer model's vocabulary -------------
    if mapping["supported"]:
        if not fert_npk:
            return {
                "crop": crop_result,
                "mapped_crop_type": mapping["crop_type"],
                "fertilizer": None,
                "needs_soil_test": True,
                "message": (
                    f"'{crop_name}' is supported by the fertilizer model, but it needs "
                    f"Nitrogen/Potassium/Phosphorous soil-test values to run."
                ),
            }

        fert_payload = {
            "Temparature": crop_payload["temperature"],
            "Humidity": crop_payload["humidity"],
            "Moisture": moisture,
            "Nitrogen": fert_npk["Nitrogen"],
            "Potassium": fert_npk["Potassium"],
            "Phosphorous": fert_npk["Phosphorous"],
            "Soil Type": soil_type,
            "Crop Type": mapping["crop_type"],
        }
        fert_result = recommend_fertilizer(fert_payload)
        fert_result["source"] = "model"
        fert_result["soil_note"] = SOIL_APPLICATION_NOTES.get(str(soil_type).strip())

        return {
            "crop": crop_result,
            "mapped_crop_type": mapping["crop_type"],
            "mapping_is_approximate": mapping["approximate"],
            "fertilizer": fert_result,
            "needs_soil_test": False,
        }

    # --- Path B: fall back to the published guideline table ---------------
    guideline = fertilizer_from_guideline(crop_name, soil_type)
    if guideline is not None:
        return {
            "crop": crop_result,
            "mapped_crop_type": None,
            "mapping_is_approximate": False,
            "fertilizer": guideline,
            "needs_soil_test": False,
        }

    # --- Path C: genuinely unknown ---------------------------------------
    return {
        "crop": crop_result,
        "mapped_crop_type": None,
        "fertilizer": None,
        "needs_manual_crop_type": True,
        "message": mapping["reason"],
    }