from fastapi import APIRouter, HTTPException
from services.data_service import (
    get_df, list_districts, get_sectors_in_district,
    get_district_geojson, _find_col
)

router = APIRouter(prefix="/districts", tags=["districts"])


@router.get("")
def districts():
    return list_districts()


@router.get("/{district}/summary")
def district_summary(district: str):
    df      = get_df()
    dist_col = _find_col(df, "adm2")
    if not dist_col:
        raise HTTPException(404, "No district column in data")
    sub = df[df[dist_col].str.strip().str.lower() == district.strip().lower()]
    if sub.empty:
        raise HTTPException(404, f"District '{district}' not found")
    sector_col = _find_col(df, "adm3")
    pov_col    = next((c for c in ("predicted_poverty_rate", "poverty_rate")
                       if c in sub.columns), None)
    return {
        "district":         district,
        "n_sectors":        int(len(sub)),
        "avg_cdi":          round(float(sub["cdi"].mean()), 2),
        "min_cdi":          round(float(sub["cdi"].min()), 2),
        "max_cdi":          round(float(sub["cdi"].max()), 2),
        "lagging_sectors":  int(sub["is_lagging"].sum()) if "is_lagging" in sub.columns else 0,
        "avg_poverty":      round(float(sub[pov_col].mean()), 4) if pov_col else None,
        "best_sector":      str(sub.loc[sub["cdi"].idxmax(), sector_col]) if sector_col else None,
        "worst_sector":     str(sub.loc[sub["cdi"].idxmin(), sector_col]) if sector_col else None,
    }


@router.get("/{district}/sectors")
def district_sectors(district: str, sort_by: str = "cdi_district_rank"):
    rows = get_sectors_in_district(district)
    if not rows:
        raise HTTPException(404, f"District '{district}' not found or has no sectors")
    if sort_by in rows[0]:
        rows = sorted(rows, key=lambda r: r.get(sort_by) or 0)
    return rows


@router.get("/{district}/geojson")
def district_geojson(district: str):
    return get_district_geojson(district)
