"""
data_service.py — loads sector data, computes CDI, serves GeoJSON.
All functions use module-level caching so files are read only once at startup.
"""

import json
from pathlib import Path
from functools import lru_cache

import numpy as np
import pandas as pd
import geopandas as gpd

PROCESSED = Path(r"C:/Users/HP/Desktop/Proposal_Final/processed")
DATASETS  = Path(r"C:/Users/HP/Desktop/Proposal_Final/Datasets")
SHP_ADM3  = (DATASETS / "rwa_adm_2006_administrative_boundary"
             / "rwa_adm3_2006_NISR_WGS1984_20181002.shp")

CDI_WEIGHTS = {
    "road_density_km_per_km2": 0.25,
    "health_facility_count":   0.20,
    "school_count":            0.20,
    "nightlight_mean":         0.20,
    "pop_density_mean":        0.15,
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _normalize(series: pd.Series) -> pd.Series:
    lo, hi = series.min(), series.max()
    if hi == lo:
        return pd.Series(0.5, index=series.index)
    return (series - lo) / (hi - lo)


def _find_col(df: pd.DataFrame, keyword: str) -> str | None:
    return next((c for c in df.columns if keyword.lower() in c.lower()), None)


def _compute_cdi(df: pd.DataFrame) -> pd.DataFrame:
    score = pd.Series(0.0, index=df.index)
    total_w = 0.0
    for feat, w in CDI_WEIGHTS.items():
        if feat in df.columns:
            score += w * _normalize(df[feat].fillna(0))
            total_w += w
    if total_w > 0:
        score /= total_w
    for col in ("predicted_poverty_rate", "poverty_rate"):
        if col in df.columns:
            score = 0.80 * score + 0.20 * (1 - _normalize(df[col].fillna(0.5)))
            break
    df["cdi"] = (score * 100).round(2)
    df["cdi_national_rank"] = df["cdi"].rank(ascending=False, method="min").astype(int)
    dist_col = _find_col(df, "adm2")
    if dist_col:
        df["cdi_district_rank"] = (
            df.groupby(dist_col)["cdi"]
              .rank(ascending=False, method="min").astype(int)
        )
        avg = df.groupby(dist_col)["cdi"].transform("mean")
        df["district_avg_cdi"] = avg.round(2)
        df["gap_from_district"] = (df["cdi"] - avg).round(2)
        df["is_lagging"] = df["gap_from_district"] < -10
    df["tier"] = pd.cut(
        df["cdi"],
        bins=[0, 25, 50, 75, 100],
        labels=["Lagging", "Developing", "Progressing", "Advanced"],
        include_lowest=True,
    ).astype(str)
    return df


def _generate_demo() -> pd.DataFrame:
    np.random.seed(42)
    n = 80
    districts = ["Musanze", "Burera", "Gakenke", "Rulindo", "Gicumbi"]
    df = pd.DataFrame({
        "adm3_en":                 [f"Sector_{i:03d}" for i in range(n)],
        "adm2_en":                 np.random.choice(districts, n),
        "adm1_en":                 "Northern Province",
        "nightlight_mean":         np.random.exponential(3, n).round(2),
        "road_density_km_per_km2": np.random.uniform(0.1, 2.0, n).round(3),
        "health_facility_count":   np.random.randint(0, 8, n),
        "school_count":            np.random.randint(2, 20, n),
        "pop_density_mean":        np.random.uniform(100, 800, n).round(1),
        "predicted_poverty_rate":  np.random.uniform(0.15, 0.75, n).round(3),
    })
    return df


# ── Cached loaders ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_df() -> pd.DataFrame:
    for name in ("sector_predictions.csv", "sector_features_labeled.csv",
                 "sector_features.csv"):
        p = PROCESSED / name
        if p.exists():
            df = pd.read_csv(p)
            df.columns = df.columns.str.lower()
            return _compute_cdi(df)
    return _compute_cdi(_generate_demo())


@lru_cache(maxsize=1)
def get_geojson() -> dict:
    df = get_df()
    if not SHP_ADM3.exists():
        return {"type": "FeatureCollection", "features": []}

    gdf = gpd.read_file(SHP_ADM3).to_crs("EPSG:4326")
    gdf.columns = [c.lower() if c != "geometry" else c for c in gdf.columns]
    # simplify geometry to reduce response size
    gdf["geometry"] = gdf["geometry"].simplify(0.002, preserve_topology=True)

    sector_col = _find_col(df, "adm3")
    shp_col    = _find_col(gdf, "adm3")
    if sector_col and shp_col:
        # Only bring CDI/derived columns from df — avoid duplicate adm columns
        exclude = set(gdf.columns) - {shp_col, "geometry"}
        merge_cols = [c for c in df.columns if c not in exclude or c == sector_col]
        gdf = gdf.merge(df[merge_cols], left_on=shp_col, right_on=sector_col, how="left")

    # Keep only lightweight properties
    keep = [c for c in ["adm3_en", "adm2_en", "adm1_en", "cdi", "cdi_national_rank",
                         "cdi_district_rank", "tier", "is_lagging",
                         "predicted_poverty_rate", "road_density_km_per_km2",
                         "health_facility_count", "school_count",
                         "nightlight_mean", "gap_from_district"]
            if c in gdf.columns]
    gdf = gdf[keep + ["geometry"]]
    return json.loads(gdf.to_json())


# ── Query helpers ─────────────────────────────────────────────────────────────

def get_sector(name: str) -> dict | None:
    df  = get_df()
    col = _find_col(df, "adm3")
    if not col:
        return None
    row = df[df[col].str.strip().str.lower() == name.strip().lower()]
    if row.empty:
        return None
    return row.iloc[0].where(pd.notnull(row.iloc[0]), None).to_dict()


def get_sectors_in_district(district: str) -> list[dict]:
    df   = get_df()
    col  = _find_col(df, "adm2")
    if not col:
        return df.to_dict(orient="records")
    sub  = df[df[col].str.strip().str.lower() == district.strip().lower()]
    return sub.where(pd.notnull(sub), None).to_dict(orient="records")


def list_districts() -> list[str]:
    df  = get_df()
    col = _find_col(df, "adm2")
    return sorted(df[col].dropna().unique().tolist()) if col else []


def get_national_summary() -> dict:
    df = get_df()
    sector_col = _find_col(df, "adm3")
    dist_col   = _find_col(df, "adm2")
    pov_col    = next((c for c in ("predicted_poverty_rate", "poverty_rate")
                       if c in df.columns), None)
    return {
        "total_sectors":    int(len(df)),
        "total_districts":  int(df[dist_col].nunique()) if dist_col else 0,
        "national_avg_cdi": round(float(df["cdi"].mean()), 2),
        "lagging_sectors":  int(df["is_lagging"].sum()) if "is_lagging" in df.columns else 0,
        "avg_poverty_rate": round(float(df[pov_col].mean()), 4) if pov_col else None,
        "most_developed":   str(df.loc[df["cdi"].idxmax(), sector_col]) if sector_col else None,
        "least_developed":  str(df.loc[df["cdi"].idxmin(), sector_col]) if sector_col else None,
        "tier_counts":      df["tier"].value_counts().to_dict() if "tier" in df.columns else {},
    }


def get_district_geojson(district: str) -> dict:
    full = get_geojson()
    dist_feat = [
        f for f in full["features"]
        if (f["properties"].get("adm2_en") or "").strip().lower() == district.strip().lower()
    ]
    return {"type": "FeatureCollection", "features": dist_feat}


def get_feature_list() -> list[str]:
    df = get_df()
    return [c for c in CDI_WEIGHTS if c in df.columns]
