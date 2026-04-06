"""Backend tests for EduTech LMS - Auth, Dashboard, CRM, Academic, Finance, Students"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def auth_session(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return session

# --- Auth Tests ---
class TestAuth:
    def test_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "admin@edutech.com"
        assert data["role"] == "admin"

    def test_login_wrong_password(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "wrong"})
        assert resp.status_code == 401

    def test_me_authenticated(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "admin@edutech.com"

    def test_me_unauthenticated(self, session):
        s = requests.Session()
        resp = s.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401

# --- Dashboard Tests ---
class TestDashboard:
    def test_stats(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_revenue" in data
        assert "total_students" in data
        assert "conversion_rate" in data
        assert "revenue_by_branch" in data
        assert "enrolments_by_category" in data
        assert "monthly_trends" in data

# --- CRM Enquiries Tests ---
class TestEnquiries:
    def test_list_enquiries(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/enquiries")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # seeded 5 enquiries

    def test_create_enquiry(self, auth_session):
        payload = {
            "student_name": "TEST_Student One",
            "email": "test_enq@test.com",
            "phone": "9999999999",
            "courses": [],
            "stage": "new",
            "source": "manual",
            "notes": "Test enquiry"
        }
        resp = auth_session.post(f"{BASE_URL}/api/enquiries", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_name"] == "TEST_Student One"
        assert data["stage"] == "new"
        assert "id" in data
        # Store for cleanup
        TestEnquiries.created_id = data["id"]

    def test_update_stage(self, auth_session):
        if not hasattr(TestEnquiries, 'created_id'):
            pytest.skip("No enquiry created")
        resp = auth_session.patch(f"{BASE_URL}/api/enquiries/{TestEnquiries.created_id}/stage", json={"stage": "followup"})
        assert resp.status_code == 200
        assert resp.json()["stage"] == "followup"

    def test_delete_enquiry(self, auth_session):
        if not hasattr(TestEnquiries, 'created_id'):
            pytest.skip("No enquiry created")
        resp = auth_session.delete(f"{BASE_URL}/api/enquiries/{TestEnquiries.created_id}")
        assert resp.status_code == 200

# --- Academic Tests ---
class TestAcademic:
    def test_list_branches(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/branches")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 3  # seeded 3 branches

    def test_list_batches(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/academic/batches")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_schedule(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/academic/schedule")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

# --- Finance Tests ---
class TestFinance:
    def test_list_invoices(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/finance/invoices")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_generate_invoice(self, auth_session):
        # Get a student first
        students_resp = auth_session.get(f"{BASE_URL}/api/students")
        assert students_resp.status_code == 200
        students = students_resp.json()
        if not students:
            pytest.skip("No students found")
        student = students[0]
        
        # Get a course
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        if not courses:
            pytest.skip("No courses found")
        course = courses[0]
        
        payload = {
            "student_id": student["id"],
            "student_name": student["name"],
            "course_id": course["id"],
            "course_name": course["name"],
            "base_fee": 25000,
            "discount": 0
        }
        resp = auth_session.post(f"{BASE_URL}/api/finance/calculate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert data["gst_amount"] == 4500.0  # 18% of 25000
        assert data["total"] == 29500.0
        TestFinance.invoice_id = data["id"]

# --- Students Tests ---
class TestStudents:
    def test_list_students(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/students")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 4  # seeded 4 students

    def test_create_and_get_student(self, auth_session):
        payload = {
            "name": "TEST_Student",
            "email": "test_student_unique@test.com",
            "phone": "8888888888",
        }
        resp = auth_session.post(f"{BASE_URL}/api/students", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Student"
        assert "id" in data
        TestStudents.student_id = data["id"]
        
        # GET to verify persistence
        get_resp = auth_session.get(f"{BASE_URL}/api/students/{data['id']}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "TEST_Student"

    def test_student_lifecycle_onboard(self, auth_session):
        if not hasattr(TestStudents, 'student_id'):
            pytest.skip("No student created")
        # Get a batch (create one if none)
        batches_resp = auth_session.get(f"{BASE_URL}/api/academic/batches")
        batches = batches_resp.json()
        batch_id = batches[0]["id"] if batches else "test-batch-id"
        
        resp = auth_session.post(f"{BASE_URL}/api/students/{TestStudents.student_id}/onboard", json={"batch_id": batch_id})
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_student_complete(self, auth_session):
        if not hasattr(TestStudents, 'student_id'):
            pytest.skip("No student created")
        resp = auth_session.post(f"{BASE_URL}/api/students/{TestStudents.student_id}/complete")
        assert resp.status_code == 200
        data = resp.json()
        assert "certificate" in data
