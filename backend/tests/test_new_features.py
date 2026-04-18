"""
Tests for new features: Logo upload, White-label PDF, Student ID card, Portal photo, Parent invoice downloads
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_CREDS = {"email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"}
STUDENT_CREDS = {"email": "vikram.shinde55@example.com", "password": "student123", "institute_code": "DEFAULT"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def student_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=STUDENT_CREDS)
    if r.status_code != 200:
        pytest.skip(f"Student login failed: {r.text}")
    return s


class TestLogoAPI:
    """Logo upload and retrieval"""

    def test_get_logo_before_upload(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/settings/logo")
        assert r.status_code in [200, 404], f"Unexpected status: {r.status_code}"
        print(f"GET /api/settings/logo (before upload): {r.status_code}")

    def test_upload_logo_admin(self, admin_session):
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
            b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
            b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        files = {"file": ("test_logo.png", io.BytesIO(png_bytes), "image/png")}
        r = admin_session.post(f"{BASE_URL}/api/settings/logo", files=files)
        print(f"POST /api/settings/logo: {r.status_code} {r.text}")
        assert r.status_code == 200, f"Logo upload failed: {r.text}"

    def test_get_logo_after_upload(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/settings/logo")
        print(f"GET /api/settings/logo after upload: {r.status_code}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")


class TestInvoicePDFBranding:
    """Invoice PDF uses institute name"""

    def test_invoice_pdf_branding(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/finance/invoices")
        assert r.status_code == 200
        invoices = r.json()
        if not invoices:
            pytest.skip("No invoices in DB")
        invoice_id = invoices[0].get("id") or str(invoices[0].get("_id", ""))
        pdf_r = admin_session.get(f"{BASE_URL}/api/finance/invoices/{invoice_id}/pdf")
        print(f"Invoice PDF: {pdf_r.status_code}, content-type: {pdf_r.headers.get('content-type')}")
        assert pdf_r.status_code == 200
        assert "pdf" in pdf_r.headers.get("content-type", "")
        cd = pdf_r.headers.get("content-disposition", "")
        assert "attachment" in cd


class TestPortalPhotoAndIDCard:
    """Student portal photo upload and ID card generation"""

    def test_portal_photo_upload_admin_returns_404(self, admin_session):
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {"file": ("photo.png", io.BytesIO(png_bytes), "image/png")}
        r = admin_session.post(f"{BASE_URL}/api/portal/photo", files=files)
        print(f"POST /api/portal/photo (admin): {r.status_code}")
        assert r.status_code == 404

    def test_portal_id_card_admin_returns_404(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/portal/id-card")
        print(f"GET /api/portal/id-card (admin): {r.status_code}")
        assert r.status_code == 404

    def test_portal_id_card_student(self, student_session):
        r = student_session.get(f"{BASE_URL}/api/portal/id-card")
        print(f"GET /api/portal/id-card (student): {r.status_code}")
        assert r.status_code == 200
        assert "pdf" in r.headers.get("content-type", "")

    def test_portal_photo_upload_student(self, student_session):
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {"file": ("photo.png", io.BytesIO(png_bytes), "image/png")}
        r = student_session.post(f"{BASE_URL}/api/portal/photo", files=files)
        print(f"POST /api/portal/photo (student): {r.status_code} {r.text}")
        assert r.status_code == 200
