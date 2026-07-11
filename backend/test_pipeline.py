import json
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User

client = TestClient(app)

def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    user = db.query(User).filter(User.username == "testuser").first()
    if not user:
        user = User(username="testuser", hashed_password="hashed")
        db.add(user)
        db.commit()
    db.close()

def run_test():
    setup_db()
    
    with TestClient(app) as client:
        # 2. Upload
        file_path = "../ecommerce_diagram.png"
        try:
            with open(file_path, "rb") as f:
                upload_res = client.post("/api/diagrams/upload", files={"file": ("ecommerce_diagram.png", f, "image/png")})
        except FileNotFoundError:
            print("Test file not found!")
            return
        
        print("Upload Res:", upload_res.status_code, upload_res.json())
        upload_id = upload_res.json().get("id")
        
        if not upload_id:
            print("Failed to get upload id")
            return
            
        # 3. Analyze
        print(f"Calling analyze for {upload_id}")
        analyze_res = client.post(f"/api/analyze/{upload_id}")
        print("Analyze Res:", analyze_res.status_code)
        
        if analyze_res.status_code == 200:
            print(json.dumps(analyze_res.json(), indent=2))
        else:
            print(analyze_res.text)

if __name__ == "__main__":
    from app.auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: User(id=1, username="testuser")
    run_test()
