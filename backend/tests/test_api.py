# API tests for the SLDS backend.
# Make sure the server is running before you run these.
# Start it with: uvicorn main:app --reload
# Then run: pytest tests/test_api.py -v

import httpx
import pytest

BASE_URL = "http://localhost:8000"


class TestAPITests:

    # AT-01: the districts endpoint should return all 30 districts in Rwanda
    def test_AT01_districts_returns_complete_list(self):
        response = httpx.get(f"{BASE_URL}/api/districts", timeout=30.0)

        assert response.status_code == 200, (
            f"Expected HTTP 200, got {response.status_code}"
        )

        data = response.json()

        assert isinstance(data, list), "Response should be a list of district names"
        assert len(data) == 30, f"Rwanda has 30 districts but got {len(data)}"
        assert all(isinstance(name, str) for name in data), "Each district should be a string"

        print(f"\n  Returned {len(data)} districts. First 3: {data[:3]}")

    # AT-02: requesting a valid sector should return all the expected data fields
    def test_AT02_sector_detail_returns_valid_data(self):
        response = httpx.get(f"{BASE_URL}/api/sectors/Kacyiru")

        assert response.status_code == 200, (
            f"Expected HTTP 200 for a valid sector, got {response.status_code}"
        )

        data = response.json()

        required_fields = ["cdi", "cdi_national_rank", "predicted_poverty_rate", "adm2_en", "tier"]
        for field in required_fields:
            assert field in data, f"Field '{field}' is missing from the response"

        assert isinstance(data["cdi"], (int, float)), "CDI should be a number"
        assert 0 <= data["cdi"] <= 100, f"CDI should be between 0 and 100, got {data['cdi']}"

        print(f"\n  Kacyiru: CDI {data['cdi']}, District {data['adm2_en']}, Tier {data['tier']}")

    # AT-03: requesting a sector that does not exist should return a 404 error
    def test_AT03_unknown_sector_returns_404(self):
        response = httpx.get(f"{BASE_URL}/api/sectors/FakeSector")

        assert response.status_code == 404, (
            f"Expected 404 for a non-existent sector, got {response.status_code}"
        )

        data = response.json()
        assert "detail" in data, "The 404 response should include an error message"

        print(f"\n  Got correct 404. Message: {data['detail']}")

    # AT-04: the national GeoJSON endpoint should return a valid FeatureCollection
    # with one feature per sector (416 total)
    def test_AT04_national_geojson_is_valid_feature_collection(self):
        response = httpx.get(f"{BASE_URL}/api/national/geojson", timeout=30.0)

        assert response.status_code == 200

        data = response.json()

        assert data.get("type") == "FeatureCollection", "Type must be FeatureCollection"

        features = data.get("features", [])
        assert len(features) == 416, f"Expected 416 sector features, got {len(features)}"

        # Check the first few features have the right structure
        for i, feature in enumerate(features[:5]):
            assert "geometry" in feature, f"Feature {i} is missing geometry"
            assert "properties" in feature, f"Feature {i} is missing properties"

        print(f"\n  Valid GeoJSON with {len(features)} sector features.")
