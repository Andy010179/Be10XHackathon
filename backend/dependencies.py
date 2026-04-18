from fastapi import Depends, HTTPException, Request
from bson import ObjectId
import jwt as pyjwt
from database import db
from helpers import JWT_SECRET, JWT_ALGORITHM


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        # Attach institute name for display
        iid = user.get("institute_id")
        if iid:
            try:
                inst = await db.institutes.find_one({"_id": ObjectId(iid)}, {"name": 1})
                user["institute_name"] = inst.get("name", "") if inst else ""
            except Exception:
                user["institute_name"] = ""
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_admin_or_employer(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ["admin", "super_admin", "employer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


async def require_admin_or_super(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


async def require_parent(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Parent access only")
    return user
