import os
import smtplib
import json
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from collections import deque
from threading import Lock
from typing import Optional, Dict, Any, List

from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_TLS,
    SMTP_SSL,
    EMAIL_DEV_MODE,
    FRONTEND_URL,
    UPLOAD_DIR
)

logger = logging.getLogger("email_service")

# Thread-safe in-memory dev mailbox store for local development and test verification
_DEV_MAILBOX_LOCK = Lock()
_DEV_MAILBOX: deque = deque(maxlen=25)

DEV_EMAIL_DIR = os.path.join(UPLOAD_DIR, "dev_emails")
os.makedirs(DEV_EMAIL_DIR, exist_ok=True)


def _store_dev_email(email_record: Dict[str, Any]):
    """Store email in dev memory and on disk for local inspection without external SMTP."""
    with _DEV_MAILBOX_LOCK:
        _DEV_MAILBOX.appendleft(email_record)

    try:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        safe_to = email_record.get("to", "unknown").replace("@", "_at_").replace(".", "_")
        filename = f"{ts}_{safe_to}.json"
        filepath = os.path.join(DEV_EMAIL_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(email_record, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist dev email to disk: {e}")


def get_latest_dev_email(to_email: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve the latest email stored in development mode, optionally filtered by recipient."""
    with _DEV_MAILBOX_LOCK:
        if not to_email:
            return _DEV_MAILBOX[0] if _DEV_MAILBOX else None
        norm_to = to_email.strip().lower()
        for msg in _DEV_MAILBOX:
            if msg.get("to", "").strip().lower() == norm_to:
                return msg
        return None


def get_all_dev_emails() -> List[Dict[str, Any]]:
    """Retrieve all recent emails stored in development mode."""
    with _DEV_MAILBOX_LOCK:
        return list(_DEV_MAILBOX)


def clear_dev_mailbox():
    """Clear dev email history (primarily used between tests)."""
    with _DEV_MAILBOX_LOCK:
        _DEV_MAILBOX.clear()


def _send_smtp_message(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """Send an email using configured SMTP server."""
    msg = MIMEMultipart("alternative")
    sender_display = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>" if SMTP_FROM_NAME else SMTP_FROM_EMAIL
    msg["From"] = sender_display
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    if SMTP_SSL:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)

    try:
        server.ehlo()
        if SMTP_TLS and not SMTP_SSL:
            server.starttls()
            server.ehlo()
        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        logger.info(f"Successfully sent email to {to_email} via SMTP")
        return True
    finally:
        try:
            server.quit()
        except Exception:
            pass


def send_password_reset_email(to_email: str, recipient_name: str, raw_token: str, expires_in_minutes: int = 20) -> bool:
    """
    Dispatch password reset email.
    If SMTP_HOST is not configured or EMAIL_DEV_MODE is True (and no SMTP credentials),
    safely stores email to local dev mailbox.
    """
    reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
    subject = "Reset your DiagramToSolutions password"

    display_name = recipient_name or to_email.split("@")[0]

    text_body = f"""Hello {display_name},

We received a request to reset the password for your DiagramToSolutions account.

To set a new password, open the link below in your browser:
{reset_url}

This password reset link will expire in {expires_in_minutes} minutes and can only be used once.

Security Notice:
If you did not request this password reset, please disregard this email. Your account credentials remain secure and no changes have been made.

Best regards,
DiagramToSolutions Security Team
"""

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset your DiagramToSolutions password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #242820;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F6F0; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="540" style="max-width: 540px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5E1D8; box-shadow: 0 4px 20px rgba(36, 40, 32, 0.06); overflow: hidden;">
          <!-- Top Accent Line -->
          <tr>
            <td style="height: 4px; background-color: #397A55;"></td>
          </tr>
          <!-- Content Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 36px; height: 36px; background-color: #397A55; border-radius: 10px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: bold; font-size: 18px;">
                    ⚡
                  </td>
                  <td style="padding-left: 12px; font-size: 16px; font-weight: 700; color: #242820; letter-spacing: -0.2px;">
                    DiagramToSolutions
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 22px; font-weight: 700; color: #242820; margin: 0 0 8px 0; letter-spacing: -0.3px;">
                Password Reset Request
              </h1>
              <p style="font-size: 14px; line-height: 1.5; color: #73766F; margin: 0;">
                Hello <strong>{display_name}</strong>, a request was received to reset the password for your account associated with <strong>{to_email}</strong>.
              </p>
            </td>
          </tr>
          <!-- Reset Button -->
          <tr>
            <td style="padding: 12px 32px 24px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #397A55;">
                    <a href="{reset_url}" target="_blank" style="font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 12px 28px; display: inline-block; border-radius: 10px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #73766F; margin: 18px 0 0 0; line-height: 1.4;">
                This single-use link is valid for <strong>{expires_in_minutes} minutes</strong>. If the button above does not work, copy and paste this URL into your browser:
              </p>
              <p style="font-size: 11px; color: #397A55; margin: 6px 0 0 0; word-break: break-all; font-family: monospace;">
                {reset_url}
              </p>
            </td>
          </tr>
          <!-- Security Footer Notice -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F5F1EA; border-top: 1px solid #E5E1D8; text-align: left;">
              <p style="font-size: 12px; line-height: 1.5; color: #73766F; margin: 0;">
                <strong>Security Notice:</strong> If you did not request this password reset, no action is required. Your password remains unchanged. If you suspect unauthorized access, contact your engineering administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    dev_record = {
        "to": to_email,
        "recipient_name": recipient_name,
        "subject": subject,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "expires_in_minutes": expires_in_minutes,
        "reset_url": reset_url,
        "token": raw_token,
        "type": "password_reset"
    }

    # If real SMTP is configured and host is not empty
    if SMTP_HOST and SMTP_HOST.strip():
        try:
            success = _send_smtp_message(to_email, subject, text_body, html_body)
            # Store copy in dev mailbox as well if in dev mode
            if EMAIL_DEV_MODE:
                _store_dev_email(dev_record)
            return success
        except Exception as e:
            logger.error(f"SMTP delivery failed to {to_email}: {e}")
            raise RuntimeError(f"Email delivery failed through SMTP provider: {e}")

    # Local development fallback
    _store_dev_email(dev_record)
    logger.info(f"[DEV EMAIL] Password reset email recorded for {to_email} (Development Mode).")
    return True


def send_password_changed_notification(to_email: str, recipient_name: str) -> bool:
    """Send notification confirming that the account password was successfully updated."""
    subject = "Your DiagramToSolutions password has been updated"
    display_name = recipient_name or to_email.split("@")[0]
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    text_body = f"""Hello {display_name},

Your password for DiagramToSolutions was successfully changed on {now_str}.

If you initiated this change, you can safely ignore this message.

If you did NOT change your password, please contact your systems administrator immediately.

Best regards,
DiagramToSolutions Security Team
"""

    html_body = f"""<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; background-color: #F8F6F0; font-family: sans-serif; color: #242820;">
  <div style="max-width: 500px; margin: auto; background-color: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 12px; padding: 28px;">
    <h2 style="color: #397A55; margin-top: 0;">Password Changed</h2>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>Your DiagramToSolutions password was successfully updated at <strong>{now_str}</strong>.</p>
    <p style="font-size: 13px; color: #73766F;">If you made this change, no further action is required.</p>
    <div style="background-color: #FCE8E7; border: 1px solid #B83230; padding: 12px; border-radius: 8px; margin-top: 16px;">
      <p style="color: #B83230; font-size: 12px; margin: 0;">
        <strong>Warning:</strong> If you did not make this change, please contact security immediately.
      </p>
    </div>
  </div>
</body>
</html>
"""

    dev_record = {
        "to": to_email,
        "recipient_name": recipient_name,
        "subject": subject,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "type": "password_changed_notification"
    }

    if SMTP_HOST and SMTP_HOST.strip():
        try:
            return _send_smtp_message(to_email, subject, text_body, html_body)
        except Exception as e:
            logger.warning(f"Could not send password change notice via SMTP: {e}")
            return False

    _store_dev_email(dev_record)
    return True
