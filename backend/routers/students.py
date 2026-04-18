from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
from models import StudentCreate, StudentUpdate, StatusUpdate, OnboardStudent
import uuid

students_router = APIRouter(prefix="/students", tags=["students"])


@students_router.get("")
async def list_students(user: dict = Depends(get_current_user)):
    students = await db.students.find(ifilter(user)).sort("created_at", -1).to_list(1000)
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
        "institute_id": user.get("institute_id"),
        "enrollment_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.students.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})


@students_router.get("/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    student = await db.students.find_one(ifilter(user, {"_id": ObjectId(student_id)}))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return serialize_doc(student)


@students_router.put("/{student_id}")
async def update_student(student_id: str, data: StudentUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.students.update_one(ifilter(user, {"_id": ObjectId(student_id)}), {"$set": update})
    return serialize_doc(await db.students.find_one({"_id": ObjectId(student_id)}))


@students_router.patch("/{student_id}/status")
async def update_student_status(student_id: str, data: StatusUpdate, user: dict = Depends(require_admin)):
    await db.students.update_one(ifilter(user, {"_id": ObjectId(student_id)}), {"$set": {"status": data.status}})
    return serialize_doc(await db.students.find_one({"_id": ObjectId(student_id)}))


@students_router.post("/{student_id}/onboard")
async def onboard_student(student_id: str, data: OnboardStudent, user: dict = Depends(require_admin)):
    all_batch_ids = data.batch_ids or ([data.batch_id] if data.batch_id else [])
    if not all_batch_ids:
        raise HTTPException(status_code=400, detail="At least one batch must be selected")
    primary_batch = all_batch_ids[0]
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"status": "active", "batch_id": primary_batch, "batch_ids": all_batch_ids}}
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
        "institute_id": user.get("institute_id"),
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
        "institute_id": user.get("institute_id"),
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    }
    result = await db.enquiries.insert_one(enquiry_doc)
    return {"message": "New CRM lead created for next year", "enquiry_id": str(result.inserted_id)}
