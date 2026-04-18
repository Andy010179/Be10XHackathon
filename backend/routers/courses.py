from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
from models import CourseCreate

courses_router = APIRouter(prefix="/courses", tags=["courses"])


@courses_router.get("")
async def list_courses(user: dict = Depends(get_current_user)):
    courses = await db.courses.find(ifilter(user)).to_list(1000)
    return [serialize_doc(c) for c in courses]


@courses_router.post("")
async def create_course(data: CourseCreate, user: dict = Depends(require_admin)):
    doc = {
        "name": data.name, "category": data.category, "branch_id": data.branch_id,
        "base_fee": data.base_fee, "teacher_id": data.teacher_id,
        "institute_id": user.get("institute_id"),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.courses.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})


@courses_router.put("/{course_id}")
async def update_course(course_id: str, data: CourseCreate, user: dict = Depends(require_admin)):
    await db.courses.update_one(
        ifilter(user, {"_id": ObjectId(course_id)}),
        {"$set": {
            "name": data.name, "category": data.category, "branch_id": data.branch_id,
            "base_fee": data.base_fee, "teacher_id": data.teacher_id
        }}
    )
    return serialize_doc(await db.courses.find_one({"_id": ObjectId(course_id)}))


@courses_router.delete("/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_admin)):
    await db.courses.delete_one(ifilter(user, {"_id": ObjectId(course_id)}))
    return {"message": "Course deleted"}
