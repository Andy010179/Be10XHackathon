"""
Iteration 4: Test edit flows for User/Academic/Enquiry, multi-batch onboarding, city field in CRM
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return s


# --- PUT /api/users/:id ---
class TestUserEdit:
    def test_edit_user_email_and_role(self, session):
        # Create a test user
        res = session.post(f"{BASE_URL}/api/users", json={
            "name": "TEST_EditUser", "email": "TEST_edituser4@example.com",
            "password": "pass1234", "role": "student"
        })
        assert res.status_code == 200
        user_id = res.json()["id"]

        # Update user
        put_res = session.put(f"{BASE_URL}/api/users/{user_id}", json={
            "email": "TEST_edituser4_updated@example.com",
            "role": "teacher",
            "joining_date": "2024-01-15"
        })
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["email"] == "test_edituser4_updated@example.com"  # emails lowercased by backend
        assert data["role"] == "teacher"

        # Cleanup
        session.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_edit_user_returns_updated_data(self, session):
        # Create
        res = session.post(f"{BASE_URL}/api/users", json={
            "name": "TEST_EditUser2", "email": "TEST_edituser4b@example.com",
            "password": "pass1234", "role": "student"
        })
        assert res.status_code == 200
        user_id = res.json()["id"]

        # PUT with name only
        put_res = session.put(f"{BASE_URL}/api/users/{user_id}", json={"name": "TEST_UpdatedName"})
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["name"] == "TEST_UpdatedName"

        # Cleanup
        session.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_edit_user_empty_update_returns_400(self, session):
        # Get first user
        users = session.get(f"{BASE_URL}/api/users").json()
        if not users:
            pytest.skip("No users available")
        user_id = users[0]["id"]
        put_res = session.put(f"{BASE_URL}/api/users/{user_id}", json={})
        assert put_res.status_code == 400


# --- POST /api/enquiries with city field ---
class TestEnquiryCity:
    def test_create_enquiry_with_city(self, session):
        res = session.post(f"{BASE_URL}/api/enquiries", json={
            "student_name": "TEST_CityEnquiry",
            "email": "TEST_city@example.com",
            "phone": "9999999999",
            "city": "Mumbai",
            "stage": "new",
            "source": "manual",
            "notes": ""
        })
        assert res.status_code == 200
        data = res.json()
        assert data["city"] == "Mumbai"
        enq_id = data["id"]

        # Cleanup
        session.delete(f"{BASE_URL}/api/enquiries/{enq_id}")

    def test_update_enquiry_with_city(self, session):
        # Create
        res = session.post(f"{BASE_URL}/api/enquiries", json={
            "student_name": "TEST_EditEnquiry",
            "email": "TEST_editeq@example.com",
            "phone": "9999999998",
            "city": "Pune",
            "stage": "new",
            "source": "manual",
            "notes": ""
        })
        assert res.status_code == 200
        enq_id = res.json()["id"]

        # Update city
        put_res = session.put(f"{BASE_URL}/api/enquiries/{enq_id}", json={
            "student_name": "TEST_EditEnquiry Updated",
            "email": "TEST_editeq@example.com",
            "phone": "9999999998",
            "city": "Nagpur",
            "stage": "followup",
            "source": "website",
            "notes": "Updated notes"
        })
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["city"] == "Nagpur"
        assert data["student_name"] == "TEST_EditEnquiry Updated"

        # Cleanup
        session.delete(f"{BASE_URL}/api/enquiries/{enq_id}")


# --- PUT /api/academic/batches/:id ---
class TestBatchEdit:
    def test_edit_batch(self, session):
        # Get existing batches
        batches = session.get(f"{BASE_URL}/api/academic/batches").json()
        branches = session.get(f"{BASE_URL}/api/branches").json()
        courses = session.get(f"{BASE_URL}/api/courses").json()
        users = session.get(f"{BASE_URL}/api/users").json()
        teachers = [u for u in users if u["role"] in ["teacher", "admin"]]

        if not branches or not courses or not teachers:
            pytest.skip("Missing required data for batch creation")

        # Create a test batch
        res = session.post(f"{BASE_URL}/api/academic/batches", json={
            "name": "TEST_Batch4",
            "branch_id": branches[0]["id"],
            "course_id": courses[0]["id"],
            "teacher_id": teachers[0]["id"],
            "start_time": "09:00",
            "end_time": "11:00",
            "days": ["Mon", "Wed"]
        })
        assert res.status_code == 200
        batch_id = res.json()["id"]

        # Edit the batch
        put_res = session.put(f"{BASE_URL}/api/academic/batches/{batch_id}", json={
            "name": "TEST_Batch4_Updated",
            "days": ["Tue", "Thu", "Sat"]
        })
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["name"] == "TEST_Batch4_Updated"
        assert "Tue" in data["days"]

        # Cleanup
        session.delete(f"{BASE_URL}/api/academic/batches/{batch_id}")


# --- PUT /api/academic/schedule/:id ---
class TestScheduleEdit:
    def test_edit_schedule(self, session):
        sessions = session.get(f"{BASE_URL}/api/academic/schedule").json()
        branches = session.get(f"{BASE_URL}/api/branches").json()
        courses = session.get(f"{BASE_URL}/api/courses").json()
        users = session.get(f"{BASE_URL}/api/users").json()
        teachers = [u for u in users if u["role"] in ["teacher", "admin"]]

        if not branches or not courses or not teachers:
            pytest.skip("Missing required data for schedule creation")

        # Create a schedule
        res = session.post(f"{BASE_URL}/api/academic/schedule", json={
            "course_id": courses[0]["id"],
            "teacher_id": teachers[0]["id"],
            "room_id": "Room-A1",
            "branch_id": branches[0]["id"],
            "start_time": "2026-03-01T09:00:00",
            "end_time": "2026-03-01T11:00:00",
            "title": "TEST_Session"
        })
        assert res.status_code == 200
        sess_id = res.json()["id"]

        # Edit the session title
        put_res = session.put(f"{BASE_URL}/api/academic/schedule/{sess_id}", json={
            "title": "TEST_Session_Updated"
        })
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["title"] == "TEST_Session_Updated"

        # Cleanup
        session.delete(f"{BASE_URL}/api/academic/schedule/{sess_id}")


# --- Multi-batch onboarding ---
class TestMultiBatchOnboard:
    def test_onboard_student_multi_batch(self, session):
        branches = session.get(f"{BASE_URL}/api/branches").json()
        courses = session.get(f"{BASE_URL}/api/courses").json()
        users = session.get(f"{BASE_URL}/api/users").json()
        teachers = [u for u in users if u["role"] in ["teacher", "admin"]]

        if not branches or not courses or not teachers:
            pytest.skip("Missing required data")

        # Create two test batches
        b1 = session.post(f"{BASE_URL}/api/academic/batches", json={
            "name": "TEST_MB_Batch1", "branch_id": branches[0]["id"],
            "course_id": courses[0]["id"], "teacher_id": teachers[0]["id"],
            "start_time": "09:00", "end_time": "11:00", "days": ["Mon"]
        }).json()["id"]
        b2 = session.post(f"{BASE_URL}/api/academic/batches", json={
            "name": "TEST_MB_Batch2", "branch_id": branches[0]["id"],
            "course_id": courses[0]["id"], "teacher_id": teachers[0]["id"],
            "start_time": "12:00", "end_time": "14:00", "days": ["Wed"]
        }).json()["id"]

        # Create a student
        stu = session.post(f"{BASE_URL}/api/students", json={
            "name": "TEST_MultiStudent",
            "email": "TEST_multistudent4@example.com",
            "phone": "8888888888"
        })
        assert stu.status_code == 200
        stu_id = stu.json()["id"]

        # Onboard with multiple batch_ids
        onboard_res = session.post(f"{BASE_URL}/api/students/{stu_id}/onboard", json={
            "batch_ids": [b1, b2]
        })
        assert onboard_res.status_code == 200
        data = onboard_res.json()
        assert data["status"] == "active"
        assert data.get("batch_id") == b1  # primary batch
        assert b1 in data.get("batch_ids", [])
        assert b2 in data.get("batch_ids", [])

        # Cleanup
        session.delete(f"{BASE_URL}/api/academic/batches/{b1}")
        session.delete(f"{BASE_URL}/api/academic/batches/{b2}")

    def test_edit_branch(self, session):
        # Create a test branch
        res = session.post(f"{BASE_URL}/api/branches", json={"name": "TEST_Branch4", "location": "TEST Location"})
        assert res.status_code == 200
        branch_id = res.json()["id"]

        # Edit
        put_res = session.put(f"{BASE_URL}/api/branches/{branch_id}", json={
            "name": "TEST_Branch4_Updated",
            "location": "Updated Location"
        })
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["name"] == "TEST_Branch4_Updated"
        assert data["location"] == "Updated Location"

        # Cleanup
        session.delete(f"{BASE_URL}/api/branches/{branch_id}")
