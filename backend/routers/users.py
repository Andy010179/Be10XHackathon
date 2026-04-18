from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, ifilter, hash_password
from dependencies import require_admin
from models import UserCreate, UserUpdate

users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("")
async def list_users(user: dict = Depends(require_admin)):
    users = await db.users.find(ifilter(user), {"password_hash": 0}).to_list(1000)
    return [serialize_doc(u) for u in users]


@users_router.post("")
async def create_user(data: UserCreate, user: dict = Depends(require_admin)):
    name = data.name
    email = data.email.lower()
    iid = user.get("institute_id")
    if data.role == "student" and data.student_id:
        try:
            student = await db.students.find_one({"_id": ObjectId(data.student_id)})
            if student:
                name = student.get("name", name)
                email = student.get("email", email).lower()
        except Exception:
            pass
    existing = await db.users.find_one({"email": email, "institute_id": iid} if iid else {"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "name": name, "email": email,
        "password_hash": hash_password(data.password),
        "role": data.role, "branch_id": data.branch_id,
        "student_id": data.student_id if data.role == "student" else None,
        "institute_id": iid,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    if data.role == "student" and data.student_id:
        try:
            await db.students.update_one(
                {"_id": ObjectId(data.student_id)},
                {"$set": {"user_id": str(result.inserted_id)}}
            )
        except Exception:
            pass
    return {"id": str(result.inserted_id), "name": name, "email": email, "role": data.role}


@users_router.delete("/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    await db.users.delete_one(ifilter(user, {"_id": ObjectId(user_id)}))
    return {"message": "User deleted"}


@users_router.put("/{user_id}")
async def update_user(user_id: str, data: UserUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None and k != "new_password"}
    if "email" in update:
        update["email"] = update["email"].lower()
    if data.new_password:
        if len(data.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        update["password_hash"] = hash_password(data.new_password)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one(ifilter(user, {"_id": ObjectId(user_id)}), {"$set": update})
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return serialize_doc(updated)
