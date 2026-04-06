from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator
from typing import Annotated, List, Optional, Any
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import os
import jwt as pyjwt
import bcrypt
import uuid
import logging
from io import BytesIO
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
import resend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Constants ---
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

# --- DB ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- PyObjectId ---
def coerce_object_id(v: Any) -> str:
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(coerce_object_id)]

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

# --- Auth dependency ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_admin_or_employer(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ["admin", "employer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

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

# --- Razorpay keys helper (DB first, fallback to env) ---
async def get_razorpay_keys():
    settings = await db.app_settings.find_one({"key": "razorpay"})
    if settings and settings.get("key_id") and settings.get("key_secret"):
        return settings["key_id"], settings["key_secret"]
    return RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

# --- Email helper (Resend) ---
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

# --- App setup ---
app = FastAPI(title="EduTech LMS API")
api_router = APIRouter(prefix="/api")

_cors_raw = os.environ.get("CORS_ORIGINS", "")
if _cors_raw and _cors_raw.strip() != "*":
    _cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
else:
    _cors_origins = [FRONTEND_URL, "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# MODELS
# ========================
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"
    branch_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class BranchCreate(BaseModel):
    name: str
    location: str

class CourseCreate(BaseModel):
    name: str
    category: str
    branch_id: str
    base_fee: float
    teacher_id: Optional[str] = None

class EnquiryCreate(BaseModel):
    student_name: str
    email: str
    phone: str
    courses: List[str] = []
    stage: str = "new"
    source: str = "manual"
    notes: str = ""

class StageUpdate(BaseModel):
    stage: str

class ScheduleCreate(BaseModel):
    course_id: str
    teacher_id: str
    room_id: str
    branch_id: str
    start_time: datetime
    end_time: datetime
    title: str = ""

class BatchCreate(BaseModel):
    name: str
    branch_id: str
    course_id: str
    teacher_id: str
    start_time: str
    end_time: str
    days: List[str] = []

class FeeCalculate(BaseModel):
    student_id: str
    student_name: str
    course_id: str
    course_name: str
    base_fee: float
    discount: float = 0

class StudentCreate(BaseModel):
    name: str
    email: str
    phone: str
    branch_id: Optional[str] = None
    course_ids: List[str] = []
    dob: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    course_ids: Optional[List[str]] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    notes: Optional[str] = None
    syllabus_percentage: Optional[float] = None

class StatusUpdate(BaseModel):
    status: str

class OnboardStudent(BaseModel):
    batch_id: str

class AttendanceMark(BaseModel):
    session_id: str
    student_id: str
    status: str

class PaymentUpdate(BaseModel):
    amount: float

class OrderCreate(BaseModel):
    invoice_id: str
    amount: float

class PaymentVerify(BaseModel):
    invoice_id: str
    payment_id: str
    order_id: str
    signature: Optional[str] = None
    amount: float

class PersonalUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class FeeQuery(BaseModel):
    message: str

class RazorpaySettings(BaseModel):
    key_id: str
    key_secret: str

# ========================
# AUTH ROUTES
# ========================
auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = hash_password(data.password)
    user_doc = {
        "name": data.name, "email": email, "password_hash": password_hash,
        "role": data.role, "branch_id": data.branch_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800)
    return {"id": user_id, "name": data.name, "email": email, "role": data.role}

@auth_router.post("/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800)
    return {"id": user_id, "name": user.get("name"), "email": email, "role": user.get("role", "student")}

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@auth_router.post("/refresh")
async def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(user_id, user["email"])
        response.set_cookie("access_token", new_access, httponly=True, secure=False, samesite="lax", max_age=28800)
        return {"message": "Token refreshed"}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ========================
# USERS ROUTES
# ========================
users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("")
async def list_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return [serialize_doc(u) for u in users]

@users_router.post("")
async def create_user(data: UserCreate, user: dict = Depends(require_admin)):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "name": data.name, "email": email,
        "password_hash": hash_password(data.password),
        "role": data.role, "branch_id": data.branch_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    return {"id": str(result.inserted_id), "name": data.name, "email": email, "role": data.role}

@users_router.delete("/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "User deleted"}

# ========================
# BRANCHES ROUTES
# ========================
branches_router = APIRouter(prefix="/branches", tags=["branches"])

@branches_router.get("")
async def list_branches(user: dict = Depends(get_current_user)):
    branches = await db.branches.find().to_list(1000)
    return [serialize_doc(b) for b in branches]

@branches_router.post("")
async def create_branch(data: BranchCreate, user: dict = Depends(require_admin)):
    doc = {"name": data.name, "location": data.location, "created_at": datetime.now(timezone.utc)}
    result = await db.branches.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@branches_router.put("/{branch_id}")
async def update_branch(branch_id: str, data: BranchCreate, user: dict = Depends(require_admin)):
    await db.branches.update_one({"_id": ObjectId(branch_id)}, {"$set": {"name": data.name, "location": data.location}})
    return serialize_doc(await db.branches.find_one({"_id": ObjectId(branch_id)}))

@branches_router.delete("/{branch_id}")
async def delete_branch(branch_id: str, user: dict = Depends(require_admin)):
    await db.branches.delete_one({"_id": ObjectId(branch_id)})
    return {"message": "Branch deleted"}

# ========================
# COURSES ROUTES
# ========================
courses_router = APIRouter(prefix="/courses", tags=["courses"])

@courses_router.get("")
async def list_courses(user: dict = Depends(get_current_user)):
    courses = await db.courses.find().to_list(1000)
    return [serialize_doc(c) for c in courses]

@courses_router.post("")
async def create_course(data: CourseCreate, user: dict = Depends(require_admin)):
    doc = {
        "name": data.name, "category": data.category, "branch_id": data.branch_id,
        "base_fee": data.base_fee, "teacher_id": data.teacher_id,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.courses.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@courses_router.put("/{course_id}")
async def update_course(course_id: str, data: CourseCreate, user: dict = Depends(require_admin)):
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": {
        "name": data.name, "category": data.category, "branch_id": data.branch_id,
        "base_fee": data.base_fee, "teacher_id": data.teacher_id
    }})
    return serialize_doc(await db.courses.find_one({"_id": ObjectId(course_id)}))

@courses_router.delete("/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_admin)):
    await db.courses.delete_one({"_id": ObjectId(course_id)})
    return {"message": "Course deleted"}

# ========================
# ENQUIRIES (CRM)
# ========================
enquiries_router = APIRouter(prefix="/enquiries", tags=["enquiries"])

@enquiries_router.get("")
async def list_enquiries(user: dict = Depends(get_current_user)):
    enquiries = await db.enquiries.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(e) for e in enquiries]

@enquiries_router.post("")
async def create_enquiry(data: EnquiryCreate, user: dict = Depends(get_current_user)):
    doc = {
        "student_name": data.student_name, "email": data.email, "phone": data.phone,
        "courses": data.courses, "stage": data.stage, "source": data.source,
        "notes": data.notes, "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.enquiries.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@enquiries_router.put("/{enquiry_id}")
async def update_enquiry(enquiry_id: str, data: EnquiryCreate, user: dict = Depends(get_current_user)):
    update = {
        "student_name": data.student_name, "email": data.email, "phone": data.phone,
        "courses": data.courses, "source": data.source, "notes": data.notes,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.enquiries.update_one({"_id": ObjectId(enquiry_id)}, {"$set": update})
    return serialize_doc(await db.enquiries.find_one({"_id": ObjectId(enquiry_id)}))

@enquiries_router.patch("/{enquiry_id}/stage")
async def update_stage(enquiry_id: str, data: StageUpdate, user: dict = Depends(get_current_user)):
    await db.enquiries.update_one(
        {"_id": ObjectId(enquiry_id)},
        {"$set": {"stage": data.stage, "updated_at": datetime.now(timezone.utc)}}
    )
    return serialize_doc(await db.enquiries.find_one({"_id": ObjectId(enquiry_id)}))

@enquiries_router.delete("/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, user: dict = Depends(get_current_user)):
    await db.enquiries.delete_one({"_id": ObjectId(enquiry_id)})
    return {"message": "Enquiry deleted"}

# ========================
# ACADEMIC ROUTES
# ========================
academic_router = APIRouter(prefix="/academic", tags=["academic"])

@academic_router.get("/schedule")
async def list_schedule(user: dict = Depends(get_current_user)):
    sessions = await db.class_sessions.find().sort("start_time", 1).to_list(1000)
    return [serialize_doc(s) for s in sessions]

@academic_router.post("/schedule")
async def create_schedule(data: ScheduleCreate, user: dict = Depends(require_admin)):
    conflict = await db.class_sessions.find_one({
        "$and": [
            {"$or": [{"teacher_id": data.teacher_id}, {"room_id": data.room_id}]},
            {"start_time": {"$lt": data.end_time}},
            {"end_time": {"$gt": data.start_time}}
        ]
    })
    if conflict:
        raise HTTPException(status_code=400, detail="Conflict: Teacher or room is already booked during this time slot")
    doc = {
        "course_id": data.course_id, "teacher_id": data.teacher_id,
        "room_id": data.room_id, "branch_id": data.branch_id,
        "start_time": data.start_time, "end_time": data.end_time,
        "title": data.title, "created_at": datetime.now(timezone.utc)
    }
    result = await db.class_sessions.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@academic_router.delete("/schedule/{session_id}")
async def delete_schedule(session_id: str, user: dict = Depends(require_admin)):
    await db.class_sessions.delete_one({"_id": ObjectId(session_id)})
    return {"message": "Session deleted"}

@academic_router.get("/batches")
async def list_batches(user: dict = Depends(get_current_user)):
    batches = await db.batches.find().to_list(1000)
    return [serialize_doc(b) for b in batches]

@academic_router.post("/batches")
async def create_batch(data: BatchCreate, user: dict = Depends(require_admin)):
    doc = {
        "name": data.name, "branch_id": data.branch_id, "course_id": data.course_id,
        "teacher_id": data.teacher_id, "start_time": data.start_time,
        "end_time": data.end_time, "days": data.days,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.batches.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@academic_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(require_admin)):
    await db.batches.delete_one({"_id": ObjectId(batch_id)})
    return {"message": "Batch deleted"}

# ========================
# FINANCE ROUTES
# ========================
finance_router = APIRouter(prefix="/finance", tags=["finance"])

@finance_router.get("/invoices")
async def list_invoices(user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(i) for i in invoices]

@finance_router.post("/calculate")
async def calculate_fee(data: FeeCalculate, user: dict = Depends(require_admin)):
    GST_RATE = 0.18
    gst_amount = round(data.base_fee * GST_RATE, 2)
    total = round((data.base_fee + gst_amount) - data.discount, 2)
    doc = {
        "student_id": data.student_id, "student_name": data.student_name,
        "course_id": data.course_id, "course_name": data.course_name,
        "base_fee": data.base_fee, "gst_amount": gst_amount,
        "discount": data.discount, "total": total,
        "paid_amount": 0, "balance": total,
        "status": "pending", "created_at": datetime.now(timezone.utc),
    }
    result = await db.invoices.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@finance_router.patch("/invoices/{invoice_id}/pay")
async def mark_paid(invoice_id: str, data: PaymentUpdate, user: dict = Depends(require_admin)):
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    new_paid = invoice.get("paid_amount", 0) + data.amount
    new_balance = max(0, invoice.get("total", 0) - new_paid)
    new_status = "paid" if new_balance <= 0 else "partial"
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"paid_amount": new_paid, "balance": new_balance, "status": new_status}}
    )
    return serialize_doc(await db.invoices.find_one({"_id": ObjectId(invoice_id)}))

@finance_router.post("/nudge/{student_id}")
async def send_nudge(student_id: str, user: dict = Depends(require_admin)):
    invoices = await db.invoices.find({"student_id": student_id, "balance": {"$gt": 0}}).to_list(100)
    if not invoices:
        raise HTTPException(status_code=404, detail="No outstanding invoices found")
    total_balance = sum(i.get("balance", 0) for i in invoices)
    await db.nudge_logs.insert_one({
        "student_id": student_id, "invoice_count": len(invoices),
        "total_balance": total_balance, "sent_at": datetime.now(timezone.utc),
        "sent_by": user.get("id") or user.get("_id")
    })
    # Send email via Resend
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    email_sent = False
    if student and student.get("email"):
        email_sent = await send_nudge_email(student["email"], student.get("name", "Student"), total_balance)
    msg = f"Payment reminder logged. Outstanding: ₹{total_balance:,.2f}"
    if email_sent:
        msg += " · Email sent via Resend"
    elif RESEND_API_KEY:
        msg += " · Email delivery attempted"
    else:
        msg += " · Add RESEND_API_KEY to .env to enable emails"
    return {"message": msg, "email_sent": email_sent, "total_balance": total_balance}

# ========================
# DASHBOARD ROUTES
# ========================
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@dashboard_router.get("/stats")
async def get_stats(branch_id: Optional[str] = None, user: dict = Depends(require_admin_or_employer)):
    student_filter = {}
    if branch_id:
        student_filter["branch_id"] = branch_id

    # Fetch invoices with projection (only needed fields)
    invoices = await db.invoices.find({}, {"paid_amount": 1, "balance": 1, "student_id": 1}).to_list(10000)
    total_revenue = sum(i.get("paid_amount", 0) for i in invoices)
    outstanding_balance = sum(i.get("balance", 0) for i in invoices)

    total_students = await db.students.count_documents(student_filter)
    active_students = await db.students.count_documents({**student_filter, "status": "active"})

    total_enquiries = await db.enquiries.count_documents({})
    converted_enquiries = await db.enquiries.count_documents({"stage": "converted"})
    conversion_rate = round((converted_enquiries / total_enquiries * 100) if total_enquiries > 0 else 0, 1)

    # Revenue by branch — fetch all students + invoices once, aggregate in memory (avoids N+1)
    branches = await db.branches.find().to_list(100)
    all_students = await db.students.find({}, {"_id": 1, "branch_id": 1}).to_list(5000)
    student_branch_map = {str(s["_id"]): s.get("branch_id") for s in all_students}
    branch_revenue_map: dict = {}
    for inv in invoices:
        sid = inv.get("student_id", "")
        bid = student_branch_map.get(sid, "")
        branch_revenue_map[bid] = branch_revenue_map.get(bid, 0) + inv.get("paid_amount", 0)

    revenue_by_branch = [
        {"branch": b.get("name"), "revenue": branch_revenue_map.get(str(b["_id"]), 0)}
        for b in branches
    ]

    # Enrolments by course category — projection to fetch only category field
    courses = await db.courses.find({}, {"category": 1}).to_list(1000)
    category_map = {}
    for c in courses:
        cat = c.get("category", "Other")
        category_map[cat] = category_map.get(cat, 0) + 1
    enrolments_by_category = [{"name": k, "value": v} for k, v in category_map.items()]

    # Monthly trends (last 6 months)
    monthly_trends = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_start = now.replace(day=1) - timedelta(days=i * 30)
        month_end = month_start + timedelta(days=30)
        count = await db.students.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
        monthly_trends.append({"month": month_start.strftime("%b"), "enrolments": count})

    return {
        "total_revenue": total_revenue, "outstanding_balance": outstanding_balance,
        "total_students": total_students, "active_students": active_students,
        "conversion_rate": conversion_rate, "total_enquiries": total_enquiries,
        "revenue_by_branch": revenue_by_branch, "enrolments_by_category": enrolments_by_category,
        "monthly_trends": monthly_trends,
    }

@dashboard_router.post("/weekly-summary")
async def generate_weekly_summary(user: dict = Depends(require_admin_or_employer)):
    invoices = await db.invoices.find().to_list(10000)
    total_revenue = sum(i.get("paid_amount", 0) for i in invoices)
    outstanding = sum(i.get("balance", 0) for i in invoices)
    total_students = await db.students.count_documents({})
    new_enquiries = await db.enquiries.count_documents({
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    })
    total_enq = await db.enquiries.count_documents({})
    converted = await db.enquiries.count_documents({"stage": "converted"})
    stats = {
        "total_revenue_INR": total_revenue, "outstanding_balance_INR": outstanding,
        "total_students": total_students, "new_enquiries_this_week": new_enquiries,
        "conversion_rate": f"{round((converted/total_enq*100) if total_enq > 0 else 0, 1)}%"
    }
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"weekly-summary-{uuid.uuid4()}",
            system_message="You are an educational institute analytics assistant. Generate professional, concise weekly summaries in 3-4 bullet points using rupee (₹) for currency. Be specific with numbers. Keep under 150 words."
        ).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(
            text=f"Generate a weekly performance summary for an educational institute with these stats: {stats}. Include key insights and one actionable recommendation."
        ))
        return {"summary": response, "stats": stats}
    except Exception as e:
        logger.error(f"AI summary error: {e}")
        return {
            "summary": f"• Revenue collected this period: ₹{total_revenue:,.0f}\n• Outstanding balance: ₹{outstanding:,.0f}\n• {total_students} students enrolled, {new_enquiries} new enquiries this week\n• Conversion rate: {stats['conversion_rate']} — consider follow-up calls to improve.",
            "stats": stats
        }

