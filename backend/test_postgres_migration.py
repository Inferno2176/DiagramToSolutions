import os
import unittest
import json
from datetime import datetime, timezone
from app.models import Base, User, Diagram
from migrate_sqlite_to_postgres import json_equal

class TestPostgresMigrationUnit(unittest.TestCase):

    def test_json_equal_identical(self):
        d1 = {"summary": {"name": "Test"}, "tech_stack": ["FastAPI", "PostgreSQL"]}
        d2 = {"tech_stack": ["FastAPI", "PostgreSQL"], "summary": {"name": "Test"}}
        self.assertTrue(json_equal(d1, d2))

    def test_json_equal_none(self):
        self.assertTrue(json_equal(None, None))
        self.assertFalse(json_equal({"key": "value"}, None))
        self.assertFalse(json_equal(None, {"key": "value"}))

    def test_json_equal_mismatch(self):
        d1 = {"a": 1, "b": 2}
        d2 = {"a": 1, "b": 3}
        self.assertFalse(json_equal(d1, d2))

    def test_model_schema_compatibility(self):
        # Verify User and Diagram models have all required fields
        user = User(id=1, username="test_user", hashed_password="pwd")
        self.assertEqual(user.id, 1)
        self.assertEqual(user.username, "test_user")

        diagram = Diagram(
            id="test-uuid-1234",
            user_id=1,
            filename="diagram.png",
            file_path="/path/to/file",
            status="completed",
            ocr_text="FastAPI Postgres",
            ocr_json={"detected": ["FastAPI"]},
            analysis_json={"summary": {"architecture_name": "Test"}}
        )
        self.assertEqual(diagram.id, "test-uuid-1234")
        self.assertEqual(diagram.user_id, 1)
        self.assertEqual(diagram.ocr_json, {"detected": ["FastAPI"]})

if __name__ == "__main__":
    unittest.main()
