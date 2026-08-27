"""
Train a classifier to recommend a fertilizer type from soil/crop
conditions.

Dataset: "Fertilizer Prediction" (Kaggle). Common versions of this
dataset use columns like:
  Temparature, Humidity, Moisture, Soil Type, Crop Type, Nitrogen,
  Potassium, Phosphorous, Fertilizer Name

Place the CSV at: data/raw/fertilizer_prediction.csv
Run with: python models/train_fertilizer_model.py

If your downloaded CSV has slightly different column names/casing
(Kaggle uploads vary), check the printed columns on the first run and
adjust NUMERIC_FEATURES / CATEGORICAL_FEATURES / LABEL_COL below.
"""

import os
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

DATA_PATH = os.path.join("data", "raw", "fertilizer_prediction.csv")
MODEL_OUT = os.path.join("models", "fertilizer_model.pt")
SCALER_OUT = os.path.join("models", "fertilizer_scaler.pkl")
LABEL_ENCODER_OUT = os.path.join("models", "fertilizer_label_encoder.pkl")
SOIL_ENCODER_OUT = os.path.join("models", "fertilizer_soil_encoder.pkl")
CROP_ENCODER_OUT = os.path.join("models", "fertilizer_crop_encoder.pkl")

# Adjust these if your CSV's column names differ.
NUMERIC_FEATURES = ["Temparature", "Humidity", "Moisture", "Nitrogen", "Potassium", "Phosphorous"]
SOIL_COL = "Soil Type"
CROP_COL = "Crop Type"
LABEL_COL = "Fertilizer Name"


class FertilizerMLP(nn.Module):
    def __init__(self, in_dim, num_classes):
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


def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Couldn't find {DATA_PATH}. Download the Fertilizer Prediction "
            f"dataset from Kaggle and place it at that path."
        )
    df = pd.read_csv(DATA_PATH)
    df.columns = [c.strip() for c in df.columns]  # trim stray whitespace in headers
    print("Columns found in your CSV:", list(df.columns))

    missing = [c for c in NUMERIC_FEATURES + [SOIL_COL, CROP_COL, LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing expected columns: {missing}. "
            f"Open the CSV, check the real column names, and update the "
            f"NUMERIC_FEATURES/SOIL_COL/CROP_COL/LABEL_COL constants at the "
            f"top of this script to match."
        )
    return df


def main():
    df = load_data()

    soil_encoder = LabelEncoder()
    crop_encoder = LabelEncoder()
    df["soil_enc"] = soil_encoder.fit_transform(df[SOIL_COL].astype(str))
    df["crop_enc"] = crop_encoder.fit_transform(df[CROP_COL].astype(str))

    feature_cols = NUMERIC_FEATURES + ["soil_enc", "crop_enc"]
    X = df[feature_cols].values.astype(np.float32)

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df[LABEL_COL].astype(str))
    num_classes = len(label_encoder.classes_)
    print(f"Found {num_classes} fertilizer classes: {list(label_encoder.classes_)}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42,
        stratify=y if min(np.bincount(y)) >= 2 else None,
    )

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.long)
    X_test_t = torch.tensor(X_test, dtype=torch.float32)
    y_test_t = torch.tensor(y_test, dtype=torch.long)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    model = FertilizerMLP(in_dim=len(feature_cols), num_classes=num_classes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    X_train_t, y_train_t = X_train_t.to(device), y_train_t.to(device)
    X_test_t, y_test_t = X_test_t.to(device), y_test_t.to(device)

    epochs = 150  # fertilizer datasets are often small, train a bit longer
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits = model(X_train_t)
        loss = criterion(logits, y_train_t)
        loss.backward()
        optimizer.step()

        if epoch % 15 == 0 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                test_logits = model(X_test_t)
                test_preds = test_logits.argmax(dim=1)
                acc = (test_preds == y_test_t).float().mean().item()
            print(f"Epoch {epoch:3d} | train_loss={loss.item():.4f} | test_acc={acc*100:.2f}%")

    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), MODEL_OUT)
    joblib.dump(scaler, SCALER_OUT)
    joblib.dump(label_encoder, LABEL_ENCODER_OUT)
    joblib.dump(soil_encoder, SOIL_ENCODER_OUT)
    joblib.dump(crop_encoder, CROP_ENCODER_OUT)
    print(f"\nSaved model -> {MODEL_OUT}")
    print(f"Saved scaler -> {SCALER_OUT}")
    print(f"Saved label encoder -> {LABEL_ENCODER_OUT}")
    print(f"Saved soil/crop encoders -> {SOIL_ENCODER_OUT}, {CROP_ENCODER_OUT}")


if __name__ == "__main__":
    main()
