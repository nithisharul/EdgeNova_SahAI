"""
Train a small MLP to recommend a crop from soil/climate parameters.

Dataset: Crop Recommendation Dataset (Kaggle, by Atharva Ingle)
Expected columns: N, P, K, temperature, humidity, ph, rainfall, label

Place the CSV at: data/raw/crop_recommendation.csv
Run with:  python models/train_crop_model.py
"""

import os
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

DATA_PATH = os.path.join("data", "raw", "crop_recommendation.csv")
MODEL_OUT = os.path.join("models", "crop_model.pt")
SCALER_OUT = os.path.join("models", "crop_scaler.pkl")
ENCODER_OUT = os.path.join("models", "crop_label_encoder.pkl")

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
LABEL_COL = "label"


class CropMLP(nn.Module):
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
            f"Couldn't find {DATA_PATH}. Download the Crop Recommendation "
            f"Dataset from Kaggle and place it at that path."
        )
    df = pd.read_csv(DATA_PATH)
    missing = [c for c in FEATURES + [LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing expected columns: {missing}")
    return df


def main():
    df = load_data()

    X = df[FEATURES].values.astype(np.float32)
    y_raw = df[LABEL_COL].values

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    num_classes = len(label_encoder.classes_)
    print(f"Found {num_classes} crop classes: {list(label_encoder.classes_)}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.long)
    X_test_t = torch.tensor(X_test, dtype=torch.float32)
    y_test_t = torch.tensor(y_test, dtype=torch.long)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    model = CropMLP(in_dim=len(FEATURES), num_classes=num_classes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    X_train_t, y_train_t = X_train_t.to(device), y_train_t.to(device)
    X_test_t, y_test_t = X_test_t.to(device), y_test_t.to(device)

    epochs = 500
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits = model(X_train_t)
        loss = criterion(logits, y_train_t)
        loss.backward()
        optimizer.step()

        if epoch % 10 == 0 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                test_logits = model(X_test_t)
                test_preds = test_logits.argmax(dim=1)
                acc = (test_preds == y_test_t).float().mean().item()
            print(f"Epoch {epoch:3d} | train_loss={loss.item():.4f} | test_acc={acc*100:.2f}%")

    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), MODEL_OUT)
    joblib.dump(scaler, SCALER_OUT)
    joblib.dump(label_encoder, ENCODER_OUT)
    print(f"\nSaved model -> {MODEL_OUT}")
    print(f"Saved scaler -> {SCALER_OUT}")
    print(f"Saved label encoder -> {ENCODER_OUT}")


if __name__ == "__main__":
    main()
