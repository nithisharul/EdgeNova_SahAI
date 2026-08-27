"""
sahAI - Fertilizer Recommendation Model (PyTorch MLP)
=====================================================

Trains a multi-class classifier that maps soil/climate conditions + crop type
to a recommended fertilizer.

Dataset : "Fertilizer Prediction" (Kaggle, public)
Expected columns (note the dataset's own typos - handled automatically):
    Temparature, Humidity , Moisture, Soil Type, Crop Type,
    Nitrogen, Potassium, Phosphorous, Fertilizer Name

Usage (from the sahAI project root):
    python models/train_fertilizer_model.py
    python models/train_fertilizer_model.py --csv data/raw/Fertilizer_Prediction.csv --epochs 600

Outputs (written to models/):
    fertilizer_model.pth          - weights + architecture metadata
    fertilizer_preprocessor.joblib - ColumnTransformer + LabelEncoder for the API
"""

import argparse
import glob
import os
import sys

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from torch.utils.data import DataLoader, TensorDataset

SEED = 42
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")

# Canonical names used everywhere downstream (the API must send these keys).
NUMERIC_COLS = [
    "Temparature",
    "Humidity",
    "Moisture",
    "Nitrogen",
    "Potassium",
    "Phosphorous",
]
CATEGORICAL_COLS = ["Soil Type", "Crop Type"]
TARGET_COL = "Fertilizer Name"

# Maps every spelling we've seen in the wild -> our canonical name.
COLUMN_ALIASES = {
    "temparature": "Temparature",
    "temperature": "Temparature",
    "humidity": "Humidity",
    "moisture": "Moisture",
    "soil type": "Soil Type",
    "soiltype": "Soil Type",
    "soil_type": "Soil Type",
    "crop type": "Crop Type",
    "croptype": "Crop Type",
    "crop_type": "Crop Type",
    "nitrogen": "Nitrogen",
    "potassium": "Potassium",
    "phosphorous": "Phosphorous",
    "phosphorus": "Phosphorous",
    "fertilizer name": "Fertilizer Name",
    "fertilizer": "Fertilizer Name",
    "fertilizer_name": "Fertilizer Name",
}


class FertilizerMLP(nn.Module):
    """Small feed-forward net. Kept modest on purpose - the public fertilizer
    dataset is tiny (~99 rows), so a large net just memorises it."""

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


