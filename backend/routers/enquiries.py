from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, ifilter, auto_create_student_from_enquiry
from dependencies import get_current_user
from models import EnquiryCreate, StageUpdate
import math
import re as _re

enquiries_router = APIRouter(prefix="/enquiries", tags=["enquiries"])


@enquiries_router.get("")
async def list_enquiries(
    user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 15,
    search: str = None,
):
    q = ifilter(user)
    if search:
        q["$or"] = [
            {"student_name": {"$regex": _re.escape(search), "$options": "i"}},
            {"email": {"$regex": _re.escape(search), "$options": "i"}},
            {"phone": {"$regex": _re.escape(search), "$options": "i"}},
            {"city": {"$regex": _re.escape(search), "$options": "i"}},
        ]
    total = await db.enquiries.count_documents(q)
    effective_limit = min(max(1, limit), 500)
    skip = (max(1, page) - 1) * effective_limit
    pages = max(1, math.ceil(total / effective_limit))
    enquiries = await db.enquiries.find(q).sort("created_at", -1).skip(skip).limit(effective_limit).to_list(effective_limit)
    return {"items": [serialize_doc(e) for e in enquiries], "total": total, "page": max(1, page), "pages": pages}


@enquiries_router.post("")
async def create_enquiry(data: EnquiryCreate, user: dict = Depends(get_current_user)):
    doc = {
        "student_name": data.student_name, "email": data.email, "phone": data.phone,
        "courses": data.courses, "stage": data.stage, "source": data.source,
        "notes": data.notes, "city": data.city, "address": data.address,
        "institute_id": user.get("institute_id"),
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    }
    result = await db.enquiries.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})


@enquiries_router.put("/{enquiry_id}")
async def update_enquiry(enquiry_id: str, data: EnquiryCreate, user: dict = Depends(get_current_user)):
    update = {
        "student_name": data.student_name, "email": data.email, "phone": data.phone,
        "courses": data.courses, "source": data.source, "notes": data.notes,
        "city": data.city, "updated_at": datetime.now(timezone.utc),
    }
    await db.enquiries.update_one(ifilter(user, {"_id": ObjectId(enquiry_id)}), {"$set": update})
    enquiry = await db.enquiries.find_one({"_id": ObjectId(enquiry_id)})
    result = serialize_doc(enquiry)
    if data.stage == "converted":
        created, student_id = await auto_create_student_from_enquiry(enquiry)
        result["student_created"] = created
        result["student_id"] = student_id
    return result


@enquiries_router.patch("/{enquiry_id}/stage")
async def update_stage(enquiry_id: str, data: StageUpdate, user: dict = Depends(get_current_user)):
    await db.enquiries.update_one(
        ifilter(user, {"_id": ObjectId(enquiry_id)}),
        {"$set": {"stage": data.stage, "updated_at": datetime.now(timezone.utc)}}
    )
    enquiry = await db.enquiries.find_one({"_id": ObjectId(enquiry_id)})
    result = serialize_doc(enquiry)
    if data.stage == "converted":
        created, student_id = await auto_create_student_from_enquiry(enquiry)
        result["student_created"] = created
        result["student_id"] = student_id
    return result


@enquiries_router.delete("/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, user: dict = Depends(get_current_user)):
    await db.enquiries.delete_one(ifilter(user, {"_id": ObjectId(enquiry_id)}))
    return {"message": "Enquiry deleted"}