# ========================
# STUDENTS ROUTES
# ========================
students_router = APIRouter(prefix="/students", tags=["students"])

@students_router.get("")
async def list_students(user: dict = Depends(get_current_user)):
    students = await db.students.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(s) for s in students]

@students_router.post("")
async def create_student(data: StudentCreate, user: dict = Depends(require_admin)):
    doc = {
        "name": data.name, "email": data.email, "phone": data.phone,
        "branch_id": data.branch_id, "course_ids": data.course_ids,
        "dob": data.dob, "address": data.address,
        "guardian_name": data.guardian_name, "guardian_phone": data.guardian_phone,
        "status": "onboarding", "syllabus_percentage": 0,
        "batch_id": None, "notes": "",
        "enrollment_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.students.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})

@students_router.get("/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return serialize_doc(student)

@students_router.put("/{student_id}")
async def update_student(student_id: str, data: StudentUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": update})
    return serialize_doc(await db.students.find_one({"_id": ObjectId(student_id)}))

@students_router.patch("/{student_id}/status")
async def update_student_status(student_id: str, data: StatusUpdate, user: dict = Depends(require_admin)):
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"status": data.status}})
    return serialize_doc(await db.students.find_one({"_id": ObjectId(student_id)}))

@students_router.post("/{student_id}/onboard")
async def onboard_student(student_id: str, data: OnboardStudent, user: dict = Depends(require_admin)):
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"status": "active", "batch_id": data.batch_id}}
    )
    return serialize_doc(await db.students.find_one({"_id": ObjectId(student_id)}))

