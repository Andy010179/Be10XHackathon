"""
Test suite for refactored backend (routers/ architecture) - iteration 10
Tests: auth, dashboard, enquiries, finance, students, branches, settings, admin backup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return s

@pytest.fixture(scope="module")
def superadmin_session():
    s = requests.Session()
    resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@edutech.com", "password": "SuperAdmin@123"
    })
    assert resp.status_code == 200, f"Super admin login failed: {resp.text}"
    return s

@pytest.fixture(scope="module")
def student_session():
    s = requests.Session()
    resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "vikram.shinde55@example.com", "password": "student123", "institute_code": "DEFAULT"
    })
    if resp.status_code == 200:
        return s
    pytest.skip("Student login failed")

# Keep admin_token as alias for backward compat
@pytest.fixture(scope="module")
def admin_token(admin_session):
    return admin_session

def auth_headers(token):
    return {}


# --- Auth tests ---
class TestAuth:
    def test_admin_login(self):
        # App uses httpOnly cookies; response body contains user data (no access_token)
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("email") == "admin@edutech.com"
        assert data.get("role") == "admin"

    def test_superadmin_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@edutech.com", "password": "SuperAdmin@123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("role") == "super_admin"

    def test_invalid_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com", "password": "badpass"
        })
        assert resp.status_code in [401, 400, 403]


# --- Dashboard ---
class TestDashboard:
    def test_dashboard_stats(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)


# --- Students ---
class TestStudents:
    def test_get_students(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/students")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# --- Branches ---
class TestBranches:
    def test_get_branches(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/branches")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# --- Enquiries ---
class TestEnquiries:
    def test_get_enquiries_paginated(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/enquiries?page=1&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# --- Finance ---
class TestFinance:
    def test_get_invoices(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/finance/invoices")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# --- Settings ---
class TestSettings:
    def test_get_twilio_settings(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/settings/twilio")
        assert resp.status_code in [200, 404]

    def test_get_razorpay_settings(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/settings/razorpay")
        assert resp.status_code in [200, 404]


# --- Admin Backup ---
class TestAdmin:
    def test_backup_returns_file(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/admin/backup")
        assert resp.status_code == 200
        content_type = resp.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type or len(resp.content) > 100


# --- Portal ---
class TestPortal:
    def test_student_portal_me(self, student_session):
        resp = student_session.get(f"{BASE_URL}/api/portal/me")
        assert resp.status_code == 200
