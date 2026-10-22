import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

API_URL = "http://127.0.0.1:8000"

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"
        elif isinstance(data, str):
            req_data = data.encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}, resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return json.loads(body), e.code
        except Exception:
            return {"detail": body}, e.code

def test_full_password_reset_flow():
    print("==================================================")
    print("Starting Comprehensive Password Reset Test Suite")
    print("==================================================")

    test_username = f"reset_test_user_{int(datetime.now().timestamp())}"
    test_email = f"{test_username}@example.com"
    initial_password = "OriginalPassword123!"
    new_password = "BrandNewSecretPassword456!"

    # 1. Register test user
    print("\n[Test 1] Registering dedicated test user...")
    res, status = make_req(
        f"{API_URL}/api/auth/register",
        method="POST",
        data={"username": test_username, "email": test_email, "password": initial_password}
    )
    assert status == 201, f"User registration failed: {res}"
    print(f"[PASS] Registered user {test_username} ({test_email})")

    # 2. Verify initial login works
    print("\n[Test 2] Verifying initial login with original credentials...")
    login_body = f"username={urllib.parse.quote(test_username)}&password={urllib.parse.quote(initial_password)}"
    res, status = make_req(
        f"{API_URL}/api/auth/token",
        method="POST",
        data=login_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert status == 200 and "access_token" in res, f"Initial login failed: {res}"
    print("OK: Initial login successful")

    # 3. Test Invalid Email Format
    print("\n[Test 3] Testing invalid email format...")
    res, status = make_req(
        f"{API_URL}/api/auth/forgot-password",
        method="POST",
        data={"email": "not-an-email"}
    )
    assert status == 400, f"Expected 400 for bad email format, got {status}: {res}"
    print("[PASS] Invalid email rejected with HTTP 400")

    # 4. Test Unregistered Email (Anti-enumeration)
    print("\n[Test 4] Testing unregistered email anti-enumeration response...")
    res, status = make_req(
        f"{API_URL}/api/auth/forgot-password",
        method="POST",
        data={"email": "nonexistent_dev_user_999@domain.com"}
    )
    assert status == 200, f"Expected 200 generic message, got {status}: {res}"
    assert "If an account exists" in res.get("message", "")
    print(f"[PASS] Received generic anti-enumeration response: {res.get('message')}")

    # 5. Request Reset for Registered User
    print("\n[Test 5] Requesting password reset for registered email...")
    res, status = make_req(
        f"{API_URL}/api/auth/forgot-password",
        method="POST",
        data={"email": test_email}
    )
    assert status == 200, f"Forgot password request failed: {res}"
    assert "If an account exists" in res.get("message", "")
    print("[PASS] Reset request accepted with identical generic response")

    # Retrieve dev email
    res, status = make_req(f"{API_URL}/api/auth/dev/latest-reset-email?email={urllib.parse.quote(test_email)}")
    assert status == 200 and res.get("found"), f"Dev email not captured: {res}"
    raw_token = res["email"]["token"]
    assert raw_token, "Token not found in dev email record"
    print(f"[PASS] Captured reset token from dev mailbox: {raw_token[:8]}... (length: {len(raw_token)})")

    # 6. Verify Token Validity via GET /verify-reset-token
    print("\n[Test 6] Testing token verification endpoint...")
    res, status = make_req(f"{API_URL}/api/auth/verify-reset-token?token={raw_token}")
    assert status == 200 and res.get("valid") is True, f"Token verification failed: {res}"
    print("[PASS] Valid token verified successfully")

    # Bogus token check
    res, status = make_req(f"{API_URL}/api/auth/verify-reset-token?token=bogus_nonexistent_token_123")
    assert status == 200 and res.get("valid") is False, f"Bogus token unexpectedly valid: {res}"
    assert res.get("reason") == "invalid"
    print("[PASS] Bogus token correctly reported as invalid")

    # 7. Test Password Validation Failures
    print("\n[Test 7] Testing password mismatch and policy validation...")
    res, status = make_req(
        f"{API_URL}/api/auth/reset-password",
        method="POST",
        data={"token": raw_token, "new_password": "Short1", "confirm_password": "Short1"}
    )
    assert status == 400, f"Expected 400 for short password, got {status}: {res}"
    print("[PASS] Short password rejected (< 8 chars)")

    res, status = make_req(
        f"{API_URL}/api/auth/reset-password",
        method="POST",
        data={"token": raw_token, "new_password": "PasswordWithNoNumbers!", "confirm_password": "PasswordWithNoNumbers!"}
    )
    assert status == 400, f"Expected 400 for missing digit, got {status}: {res}"
    print("[PASS] Password lacking digits rejected")

    res, status = make_req(
        f"{API_URL}/api/auth/reset-password",
        method="POST",
        data={"token": raw_token, "new_password": new_password, "confirm_password": "DifferentPassword123!"}
    )
    assert status == 400, f"Expected 400 for mismatched passwords, got {status}: {res}"
    print("[PASS] Password mismatch rejected")

    # 8. Perform Successful Password Reset
    print("\n[Test 8] Executing valid password reset...")
    res, status = make_req(
        f"{API_URL}/api/auth/reset-password",
        method="POST",
        data={"token": raw_token, "new_password": new_password, "confirm_password": new_password}
    )
    assert status == 200, f"Password reset failed: {res}"
    print(f"[PASS] Password successfully reset: {res.get('message')}")

    # 9. Verify Token Single-Use (Replay Prevention)
    print("\n[Test 9] Verifying consumed token cannot be reused...")
    res, status = make_req(
        f"{API_URL}/api/auth/reset-password",
        method="POST",
        data={"token": raw_token, "new_password": "AnotherPassword789!", "confirm_password": "AnotherPassword789!"}
    )
    assert status == 400, f"Expected 400 when reusing token, got {status}: {res}"
    print(f"[PASS] Token reuse rejected with message: {res.get('detail')}")

    # Verify verify-reset-token shows consumed token as 'used'
    res, status = make_req(f"{API_URL}/api/auth/verify-reset-token?token={raw_token}")
    assert res.get("valid") is False and res.get("reason") == "used"
    print("[PASS] Token verification confirms status is 'used'")

    # 10. Verify Old Password Fails and New Password Works
    print("\n[Test 10] Verifying old credentials fail and new credentials succeed...")
    old_login_body = f"username={urllib.parse.quote(test_username)}&password={urllib.parse.quote(initial_password)}"
    res, status = make_req(
        f"{API_URL}/api/auth/token",
        method="POST",
        data=old_login_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert status == 401, f"Expected 401 with old password, got {status}: {res}"
    print("[PASS] Old password successfully invalidated")

    new_login_body = f"username={urllib.parse.quote(test_username)}&password={urllib.parse.quote(new_password)}"
    res, status = make_req(
        f"{API_URL}/api/auth/token",
        method="POST",
        data=new_login_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert status == 200 and "access_token" in res, f"Login with new password failed: {res}"
    print("[PASS] Login with new password succeeded!")

    print("\n==================================================")
    print("ALL PASSWORD RESET BACKEND TESTS PASSED CLEANLY!")
    print("==================================================")

if __name__ == "__main__":
    import urllib.parse
    test_full_password_reset_flow()
