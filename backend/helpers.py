import os
import jwt as pyjwt
import bcrypt
import uuid
import logging
import asyncio
import resend
import base64
from io import BytesIO
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from database import db

logger = logging.getLogger(__name__)

# --- Constants ---
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
WHATSAPP_VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "edutech-whatsapp-verify-2024")


# --- Password helpers ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# --- JWT helpers ---
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=8)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# --- Document serializer ---
def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else str(i) if isinstance(i, ObjectId) else i for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result


# --- Institute-scoped query filter ---
def ifilter(user: dict, extra: dict = None) -> dict:
    """Build an institute-scoped query. Super admin sees all data."""
    if user.get("role") == "super_admin":
        return extra or {}
    iid = user.get("institute_id")
    q = {"institute_id": iid} if iid else {}
    if extra:
        q.update(extra)
    return q


# --- Razorpay keys helper (DB first, fallback to env) ---
async def get_razorpay_keys():
    settings = await db.app_settings.find_one({"key": "razorpay"})
    if settings and settings.get("key_id") and settings.get("key_secret"):
        return settings["key_id"], settings["key_secret"]
    return RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET


# --- Twilio settings helper (DB first, fallback to env) ---
async def get_twilio_settings():
    settings = await db.app_settings.find_one({"key": "twilio"})
    if settings and settings.get("account_sid") and settings.get("auth_token") and settings.get("phone_number"):
        return settings["account_sid"], settings["auth_token"], settings["phone_number"]
    return TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER


