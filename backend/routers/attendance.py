from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import logger
from dependencies import get_current_user

attendance_router = APIRouter(prefix="/attendance", tags=["attendance"])


@attendance_router.post("/qr-checkin")
async def qr_checkin(data: dict, user: dict = Depends(get_current_user)):
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can check in via QR")
    student_uid = user.get("student_id")
    if not student_uid:
        student = await db.students.find_one({"user_id": user.get("id") or str(user.get("_id", ""))})
        if student:
            student_uid = str(student["_id"])
        else:
            raise HTTPException(status_code=403, detail="No student record linked to this account")
    try:
        session = await db.schedules.find_one({"_id": ObjectId(session_id)})
    except Exception:
        session = None
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    existing = await db.attendance.find_one({"session_id": session_id, "student_id": student_uid})
    if existing:
        return {"already_marked": True, "status": existing.get("status"), "message": "Attendance already recorded"}
    student_doc = await db.students.find_one({"_id": ObjectId(student_uid)})
    student_name = (student_doc or {}).get("name", user.get("name", "Student"))
    await db.attendance.insert_one({
        "session_id": session_id, "student_id": student_uid, "student_name": student_name,
        "batch_id": session.get("batch_id", ""), "status": "present",
        "method": "qr_scan", "created_at": datetime.now(timezone.utc),
    })
    return {"success": True, "message": f"Welcome, {student_name}! Marked Present."}
