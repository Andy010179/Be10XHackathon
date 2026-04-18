from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, hash_password
from dependencies import require_super_admin
from models import InstituteCreate, InstituteUpdate

institutes_router = APIRouter(prefix="/institutes", tags=["institutes"])


@institutes_router.get("")
async def list_institutes(user: dict = Depends(require_super_admin)):
    insts = await db.institutes.find().sort("created_at", -1).to_list(1000)
    result = []
    for inst in insts:
        iid = str(inst["_id"])
        d = serialize_doc(inst)
        d["student_count"] = await db.students.count_documents({"institute_id": iid})
        d["enquiry_count"] = await db.enquiries.count_documents({"institute_id": iid})
        d["user_count"] = await db.users.count_documents({"institute_id": iid})
        result.append(d)
    return result


@institutes_router.post("")
async def create_institute(data: InstituteCreate, user: dict = Depends(require_super_admin)):
    code = data.code.strip().upper()
    if await db.institutes.find_one({"code": code}):
        raise HTTPException(status_code=400, detail=f"Institute code '{code}' already exists")
    if await db.users.find_one({"email": data.admin_email.lower().strip()}):
        raise HTTPException(status_code=400, detail="Admin email already registered")
    inst_doc = {
        "name": data.name.strip(), "code": code,
        "phone": data.phone or "", "address": data.address or "",
        "is_active": True, "created_at": datetime.now(timezone.utc),
    }
    result = await db.institutes.insert_one(inst_doc)
    institute_id = str(result.inserted_id)
    await db.users.insert_one({
        "name": data.admin_name.strip(),
        "email": data.admin_email.lower().strip(),
        "password_hash": hash_password(data.admin_password),
        "role": "admin", "institute_id": institute_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {**serialize_doc(inst_doc), "id": institute_id}


@institutes_router.patch("/{institute_id}")
async def update_institute(institute_id: str, data: InstituteUpdate, user: dict = Depends(require_super_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.institutes.update_one({"_id": ObjectId(institute_id)}, {"$set": update})
    return serialize_doc(await db.institutes.find_one({"_id": ObjectId(institute_id)}))


@institutes_router.delete("/{institute_id}")
async def delete_institute(institute_id: str, user: dict = Depends(require_super_admin)):
    await db.institutes.delete_one({"_id": ObjectId(institute_id)})
    return {"message": "Institute deleted"}


@institutes_router.post("/{institute_id}/reset-admin-password")
async def reset_admin_password(institute_id: str, data: dict, user: dict = Depends(require_super_admin)):
    new_password = data.get("new_password", "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    inst = await db.institutes.find_one({"_id": ObjectId(institute_id)})
    if not inst:
        raise HTTPException(status_code=404, detail="Institute not found")
    admin = await db.users.find_one({"institute_id": institute_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="No admin user found for this institute")
    await db.users.update_one(
        {"_id": admin["_id"]},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    return {"message": f"Password updated for {admin.get('email')}", "admin_email": admin.get("email")}
