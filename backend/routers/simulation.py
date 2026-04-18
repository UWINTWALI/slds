from fastapi import APIRouter, HTTPException
from schemas import SimulateRequest, BatchSimulateRequest, CompareRequest
from services.model_service import simulate, simulate_batch, get_model
from services.data_service import get_feature_list

router = APIRouter(prefix="/simulation", tags=["simulation"])

PRESET_INTERVENTIONS = {
    "road_only":     {"road_density_km_per_km2": 0.5},
    "health_only":   {"health_facility_count": 1},
    "school_only":   {"school_count": 2},
    "light_only":    {"nightlight_mean": 2.0},
    "road_health":   {"road_density_km_per_km2": 0.5, "health_facility_count": 1},
    "comprehensive": {"road_density_km_per_km2": 0.5, "health_facility_count": 1,
                      "school_count": 2},
}


@router.get("/features")
def available_features():
    """Return which features the model can accept as intervention targets."""
    return get_feature_list()


@router.post("/single")
def simulate_single(req: SimulateRequest):
    if get_model() is None:
        raise HTTPException(503, "Model not trained. Run Notebook 03 first.")
    result = simulate(req.sector, req.intervention)
    if result is None:
        raise HTTPException(404, f"Sector '{req.sector}' not found")
    return result


@router.post("/batch")
def simulate_batch_endpoint(req: BatchSimulateRequest):
    if get_model() is None:
        raise HTTPException(503, "Model not trained. Run Notebook 03 first.")
    return simulate_batch(req.intervention, req.district)


@router.post("/compare")
def compare_investments(req: CompareRequest):
    """Run all preset intervention types and return ranked comparison."""
    if get_model() is None:
        raise HTTPException(503, "Model not trained. Run Notebook 03 first.")
    features = get_feature_list()

    results = []
    for label, inv in PRESET_INTERVENTIONS.items():
        # Skip if none of the features are in the model
        if not any(k in features for k in inv):
            continue
        filtered_inv = {k: v for k, v in inv.items() if k in features}
        batch = simulate_batch(filtered_inv, req.district)
        if not batch:
            continue
        import numpy as np
        deltas = [r["delta"] for r in batch]
        arr    = np.array(deltas)
        results.append({
            "intervention_label":      label,
            "intervention":            filtered_inv,
            "avg_poverty_reduction":   round(float(-arr.mean()), 4),
            "max_poverty_reduction":   round(float(-arr.min()), 4),
            "sectors_improved":        int((arr < 0).sum()),
            "sectors_worsened":        int((arr > 0).sum()),
            "total_sectors":           len(batch),
        })

    return sorted(results, key=lambda r: -r["avg_poverty_reduction"])
