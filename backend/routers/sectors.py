from fastapi import APIRouter, HTTPException
from services.data_service import get_df, get_sector, get_geojson, _find_col
import geopandas as gpd
import json
from pathlib import Path

router = APIRouter(prefix="/sectors", tags=["sectors"])

DATASETS = Path(r"C:/Users/HP/Desktop/Proposal_Final/Datasets")
SHP_ADM3 = (DATASETS / "rwa_adm_2006_nisr_wgs1984_20181002_shp_2"
             / "rwa_adm3_2006_NISR_WGS1984_20181002.shp")


@router.get("/{sector_name}")
def sector_detail(sector_name: str):
    row = get_sector(sector_name)
    if row is None:
        raise HTTPException(404, f"Sector '{sector_name}' not found")
    return row


@router.get("/{sector_name}/neighbors")
def sector_neighbors(sector_name: str, n: int = 6):
    """Return up to n sectors whose boundaries touch the given sector."""
    if not SHP_ADM3.exists():
        return []

    df  = get_df()
    col = _find_col(df, "adm3")
    gdf = gpd.read_file(SHP_ADM3).to_crs("EPSG:4326")

    shp_col = _find_col(gdf, "adm3")
    if not shp_col:
        return []

    target = gdf[gdf[shp_col].str.strip().str.lower() == sector_name.strip().lower()]
    if target.empty:
        return []

    touches = gdf[gdf.geometry.touches(target.geometry.values[0])].head(n)
    if col and col in df.columns:
        merge_cols = [c for c in df.columns if c != "geometry"]
        touches = touches.merge(df[merge_cols], left_on=shp_col, right_on=col, how="left")

    keep = [c for c in ["adm3_en", "adm2_en", "cdi", "cdi_national_rank",
                         "predicted_poverty_rate", "road_density_km_per_km2",
                         "health_facility_count", "school_count"]
            if c in touches.columns]
    return touches[keep].where(touches[keep].notna(), None).to_dict(orient="records")


@router.get("")
def list_sectors(district: str | None = None):
    df      = get_df()
    dist_col = _find_col(df, "adm2")
    if district and dist_col:
        df = df[df[dist_col].str.strip().str.lower() == district.strip().lower()]
    return sorted(df[_find_col(df, "adm3")].dropna().tolist()) if _find_col(df, "adm3") else []