async def send_sms_alert(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio. Silently skips if not configured."""
    from twilio.rest import Client as TwilioClient
    account_sid, auth_token, from_phone = await get_twilio_settings()
    if not (account_sid and auth_token and from_phone):
        logger.warning("[Twilio SMS] Not configured — skipping SMS")
        return False
    if not to_phone or not to_phone.strip():
        logger.warning("[Twilio SMS] No recipient phone number — skipping")
        return False
    try:
        def _send():
            client = TwilioClient(account_sid, auth_token)
            return client.messages.create(body=message, from_=from_phone, to=to_phone)
        msg = await asyncio.to_thread(_send)
        logger.info(f"[Twilio SMS] Sent to {to_phone} — SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"[Twilio SMS] Error sending to {to_phone}: {e}")
        return False


# --- Institute branding helper (name + logo) ---
async def get_institute_branding(institute_id: str):
    """Returns (institute_name, logo_base64_or_None, logo_mime_or_None)"""
    if not institute_id:
        return "EduTech LMS", None, None
    try:
        inst = await db.institutes.find_one({"_id": ObjectId(institute_id)}, {"name": 1})
        name = inst.get("name", "EduTech LMS") if inst else "EduTech LMS"
        logo_doc = await db.app_settings.find_one({"key": "logo", "institute_id": institute_id})
        logo_b64 = logo_doc.get("data") if logo_doc else None
        logo_mime = logo_doc.get("mime_type", "image/png") if logo_doc else None
        return name, logo_b64, logo_mime
    except Exception:
        return "EduTech LMS", None, None


# --- Parent notification helper ---
async def notify_parent(parent_email: str, parent_name: str, student_name: str, subject: str, html_body: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning(f"[Parent Notify] No RESEND key — skipping: {parent_email} | {subject}")
        return False
    resend.api_key = RESEND_API_KEY
    try:
        params = {"from": f"EduTech LMS <{SENDER_EMAIL}>", "to": [parent_email], "subject": subject, "html": html_body}
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.error(f"Parent notification error: {e}")
        return False


# --- Auto-create student from enquiry on conversion ---
async def auto_create_student_from_enquiry(enquiry: dict):
    """Creates a student record from an enquiry. Returns (created: bool, student_id: str)."""
    email = enquiry.get("email", "").lower()
    if not email:
        return False, ""
    iid = enquiry.get("institute_id")
    existing = await db.students.find_one({"email": email, "institute_id": iid} if iid else {"email": email})
    if existing:
        return False, str(existing["_id"])
    student_doc = {
        "name": enquiry.get("student_name", ""),
        "email": email,
        "phone": enquiry.get("phone", ""),
        "branch_id": None,
        "course_ids": enquiry.get("courses", []),
        "dob": None,
        "address": enquiry.get("address") or enquiry.get("city", ""),
        "guardian_name": "",
        "guardian_phone": "",
        "status": "onboarding",
        "syllabus_percentage": 0,
        "batch_id": None,
        "batch_ids": [],
        "notes": enquiry.get("notes", ""),
        "source": enquiry.get("source", "crm"),
        "enquiry_id": str(enquiry["_id"]),
        "institute_id": iid,
        "enrollment_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.students.insert_one(student_doc)
    return True, str(res.inserted_id)


# --- Email nudge helper (Resend) ---
async def send_nudge_email(recipient_email: str, student_name: str, total_balance: float) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — skipping email")
        return False
    resend.api_key = RESEND_API_KEY
    html = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;">
    <div style="background:#002EB8;padding:24px 28px;border-radius:8px 8px 0 0;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">EduTech LMS &mdash; Payment Reminder</h1>
    </div>
    <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:0 0 8px 8px;padding:28px;">
      <p style="font-size:15px;color:#0A0A0A;margin:0 0 12px;">Dear <strong>{student_name}</strong>,</p>
      <p style="font-size:15px;color:#0A0A0A;margin:0 0 20px;">
        You have an outstanding fee balance of <strong style="color:#FF2B2B;">&#8377;{total_balance:,.2f}</strong> with EduTech Institute.
        Please contact the admin office or login to the student portal to clear your dues.
      </p>
      <div style="background:white;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#8A8F98;text-transform:uppercase;letter-spacing:2px;">Outstanding Balance</p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:800;color:#FF2B2B;">&#8377;{total_balance:,.2f}</p>
      </div>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
      <p style="font-size:12px;color:#8A8F98;margin:0;">EduTech LMS &middot; Institute Management Platform</p>
    </div></body></html>
    """
    try:
        params = {
            "from": f"EduTech LMS <{SENDER_EMAIL}>",
            "to": [recipient_email],
            "subject": f"Fee Payment Reminder — ₹{total_balance:,.2f} outstanding",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.error(f"Resend email error: {e}")
        return False


# --- Low attendance notification ---
async def check_and_notify_low_attendance(student_id: str, institute_id: str = None):
    try:
        records = await db.attendance.find({"student_id": student_id}).to_list(500)
        if not records:
            return
        total = len(records)
        present = sum(1 for r in records if r.get("status") == "present")
        pct = (present / total * 100) if total > 0 else 100
        if pct < 75:
            parents = await db.users.find({"role": "parent", "student_id": student_id}).to_list(10)
            student = await db.students.find_one({"_id": ObjectId(student_id)})
            sname = (student or {}).get("name", "your child")
            for p in parents:
                html = f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#FF2B2B;padding:24px;border-radius:8px 8px 0 0">
                  <h1 style="color:white;margin:0;font-size:18px">Low Attendance Alert</h1>
                </div>
                <div style="background:#FFF;border:1px solid #E5E7EB;border-radius:0 0 8px 8px;padding:24px">
                  <p>Dear {p.get('name','Parent')},</p>
                  <p><strong>{sname}</strong>'s attendance has dropped to <strong style="color:#FF2B2B">{pct:.1f}%</strong>.</p>
                  <p>Minimum required attendance is 75%. Please contact the institute.</p>
                </div></body></html>"""
                await notify_parent(
                    p["email"], p.get("name", "Parent"), sname,
                    f"Low Attendance Alert — {sname} ({pct:.1f}%)", html
                )
    except Exception as e:
        logger.error(f"Low attendance notify error: {e}")
