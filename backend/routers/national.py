from fastapi import APIRouter
from services.data_service import get_df, get_national_summary, get_geojson, _find_col
from services.model_service import model_performance

router = APIRouter(prefix="/national", tags=["national"])


@router.get("/summary")
def national_summary():
    return get_national_summary()


@router.get("/sectors")
def all_sectors(sort_by: str = "cdi_national_rank", order: str = "asc", limit: int = 500):
    df  = get_df()
    asc = order == "asc"
    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=asc)
    df = df.head(limit)
    return df.where(df.notna(), None).to_dict(orient="records")


@router.get("/geojson")
def national_geojson():
    return get_geojson()


@router.get("/model-performance")
def perf():
    result = model_performance()
    if result is None:
        return {"trained": False}
    return result
