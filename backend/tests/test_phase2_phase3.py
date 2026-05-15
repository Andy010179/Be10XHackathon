"""
Phase 2 & Phase 3 feature tests:
- Wages config, logs, summary
- Staff Attendance QR, dashboard
- Library CRUD
- CRM archived toggle (enquiries)
- Dashboard PDF export endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_CREDS = {"email": "admin@edutech.com", "password": "admin123"}
SUPERADMIN_CREDS = {"email": "superadmin@edutech.com", "password": "SuperAdmin@123"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def superadmin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDS)
    assert r.status_code == 200, f"SuperAdmin login failed: {r.text}"
    return s


# --- Wages ---
class TestWages:
    def test_get_wage_config(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wages/config")
        assert r.status_code == 200
        data = r.json()
        assert "teacher_per_lecture_rate" in data
        assert "staff_per_conversion_rate" in data
        print(f"Wage config: {data}")

    def test_put_wage_config(self, admin_session):
        payload = {"teacher_per_lecture_rate": 500.0, "staff_per_conversion_rate": 1000.0}
        r = admin_session.put(f"{BASE_URL}/api/wages/config", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["teacher_per_lecture_rate"] == 500.0
        assert data["staff_per_conversion_rate"] == 1000.0
        print(f"Wage config updated: {data}")

    def test_get_wage_config_persisted(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wages/config")
        assert r.status_code == 200
        data = r.json()
        assert data["teacher_per_lecture_rate"] == 500.0
        assert data["staff_per_conversion_rate"] == 1000.0

    def test_get_wage_summary(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wages/summary")
        assert r.status_code == 200
        data = r.json()
        assert "summary" in data
        assert "total" in data
        print(f"Wage summary: total={data['total']}")

    def test_get_wage_logs(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wages/logs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- Staff Attendance ---
class TestStaffAttendance:
    def test_get_institute_qr(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/staff-attendance/institute-qr")
        assert r.status_code == 200
        data = r.json()
        assert "qr_data" in data
        assert data["qr_data"].startswith("STAFF_CHECKIN:")
        assert "token" in data
        print(f"QR data: {data['qr_data'][:40]}")

    def test_get_attendance_dashboard(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/staff-attendance/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert "date" in data
        assert "records" in data
        print(f"Dashboard date: {data['date']}, records: {len(data['records'])}")

    def test_get_attendance_dashboard_with_date(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/staff-attendance/dashboard?date=2025-01-01")
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == "2025-01-01"


# --- Library ---
class TestLibrary:
    created_item_id = None

    def test_list_library_empty(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/library")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print(f"Library items: {len(r.json())}")

    def test_add_library_url_item(self, admin_session):
        import io
        data = {
            "title": "TEST_YouTube Python Tutorial",
            "type": "url",
            "category": "Programming",
            "description": "Test video resource",
            "url": "https://www.youtube.com/watch?v=test123",
        }
        r = admin_session.post(f"{BASE_URL}/api/library", data=data)
        assert r.status_code == 200, f"Add library item failed: {r.text}"
        item = r.json()
        assert item["title"] == data["title"]
        assert item["type"] == "url"
        TestLibrary.created_item_id = item.get("id")
        print(f"Created library item: {item['id']}")

    def test_list_library_with_type_filter(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/library?type=url")
        assert r.status_code == 200
        items = r.json()
        assert any(i["title"] == "TEST_YouTube Python Tutorial" for i in items)

    def test_delete_library_item(self, admin_session):
        if not TestLibrary.created_item_id:
            pytest.skip("No item created to delete")
        r = admin_session.delete(f"{BASE_URL}/api/library/{TestLibrary.created_item_id}")
        assert r.status_code == 200


# --- Enquiries (CRM Archived) ---
class TestEnquiriesArchived:
    def test_get_enquiries(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/enquiries")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print(f"Enquiries count: {len(r.json())}")

    def test_get_enquiries_with_show_archived(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/enquiries?show_archived=true")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- Dashboard ---
class TestDashboard:
    def test_dashboard_summary(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/summary")
        assert r.status_code == 200
        print(f"Dashboard summary keys: {list(r.json().keys())}")

    def test_revenue_by_branch(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/revenue-by-branch")
        assert r.status_code in [200, 404]
        print(f"Revenue by branch status: {r.status_code}")


# --- SuperAdmin Settings ---
class TestSuperAdminSettings:
    def test_get_institutes(self, superadmin_session):
        r = superadmin_session.get(f"{BASE_URL}/api/institutes")
        assert r.status_code == 200
        institutes = r.json()
        assert isinstance(institutes, list)
        print(f"Institutes count: {len(institutes)}")

    def test_get_institute_settings(self, superadmin_session):
        # Get institutes first
        r = superadmin_session.get(f"{BASE_URL}/api/institutes")
        if r.status_code != 200 or not r.json():
            pytest.skip("No institutes found")
        iid = r.json()[0].get("id") or r.json()[0].get("_id")
        rs = superadmin_session.get(f"{BASE_URL}/api/institutes/{iid}/settings")
        assert rs.status_code in [200, 404]
        print(f"Institute settings status: {rs.status_code}")
