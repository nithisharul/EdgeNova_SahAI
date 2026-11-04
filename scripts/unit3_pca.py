"""Unit 3: Principal Component Analysis (PCA), implemented with NumPy.

Run from the project root:
    python scripts/unit3_pca.py
    python scripts/unit3_pca.py --components 3

The default reads the crop recommendation data, drops its nonnumeric label,
standardizes the numeric soil/climate features, then computes PCA by eigendecomposing
the covariance matrix. Use --csv to select another numeric CSV.
"""

import argparse
import csv
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
# data/raw/README.md names the file crop_recommendation.csv; Kaggle ships it as
# Crop_recommendation.csv. Accept either so case-sensitive systems work too.
DEFAULT_CSV = next(
    (RAW_DIR / name for name in ("crop_recommendation.csv", "Crop_recommendation.csv")
     if (RAW_DIR / name).exists()),
    RAW_DIR / "crop_recommendation.csv",
)


def load_numeric_csv(path):
    """Load numeric columns from a CSV, excluding common target/label columns."""
    with open(path, newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames:
            raise ValueError(f"CSV has no header: {path}")
        rows = list(reader)

    excluded = {"label", "target", "class", "crop", "crop_label"}
    columns = [name for name in reader.fieldnames if name.strip().lower() not in excluded]
    numeric, names = [], []
    for name in columns:
        try:
            values = np.array([float(row[name]) for row in rows], dtype=float)
        except (TypeError, ValueError):
            continue
        if np.isfinite(values).all():
            numeric.append(values)
            names.append(name)

    if not numeric:
        raise ValueError("CSV contains no complete numeric feature columns")
    return np.column_stack(numeric), names


def standardize(X):
    mean = X.mean(axis=0)
    scale = X.std(axis=0)
    scale[scale == 0] = 1.0
    return (X - mean) / scale, mean, scale


def fit_pca(X, n_components):
    """Return projected data, eigenvalues, eigenvectors, and explained ratios."""
    if X.ndim != 2 or X.shape[0] < 2 or X.shape[1] < 1:
        raise ValueError("PCA needs a 2D matrix with at least two rows and one feature")
    if not np.isfinite(X).all():
        raise ValueError("PCA input must contain only finite values")
    if not 1 <= n_components <= X.shape[1]:
        raise ValueError(f"components must be between 1 and {X.shape[1]}")

    X_centered = X - X.mean(axis=0)
    covariance = X_centered.T @ X_centered / (len(X_centered) - 1)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    order = np.argsort(eigenvalues)[::-1]
    eigenvalues = np.maximum(eigenvalues[order], 0.0)
    eigenvectors = eigenvectors[:, order]
    total = eigenvalues.sum()
    ratios = eigenvalues / total if total > 0 else np.zeros_like(eigenvalues)
    basis = eigenvectors[:, :n_components]
    return X_centered @ basis, eigenvalues, basis, ratios


def main():
    parser = argparse.ArgumentParser(description="Run PCA on numeric dataset features.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV,
                        help=f"input CSV (default: {DEFAULT_CSV})")
    parser.add_argument("--components", type=int, default=2,
                        help="number of principal components to retain")
    args = parser.parse_args()

    if not args.csv.is_file():
        parser.error(f"CSV not found: {args.csv}")
    raw, names = load_numeric_csv(args.csv)
    scaled, _, _ = standardize(raw)
    projected, eigenvalues, _, ratios = fit_pca(scaled, args.components)

    print(f"Dataset: {args.csv}")
    print(f"Rows: {len(raw)} | numeric features: {len(names)}")
    print("Features:", ", ".join(names))
    print("Eigenvalues:", np.round(eigenvalues, 4).tolist())
    print("Explained variance ratios:", np.round(ratios, 4).tolist())
    print(f"Variance retained by first {args.components}: {ratios[:args.components].sum():.4f}")
    print("First five projected rows:")
    print(np.round(projected[:5], 4))


if __name__ == "__main__":
    main()
