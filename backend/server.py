from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from datetime import datetime, timezone

from database import db, client
from helpers import hash_password, verify_password, logger

from routers.auth import auth_router
from routers.users import users_router
from routers.branches import branches_router
from routers.courses import courses_router
from routers.enquiries import enquiries_router
from routers.academic import academic_router
from routers.finance import finance_router
from routers.dashboard import dashboard_router
from routers.students import students_router
from routers.teacher import teacher_router
from routers.attendance import attendance_router
from routers.payments import payments_router
from routers.portal import portal_router
from routers.webhooks import webhooks_router
from routers.settings import settings_router
from routers.admin import admin_router
from routers.institutes import institutes_router
from routers.parent import parent_router
from routers.public import public_router

logging.basicConfig(level=logging.INFO)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

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
api_router.include_router(attendance_router)
api_router.include_router(payments_router)
api_router.include_router(portal_router)
api_router.include_router(webhooks_router)
api_router.include_router(settings_router)
api_router.include_router(admin_router)
api_router.include_router(institutes_router)
api_router.include_router(parent_router)
api_router.include_router(public_router)

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    default_inst = await db.institutes.find_one({"code": "DEFAULT"})
    if not default_inst:
        res = await db.institutes.insert_one({
            "name": "EduTech Academy",
            "code": "DEFAULT",
            "phone": "",
            "address": "",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        })
        default_id = str(res.inserted_id)
        logger.info(f"Created default institute: {default_id}")
    else:
        default_id = str(default_inst["_id"])

    colls = ["users", "students", "enquiries", "invoices", "payments",
             "attendance", "fee_queries", "branches", "courses", "batches",
             "schedules", "certificates", "class_sessions"]
    for coll in colls:
        r = await db[coll].update_many(
            {"institute_id": {"$exists": False}},
            {"$set": {"institute_id": default_id}}
        )
        if r.modified_count:
            logger.info(f"Migrated {r.modified_count} docs in '{coll}' to default institute")

    if not await db.users.find_one({"role": "super_admin"}):
        await db.users.insert_one({
            "name": "Super Admin",
            "email": "superadmin@edutech.com",
            "password_hash": hash_password("SuperAdmin@123"),
            "role": "super_admin",
            "institute_id": None,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Super Admin seeded: superadmin@edutech.com / SuperAdmin@123")

    if not await db.users.find_one({"email": "admin@edutech.com"}):
        await db.users.insert_one({
            "name": "Admin", "email": "admin@edutech.com",
            "password_hash": hash_password("admin123"),
            "role": "admin", "institute_id": default_id,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Default admin seeded")

    try:
        await db.users.create_index("email", unique=True)
        await db.students.create_index("email")
        await db.enquiries.create_index("stage")
    except Exception:
        pass

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

    if await db.branches.count_documents({}) == 0:
        branches = [
            {"name": "Pune Branch", "location": "Pune, Maharashtra", "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "Mumbai Branch", "location": "Mumbai, Maharashtra", "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "Nashik Branch", "location": "Nashik, Maharashtra", "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
        ]
        await db.branches.insert_many(branches)
        inserted_branches = await db.branches.find().to_list(10)
        branch_ids = [str(b["_id"]) for b in inserted_branches]
        courses_data = [
            {"name": "12th HSC Science", "category": "HSC", "branch_id": branch_ids[0], "base_fee": 25000, "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "CET Preparation", "category": "Competitive", "branch_id": branch_ids[0], "base_fee": 35000, "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "JEE Main", "category": "Engineering", "branch_id": branch_ids[1], "base_fee": 55000, "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "NEET Preparation", "category": "Medical", "branch_id": branch_ids[1], "base_fee": 60000, "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
            {"name": "CA Foundation", "category": "Commerce", "branch_id": branch_ids[2], "base_fee": 40000, "institute_id": default_id, "created_at": datetime.now(timezone.utc)},
        ]
        await db.courses.insert_many(courses_data)
        await db.enquiries.insert_many([
            {"student_name": "Arjun Sharma", "email": "arjun@email.com", "phone": "9876543210", "courses": [], "stage": "new", "source": "website", "notes": "Interested in JEE preparation", "institute_id": default_id, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Priya Patel", "email": "priya@email.com", "phone": "9876543211", "courses": [], "stage": "followup", "source": "whatsapp", "notes": "Called back, very interested in HSC batch", "institute_id": default_id, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Rahul Kumar", "email": "rahul@email.com", "phone": "9876543212", "courses": [], "stage": "converted", "source": "manual", "notes": "Enrolled in CET batch successfully", "institute_id": default_id, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Sneha Joshi", "email": "sneha@email.com", "phone": "9876543213", "courses": [], "stage": "missed", "source": "google_forms", "notes": "Did not respond to follow-up calls", "institute_id": default_id, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            {"student_name": "Dev Kapoor", "email": "dev@email.com", "phone": "9876543214", "courses": [], "stage": "declined", "source": "website", "notes": "Opted for another institute", "institute_id": default_id, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
        ])
        await db.students.insert_many([
            {"name": "Rahul Kumar", "email": "rahul.s@email.com", "phone": "9876543212", "branch_id": branch_ids[0], "course_ids": [], "status": "active", "syllabus_percentage": 65, "batch_id": None, "notes": "", "institute_id": default_id, "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Anjali Singh", "email": "anjali@email.com", "phone": "9876543215", "branch_id": branch_ids[1], "course_ids": [], "status": "onboarding", "syllabus_percentage": 0, "batch_id": None, "notes": "", "institute_id": default_id, "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Vikram Mehta", "email": "vikram@email.com", "phone": "9876543216", "branch_id": branch_ids[0], "course_ids": [], "status": "completed", "syllabus_percentage": 100, "batch_id": None, "notes": "", "institute_id": default_id, "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
            {"name": "Meera Nair", "email": "meera@email.com", "phone": "9876543217", "branch_id": branch_ids[2], "course_ids": [], "status": "active", "syllabus_percentage": 42, "batch_id": None, "notes": "", "institute_id": default_id, "enrollment_date": datetime.now(timezone.utc).isoformat(), "created_at": datetime.now(timezone.utc)},
        ])
        logger.info("Sample data seeded")


@app.on_event("shutdown")
async def shutdown():
    client.close()
