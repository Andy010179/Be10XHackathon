from fastapi import APIRouter, Depends, HTTPException, Response, Request
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import hash_password, verify_password, create_access_token, create_refresh_token, serialize_doc, JWT_SECRET, JWT_ALGORITHM
from dependencies import get_current_user
from models import UserCreate, UserLogin
import jwt as pyjwt

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "name": data.name, "email": email,
        "password_hash": hash_password(data.password),
        "role": data.role, "branch_id": data.branch_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=8 * 3600)
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=7 * 86400)
    return {"id": user_id, "name": data.name, "email": email, "role": data.role}


@auth_router.post("/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower()
    institute_code = data.institute_code.strip().upper() if data.institute_code else None
    if institute_code:
        # Scope user lookup to this institute
        inst = await db.institutes.find_one({"code": institute_code, "is_active": True})
        if not inst:
            raise HTTPException(status_code=400, detail=f"Institute code '{institute_code}' not found or inactive")
        iid = str(inst["_id"])
        user = await db.users.find_one({"email": email, "institute_id": iid})
        if not user:
            # Fallback: look for super_admin without institute scope
            user = await db.users.find_one({"email": email, "role": "super_admin"})
    else:
        user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=8 * 3600)
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=7 * 86400)
    iid = user.get("institute_id")
    inst_name = ""
    if iid:
        try:
            inst_doc = await db.institutes.find_one({"_id": ObjectId(iid)}, {"name": 1})
            inst_name = inst_doc.get("name", "") if inst_doc else ""
        except Exception:
            pass
    return {
        "id": user_id, "name": user.get("name"), "email": email,
        "role": user.get("role"), "branch_id": user.get("branch_id"),
        "institute_id": iid, "institute_name": inst_name,
    }


@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@auth_router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_token = create_access_token(user_id, user["email"])
        response.set_cookie("access_token", new_token, httponly=True, samesite="lax", max_age=8 * 3600)
        return {"message": "Token refreshed"}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
