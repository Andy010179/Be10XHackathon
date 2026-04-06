"""Tests for new features: Courses, User Management, Payments (mock), Portal"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.cookies.get("access_token") or r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s

# --- Courses CRUD ---
class TestCourses:
    course_id = None

    def test_list_courses(self, session):
        r = session.get(f"{BASE_URL}/api/courses")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print(f"PASS: list_courses - {len(r.json())} courses")

    def test_create_course(self, session):
        # Get a valid branch_id first
        rb = session.get(f"{BASE_URL}/api/branches")
        branches = rb.json() if rb.status_code == 200 else []
        branch_id = branches[0]["id"] if branches else "main"
        payload = {"name": "TEST_Python Basics", "category": "Programming", "branch_id": branch_id, "base_fee": 5000.0, "teacher_id": None}
        r = session.post(f"{BASE_URL}/api/courses", json=payload)
        assert r.status_code == 200, f"Create course failed: {r.text}"
        data = r.json()
        assert data["name"] == payload["name"]
        TestCourses.course_id = data["id"]
        print(f"PASS: create_course id={TestCourses.course_id}")

    def test_update_course(self, session):
        if not TestCourses.course_id:
            pytest.skip("No course_id")
        rb = session.get(f"{BASE_URL}/api/branches")
        branches = rb.json() if rb.status_code == 200 else []
        branch_id = branches[0]["id"] if branches else "main"
        payload = {"name": "TEST_Python Advanced", "category": "Programming", "branch_id": branch_id, "base_fee": 7000.0, "teacher_id": None}
        r = session.put(f"{BASE_URL}/api/courses/{TestCourses.course_id}", json=payload)
        assert r.status_code == 200, f"Update course failed: {r.text}"
        print("PASS: update_course")

    def test_delete_course(self, session):
        if not TestCourses.course_id:
            pytest.skip("No course_id")
        r = session.delete(f"{BASE_URL}/api/courses/{TestCourses.course_id}")
        assert r.status_code == 200, f"Delete course failed: {r.text}"
        print("PASS: delete_course")

# --- User Management ---
class TestUserManagement:
    user_id = None

    def test_list_users(self, session):
        r = session.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print(f"PASS: list_users - {len(r.json())} users")

    def test_create_teacher(self, session):
        payload = {"name": "TEST_Teacher One", "email": "test_teacher_new@edutech.com", "role": "teacher", "password": "teacher123"}
        r = session.post(f"{BASE_URL}/api/users", json=payload)
        assert r.status_code in [200, 201], f"Create teacher failed: {r.text}"
        data = r.json()
        TestUserManagement.user_id = data.get("id")
        print(f"PASS: create_teacher id={TestUserManagement.user_id}")

    def test_delete_user(self, session):
        if not TestUserManagement.user_id:
            pytest.skip("No user_id")
        r = session.delete(f"{BASE_URL}/api/users/{TestUserManagement.user_id}")
        assert r.status_code in [200, 204], f"Delete user failed: {r.text}"
        print("PASS: delete_user")

# --- Payments (mock) ---
class TestPayments:
    def test_create_payment_order_no_key(self, session):
        """Should return mock order when no Razorpay keys"""
        r = session.get(f"{BASE_URL}/api/finance/invoices")
        assert r.status_code == 200
        invoices = r.json()
        if not invoices:
            pytest.skip("No invoices available")
        invoice = invoices[0]
        invoice_id = invoice["id"]
        amount = invoice.get("balance", invoice.get("total", 1000))
        r2 = session.post(f"{BASE_URL}/api/payments/create-order", json={"invoice_id": invoice_id, "amount": float(amount)})
        assert r2.status_code in [200, 201], f"Payment order unexpected: {r2.text}"
        data = r2.json()
        assert "order_id" in data
        assert data.get("mock") == True  # Should be mock mode
        print(f"PASS: create_payment_order mock={data.get('mock')} order_id={data.get('order_id')}")

# --- Portal ---
class TestPortal:
    def test_portal_me(self, session):
        r = session.get(f"{BASE_URL}/api/portal/me")
        assert r.status_code == 200
        print(f"PASS: portal_me - {r.json()}")

    def test_portal_invoices(self, session):
        r = session.get(f"{BASE_URL}/api/portal/invoices")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print(f"PASS: portal_invoices - {len(r.json())} invoices")

    def test_portal_attendance(self, session):
        r = session.get(f"{BASE_URL}/api/portal/attendance")
        assert r.status_code == 200
        print(f"PASS: portal_attendance")

    def test_portal_certificate(self, session):
        r = session.get(f"{BASE_URL}/api/portal/certificate")
        assert r.status_code in [200, 404]
        print(f"PASS: portal_certificate status={r.status_code}")

    def test_portal_fee_query(self, session):
        """Fee query requires a student record - admin won't have one. Expected 404 for admin."""
        r = session.post(f"{BASE_URL}/api/portal/fee-query", json={"message": "Test message from pytest"})
        # Admin has no student record, so 404 is expected. Student would get 200.
        assert r.status_code in [200, 404], f"Fee query unexpected: {r.text}"
        print(f"PASS: portal_fee_query status={r.status_code} (404 expected for admin user)")
