# System tests for the SLDS backend.
# These tests simulate real user journeys from login through to data retrieval.
# Make sure the server is running and seed users exist before running.
# Start server: uvicorn main:app --reload
# Run tests:    pytest tests/test_system.py -v

import httpx
import pytest

BASE_URL = "http://localhost:8000"


# Helper that logs in and returns the token response
def login(email: str, password: str) -> dict:
    response = httpx.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, (
        f"Login failed for {email}. Status {response.status_code}: {response.text}"
    )
    return response.json()


class TestSystemTests:

    # ST-01: a Ministry Officer should be able to log in and get a token with national admin access
    def test_ST01_ministry_officer_login_and_national_access(self):
        data = login("admin@gmail.com", "admin")

        assert "access_token" in data, "Login response must include an access token"
        token = data["access_token"]
        user = data["user"]

        assert "national_admin" in user["roles"], (
            f"Ministry Officer should have national_admin role, got {user['roles']}"
        )

        # National admin has no district restriction
        assert user["district"] is None, "National admin should not be tied to a district"
        assert user["is_active"] is True, "Account should be active"

        # Confirm the token actually works by calling the me endpoint
        me_response = httpx.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "admin@gmail.com"

        print(f"\n  Ministry Officer logged in. Roles: {user['roles']}")

    # ST-02: a Sector Officer should only have access to their assigned sector
    # and should be blocked from admin endpoints
    def test_ST02_sector_officer_is_restricted_to_assigned_sector(self):
        data = login("rutunga@slds.rw", "sector")
        user = data["user"]
        token = data["access_token"]

        assert user["sector"] == "Rutunga", f"Expected Rutunga, got {user['sector']}"
        assert user["district"] == "Gasabo", f"Expected Gasabo, got {user['district']}"
        assert "sector_officer" in user["roles"]

        # Sector officer should not be able to access the admin user list.
        # Using the trailing slash to avoid a 307 redirect before auth runs.
        admin_response = httpx.get(
            f"{BASE_URL}/api/users/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert admin_response.status_code in (401, 403), (
            f"Sector Officer should be denied access to admin endpoints. "
            f"Got {admin_response.status_code} instead of 401 or 403."
        )

        print(f"\n  Sector: {user['sector']}, District: {user['district']}, Admin blocked: {admin_response.status_code}")

    # ST-03: the national map should load with all 416 sectors and the indicator
    # data that the choropleth map needs to colour each sector
    def test_ST03_national_map_loads_with_indicator_properties(self):
        response = httpx.get(f"{BASE_URL}/api/national/geojson", timeout=30.0)

        assert response.status_code == 200
        features = response.json().get("features", [])

        assert len(features) == 416, f"Expected 416 sectors, got {len(features)}"

        indicator_fields = {"cdi", "nightlight_mean", "predicted_poverty_rate"}
        for i, feature in enumerate(features[:10]):
            props = feature.get("properties", {})
            found = indicator_fields & set(props.keys())
            assert found, (
                f"Feature {i} is missing indicator fields needed for map colouring. "
                f"Found keys: {list(props.keys())}"
            )

        print(f"\n  National map loaded with {len(features)} features.")

    # ST-04: a District Officer should be able to log in and retrieve all sectors
    # for their district, with no sectors from other districts in the result
    def test_ST04_district_officer_retrieves_assigned_district_sectors(self):
        data = login("gasabo@slds.rw", "district")
        user = data["user"]
        token = data["access_token"]

        assert "district_officer" in user["roles"]
        assert user["district"] == "Gasabo"

        sectors_response = httpx.get(
            f"{BASE_URL}/api/districts/Gasabo/sectors",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert sectors_response.status_code == 200
        sectors = sectors_response.json()

        assert isinstance(sectors, list) and len(sectors) > 0, "Gasabo should have sectors"

        # Every sector in the response must belong to Gasabo
        for sector in sectors:
            assert sector.get("adm2_en", "").strip().lower() == "gasabo", (
                f"Sector {sector.get('adm3_en')} does not belong to Gasabo"
            )

        print(f"\n  Gasabo District Officer retrieved {len(sectors)} sectors, all verified.")
