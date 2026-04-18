from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc
from dependencies import get_current_user, require_admin
from models import ScheduleCreate, ScheduleUpdate, BatchCreate, BatchUpdate

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


@academic_router.put("/schedule/{session_id}")
async def update_schedule(session_id: str, data: ScheduleUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.class_sessions.update_one({"_id": ObjectId(session_id)}, {"$set": update})
    return serialize_doc(await db.class_sessions.find_one({"_id": ObjectId(session_id)}))


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


@academic_router.put("/batches/{batch_id}")
async def update_batch(batch_id: str, data: BatchUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.batches.update_one({"_id": ObjectId(batch_id)}, {"$set": update})
    return serialize_doc(await db.batches.find_one({"_id": ObjectId(batch_id)}))
