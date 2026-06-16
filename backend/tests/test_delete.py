# End-to-end tests for the Report Deletion API endpoint.
# Start backend server first: uvicorn main:app --reload
# Run tests: pytest tests/test_delete.py -v

import httpx
import pytest

BASE_URL = "http://localhost:8000"


def login(email: str, password: str) -> dict:
    response = httpx.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()


class TestReportDeletion:

    def test_report_submit_receive_and_delete_flow(self):
        # 1. Log in as a Sector Officer (Rutunga)
        sector_auth = login("rutunga@slds.rw", "sector")
        sector_token = sector_auth["access_token"]

        # 2. Submit a report
        report_payload = {
            "report_type": "sector",
            "title": "Rutunga Poverty Audit Q2",
            "html_content": "<h1>Rutunga Report</h1><p>Indicators look stable.</p>",
            "district": "Gasabo",
            "sector": "Rutunga",
            "payload": {"poverty_rate": 0.35}
        }
        submit_res = httpx.post(
            f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {sector_token}"},
            json=report_payload,
        )
        assert submit_res.status_code == 201, f"Failed to submit: {submit_res.text}"
        report_data = submit_res.json()
        report_id = report_data["id"]
        assert report_id is not None

        # 3. Log in as the District Officer (Gasabo) who is the recipient
        district_auth = login("gasabo@slds.rw", "district")
        district_token = district_auth["access_token"]

        # 4. Verify report is in the District Officer's inbox list
        list_res = httpx.get(
            f"{BASE_URL}/api/reports?box=inbox",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert list_res.status_code == 200
        reports = list_res.json()
        found_in_inbox = any(r["id"] == report_id for r in reports)
        assert found_in_inbox, "Submitted report was not found in the recipient's inbox"

        # 5. Verify the District Officer can view report details
        detail_res = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert detail_res.status_code == 200
        assert detail_res.json()["title"] == "Rutunga Poverty Audit Q2"

        # 6. Delete the report from the District Officer's inbox
        delete_res = httpx.delete(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert delete_res.json().get("ok") is True

        # 7. Verify report is no longer in the inbox list
        list_res_after = httpx.get(
            f"{BASE_URL}/api/reports?box=inbox",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert list_res_after.status_code == 200
        reports_after = list_res_after.json()
        found_after = any(r["id"] == report_id for r in reports_after)
        assert not found_after, "Report was still found in inbox after deletion"

        # 8. Verify the District Officer's access to the report is now denied
        detail_res_after = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert detail_res_after.status_code == 403, (
            f"Expected 403 Access Denied, got {detail_res_after.status_code}"
        )

    def test_report_delete_by_sender_flow(self):
        # 1. Log in as Sector Officer (Rutunga)
        sector_auth = login("rutunga@slds.rw", "sector")
        sector_token = sector_auth["access_token"]

        # 2. Submit a report
        report_payload = {
            "report_type": "sector",
            "title": "Rutunga Sent Report to Delete",
            "html_content": "<h1>Rutunga Sent</h1><p>Test permanent deletion by sender</p>",
            "district": "Gasabo",
            "sector": "Rutunga",
            "payload": {"poverty_rate": 0.40}
        }
        submit_res = httpx.post(
            f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {sector_token}"},
            json=report_payload,
        )
        assert submit_res.status_code == 201, f"Failed to submit: {submit_res.text}"
        report_data = submit_res.json()
        report_id = report_data["id"]
        assert report_id is not None

        # 3. Verify recipient (Gasabo) has it in inbox
        district_auth = login("gasabo@slds.rw", "district")
        district_token = district_auth["access_token"]

        list_res = httpx.get(
            f"{BASE_URL}/api/reports?box=inbox",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert list_res.status_code == 200
        found_in_inbox = any(r["id"] == report_id for r in list_res.json())
        assert found_in_inbox, "Report not in recipient inbox"

        # 4. Verify sender has it in sent box
        list_sent_res = httpx.get(
            f"{BASE_URL}/api/reports?box=sent",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert list_sent_res.status_code == 200
        found_in_sent = any(r["id"] == report_id for r in list_sent_res.json())
        assert found_in_sent, "Report not in sender sent box"

        # 5. Delete the report as the sender
        delete_res = httpx.delete(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert delete_res.status_code == 200, f"Delete by sender failed: {delete_res.text}"
        assert "deleted permanently" in delete_res.json().get("message", "")

        # 6. Verify sender no longer has it in sent box
        list_sent_after = httpx.get(
            f"{BASE_URL}/api/reports?box=sent",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        found_in_sent_after = any(r["id"] == report_id for r in list_sent_after.json())
        assert not found_in_sent_after, "Report still in sender sent box after deletion"

        # 7. Verify recipient no longer has it in inbox box
        list_inbox_after = httpx.get(
            f"{BASE_URL}/api/reports?box=inbox",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        found_in_inbox_after = any(r["id"] == report_id for r in list_inbox_after.json())
        assert not found_in_inbox_after, "Report still in recipient inbox after sender deleted it"

        # 8. Verify recipient gets 404 since report is fully deleted
        detail_res_after = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert detail_res_after.status_code == 404, (
            f"Expected 404 Not Found, got {detail_res_after.status_code}"
        )

