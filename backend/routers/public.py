from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import logger
from dependencies import get_current_user
from models import PublicEnquiryCreate

public_router = APIRouter(tags=["public"])


@public_router.post("/public/enquiry")
async def public_submit_enquiry(data: PublicEnquiryCreate):
    iid = None
    if data.institute_code:
        inst = await db.institutes.find_one({"code": data.institute_code.strip().upper(), "is_active": True})
        if inst:
            iid = str(inst["_id"])
    if not iid:
        default_inst = await db.institutes.find_one({"code": "DEFAULT"})
        if default_inst:
            iid = str(default_inst["_id"])
    doc = {
        "student_name": data.student_name.strip(),
        "email": data.email.strip().lower(),
        "phone": data.phone.strip(),
        "address": data.address.strip() if data.address else "",
        "city": data.city.strip() if data.city else "",
        "notes": data.interest.strip(),
        "courses": [], "stage": "new", "source": "web_form",
        "institute_id": iid,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.enquiries.insert_one(doc)
    return {"success": True, "message": "Thank you! Your enquiry has been submitted. We will get in touch with you soon."}
