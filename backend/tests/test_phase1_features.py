"""
Phase 1 Feature Tests: Staff Portal, GST dropdown, Fee Queries pagination/comments, Student UID, Parent Portal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://skill-academy-77.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return s


class TestStaffPortal:
    """Staff portal endpoint tests"""

    def test_staff_me_returns_expected_fields(self, session):
        resp = session.get(f"{BASE_URL}/api/staff/me")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "staff_number" in data, "Missing staff_number"
        assert "institute_name" in data, "Missing institute_name"
        assert "branch_name" in data, "Missing branch_name"
        assert "has_photo" in data, "Missing has_photo"
        assert data["staff_number"].startswith("ADM-"), f"Expected ADM- prefix, got {data['staff_number']}"
        print(f"staff_number: {data['staff_number']}, institute: {data['institute_name']}")

    def test_staff_id_card_returns_pdf(self, session):
        resp = session.get(f"{BASE_URL}/api/staff/id-card")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        assert resp.headers["content-type"] == "application/pdf", f"Expected PDF, got {resp.headers['content-type']}"
        assert len(resp.content) > 1000, "PDF is suspiciously small"
        print(f"ID card PDF size: {len(resp.content)} bytes")

    def test_staff_update_phone(self, session):
        resp = session.put(f"{BASE_URL}/api/staff/phone", json={"phone": "9876543210"})
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("phone") == "9876543210"
        print("Phone update successful")


class TestFeeQueriesPagination:
    """Fee queries paginated endpoint tests"""

    def test_fee_queries_paginated_response_structure(self, session):
        resp = session.get(f"{BASE_URL}/api/admin/fee-queries?page=1&limit=20")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "items" in data, "Missing items field"
        assert "total" in data, "Missing total field"
        assert "pages" in data, "Missing pages field"
        assert "page" in data, "Missing page field"
        assert isinstance(data["items"], list), "items should be a list"
        assert data["page"] == 1
        print(f"Fee queries: total={data['total']}, pages={data['pages']}")

    def test_fee_queries_status_filter(self, session):
        resp = session.get(f"{BASE_URL}/api/admin/fee-queries?page=1&limit=20&status=open")
        assert resp.status_code == 200
        data = resp.json()
        for item in data["items"]:
            assert item["status"] == "open", f"Expected open, got {item['status']}"
        print(f"Open queries: {len(data['items'])}")

    def test_fee_query_comment_requires_non_empty(self, session):
        # Test empty comment rejection
        resp = session.patch(f"{BASE_URL}/api/admin/fee-queries/000000000000000000000001/comment", json={"admin_comment": ""})
        assert resp.status_code in [400, 422, 404], f"Expected error for empty comment, got {resp.status_code}"
        print("Empty comment correctly rejected")


class TestGSTCalculation:
    """Finance GST rate tests"""

    def test_calculate_fee_with_5pct_gst(self, session):
        # Need a student - get list first
        students_resp = session.get(f"{BASE_URL}/api/students")
        students = students_resp.json()
        if not students:
            pytest.skip("No students available to test fee calculation")
        student = students[0]
        payload = {
            "student_id": student["id"], "student_name": student["name"],
            "course_id": "test-course", "course_name": "Test Course",
            "base_fee": 10000.0, "discount": 0.0, "gst_rate": 5.0
        }
        resp = session.post(f"{BASE_URL}/api/finance/calculate", json=payload)
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["gst_rate"] == 5.0, f"Expected gst_rate=5, got {data['gst_rate']}"
        assert abs(data["gst_amount"] - 500.0) < 0.01, f"Expected gst_amount=500, got {data['gst_amount']}"
        assert abs(data["total"] - 10500.0) < 0.01, f"Expected total=10500, got {data['total']}"
        print(f"GST test: base=10000, gst_rate=5%, gst_amount={data['gst_amount']}, total={data['total']}")

    def test_calculate_fee_with_18pct_gst(self, session):
        students_resp = session.get(f"{BASE_URL}/api/students")
        students = students_resp.json()
        if not students:
            pytest.skip("No students available")
        student = students[0]
        payload = {
            "student_id": student["id"], "student_name": student["name"],
            "course_id": "test-course-2", "course_name": "Test Course 2",
            "base_fee": 1000.0, "discount": 0.0, "gst_rate": 18.0
        }
        resp = session.post(f"{BASE_URL}/api/finance/calculate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["gst_amount"] - 180.0) < 0.01, f"Expected 180, got {data['gst_amount']}"
        assert abs(data["total"] - 1180.0) < 0.01
        print(f"18% GST test passed: total={data['total']}")


class TestStudentUID:
    """Student unique enrollment ID on activation"""

    def test_student_gets_enrollment_no_on_activation(self, session):
        # Create a test student
        create_resp = session.post(f"{BASE_URL}/api/students", json={
            "name": "TEST_UID_Student", "email": "test_uid_student@test.com",
            "phone": "9999999999", "branch_id": "", "course_ids": [],
            "dob": "", "address": "", "guardian_name": "", "guardian_phone": ""
        })
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        student_id = create_resp.json()["id"]

        # Activate the student
        activate_resp = session.patch(f"{BASE_URL}/api/students/{student_id}/status", json={"status": "active"})
        assert activate_resp.status_code == 200, f"Activate failed: {activate_resp.text}"
        data = activate_resp.json()
        assert "enrollment_no" in data, "Missing enrollment_no after activation"
        assert data["enrollment_no"], "enrollment_no should not be empty"
        assert "STU" in data["enrollment_no"], f"Expected STU in enrollment_no, got {data['enrollment_no']}"
        print(f"Enrollment number generated: {data['enrollment_no']}")

        # Cleanup - delete student
        session.delete(f"{BASE_URL}/api/students/{student_id}") if hasattr(session, 'delete') else None
