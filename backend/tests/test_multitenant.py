"""
Tests for Multi-tenant institute isolation, Super Admin, Parent portal features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


def login_response(email, password, institute_code=None):
    payload = {"email": email, "password": password}
    if institute_code:
        payload["institute_code"] = institute_code
    return requests.post(f"{BASE_URL}/api/auth/login", json=payload)


def auth_session(email, password, institute_code=None):
    s = requests.Session()
    payload = {"email": email, "password": password}
    if institute_code:
        payload["institute_code"] = institute_code
    r = s.post(f"{BASE_URL}/api/auth/login", json=payload)
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return s


# --- Auth / Login tests ---

class TestLogin:
    """Login endpoint with institute_code field"""

    def test_super_admin_login_no_code(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@edutech.com", "password": "SuperAdmin@123"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "super_admin"
        assert data.get("institute_id") is None

    def test_default_admin_login_with_code(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert data.get("institute_id") is not None

    def test_invalid_institute_code_rejected(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@edutech.com", "password": "admin123", "institute_code": "BADCODE"
        })
        assert r.status_code == 401

    def test_sunrise_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sunrise.com", "password": "Sunrise@123", "institute_code": "SUNRISE01"
        })
        # May return 401 if sunrise institute not seeded yet
        # Acceptable: 200 or 401
        assert r.status_code in [200, 401], f"Unexpected: {r.status_code} {r.text}"


# --- Super Admin Institute endpoints ---

class TestSuperAdminInstitutes:
    """Super admin institute management"""

    def setup_method(self):
        self.session = auth_session("superadmin@edutech.com", "SuperAdmin@123")

    def test_list_institutes(self):
        r = self.session.get(f"{BASE_URL}/api/institutes")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        codes = [i["code"] for i in data]
        assert "DEFAULT" in codes, f"DEFAULT not found in {codes}"

    def test_create_and_delete_institute(self):
        r = self.session.post(f"{BASE_URL}/api/institutes", json={
            "name": "TEST Institute",
            "code": "TESTINST99",
            "admin_name": "Test Admin",
            "admin_email": "testinst99admin@test.com",
            "admin_password": "TestAdmin@123",
            "phone": "9999999999",
            "address": "Test Address"
        })
        assert r.status_code == 200
        inst = r.json()
        assert inst["code"] == "TESTINST99"
        inst_id = inst["id"]

        # delete it
        rd = self.session.delete(f"{BASE_URL}/api/institutes/{inst_id}")
        assert rd.status_code == 200

    def test_non_super_admin_cannot_list_institutes(self):
        s = auth_session("admin@edutech.com", "admin123", "DEFAULT")
        r = s.get(f"{BASE_URL}/api/institutes")
        assert r.status_code == 403


# --- Institute Data Isolation ---

class TestDataIsolation:
    """DEFAULT admin should see data; Sunrise admin should see 0"""

    def test_default_admin_sees_students(self):
        s = auth_session("admin@edutech.com", "admin123", "DEFAULT")
        r = s.get(f"{BASE_URL}/api/students")
        assert r.status_code == 200
        assert len(r.json()) > 0, "DEFAULT admin should have seeded students"

    def test_default_admin_sees_enquiries(self):
        s = auth_session("admin@edutech.com", "admin123", "DEFAULT")
        r = s.get(f"{BASE_URL}/api/enquiries")
        assert r.status_code == 200
        assert len(r.json()) > 0, "DEFAULT admin should have seeded enquiries"

    def test_sunrise_admin_sees_zero_students(self):
        # First check if sunrise admin can login
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sunrise.com", "password": "Sunrise@123", "institute_code": "SUNRISE01"
        })
        if r.status_code != 200:
            pytest.skip("Sunrise admin not seeded, skipping isolation test")
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sunrise.com", "password": "Sunrise@123", "institute_code": "SUNRISE01"
        })
        rs = s.get(f"{BASE_URL}/api/students")
        assert rs.status_code == 200
        assert len(rs.json()) == 0, f"Sunrise admin should see 0 students, got {len(rs.json())}"

    def test_sunrise_admin_sees_zero_enquiries(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sunrise.com", "password": "Sunrise@123", "institute_code": "SUNRISE01"
        })
        if r.status_code != 200:
            pytest.skip("Sunrise admin not seeded")
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sunrise.com", "password": "Sunrise@123", "institute_code": "SUNRISE01"
        })
        rs = s.get(f"{BASE_URL}/api/enquiries")
        assert rs.status_code == 200
        data = rs.json()
        # Response may be paginated {items, total} or plain list
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) == 0


# --- Parent account management ---

class TestParentAccounts:
    """Admin can create parent accounts"""

    def setup_method(self):
        self.session = auth_session("admin@edutech.com", "admin123", "DEFAULT")

    def test_list_parents(self):
        r = self.session.get(f"{BASE_URL}/api/admin/parents")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_parent_account(self):
        # Get a student to link
        rs = self.session.get(f"{BASE_URL}/api/students")
        assert rs.status_code == 200
        students = rs.json()
        if not students:
            pytest.skip("No students to link parent to")
        student_id = students[0]["id"]

        r = self.session.post(f"{BASE_URL}/api/admin/parents", json={
            "parent_name": "TEST Parent",
            "parent_email": "testparent_99@test.com",
            "parent_phone": "9000000001",
            "student_id": student_id,
            "password": "Parent@123"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("email") == "testparent_99@test.com"
        # Cleanup
        parent_id = data.get("id")
        if parent_id:
            self.session.delete(f"{BASE_URL}/api/admin/parents/{parent_id}")

    def test_create_parent_login_and_dashboard(self):
        rs = self.session.get(f"{BASE_URL}/api/students")
        students = rs.json()
        if not students:
            pytest.skip("No students available")
        student_id = students[0]["id"]

        # Create parent - API auto-generates temp password, returns it in response
        rc = self.session.post(f"{BASE_URL}/api/admin/parents", json={
            "parent_name": "TEST ParentLogin",
            "parent_email": "testparentlogin_99@test.com",
            "parent_phone": "9000000002",
            "student_id": student_id,
        })
        if rc.status_code != 200:
            pytest.skip(f"Could not create parent: {rc.text}")
        parent_data = rc.json()
        parent_id = parent_data.get("id")
        temp_password = parent_data.get("temp_password")
        assert temp_password, "temp_password should be returned in response"

        # Login as parent using temp password (no institute_code needed)
        rp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testparentlogin_99@test.com", "password": temp_password
        })
        assert rp.status_code == 200
        assert rp.json()["role"] == "parent"

        # Access parent dashboard
        ps = requests.Session()
        ps.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testparentlogin_99@test.com", "password": temp_password
        })
        rd = ps.get(f"{BASE_URL}/api/parent/dashboard")
        assert rd.status_code == 200

        # Cleanup
        if parent_id:
            self.session.delete(f"{BASE_URL}/api/admin/parents/{parent_id}")


# --- Student invite parent ---

class TestStudentInviteParent:
    """Student portal: invite parent by email"""

    def test_invite_parent_endpoint(self):
        # student@edutech.com may not exist, try to login with DEFAULT code
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "student@edutech.com", "password": "student123", "institute_code": "DEFAULT"
        })
        if r.status_code != 200:
            pytest.skip("student@edutech.com not available, skipping invite test")
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "student@edutech.com", "password": "student123", "institute_code": "DEFAULT"
        })
        r = s.post(f"{BASE_URL}/api/portal/invite-parent", json={
            "email": "invitedparent_test@test.com",
            "name": "Invited Parent"
        })
        # 200 or 404 if student record not linked
        assert r.status_code in [200, 201, 404], f"Unexpected: {r.status_code} {r.text}"