@students_router.post("/{student_id}/complete")
async def complete_student(student_id: str, user: dict = Depends(require_admin)):
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"status": "completed", "syllabus_percentage": 100}}
    )
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    cert = {
        "student_id": student_id, "student_name": student.get("name"),
        "issued_date": datetime.now(timezone.utc).isoformat(),
        "certificate_id": f"CERT-{uuid.uuid4().hex[:8].upper()}",
    }
    await db.certificates.insert_one(cert)
    cert.pop("_id", None)
    return {"message": "Student completed and certificate generated", "certificate": cert}

@students_router.post("/{student_id}/promote")
async def promote_student(student_id: str, user: dict = Depends(require_admin)):
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    enquiry_doc = {
        "student_name": student.get("name"), "email": student.get("email"),
        "phone": student.get("phone"), "courses": student.get("course_ids", []),
        "stage": "new", "source": "promotion",
        "notes": "Re-enrolment lead from previous year student",
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    }
    result = await db.enquiries.insert_one(enquiry_doc)
    return {"message": "New CRM lead created for next year", "enquiry_id": str(result.inserted_id)}

# ========================
# TEACHER ROUTES
# ========================
teacher_router = APIRouter(prefix="/teacher", tags=["teacher"])

@teacher_router.get("/sessions")
async def get_teacher_sessions(user: dict = Depends(get_current_user)):
    teacher_id = user.get("_id") or user.get("id")
    if user.get("role") == "admin":
        sessions = await db.class_sessions.find().sort("start_time", 1).to_list(100)
    else:
        sessions = await db.class_sessions.find({"teacher_id": teacher_id}).sort("start_time", 1).to_list(100)
    return [serialize_doc(s) for s in sessions]

