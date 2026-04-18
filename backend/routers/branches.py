from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
from models import BranchCreate

branches_router = APIRouter(prefix="/branches", tags=["branches"])


@branches_router.get("")
async def list_branches(user: dict = Depends(get_current_user)):
    branches = await db.branches.find(ifilter(user)).to_list(1000)
    return [serialize_doc(b) for b in branches]


@branches_router.post("")
async def create_branch(data: BranchCreate, user: dict = Depends(require_admin)):
    doc = {
        "name": data.name, "location": data.location,
        "institute_id": user.get("institute_id"),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.branches.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})


@branches_router.put("/{branch_id}")
async def update_branch(branch_id: str, data: BranchCreate, user: dict = Depends(require_admin)):
    await db.branches.update_one(
        ifilter(user, {"_id": ObjectId(branch_id)}),
        {"$set": {"name": data.name, "location": data.location}}
    )
    return serialize_doc(await db.branches.find_one({"_id": ObjectId(branch_id)}))


@branches_router.delete("/{branch_id}")
async def delete_branch(branch_id: str, user: dict = Depends(require_admin)):
    await db.branches.delete_one(ifilter(user, {"_id": ObjectId(branch_id)}))
    return {"message": "Branch deleted"}
