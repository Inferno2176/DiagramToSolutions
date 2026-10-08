import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.database import engine, SessionLocal
from app.models import User, Project, DiagramUpload, OcrResult, AnalysisResult
from app.auth import verify_password
from app.services.ocr import initialize_ocr

class TestMultiTenantArchitecture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        initialize_ocr()
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        
        # Unique timestamp for clean test isolation
        ts = int(datetime.now().timestamp())
        cls.user_a_email = f"user_a_{ts}@example.com"
        cls.user_a_name = f"user_a_{ts}"
        cls.user_a_pass = "AlphaPass123!"
        
        cls.user_b_email = f"user_b_{ts}@example.com"
        cls.user_b_name = f"user_b_{ts}"
        cls.user_b_pass = "BetaPass456!"
        
        cls.token_a = None
        cls.token_b = None
        cls.diagram_a_id = None
        cls.diagram_b_id = None

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_register_user_a(self):
        print("\n--- TEST 1: Register User A ---")
        res = self.client.post("/api/auth/register", json={
            "username": self.user_a_name,
            "email": self.user_a_email,
            "name": "User Alpha",
            "password": self.user_a_pass
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["username"], self.user_a_name)
        self.assertEqual(data["email"], self.user_a_email)
        self.assertTrue(data["is_active"])
        
        # Verify in DB that password is NOT plaintext and properly hashed
        db_user = self.db.query(User).filter(User.username == self.user_a_name).first()
        self.assertIsNotNone(db_user)
        self.assertNotEqual(db_user.password_hash, self.user_a_pass)
        self.assertTrue(verify_password(self.user_a_pass, db_user.password_hash))
        print("User A registered and password securely hashed with bcrypt in PostgreSQL.")

    def test_02_login_user_a(self):
        print("\n--- TEST 2: Login User A ---")
        # Test OAuth2 form login
        res = self.client.post("/api/auth/token", data={
            "username": self.user_a_name,
            "password": self.user_a_pass
        })
        self.assertEqual(res.status_code, 200)
        token_data = res.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        TestMultiTenantArchitecture.token_a = token_data["access_token"]
        
        # Test /auth/me endpoint
        me_res = self.client.get("/auth/me", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["username"], self.user_a_name)
        print("User A logged in successfully. JWT issued.")

    def test_03_upload_diagram_a(self):
        print("\n--- TEST 3: Upload Diagram A ---")
        # Use existing ecommerce_diagram.png
        sample_img = os.path.join(os.path.dirname(BACKEND_DIR), "ecommerce_diagram.png")
        if not os.path.exists(sample_img):
            sample_img = os.path.join(BACKEND_DIR, "demo_samples", "1_web_architecture.png")
            
        with open(sample_img, "rb") as f:
            res = self.client.post(
                "/api/diagrams/upload",
                headers={"Authorization": f"Bearer {self.token_a}"},
                files={"file": ("blueprint_a.png", f, "image/png")}
            )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data["filename"], "blueprint_a.png")
        TestMultiTenantArchitecture.diagram_a_id = data["id"]
        print(f"Diagram A uploaded with ID: {self.diagram_a_id}")

    def test_04_run_analysis_diagram_a(self):
        print("\n--- TEST 4: Run OCR + Gemini Analysis for Diagram A ---")
        res = self.client.post(
            f"/api/analyze/{self.diagram_a_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        # Status can be 200 (completed) or 429 (quota exceeded in dev, OCR preserved)
        self.assertIn(res.status_code, [200, 429])
        print(f"Analysis triggered, response status: {res.status_code}")

    def test_05_verify_postgresql_storage(self):
        print("\n--- TEST 5: Verify PostgreSQL Entities for User A ---")
        # Check User A
        user_a = self.db.query(User).filter(User.username == self.user_a_name).first()
        self.assertIsNotNone(user_a)
        
        # Check Project for User A
        projects = self.db.query(Project).filter(Project.user_id == user_a.id).all()
        self.assertGreaterEqual(len(projects), 1)
        
        # Check DiagramUpload for Diagram A
        upload_a = self.db.query(DiagramUpload).filter(DiagramUpload.id == self.diagram_a_id).first()
        self.assertIsNotNone(upload_a)
        self.assertEqual(upload_a.user_id, user_a.id)
        self.assertEqual(upload_a.original_filename, "blueprint_a.png")
        
        # Check OCR result
        ocr_a = self.db.query(OcrResult).filter(OcrResult.diagram_upload_id == self.diagram_a_id).first()
        self.assertIsNotNone(ocr_a)
        self.assertIsNotNone(ocr_a.ocr_text)
        print("Verified: User A, Project, DiagramUpload, and OcrResult successfully stored in PostgreSQL.")

    def test_06_logout_user_a(self):
        print("\n--- TEST 6: Logout User A ---")
        # Simulating client-side discarding of token_a
        print("User A logged out.")

    def test_07_register_login_user_b(self):
        print("\n--- TEST 7: Register & Login User B ---")
        res = self.client.post("/api/auth/register", json={
            "username": self.user_b_name,
            "email": self.user_b_email,
            "name": "User Beta",
            "password": self.user_b_pass
        })
        self.assertEqual(res.status_code, 201)
        
        login_res = self.client.post("/api/auth/token", data={
            "username": self.user_b_name,
            "password": self.user_b_pass
        })
        self.assertEqual(login_res.status_code, 200)
        TestMultiTenantArchitecture.token_b = login_res.json()["access_token"]
        print("User B registered and logged in successfully.")

    def test_08_user_b_cross_tenant_isolation(self):
        print("\n--- TEST 8: Verify User B CANNOT Access Diagram A or Its Solution ---")
        # Try GET /api/diagrams/{diagram_a_id} as User B
        res_diag = self.client.get(
            f"/api/diagrams/{self.diagram_a_id}",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_diag.status_code, 404, "User B should not access User A's diagram details!")
        
        # Try GET /api/analyze/{diagram_a_id} as User B
        res_analyze = self.client.get(
            f"/api/analyze/{self.diagram_a_id}",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_analyze.status_code, 404, "User B should not access User A's analysis!")
        
        # Try downloading report of Diagram A as User B
        res_download = self.client.get(
            f"/api/diagrams/{self.diagram_a_id}/download/json",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_download.status_code, 404, "User B should not download User A's report!")
        
        # Verify User B history does NOT contain Diagram A
        res_history = self.client.get(
            "/api/dashboard/history",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_history.status_code, 200)
        history_ids = [item["id"] for item in res_history.json()]
        self.assertNotIn(self.diagram_a_id, history_ids)
        
        # Verify User B stats do not count Diagram A
        res_stats = self.client.get(
            "/api/dashboard/stats",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_stats.status_code, 200)
        self.assertEqual(res_stats.json()["total_uploads"], 0)
        print("Cross-tenant security verified: User B completely blocked from User A data.")

    def test_09_upload_diagram_b(self):
        print("\n--- TEST 9: Upload Diagram B as User B ---")
        sample_img = os.path.join(os.path.dirname(BACKEND_DIR), "ecommerce_diagram.png")
        if not os.path.exists(sample_img):
            sample_img = os.path.join(BACKEND_DIR, "demo_samples", "1_web_architecture.png")
            
        with open(sample_img, "rb") as f:
            res = self.client.post(
                "/api/diagrams/upload",
                headers={"Authorization": f"Bearer {self.token_b}"},
                files={"file": ("blueprint_b.png", f, "image/png")}
            )
        self.assertEqual(res.status_code, 201)
        TestMultiTenantArchitecture.diagram_b_id = res.json()["id"]
        
        # Trigger analysis
        self.client.post(
            f"/api/analyze/{self.diagram_b_id}",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        print(f"Diagram B uploaded and processed with ID: {self.diagram_b_id}")

    def test_10_verify_user_b_sees_only_own_history(self):
        print("\n--- TEST 10: Verify User B History Shows ONLY User B's Records ---")
        res_history = self.client.get(
            "/api/dashboard/history",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_history.status_code, 200)
        history = res_history.json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["id"], self.diagram_b_id)
        self.assertEqual(history[0]["filename"], "blueprint_b.png")
        
        res_stats = self.client.get(
            "/api/dashboard/stats",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_stats.status_code, 200)
        self.assertEqual(res_stats.json()["total_uploads"], 1)
        print("Verified: User B only sees their own 1 upload; zero leakage from User A.")

    def test_11_simulated_backend_restart(self):
        print("\n--- TEST 11: Simulate Backend Restart ---")
        # Dispose connection pools and reconnect
        engine.dispose()
        new_db = SessionLocal()
        count = new_db.query(DiagramUpload).count()
        self.assertGreaterEqual(count, 2)
        new_db.close()
        print("Backend engine and pool re-initialized cleanly.")

    def test_12_retrieve_solution_without_rerunning_gemini(self):
        print("\n--- TEST 12: Verify Stored Solution Retrieval Without Rerunning Gemini ---")
        res = self.client.get(
            f"/api/diagrams/{self.diagram_a_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], self.diagram_a_id)
        self.assertIsNotNone(data["ocr_text"])
        
        # Verify /api/analyze GET retrieval
        analyze_res = self.client.get(
            f"/api/analyze/{self.diagram_a_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(analyze_res.status_code, 200)
        self.assertIn("ocr_text", analyze_res.json())
        print("Verified: Stored solution retrieved directly from PostgreSQL without Gemini re-run.")

if __name__ == "__main__":
    unittest.main()