@teacher_router.get("/students")
async def get_teacher_students(user: dict = Depends(get_current_user)):
    students = await db.students.find({"status": "active"}).to_list(1000)
    return [serialize_doc(s) for s in students]

@teacher_router.get("/qr/{session_id}")
async def get_session_qr(session_id: str, user: dict = Depends(get_current_user)):
    qr_data = f"EDUTECH-SESSION-{session_id}"
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_data}&bgcolor=ffffff&color=002EB8"
    return {"qr_url": qr_url, "session_id": session_id, "qr_data": qr_data}

@teacher_router.post("/attendance")
async def mark_attendance(data: AttendanceMark, user: dict = Depends(get_current_user)):
    existing = await db.attendance.find_one({"session_id": data.session_id, "student_id": data.student_id})
    if existing:
        await db.attendance.update_one(
            {"session_id": data.session_id, "student_id": data.student_id},
            {"$set": {"status": data.status, "marked_at": datetime.now(timezone.utc)}}
        )
    else:
        student = await db.students.find_one({"_id": ObjectId(data.student_id)})
        student_name = student.get("name", "Unknown") if student else "Unknown"
        await db.attendance.insert_one({
            "session_id": data.session_id, "student_id": data.student_id,
            "student_name": student_name, "status": data.status,
            "marked_at": datetime.now(timezone.utc),
        })
    if data.status == "present":
        total = await db.attendance.count_documents({"student_id": data.student_id})
        present = await db.attendance.count_documents({"student_id": data.student_id, "status": "present"})
        pct = round((present / total * 100) if total > 0 else 0, 1)
        await db.students.update_one({"_id": ObjectId(data.student_id)}, {"$set": {"syllabus_percentage": pct}})
    return {"message": f"Attendance marked: {data.status}"}