def find_csv(explicit: str | None) -> str:
    if explicit:
        if not os.path.exists(explicit):
            sys.exit(f"[!] CSV not found: {explicit}")
        return explicit

    candidates = glob.glob(os.path.join(RAW_DIR, "*.csv"))
    hits = [c for c in candidates if "fertil" in os.path.basename(c).lower()]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        sys.exit(f"[!] Multiple fertilizer CSVs found, pass one with --csv:\n    " + "\n    ".join(hits))
    sys.exit(
        f"[!] No fertilizer CSV found in {RAW_DIR}\n"
        f"    Drop the Kaggle 'Fertilizer Prediction' CSV there, or pass --csv <path>."
    )


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip stray whitespace ('Humidity ') and map known spelling variants."""
    renamed = {}
    for col in df.columns:
        key = col.strip().lower().replace("  ", " ")
        renamed[col] = COLUMN_ALIASES.get(key, col.strip())
    df = df.rename(columns=renamed)

    required = NUMERIC_COLS + CATEGORICAL_COLS + [TARGET_COL]
    missing = [c for c in required if c not in df.columns]
    if missing:
        sys.exit(
            f"[!] Missing expected columns after normalisation: {missing}\n"
            f"    Columns actually present: {list(df.columns)}"
        )
    return df


def main():
    p = argparse.ArgumentParser(description="Train the sahAI fertilizer recommender.")
    p.add_argument("--csv", default=None, help="path to the fertilizer CSV")
    p.add_argument("--epochs", type=int, default=400)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--test-size", type=float, default=0.2)
    args = p.parse_args()

    torch.manual_seed(SEED)
    np.random.seed(SEED)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[i] Device: {device}")

    # ---------------------------------------------------------------- load
    csv_path = find_csv(args.csv)
    print(f"[i] Reading {csv_path}")
    df = pd.read_csv(csv_path)
    df = normalise_columns(df)
    df = df.dropna(subset=NUMERIC_COLS + CATEGORICAL_COLS + [TARGET_COL])

    # Categorical text in this dataset is inconsistently cased/spaced.
    for c in CATEGORICAL_COLS + [TARGET_COL]:
        df[c] = df[c].astype(str).str.strip()

    print(f"[i] Rows: {len(df)}   Classes: {df[TARGET_COL].nunique()}")
    print(df[TARGET_COL].value_counts().to_string())

    if len(df) < 40:
        print("[!] Very small dataset - treat the accuracy number with suspicion.")

    X = df[NUMERIC_COLS + CATEGORICAL_COLS]
    y_raw = df[TARGET_COL]

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    num_classes = len(label_encoder.classes_)

    # --------------------------------------------------------------- split
    # Stratify only if every class has at least 2 members, otherwise it errors.
    counts = pd.Series(y).value_counts()
    stratify = y if counts.min() >= 2 else None
    if stratify is None:
        print("[!] A class has <2 samples - falling back to an unstratified split.")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=args.test_size, random_state=SEED, stratify=stratify
    )

    # -------------------------------------------------------- preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_COLS),
        ]
    )
    X_train_t = preprocessor.fit_transform(X_train).astype(np.float32)
    X_val_t = preprocessor.transform(X_val).astype(np.float32)
    input_dim = X_train_t.shape[1]
    print(f"[i] Feature vector width after encoding: {input_dim}")

    train_ds = TensorDataset(torch.from_numpy(X_train_t), torch.from_numpy(y_train).long())
    val_x = torch.from_numpy(X_val_t).to(device)
    val_y = torch.from_numpy(y_val).long().to(device)

    batch_size = min(args.batch_size, max(2, len(train_ds) // 4))
    # BatchNorm chokes on a trailing batch of size 1.
    drop_last = len(train_ds) % batch_size == 1
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=drop_last)

    # -------------------------------------------------------------- model
    hidden = (128, 64) if len(df) >= 1000 else (64, 32)
    model = FertilizerMLP(input_dim, num_classes, hidden=hidden).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_acc, best_state, best_epoch = -1.0, None, 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        for xb, yb in train_dl:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()
            running += loss.item() * xb.size(0)
        scheduler.step()

        model.eval()
        with torch.no_grad():
            val_logits = model(val_x)
            val_loss = criterion(val_logits, val_y).item()
            val_acc = (val_logits.argmax(1) == val_y).float().mean().item()

        if val_acc > best_acc:
            best_acc, best_epoch = val_acc, epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

        if epoch % 25 == 0 or epoch == 1:
            print(
                f"    epoch {epoch:4d}/{args.epochs}  "
                f"train_loss {running / len(train_ds):.4f}  "
                f"val_loss {val_loss:.4f}  val_acc {val_acc:.3f}"
            )

    print(f"\n[i] Best val accuracy {best_acc:.3f} at epoch {best_epoch}")
    model.load_state_dict(best_state)

    # ------------------------------------------------------------- report
    model.eval()
    with torch.no_grad():
        preds = model(val_x).argmax(1).cpu().numpy()
    present = np.unique(np.concatenate([y_val, preds]))
    print("\n" + classification_report(
        y_val, preds,
        labels=present,
        target_names=label_encoder.classes_[present],
        zero_division=0,
    ))

    # --------------------------------------------------------------- save
    model_path = os.path.join(HERE, "fertilizer_model.pth")
    prep_path = os.path.join(HERE, "fertilizer_preprocessor.joblib")

    torch.save(
        {
            "state_dict": best_state,
            "input_dim": input_dim,
            "num_classes": num_classes,
            "hidden": hidden,
            "classes": list(label_encoder.classes_),
            "numeric_cols": NUMERIC_COLS,
            "categorical_cols": CATEGORICAL_COLS,
            "val_accuracy": best_acc,
        },
        model_path,
    )
    joblib.dump({"preprocessor": preprocessor, "label_encoder": label_encoder}, prep_path)

    print(f"[+] Saved {model_path}")
    print(f"[+] Saved {prep_path}")
    print(
        "\n[i] Inference contract for fertilizer_routes.py - build a one-row DataFrame with columns:\n"
        f"    {NUMERIC_COLS + CATEGORICAL_COLS}\n"
        "    then preprocessor.transform(df) -> model -> softmax -> label_encoder.classes_[idx]"
    )


if __name__ == "__main__":
    main()