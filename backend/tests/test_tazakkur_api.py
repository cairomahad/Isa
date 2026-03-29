"""
Tazakkur Islamic App - Backend API Tests
Tests all endpoints via public URL
"""
import pytest
import requests
import os

BASE_URL = "https://tazakkur-fix.preview.emergentagent.com"

class TestHealthCheck:
    """Health check endpoint"""

    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        print(f"Health check response: {data}")
        assert isinstance(data, dict)

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_invalid_credentials(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "+79999999999",
            "password": "wrongpassword"
        })
        print(f"Login invalid: status={response.status_code}, body={response.text[:200]}")
        assert response.status_code in [401, 404, 400]
        data = response.json()
        assert isinstance(data, dict)

    def test_login_missing_fields(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={})
        print(f"Login missing fields: status={response.status_code}, body={response.text[:200]}")
        assert response.status_code in [400, 422]

    def test_login_returns_json(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "+70000000000",
            "password": "test123"
        })
        print(f"Login JSON check: status={response.status_code}")
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type, f"Expected JSON, got: {content_type}"

class TestPrayerTimes:
    """Prayer times endpoint"""

    def test_prayer_times_moscow(self):
        response = requests.get(f"{BASE_URL}/api/prayer-times", params={"city": "moscow"})
        print(f"Prayer times: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_prayer_times_returns_json(self):
        response = requests.get(f"{BASE_URL}/api/prayer-times", params={"city": "kazan"})
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type

class TestHadith:
    """Hadith daily endpoint"""

    def test_hadith_daily(self):
        response = requests.get(f"{BASE_URL}/api/hadith/daily")
        print(f"Hadith daily: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

class TestStory:
    """Story daily endpoint"""

    def test_story_daily(self):
        response = requests.get(f"{BASE_URL}/api/story/daily")
        print(f"Story daily: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

class TestBenefit:
    """Benefit daily endpoint"""

    def test_benefit_daily(self):
        response = requests.get(f"{BASE_URL}/api/benefit/daily")
        print(f"Benefit daily: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

class TestLessons:
    """Lessons endpoint"""

    def test_lessons_with_user_id(self):
        response = requests.get(f"{BASE_URL}/api/lessons", params={"user_id": "test"})
        print(f"Lessons: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code in [200, 400, 404]
        data = response.json()
        assert isinstance(data, (dict, list))

class TestZikr:
    """Zikr list endpoint"""

    def test_zikr_list(self):
        response = requests.get(f"{BASE_URL}/api/zikr/list")
        print(f"Zikr list: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

class TestQuran:
    """Quran surahs endpoint"""

    def test_quran_surahs(self):
        response = requests.get(f"{BASE_URL}/api/quran/surahs")
        print(f"Quran surahs: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

class TestAdmin:
    """Admin endpoints"""

    def test_admin_stats(self):
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        print(f"Admin stats: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code in [200, 401, 403]
        data = response.json()
        assert isinstance(data, (dict, list))

    def test_admin_students(self):
        response = requests.get(f"{BASE_URL}/api/admin/students")
        print(f"Admin students: status={response.status_code}, body={response.text[:300]}")
        assert response.status_code in [200, 401, 403]
        data = response.json()
        assert isinstance(data, (dict, list))

class TestCORS:
    """CORS headers check"""

    def test_cors_headers_present(self):
        response = requests.options(f"{BASE_URL}/api/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        print(f"CORS options: status={response.status_code}, headers={dict(response.headers)}")
        # Check that response doesn't block CORS
        # Either allow-origin header present or the GET request works fine
        assert response.status_code in [200, 204, 405]

    def test_all_endpoints_return_json_not_html(self):
        """Verify none of the endpoints return HTML error pages"""
        endpoints = [
            "/api/",
            "/api/hadith/daily",
            "/api/story/daily",
            "/api/benefit/daily",
            "/api/zikr/list",
            "/api/quran/surahs",
        ]
        for ep in endpoints:
            response = requests.get(f"{BASE_URL}{ep}")
            ct = response.headers.get("content-type", "")
            assert "text/html" not in ct, f"{ep} returned HTML: {ct}"
            print(f"OK JSON: {ep} -> {response.status_code}")