@teacher_router.get("/attendance/{session_id}")
async def get_session_attendance(session_id: str, user: dict = Depends(get_current_user)):
    attendance = await db.attendance.find({"session_id": session_id}).to_list(1000)
    return [serialize_doc(a) for a in attendance]

@teacher_router.get("/batch-report")
async def get_batch_attendance_report(batch_id: str = None, user: dict = Depends(get_current_user)):
    if batch_id and batch_id != "all":
        students = await db.students.find({"batch_id": batch_id}).to_list(1000)
    else:
        students = await db.students.find({"status": {"$in": ["active", "completed", "onboarding"]}}).to_list(1000)
    report = []
    for student in students:
        sid = str(student["_id"])
        total = await db.attendance.count_documents({"student_id": sid})
        present = await db.attendance.count_documents({"student_id": sid, "status": "present"})
        pct = round((present / total * 100) if total > 0 else 0, 1)
        report.append({
            "student_id": sid,
            "student_name": student.get("name", "Unknown"),
            "batch_id": student.get("batch_id"),
            "total_sessions": total,
            "present": present,
            "absent": total - present,
            "attendance_pct": pct,
            "status": student.get("status"),
        })
    report.sort(key=lambda x: x["attendance_pct"], reverse=True)
    return report

# ========================
# PAYMENTS ROUTES (Razorpay)
# ========================
payments_router = APIRouter(prefix="/payments", tags=["payments"])

@payments_router.post("/create-order")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"_id": ObjectId(data.invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    amount_paise = int(data.amount * 100)
    rzp_key_id, rzp_key_secret = await get_razorpay_keys()
    if rzp_key_id and rzp_key_secret:
        try:
            import razorpay as rzp
            rz_client = rzp.Client(auth=(rzp_key_id, rzp_key_secret))
            receipt = f"rcpt_{data.invoice_id[:20]}"
            order = rz_client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1, "receipt": receipt})
            return {"order_id": order["id"], "amount": amount_paise, "currency": "INR", "key": rzp_key_id, "mock": False}
        except Exception as e:
            logger.error(f"Razorpay error: {e}")
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:16]}"
    return {"order_id": mock_order_id, "amount": amount_paise, "currency": "INR", "key": "rzp_test_demo", "mock": True}

