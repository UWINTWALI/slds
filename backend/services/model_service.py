"""
model_service.py — loads the trained ML model and runs poverty simulations.
"""

from pathlib import Path
from functools import lru_cache

import numpy as np
import pandas as pd
import joblib

from services.data_service import get_df, _find_col

MODELS = Path(r"C:/Users/HP/Desktop/Proposal_Final/models")


@lru_cache(maxsize=1)
def get_model() -> dict | None:
    p = MODELS / "poverty_model.pkl"
    if p.exists():
        return joblib.load(p)
    return None


def simulate(sector_name: str, intervention: dict) -> dict | None:
    bundle = get_model()
    if bundle is None:
        return None
    model    = bundle["model"]
    features = bundle["features"]
    df       = get_df()
    col      = _find_col(df, "adm3")
    if not col:
        return None
    row = df[df[col].str.strip().str.lower() == sector_name.strip().lower()]
    if row.empty:
        return None

    baseline    = row[features].fillna(0).copy()
    counterfact = baseline.copy()
    for feat, delta in intervention.items():
        if feat in counterfact.columns:
            counterfact[feat] = (counterfact[feat] + float(delta)).clip(lower=0)

    before = float(model.predict(baseline)[0])
    after  = float(model.predict(counterfact)[0])
    delta  = after - before
    return {
        "sector":     sector_name,
        "before":     round(before, 4),
        "after":      round(after,  4),
        "delta":      round(delta,  4),
        "pct_change": round(delta / before * 100, 2) if before > 0 else 0.0,
    }


def simulate_batch(intervention: dict, district: str | None = None) -> list[dict]:
    bundle = get_model()
    if bundle is None:
        return []
    model    = bundle["model"]
    features = bundle["features"]
    df       = get_df()
    col      = _find_col(df, "adm3")
    dist_col = _find_col(df, "adm2")
    if not col:
        return []

    subset = df.copy()
    if district and dist_col:
        subset = subset[subset[dist_col].str.strip().str.lower() == district.strip().lower()]

    results = []
    for _, row in subset.iterrows():
        baseline    = pd.DataFrame([row[features].fillna(0)])
        counterfact = baseline.copy()
        for feat, delta in intervention.items():
            if feat in counterfact.columns:
                counterfact[feat] = (counterfact[feat] + float(delta)).clip(lower=0)
        before = float(model.predict(baseline)[0])
        after  = float(model.predict(counterfact)[0])
        d      = after - before
        results.append({
            "sector":     row[col],
            "district":   row[dist_col] if dist_col and dist_col in row else None,
            "before":     round(before, 4),
            "after":      round(after,  4),
            "delta":      round(d,      4),
            "pct_change": round(d / before * 100, 2) if before > 0 else 0.0,
        })

    return sorted(results, key=lambda r: r["delta"])


def model_performance() -> dict | None:
    bundle = get_model()
    if bundle is None:
        return None
    model    = bundle["model"]
    features = bundle["features"]
    df       = get_df()
    avail    = [f for f in features if f in df.columns]
    pov_col  = next((c for c in ("poverty_rate", "predicted_poverty_rate")
                     if c in df.columns), None)
    if not avail or not pov_col:
        return {"features": features, "trained": True}

    from sklearn.metrics import r2_score, mean_absolute_error
    X      = df[avail].fillna(0)
    y_pred = model.predict(X)
    y_true = df[pov_col].fillna(df[pov_col].median())

    importances = dict(zip(features, map(float, model.feature_importances_)))
    return {
        "r2":          round(float(r2_score(y_true, y_pred)), 4),
        "mae":         round(float(mean_absolute_error(y_true, y_pred)), 4),
        "n_samples":   int(df[pov_col].notna().sum()),
        "n_features":  len(avail),
        "importances": dict(sorted(importances.items(), key=lambda x: -x[1])),
    }
