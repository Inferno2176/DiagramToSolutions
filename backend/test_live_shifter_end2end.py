import requests
import json
import os

BASE_URL = "http://localhost:8000"

def test_live_shifter():
    print("=== Testing Live Agent Model Shifter Pipeline ===")
    
    # 1. Register / Login test user
    username = "live_test_user"
    password = "password123"
    
    # Try login first
    login_res = requests.post(
        f"{BASE_URL}/api/auth/token",
        data={"username": username, "password": password}
    )
    
    if login_res.status_code != 200:
        # Register
        reg_res = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": password}
        )
        print("Register Status:", reg_res.status_code)
        
        login_res = requests.post(
            f"{BASE_URL}/api/auth/token",
            data={"username": username, "password": password}
        )
        
    print("Login Status:", login_res.status_code)
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload Diagram
    diagram_path = "../ecommerce_diagram.png"
    if not os.path.exists(diagram_path):
        diagram_path = "ecommerce_diagram.png"
        
    print(f"Uploading file: {diagram_path}")
    with open(diagram_path, "rb") as f:
        upload_res = requests.post(
            f"{BASE_URL}/api/diagrams/upload",
            headers=headers,
            files={"file": ("ecommerce_diagram.png", f, "image/png")}
        )
        
    print("Upload Status:", upload_res.status_code)
    upload_data = upload_res.json()
    upload_id = upload_data.get("id")
    print("Uploaded Diagram ID:", upload_id)
    
    # 3. Call Analyze (Triggers AgentModelShifter)
    print(f"\n--- Triggering /api/analyze/{upload_id} ---")
    analyze_res = requests.post(
        f"{BASE_URL}/api/analyze/{upload_id}",
        headers=headers
    )
    
    print("Analyze HTTP Status Code:", analyze_res.status_code)
    try:
        res_json = analyze_res.json()
        print("\nResponse Body Preview:")
        print(json.dumps(res_json, indent=2)[:1000] + "...")
        
        if "analysis" in res_json and "model_execution_info" in res_json["analysis"]:
            info = res_json["analysis"]["model_execution_info"]
            print("\n=== Model Execution Metadata ===")
            print("Initial Provider:", info.get("initial_provider"))
            print("Initial Model:", info.get("initial_model"))
            print("Final Provider:", info.get("final_provider"))
            print("Final Model:", info.get("final_model"))
            print("Switch Count:", info.get("switch_count"))
            print("Switch History:", info.get("switch_history"))
    except Exception as e:
        print("Raw Response Output:", analyze_res.text)

if __name__ == "__main__":
    test_live_shifter()