@payments_router.post("/verify")
async def verify_payment(data: PaymentVerify, user: dict = Depends(get_current_user)):
    verified = False
    rzp_key_id, rzp_key_secret = await get_razorpay_keys()
    if rzp_key_id and rzp_key_secret and data.signature and not data.order_id.startswith("order_mock_"):
        try:
            import razorpay as rzp
            rz_client = rzp.Client(auth=(rzp_key_id, rzp_key_secret))
            rz_client.utility.verify_payment_signature({
                "razorpay_order_id": data.order_id,
                "razorpay_payment_id": data.payment_id,
                "razorpay_signature": data.signature
            })
            verified = True
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
    else:
        verified = True  # Mock/demo mode
    if verified:
        invoice = await db.invoices.find_one({"_id": ObjectId(data.invoice_id)})
        if invoice:
            new_paid = invoice.get("paid_amount", 0) + data.amount
            new_balance = max(0, invoice.get("total", 0) - new_paid)
            new_status = "paid" if new_balance <= 0 else "partial"
            await db.invoices.update_one(
                {"_id": ObjectId(data.invoice_id)},
                {"$set": {"paid_amount": new_paid, "balance": new_balance, "status": new_status}}
            )
            await db.payments.insert_one({
                "invoice_id": data.invoice_id, "payment_id": data.payment_id,
                "order_id": data.order_id, "amount": data.amount,
                "method": "razorpay", "created_at": datetime.now(timezone.utc)
            })
        return {"success": True, "payment_id": data.payment_id, "message": "Payment recorded successfully"}
    raise HTTPException(status_code=400, detail="Payment verification failed")

# ========================
# STUDENT PORTAL ROUTES
# ========================
portal_router = APIRouter(prefix="/portal", tags=["portal"])

