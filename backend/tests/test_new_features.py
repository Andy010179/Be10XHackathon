"""Tests for new features: CRM Pagination, Admin Backup, Finance PDF, QR Attendance"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return s

@pytest.fixture(scope="module")
def student_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "student@edutech.com", "password": "student123"})
    if resp.status_code != 200:
        pytest.skip("Student login failed")
    return s

# --- CRM Pagination ---
class TestEnquiriesPagination:
    def test_get_enquiries_paginated(self, session):
        """GET /api/enquiries returns paginated response"""
        resp = session.get(f"{BASE_URL}/api/enquiries?page=1&limit=15")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data, f"Missing 'items' in response: {data}"
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["items"], list)

    def test_get_enquiries_search(self, session):
        """GET /api/enquiries with search param"""
        resp = session.get(f"{BASE_URL}/api/enquiries?page=1&limit=15&search=test")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    def test_get_enquiries_page2(self, session):
        """GET /api/enquiries page 2"""
        resp = session.get(f"{BASE_URL}/api/enquiries?page=2&limit=5")
        assert resp.status_code == 200


# --- Admin Data Management ---
class TestAdminDataManagement:
    def test_download_backup(self, session):
        """GET /api/admin/backup returns xlsx blob"""
        resp = session.get(f"{BASE_URL}/api/admin/backup")
        assert resp.status_code == 200
        ct = resp.headers.get("content-type", "")
        assert "spreadsheet" in ct or "octet-stream" in ct or "xlsx" in ct, f"Unexpected content-type: {ct}"

    def test_delete_all_data_wrong_confirm(self, session):
        """DELETE /api/admin/data should require confirmation"""
        resp = session.delete(f"{BASE_URL}/api/admin/data", json={"confirm": "WRONG"})
        assert resp.status_code in [400, 422], f"Expected 400/422, got {resp.status_code}"

    def test_restore_without_file(self, session):
        """POST /api/admin/restore without file should fail"""
        resp = session.post(f"{BASE_URL}/api/admin/restore")
        assert resp.status_code in [400, 422]


# --- Finance PDF ---
class TestFinancePDF:
    def get_first_invoice_id(self, session):
        resp = session.get(f"{BASE_URL}/api/finance/invoices")
        assert resp.status_code == 200
        invoices = resp.json()
        if not invoices:
            pytest.skip("No invoices found")
        return invoices[0]["id"]

    def test_get_invoice_pdf(self, session):
        """GET /api/finance/invoices/{id}/pdf returns PDF"""
        inv_id = self.get_first_invoice_id(session)
        resp = session.get(f"{BASE_URL}/api/finance/invoices/{inv_id}/pdf")
        assert resp.status_code == 200
        ct = resp.headers.get("content-type", "")
        assert "pdf" in ct or "octet-stream" in ct, f"Unexpected content-type: {ct}"

    def test_get_invoice_receipt_paid(self, session):
        """GET /api/finance/invoices/{id}/receipt for paid invoice"""
        resp = session.get(f"{BASE_URL}/api/finance/invoices")
        assert resp.status_code == 200
        invoices = resp.json()
        paid = [i for i in invoices if i.get("status") in ["paid", "partial"]]
        if not paid:
            pytest.skip("No paid invoices found")
        inv_id = paid[0]["id"]
        resp2 = session.get(f"{BASE_URL}/api/finance/invoices/{inv_id}/receipt")
        assert resp2.status_code == 200

    def test_get_invoice_receipt_unpaid_fails(self, session):
        """GET /api/finance/invoices/{id}/receipt for pending invoice should fail"""
        resp = session.get(f"{BASE_URL}/api/finance/invoices")
        invoices = resp.json()
        pending = [i for i in invoices if i.get("status") == "pending"]
        if not pending:
            pytest.skip("No pending invoices found")
        inv_id = pending[0]["id"]
        resp2 = session.get(f"{BASE_URL}/api/finance/invoices/{inv_id}/receipt")
        assert resp2.status_code in [400, 404], f"Expected error for unpaid, got {resp2.status_code}"


# --- QR Attendance ---
class TestQRAttendance:
    def test_qr_checkin_unauthenticated(self):
        """POST /api/attendance/qr-checkin without auth returns 401"""
        s = requests.Session()
        resp = s.post(f"{BASE_URL}/api/attendance/qr-checkin", json={"session_id": "test123"})
        assert resp.status_code == 401

    def test_qr_checkin_as_admin_fails(self, session):
        """POST /api/attendance/qr-checkin as admin should fail (not a student)"""
        resp = session.post(f"{BASE_URL}/api/attendance/qr-checkin", json={"session_id": "test123"})
        assert resp.status_code in [403, 404, 400], f"Got {resp.status_code}: {resp.text}"

    def test_qr_checkin_invalid_session(self, student_session):
        """POST /api/attendance/qr-checkin with invalid session returns 404/400"""
        resp = student_session.post(f"{BASE_URL}/api/attendance/qr-checkin", json={"session_id": "invalid_session_id_xyz"})
        assert resp.status_code in [400, 404]
