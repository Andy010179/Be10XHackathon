from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc
from dependencies import require_parent

parent_router = APIRouter(prefix="/parent", tags=["parent"])


@parent_router.get("/dashboard")
async def parent_dashboard(user: dict = Depends(require_parent)):
    student_id = user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=404, detail="No student linked to this parent account")
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    invoices = await db.invoices.find({"student_id": student_id}).to_list(100)
    attendance = await db.attendance.find({"student_id": student_id}).sort("created_at", -1).to_list(50)
    total_sessions = len(attendance)
    present = sum(1 for a in attendance if a.get("status") == "present")
    attendance_pct = round((present / total_sessions * 100), 1) if total_sessions > 0 else 0
    total_fees = sum(i.get("total", 0) for i in invoices)
    paid_fees = sum(i.get("paid_amount", 0) for i in invoices)
    balance = sum(i.get("balance", 0) for i in invoices)
    return {
        "student": serialize_doc(student),
        "attendance_summary": {"total": total_sessions, "present": present, "percentage": attendance_pct},
        "fee_summary": {"total": total_fees, "paid": paid_fees, "balance": balance},
    }


@parent_router.get("/attendance")
async def parent_attendance(user: dict = Depends(require_parent)):
    student_id = user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=404, detail="No student linked")
    records = await db.attendance.find({"student_id": student_id}).sort("created_at", -1).to_list(200)
    return [serialize_doc(r) for r in records]


@parent_router.get("/fees")
async def parent_fees(user: dict = Depends(require_parent)):
    student_id = user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=404, detail="No student linked")
    invoices = await db.invoices.find({"student_id": student_id}).sort("created_at", -1).to_list(100)
    return [serialize_doc(i) for i in invoices]


@parent_router.get("/academic")
async def parent_academic(user: dict = Depends(require_parent)):
    student_id = user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=404, detail="No student linked")
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    batch_ids = student.get("batch_ids") or ([student.get("batch_id")] if student.get("batch_id") else [])
    batches, schedules = [], []
    for bid in batch_ids:
        try:
            b = await db.batches.find_one({"_id": ObjectId(bid)})
            if b:
                batches.append(serialize_doc(b))
                sched = await db.schedules.find({"batch_id": bid}).to_list(50)
                schedules.extend([serialize_doc(s) for s in sched])
        except Exception:
            pass
    return {"student": serialize_doc(student), "batches": batches, "schedules": schedules}