@portal_router.get("/me")
async def portal_me(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return {"id": user.get("_id"), "name": user.get("name"), "email": user.get("email"), "role": user.get("role"), "no_student_record": True}
    return serialize_doc(student)

@portal_router.put("/me")
async def portal_update_me(data: PersonalUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.students.update_one({"email": user.get("email")}, {"$set": update})
    student = await db.students.find_one({"email": user.get("email")})
    return serialize_doc(student)

@portal_router.get("/invoices")
async def portal_invoices(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return []
    invoices = await db.invoices.find({"student_id": str(student["_id"])}).sort("created_at", -1).to_list(100)
    return [serialize_doc(i) for i in invoices]

@portal_router.get("/attendance")
async def portal_attendance(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return []
    attendance = await db.attendance.find({"student_id": str(student["_id"])}).sort("marked_at", -1).to_list(200)
    return [serialize_doc(a) for a in attendance]

@portal_router.get("/certificate")
async def portal_certificate(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student or student.get("status") != "completed":
        raise HTTPException(status_code=404, detail="No certificate found. Complete your course first.")
    cert = await db.certificates.find_one({"student_id": str(student["_id"])})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not yet generated.")
    return serialize_doc(cert)

@portal_router.get("/certificate/pdf")
async def portal_certificate_pdf(user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.colors import HexColor
    student = await db.students.find_one({"email": user.get("email")})
    if not student or student.get("status") != "completed":
        raise HTTPException(status_code=404, detail="No certificate found. Complete your course first.")
    cert = await db.certificates.find_one({"student_id": str(student["_id"])})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not yet generated.")
    buf = BytesIO()
    page_w, page_h = landscape(A4)
    c = rl_canvas.Canvas(buf, pagesize=landscape(A4))
    # White background
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    # Outer border (blue)
    c.setStrokeColor(HexColor("#002EB8"))
    c.setLineWidth(7)
    c.rect(18, 18, page_w - 36, page_h - 36, fill=0, stroke=1)
    # Inner border (gold)
    c.setStrokeColor(HexColor("#FFD600"))
    c.setLineWidth(2)
    c.rect(30, 30, page_w - 60, page_h - 60, fill=0, stroke=1)
    # Header bar
    c.setFillColor(HexColor("#002EB8"))
    c.rect(18, page_h - 95, page_w - 36, 77, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(page_w / 2, page_h - 54, "EDUTECH LMS")
    c.setFont("Helvetica", 11)
    c.drawCentredString(page_w / 2, page_h - 74, "CERTIFICATE OF COMPLETION")
    # Subtitle
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(page_w / 2, page_h - 136, "This is to certify that")
    # Student name
    student_name = cert.get("student_name", "Student")
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 38)
    c.drawCentredString(page_w / 2, page_h - 186, student_name)
    # Gold underline
    c.setStrokeColor(HexColor("#FFD600"))
    c.setLineWidth(2.5)
    name_w = c.stringWidth(student_name, "Helvetica-Bold", 38)
    c.line(page_w / 2 - name_w / 2 - 12, page_h - 194, page_w / 2 + name_w / 2 + 12, page_h - 194)
    # Description
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(page_w / 2, page_h - 226, "has successfully completed all required coursework and examinations")
    c.drawCentredString(page_w / 2, page_h - 246, "and is hereby awarded this Certificate of Completion.")
    # Info box
    box_x = page_w / 2 - 190
    box_y = page_h - 330
    c.setFillColor(HexColor("#F8F9FA"))
    c.roundRect(box_x, box_y, 380, 58, 8, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#E5E7EB"))
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, 380, 58, 8, fill=0, stroke=1)
    c.setStrokeColor(HexColor("#E5E7EB"))
    c.line(page_w / 2, box_y + 6, page_w / 2, box_y + 52)
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(page_w / 2 - 95, box_y + 45, "CERTIFICATE ID")
    c.drawCentredString(page_w / 2 + 95, box_y + 45, "ISSUE DATE")
    c.setFillColor(HexColor("#002EB8"))
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2 - 95, box_y + 18, cert.get("certificate_id", "N/A"))
    issued = cert.get("issued_date", "")
    try:
        issued_str = datetime.fromisoformat(issued.replace("Z", "+00:00")).strftime("%B %d, %Y")
    except Exception:
        issued_str = issued[:10] if issued else "N/A"
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2 + 95, box_y + 18, issued_str)
    # Footer strip
    c.setFillColor(HexColor("#EEF2FF"))
    c.rect(18, 18, page_w - 36, 28, fill=1, stroke=0)
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(page_w / 2, 28, "EduTech LMS  ·  Institute Management Platform  ·  Digitally Authenticated Certificate")
    c.save()
    buf.seek(0)
    safe_name = student_name.replace(" ", "_")
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=EduTech_Certificate_{safe_name}.pdf"
    })

@portal_router.post("/fee-query")
async def portal_fee_query(data: FeeQuery, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    await db.fee_queries.insert_one({
        "student_id": str(student["_id"]), "student_name": student.get("name"),
        "student_email": user.get("email"), "message": data.message,
        "status": "open", "created_at": datetime.now(timezone.utc)
    })
    # Notify admin via email if Resend is configured
    if RESEND_API_KEY:
        admin = await db.users.find_one({"role": "admin"})
        if admin and admin.get("email"):
            try:
                resend.api_key = RESEND_API_KEY
                html = f"""<html><body style="font-family:sans-serif;padding:24px;">
                <h2 style="color:#002EB8;">Fee Query Received</h2>
                <p><strong>From:</strong> {student.get('name')} ({user.get('email')})</p>
                <p><strong>Query:</strong> {data.message}</p>
                <p style="color:#8A8F98;font-size:12px;">EduTech LMS — Student Portal</p>
                </body></html>"""
                params = {"from": f"EduTech LMS <{SENDER_EMAIL}>", "to": [admin["email"]], "subject": f"Fee Query from {student.get('name')}", "html": html}
                await asyncio.to_thread(resend.Emails.send, params)
            except Exception as e:
                logger.error(f"Email error: {e}")
    return {"message": "Fee query submitted. Admin will respond shortly."}

# ========================
# WHATSAPP WEBHOOKS
# ========================
WHATSAPP_VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "edutech-whatsapp-verify-2024")
webhooks_router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@webhooks_router.get("/whatsapp")
async def whatsapp_verify(request: Request):
    hub_mode = request.query_params.get("hub.mode")
    hub_token = request.query_params.get("hub.verify_token")
    hub_challenge = request.query_params.get("hub.challenge")
    if hub_mode == "subscribe" and hub_token == WHATSAPP_VERIFY_TOKEN:
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=hub_challenge or "")
    raise HTTPException(status_code=403, detail="Invalid verify token")

@webhooks_router.post("/whatsapp")
async def whatsapp_receive(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
            # Meta WhatsApp Cloud API format
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    contacts = value.get("contacts", [])
                    for msg in messages:
                        if msg.get("type") == "text":
                            phone = msg.get("from", "")
                            text = msg.get("text", {}).get("body", "")
                            name = contacts[0]["profile"]["name"] if contacts else f"WhatsApp +{phone}"
                            await db.enquiries.insert_one({
                                "student_name": name, "email": f"wa_{phone}@whatsapp.com",
                                "phone": phone, "courses": [], "stage": "new", "source": "whatsapp",
                                "notes": f"WhatsApp: {text[:200]}",
                                "created_at": datetime.now(timezone.utc),
                                "updated_at": datetime.now(timezone.utc),
                            })
                            logger.info(f"WhatsApp lead created: {name} ({phone})")
        else:
            # Twilio form-encoded format
            form = await request.form()
            phone = str(form.get("From", "")).replace("whatsapp:", "").strip()
            text = str(form.get("Body", ""))
            name = str(form.get("ProfileName", f"WhatsApp {phone}"))
            if phone:
                await db.enquiries.insert_one({
                    "student_name": name, "email": f"wa_{phone.replace('+','')}@whatsapp.com",
                    "phone": phone, "courses": [], "stage": "new", "source": "whatsapp",
                    "notes": f"WhatsApp: {text[:200]}",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                })
                logger.info(f"Twilio WhatsApp lead: {name} ({phone})")
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}")
    return {"status": "ok"}

# ========================
# SETTINGS ROUTES
# ========================
settings_router = APIRouter(prefix="/settings", tags=["settings"])

@settings_router.get("/razorpay")
async def get_razorpay_config(user: dict = Depends(require_admin)):
    db_settings = await db.app_settings.find_one({"key": "razorpay"})
    if db_settings and db_settings.get("key_id"):
        return {"key_id": db_settings.get("key_id", ""), "has_secret": bool(db_settings.get("key_secret", "")), "configured": bool(db_settings.get("key_id") and db_settings.get("key_secret")), "source": "database"}
    return {"key_id": RAZORPAY_KEY_ID or "", "has_secret": bool(RAZORPAY_KEY_SECRET), "configured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET), "source": "environment"}

@settings_router.post("/razorpay")
async def save_razorpay_config(data: RazorpaySettings, user: dict = Depends(require_admin)):
    await db.app_settings.update_one(
        {"key": "razorpay"},
        {"$set": {"key": "razorpay", "key_id": data.key_id, "key_secret": data.key_secret, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Razorpay settings saved successfully", "configured": True}

@settings_router.get("/whatsapp-webhook")
async def get_whatsapp_info(request: Request, user: dict = Depends(require_admin)):
    backend_url = FRONTEND_URL or str(request.base_url).rstrip("/")
    return {"webhook_url": f"{backend_url}/api/webhooks/whatsapp", "verify_token": WHATSAPP_VERIFY_TOKEN}

# ========================
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(branches_router)
api_router.include_router(courses_router)
api_router.include_router(enquiries_router)
api_router.include_router(academic_router)
api_router.include_router(finance_router)
api_router.include_router(dashboard_router)
api_router.include_router(students_router)
api_router.include_router(teacher_router)
api_router.include_router(payments_router)
api_router.include_router(portal_router)
api_router.include_router(webhooks_router)
api_router.include_router(settings_router)
app.include_router(api_router)

# ========================
# STARTUP
# ========================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.students.create_index("email")
    await db.enquiries.create_index("stage")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@edutech.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "name": "Admin", "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin", "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    branch_count = await db.branches.count_documents({})
    if branch_count == 0:
        branches = [
            {"name": "Pune Branch", "location": "Pune, Maharashtra", "created_at": datetime.now(timezone.utc)},
            {"name": "Mumbai Branch", "location": "Mumbai, Maharashtra", "created_at": datetime.now(timezone.utc)},
            {"name": "Nashik Branch", "location": "Nashik, Maharashtra", "created_at": datetime.now(timezone.utc)},
        ]
        await db.branches.insert_many(branches)
        inserted_branches = await db.branches.find().to_list(10)
        branch_ids = [str(b["_id"]) for b in inserted_branches]
        courses_data = [
            {"name": "12th HSC Science", "category": "HSC", "branch_id": branch_ids[0], "base_fee": 25000, "created_at": datetime.now(timezone.utc)},
            {"name": "CET Preparation", "category": "Competitive", "branch_id": branch_ids[0], "base_fee": 35000, "created_at": datetime.now(timezone.utc)},
            {"name": "JEE Main", "category": "Engineering", "branch_id": branch_ids[1], "base_fee": 55000, "created_at": datetime.now(timezone.utc)},
            {"name": "NEET Preparation", "category": "Medical", "branch_id": branch_ids[1], "base_fee": 60000, "created_at": datetime.now(timezone.utc)},
            {"name": "CA Foundation", "category": "Commerce", "branch_id": branch_ids[2], "base_fee": 40000, "created_at": datetime.now(timezone.utc)},
        ]
        await db.courses.insert_many(courses_data)
        await db.enquiries.insert_many([
            {"student_name": "Arjun Sharma", "email": "arjun@email.com", "phone": "9876543210", "courses": [], "stage": "new", "source": "website", "notes": "Interested in JEE preparation", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Priya Patel", "email": "priya@email.com", "phone": "9876543211", "courses": [], "stage": "followup", "source": "whatsapp", "notes": "Called back, very interested in HSC batch", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Rahul Kumar", "email": "rahul@email.com", "phone": "9876543212", "courses": [], "stage": "converted", "source": "manual", "notes": "Enrolled in CET batch successfully", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Sneha Joshi", "email": "sneha@email.com", "phone": "9876543213", "courses": [], "stage": "missed", "source": "google_forms", "notes": "Did not respond to follow-up calls", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Dev Kapoor", "email": "dev@email.com", "phone": "9876543214", "courses": [], "stage": "declined", "source": "website", "notes": "Opted for another institute", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
        ])
        students_data = [
            {"name": "Rahul Kumar", "email": "rahul.s@email.com", "phone": "9876543212", "branch_id": branch_ids[0], "course_ids": [], "status": "active", "syllabus_percentage": 65, "batch_id": None, "notes": "", "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Anjali Singh", "email": "anjali@email.com", "phone": "9876543215", "branch_id": branch_ids[1], "course_ids": [], "status": "onboarding", "syllabus_percentage": 0, "batch_id": None, "notes": "", "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Vikram Mehta", "email": "vikram@email.com", "phone": "9876543216", "branch_id": branch_ids[0], "course_ids": [], "status": "completed", "syllabus_percentage": 100, "batch_id": None, "notes": "", "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Meera Nair", "email": "meera@email.com", "phone": "9876543217", "branch_id": branch_ids[2], "course_ids": [], "status": "active", "syllabus_percentage": 42, "batch_id": None, "notes": "", "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
        ]
        await db.students.insert_many(students_data)
        logger.info("Sample data seeded")

@app.on_event("shutdown")
async def shutdown():
    client.close()
