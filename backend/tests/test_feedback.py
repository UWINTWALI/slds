# End-to-end integration tests for the Report Feedback and Custom PDF Upload API endpoints.
# Start backend server first: uvicorn main:app --reload
# Run tests: pytest tests/test_feedback.py -v

import io
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


class TestFeedbackAndPdfUploads:

    def test_custom_pdf_and_feedback_flow(self):
        # 1. Log in as Sector Officer (Rutunga)
        sector_auth = login("rutunga@slds.rw", "sector")
        sector_token = sector_auth["access_token"]

        # 2. Submit a report (without custom PDF initially)
        report_payload = {
            "report_type": "sector",
            "title": "Rutunga Development Audit Q2",
            "html_content": "<h1>Rutunga Development</h1><p>Progress on CDI indicators.</p>",
            "district": "Gasabo",
            "sector": "Rutunga",
            "payload": {"cdi": 52.4}
        }
        submit_res = httpx.post(
            f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {sector_token}"},
            json=report_payload,
        )
        assert submit_res.status_code == 201, f"Failed to submit: {submit_res.text}"
        report_id = submit_res.json()["id"]

        # 3. Upload a custom PDF to the report
        pdf_content = b"%PDF-1.4 mock pdf content sector officer custom report"
        pdf_file = io.BytesIO(pdf_content)
        upload_res = httpx.post(
            f"{BASE_URL}/api/reports/{report_id}/pdf",
            headers={"Authorization": f"Bearer {sector_token}"},
            files={"pdf_file": ("custom_report.pdf", pdf_file, "application/pdf")},
        )
        assert upload_res.status_code == 200, f"Failed to upload report PDF: {upload_res.text}"
        assert upload_res.json()["ok"] is True
        assert "pdf_filename" in upload_res.json()

        # 4. Stream the report PDF back securely as Sector Officer
        stream_res = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}/pdf",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert stream_res.status_code == 200, f"Failed to stream report PDF: {stream_res.text}"
        assert stream_res.content == pdf_content

        # 5. Log in as District Officer (Gasabo) recipient
        district_auth = login("gasabo@slds.rw", "district")
        district_token = district_auth["access_token"]

        # 6. Stream report PDF as District Officer (should succeed)
        dist_stream_res = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}/pdf",
            headers={"Authorization": f"Bearer {district_token}"},
        )
        assert dist_stream_res.status_code == 200
        assert dist_stream_res.content == pdf_content

        # 7. Log in as another Sector Officer (Remera - not associated with Gasabo / Rutunga report)
        remera_auth = login("remera@slds.rw", "sector")
        remera_token = remera_auth["access_token"]

        # 8. Attempt to download PDF as Remera (should be 403 Forbidden)
        remera_stream_res = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}/pdf",
            headers={"Authorization": f"Bearer {remera_token}"},
        )
        assert remera_stream_res.status_code == 403

        # 9. Submit a feedback with comments and an official District PDF response
        feedback_text = "Thank you for the report. Please find official review attached."
        feedback_pdf_content = b"%PDF-1.4 official district response feedback document"
        feedback_pdf_file = io.BytesIO(feedback_pdf_content)

        feedback_res = httpx.post(
            f"{BASE_URL}/api/reports/{report_id}/feedback",
            headers={"Authorization": f"Bearer {district_token}"},
            data={"feedback_text": feedback_text},
            files={"pdf_file": ("official_district_review.pdf", feedback_pdf_file, "application/pdf")},
        )
        assert feedback_res.status_code == 201, f"Failed to submit feedback: {feedback_res.text}"
        feedback_data = feedback_res.json()
        assert feedback_data["feedback_text"] == feedback_text
        assert "pdf_filename" in feedback_data
        feedback_id = feedback_data["id"]

        # 10. Verify feedback is listed in report detail response
        detail_res = httpx.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert detail_res.status_code == 200
        report_detail = detail_res.json()
        assert report_detail["pdf_filename"] is not None
        assert len(report_detail["feedbacks"]) == 1
        assert report_detail["feedbacks"][0]["id"] == feedback_id
        assert report_detail["feedbacks"][0]["feedback_text"] == feedback_text

        # 11. Download the feedback attachment securely as the Sector Officer
        fb_download_res = httpx.get(
            f"{BASE_URL}/api/feedback/{feedback_id}/pdf",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert fb_download_res.status_code == 200
        assert fb_download_res.content == feedback_pdf_content

        # 12. Remera trying to download feedback attachment should be 403 Forbidden
        remera_fb_res = httpx.get(
            f"{BASE_URL}/api/feedback/{feedback_id}/pdf",
            headers={"Authorization": f"Bearer {remera_token}"},
        )
        assert remera_fb_res.status_code == 403

        # 13. Verify that a notification was created for Sector Officer (Rutunga) about the feedback
        notif_res = httpx.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {sector_token}"},
        )
        assert notif_res.status_code == 200
        notifications = notif_res.json()
        feedback_notif = [n for n in notifications if "New feedback received" in n["title"]]
        assert len(feedback_notif) >= 1
        assert report_id in feedback_notif[0]["report_id"]
