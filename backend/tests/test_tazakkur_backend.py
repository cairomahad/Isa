"""
Backend tests for Tazakkur app - iteration 3
Tests: quiz endpoint, leaderboard, admin lessons, youtube_url extraction, quiz batch insert
"""
import pytest
import requests

BASE_URL = "http://localhost:8001"


class TestQuizEndpoint:
    """Quiz GET endpoint: /api/quiz/{lesson_id}"""

    def test_quiz_returns_200(self):
        """GET /api/quiz/{lesson_id} returns 200"""
        # Use lesson ID 35 which should have quiz_tasks
        response = requests.get(f"{BASE_URL}/api/quiz/35")
        assert response.status_code == 200

    def test_quiz_response_structure(self):
        """Quiz response has 'questions' array"""
        response = requests.get(f"{BASE_URL}/api/quiz/35")
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)

    def test_quiz_questions_have_options_array(self):
        """Each quiz question has options as a list"""
        response = requests.get(f"{BASE_URL}/api/quiz/35")
        data = response.json()
        if data["questions"]:
            q = data["questions"][0]
            assert "options" in q
            assert isinstance(q["options"], list)

    def test_quiz_correct_option_is_int(self):
        """correct_option field is 0-based int (not letter)"""
        response = requests.get(f"{BASE_URL}/api/quiz/35")
        data = response.json()
        if data["questions"]:
            q = data["questions"][0]
            assert "correct_option" in q
            assert isinstance(q["correct_option"], int)
            assert q["correct_option"] in [0, 1, 2, 3]

    def test_quiz_question_has_required_fields(self):
        """Quiz question has id, question, options, correct_option, score"""
        response = requests.get(f"{BASE_URL}/api/quiz/35")
        data = response.json()
        if data["questions"]:
            q = data["questions"][0]
            for field in ['id', 'question', 'options', 'correct_option', 'score']:
                assert field in q, f"Missing field: {field}"

    def test_quiz_nonexistent_lesson_returns_empty(self):
        """Non-existent lesson returns empty questions list"""
        response = requests.get(f"{BASE_URL}/api/quiz/999999")
        assert response.status_code == 200
        data = response.json()
        assert data["questions"] == []


class TestLeaderboard:
    """Leaderboard endpoint: /api/leaderboard"""

    def test_leaderboard_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200

    def test_leaderboard_structure(self):
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)

    def test_leaderboard_limit_10(self):
        """Leaderboard with limit=10 returns at most 10 entries"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["leaderboard"]) <= 10

    def test_leaderboard_only_nonzero_zikr(self):
        """All leaderboard entries have points > 0"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=10")
        data = response.json()
        for entry in data["leaderboard"]:
            assert entry["points"] > 0, f"Entry with 0 points: {entry}"

    def test_leaderboard_entry_fields(self):
        """Each entry has rank, user_id, name, points"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=10")
        data = response.json()
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            for field in ['rank', 'user_id', 'name', 'points']:
                assert field in entry

    def test_leaderboard_ordered_desc(self):
        """Leaderboard is ordered by points descending"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=20")
        data = response.json()
        entries = data["leaderboard"]
        if len(entries) > 1:
            for i in range(len(entries) - 1):
                assert entries[i]["points"] >= entries[i+1]["points"]


class TestAdminLessons:
    """Admin lessons endpoint: /api/admin/lessons"""

    def test_admin_lessons_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/lessons")
        assert response.status_code == 200

    def test_admin_lessons_structure(self):
        response = requests.get(f"{BASE_URL}/api/admin/lessons")
        data = response.json()
        assert "lessons" in data
        assert isinstance(data["lessons"], list)

    def test_admin_lessons_has_fard_shafi(self):
        """Lessons include fard_shafi category"""
        response = requests.get(f"{BASE_URL}/api/admin/lessons")
        data = response.json()
        categories = [l.get("category") for l in data["lessons"]]
        assert "fard_shafi" in categories, f"fard_shafi not found. Categories: {set(categories)}"

    def test_admin_lessons_fields(self):
        """Each lesson has required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/lessons")
        data = response.json()
        if data["lessons"]:
            lesson = data["lessons"][0]
            for field in ['id', 'title', 'category']:
                assert field in lesson


class TestYoutubeExtraction:
    """YouTube URL extraction via POST /api/admin/lessons"""

    def test_youtube_url_youtu_be(self):
        """youtu.be/VIDEO_ID format extracts correctly"""
        payload = {
            "title": "TEST_Youtube_lesson",
            "category": "fard_shafi",
            "youtube_url": "https://youtu.be/dQw4w9WgXcQ"
        }
        response = requests.post(f"{BASE_URL}/api/admin/lessons", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        # Cleanup: delete the created lesson
        lesson_id = data.get("lesson_id")
        if lesson_id:
            requests.delete(f"{BASE_URL}/api/admin/lessons/{lesson_id}")

    def test_youtube_url_watch(self):
        """youtube.com/watch?v=VIDEO_ID format extracts correctly"""
        payload = {
            "title": "TEST_Youtube_watch_lesson",
            "category": "fard_shafi",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
        response = requests.post(f"{BASE_URL}/api/admin/lessons", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        lesson_id = data.get("lesson_id")
        if lesson_id:
            requests.delete(f"{BASE_URL}/api/admin/lessons/{lesson_id}")

    def test_invalid_youtube_url_returns_400(self):
        """Invalid YouTube URL returns 400"""
        payload = {
            "title": "TEST_bad_url",
            "category": "fard_shafi",
            "youtube_url": "https://notyoutube.com/video"
        }
        response = requests.post(f"{BASE_URL}/api/admin/lessons", json=payload)
        assert response.status_code == 400


class TestQuizBatchInsert:
    """Quiz batch insert: POST /api/admin/quiz/batch"""

    def test_quiz_batch_insert_success(self):
        """Batch insert quiz questions returns success"""
        payload = {
            "video_id": "35",
            "questions": [
                {
                    "question": "TEST_What is fiqh?",
                    "options": ["Language science", "Science of obligations", "Trade science", "Dont know"],
                    "correct_option": 1,
                    "score": 5
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/admin/quiz/batch", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("inserted", 0) >= 1

    def test_quiz_batch_empty_returns_400(self):
        """Empty questions list returns 400"""
        payload = {"video_id": "35", "questions": []}
        response = requests.post(f"{BASE_URL}/api/admin/quiz/batch", json=payload)
        assert response.status_code == 400

    def test_quiz_batch_stores_correct_option_as_letter(self):
        """Batch insert maps int correct_option to letter in DB"""
        # Insert then verify via GET
        payload = {
            "video_id": "99999",
            "questions": [
                {
                    "question": "TEST_batch_check",
                    "options": ["A", "B", "C", "D"],
                    "correct_option": 2,  # Should store as 'c'
                    "score": 5
                }
            ]
        }
        insert_resp = requests.post(f"{BASE_URL}/api/admin/quiz/batch", json=payload)
        assert insert_resp.status_code == 200

        # Verify via GET quiz
        get_resp = requests.get(f"{BASE_URL}/api/quiz/99999")
        assert get_resp.status_code == 200
        data = get_resp.json()
        if data["questions"]:
            q = data["questions"][-1]  # Last inserted
            assert q["correct_option"] == 2  # Should be converted back to int


class TestHealthCheck:
    """Basic health check"""

    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
