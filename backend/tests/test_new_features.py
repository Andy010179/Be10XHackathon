import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://skill-academy-77.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@edutech.com", "password": "admin123"})
    assert r.status_code == 200
    return s

# WhatsApp webhook tests
class TestWhatsAppWebhook:
    def test_webhook_get_verification(self):
        params = {"hub.mode": "subscribe", "hub.verify_token": "edutech-whatsapp-verify-2024", "hub.challenge": "testchallenge123"}
        r = requests.get(f"{BASE_URL}/api/webhooks/whatsapp", params=params)
        assert r.status_code == 200
        assert "testchallenge123" in r.text
        print(f"PASS: {r.text}")

    def test_webhook_get_wrong_token(self):
        params = {"hub.mode": "subscribe", "hub.verify_token": "wrong-token", "hub.challenge": "test"}
        r = requests.get(f"{BASE_URL}/api/webhooks/whatsapp", params=params)
        assert r.status_code == 403

    def test_webhook_post_meta_format(self):
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{"id": "123", "changes": [{"value": {
                "messaging_product": "whatsapp",
                "contacts": [{"profile": {"name": "Test Lead"}, "wa_id": "919876543210"}],
                "messages": [{"from": "919876543210", "text": {"body": "Hi interested"}, "type": "text", "id": "msg1", "timestamp": "1234567890"}]
            }, "field": "messages"}]}]
        }
        r = requests.post(f"{BASE_URL}/api/webhooks/whatsapp", json=payload)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

class TestSettingsAPI:
    def test_get_razorpay_settings(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/settings/razorpay")
        assert r.status_code == 200
        data = r.json()
        assert "configured" in data or "key_id" in data
        print(f"PASS: {data}")

    def test_save_razorpay_settings(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/settings/razorpay",
                              json={"key_id": "rzp_test_demokey123", "key_secret": "secret_demo456"})
        assert r.status_code == 200
        print(f"PASS: {r.json()}")

    def test_get_razorpay_settings_after_save(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/settings/razorpay")
        assert r.status_code == 200
        data = r.json()
        assert data.get("key_id") == "rzp_test_demokey123"
        print(f"PASS: key persisted: {data}")

    def test_get_whatsapp_webhook_info(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/settings/whatsapp-webhook")
        assert r.status_code == 200
        data = r.json()
        assert "webhook_url" in data
        assert "verify_token" in data
        assert data["verify_token"] == "edutech-whatsapp-verify-2024"

class TestAttendanceReport:
    def test_batch_report_returns_list(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/teacher/batch-report")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: {len(data)} students")

    def test_batch_report_has_attendance_pct(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/teacher/batch-report")
        data = r.json()
        if len(data) > 0:
            assert "attendance_pct" in data[0]
            print(f"PASS: attendance_pct={data[0]['attendance_pct']}")

class TestCertificatePDF:
    def test_pdf_cert_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/portal/certificate/pdf")
        assert r.status_code in [401, 403]
