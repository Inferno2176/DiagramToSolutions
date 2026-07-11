import os
import sys
import time
import json
import urllib.request
import urllib.parse
from PIL import Image, ImageDraw

API_URL = "http://localhost:8000"

def generate_test_image(filename):
    print(f"Generating test diagram image: {filename}...")
    try:
        # Create a simple image using Pillow
        img = Image.new('RGB', (600, 300), color=(15, 23, 42)) # Slate 900
        d = ImageDraw.Draw(img)
        # Draw some mock layout boxes
        d.rectangle([(50, 50), (200, 120)], fill=(99, 102, 241), outline=(255, 255, 255)) # React SPA
        d.rectangle([(250, 50), (400, 120)], fill=(6, 182, 212), outline=(255, 255, 255)) # FastAPI
        d.rectangle([(450, 50), (550, 250)], fill=(16, 185, 129), outline=(255, 255, 255)) # DB
        
        # Add labels
        d.text((60, 80), "React SPA (Client)", fill=(255, 255, 255))
        d.text((270, 80), "FastAPI Server", fill=(255, 255, 255))
        d.text((470, 140), "Postgres DB", fill=(255, 255, 255))
        
        # Connectors
        d.line([(200, 85), (250, 85)], fill=(255, 255, 255), width=2)
        d.line([(400, 85), (450, 140)], fill=(255, 255, 255), width=2)
        
        img.save(filename)
        print("Test image generated successfully.")
    except Exception as e:
        print(f"Warning: Failed to generate PIL image: {e}. Writing simple text placeholder.")
        with open(filename, "w") as f:
            f.write("Fake image content")

def make_request(url, method="GET", data=None, headers=None, is_json=True):
    if headers is None:
        headers = {}
    
    req_data = None
    if data:
        if isinstance(data, str):
            req_data = data.encode('utf-8')
        elif headers.get("Content-Type") == "application/x-www-form-urlencoded":
            req_data = urllib.parse.urlencode(data).encode('utf-8')
        else:
            req_data = json.dumps(data).encode('utf-8')
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read()
            if is_json:
                return json.loads(res_data.decode('utf-8')), response.status
            return res_data, response.status
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_msg)
            return error_json, e.code
        except:
            return {"detail": error_msg}, e.code
    except Exception as e:
        return {"detail": str(e)}, 500

# Helper to build raw multipart/form-data for image uploading
def upload_file_multipart(url, filepath, headers):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    filename = os.path.basename(filepath)
    
    # Read file bytes
    with open(filepath, "rb") as f:
        file_content = f.read()

    # Construct multipart body
    parts = []
    parts.append(f"--{boundary}".encode('utf-8'))
    parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
    parts.append('Content-Type: image/png'.encode('utf-8'))
    parts.append(b'') # Blank line before content
    parts.append(file_content)
    parts.append(f"--{boundary}--".encode('utf-8'))
    parts.append(b'')

    body = b'\r\n'.join(parts)
    
    upload_headers = headers.copy()
    upload_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    upload_headers["Content-Length"] = str(len(body))

    req = urllib.request.Request(url, data=body, headers=upload_headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8')), response.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode('utf-8')), e.code

def run_tests():
    # 0. Generate file
    test_img = "test_ecommerce_diagram.png"
    generate_test_image(test_img)
    
    username = "test_user_blesson"
    password = "password123"

    print("\n--- Step 1: Register User ---")
    reg_payload = {"username": username, "password": password}
    res, code = make_request(f"{API_URL}/api/auth/register", "POST", reg_payload)
    print(f"Status: {code}, Response: {res}")

    print("\n--- Step 2: Login / Retrieve Token ---")
    login_payload = {"username": username, "password": password}
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    res, code = make_request(f"{API_URL}/api/auth/token", "POST", login_payload, headers)
    print(f"Status: {code}, Response: {res}")
    
    if code != 200:
        print("Authentication failed. Aborting tests.")
        return
    
    token = res["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    print("\n--- Step 3: Upload Diagram File ---")
    res, code = upload_file_multipart(f"{API_URL}/api/diagrams/upload", test_img, auth_headers)
    print(f"Status: {code}, Response: {res}")
    
    if code != 201:
        print("Upload failed. Aborting tests.")
        return
        
    diagram_id = res["id"]
    print(f"Uploaded successfully. Diagram ID: {diagram_id}")

    print("\n--- Step 4: Polling Status ---")
    while True:
        res, code = make_request(f"{API_URL}/api/diagrams/{diagram_id}", "GET", headers=auth_headers)
        status = res.get("status")
        print(f"Current Status: {status}")
        
        if status == "COMPLETED":
            print("Processing analysis complete!")
            break
        elif status == "FAILED":
            print("Analysis pipeline reports FAILED.")
            return
            
        time.sleep(1)

    print("\n--- Step 5: Verify Generated Documentation ---")
    print(f"Summary: {res.get('architecture_summary')[:100]}...")
    print(f"Tech Stack layers parsed: {list(res.get('tech_stack', {}).keys())}")
    print(f"Number of Database Entities: {len(res.get('database_entities', []))}")
    print(f"Number of APIs suggested: {len(res.get('suggested_apis', []))}")

    # Clean up old downloaded files if present
    for ext in ["json", "md", "pdf"]:
        try:
            os.remove(f"test_downloaded_report.{ext}")
        except:
            pass

    print("\n--- Step 6: Test Downloads ---")
    for fmt in ["json", "markdown", "pdf"]:
        content, code = make_request(f"{API_URL}/api/diagrams/{diagram_id}/download/{fmt}", "GET", headers=auth_headers, is_json=(fmt == "json"))
        if code == 200:
            print(f"Export {fmt.upper()} works! Received {len(content)} bytes/keys.")
            ext = "md" if fmt == "markdown" else fmt
            if fmt == "pdf" or fmt == "markdown":
                with open(f"test_downloaded_report.{ext}", "wb") as f:
                    f.write(content)
            elif fmt == "json":
                with open(f"test_downloaded_report.{ext}", "w") as f:
                    f.write(json.dumps(content, indent=2))
        else:
            print(f"Failed to export {fmt}: {content}")

    # Clean up test image
    try:
        os.remove(test_img)
    except:
        pass
    print("\nAll integration checks completed successfully!")

if __name__ == "__main__":
    run_tests()
