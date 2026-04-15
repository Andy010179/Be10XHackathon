"""Tests for Twilio settings API endpoints"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_cookies():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@edutech.com", "password": "admin123", "institute_code": "DEFAULT"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.cookies

class TestTwilioSettings:
    """Twilio settings CRUD tests"""

    def test_get_twilio_default(self, auth_cookies):
        resp = requests.get(f"{BASE_URL}/api/settings/twilio", cookies=auth_cookies)
        assert resp.status_code == 200
        data = resp.json()
        assert "account_sid" in data
        assert "phone_number" in data
        assert "has_auth_token" in data
        assert "configured" in data
        assert "source" in data
        print(f"Default twilio config: {data}")

    def test_post_twilio_save(self, auth_cookies):
        payload = {
            "account_sid": "TEST_ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "auth_token": "TEST_auth_token_xxx",
            "phone_number": "+15551234567"
        }
        resp = requests.post(f"{BASE_URL}/api/settings/twilio", json=payload, cookies=auth_cookies)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("configured") is True
        print(f"Save response: {data}")

    def test_get_twilio_after_save(self, auth_cookies):
        resp = requests.get(f"{BASE_URL}/api/settings/twilio", cookies=auth_cookies)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("account_sid") == "TEST_ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        assert data.get("phone_number") == "+15551234567"
        assert data.get("has_auth_token") is True
        assert data.get("configured") is True
        assert data.get("source") == "database"
        print(f"After save: {data}")

    def test_twilio_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/settings/twilio")
        assert resp.status_code in [401, 403]
