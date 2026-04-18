from fastapi import APIRouter, Depends
from fastapi.responses import Response as FastAPIResponse
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import serialize_doc, ifilter, send_sms_alert
from dependencies import get_current_user
from models import AttendanceMark
import asyncio
import os
import qrcode

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
    frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
    base = os.environ.get("APP_FRONTEND_URL", frontend_url or "https://skill-academy-77.preview.emergentagent.com")
    scan_url = f"{base}/attendance/scan?session={session_id}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=8, border=4)
    qr.add_data(scan_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return FastAPIResponse(content=buf.read(), media_type="image/png")


@teacher_router.post("/attendance")
async def mark_attendance(data: AttendanceMark, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"_id": ObjectId(data.student_id)})
    student_name = student.get("name", "Unknown") if student else "Unknown"
    existing = await db.attendance.find_one({"session_id": data.session_id, "student_id": data.student_id})
    if existing:
        await db.attendance.update_one(
            {"session_id": data.session_id, "student_id": data.student_id},
            {"$set": {"status": data.status, "marked_at": datetime.now(timezone.utc)}}
        )
    else:
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
    if data.status == "absent":
        parents = await db.users.find({"role": "parent", "student_id": data.student_id}).to_list(5)
        today = datetime.now(timezone.utc).strftime("%d %b %Y")
        sms_body = f"EduTech LMS: {student_name} was marked ABSENT today ({today}). Please contact the institute for details."
        for parent in parents:
            phone = parent.get("phone", "").strip()
            if phone:
                asyncio.create_task(send_sms_alert(phone, sms_body))
    return {"message": f"Attendance marked: {data.status}"}


@teacher_router.get("/attendance/{session_id}")
async def get_session_attendance(session_id: str, user: dict = Depends(get_current_user)):
    attendance = await db.attendance.find({"session_id": session_id}).to_list(1000)
    return [serialize_doc(a) for a in attendance]


@teacher_router.get("/batch-report")
async def get_batch_attendance_report(batch_id: str = None, user: dict = Depends(get_current_user)):
    if batch_id and batch_id != "all":
        students = await db.students.find(ifilter(user, {"batch_id": batch_id})).to_list(1000)
    else:
        students = await db.students.find(ifilter(user, {"status": {"$in": ["active", "completed", "onboarding"]}})).to_list(1000)
    student_ids = [str(s["_id"]) for s in students]
    all_attendance = await db.attendance.find({"student_id": {"$in": student_ids}}).to_list(10000)
    attendance_map = {}
    for att in all_attendance:
        sid = att.get("student_id")
        if sid not in attendance_map:
            attendance_map[sid] = {"total": 0, "present": 0}
        attendance_map[sid]["total"] += 1
        if att.get("status") == "present":
            attendance_map[sid]["present"] += 1
    report = []
    for student in students:
        sid = str(student["_id"])
        stats = attendance_map.get(sid, {"total": 0, "present": 0})
        total = stats["total"]
        present = stats["present"]
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
