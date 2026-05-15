from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
import hashlib
import os

staff_attendance_router = APIRouter(prefix="/staff-attendance", tags=["staff-attendance"])

_JWT_SECRET = os.environ.get("JWT_SECRET", "secret")


def _daily_token(institute_id: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    raw = f"{institute_id}:{today}:{_JWT_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()


@staff_attendance_router.get("/institute-qr")
async def get_institute_qr(user: dict = Depends(require_admin)):
    iid = user.get("institute_id")
    if not iid:
        raise HTTPException(status_code=400, detail="Institute not found")
    token = _daily_token(iid)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    qr_data = f"STAFF_CHECKIN:{iid}:{token}:{today}"
    return {"qr_data": qr_data, "token": token, "date": today}


@staff_attendance_router.post("/scan")
async def scan_checkin(data: dict, user: dict = Depends(get_current_user)):
    qr_data = (data.get("qr_data") or "").strip()
    if not qr_data.startswith("STAFF_CHECKIN:"):
        raise HTTPException(status_code=400, detail="Invalid QR code format")

    parts = qr_data.split(":")
    if len(parts) != 4:
        raise HTTPException(status_code=400, detail="Malformed QR code")

    _, scanned_iid, scanned_token, scanned_date = parts
    user_iid = user.get("institute_id")

    if scanned_iid != user_iid:
        raise HTTPException(status_code=400, detail="QR code belongs to a different institute")

    if scanned_token != _daily_token(user_iid):
        raise HTTPException(status_code=400, detail="QR code has expired or is invalid")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if scanned_date != today:
        raise HTTPException(status_code=400, detail="QR code has expired (wrong date)")

    uid = user.get("_id") or user.get("id", "")

    # Find last record for today
    last = await db.staff_attendance.find_one(
        {"user_id": uid, "institute_id": user_iid, "date": today},
        sort=[("timestamp", -1)]
    )

    now = datetime.now(timezone.utc)

    if not last or last.get("action") == "checkout":
        doc = {
            "user_id": uid, "user_name": user.get("name", ""),
            "role": user.get("role", ""), "institute_id": user_iid,
            "action": "checkin", "timestamp": now, "date": today,
        }
        await db.staff_attendance.insert_one(doc)
        return {"action": "checkin", "message": f"Checked in at {now.strftime('%H:%M')} UTC", "timestamp": now.isoformat()}
    else:
        checkin_time = last.get("timestamp")
        duration_mins = int((now - checkin_time).total_seconds() / 60) if checkin_time else 0
        doc = {
            "user_id": uid, "user_name": user.get("name", ""),
            "role": user.get("role", ""), "institute_id": user_iid,
            "action": "checkout", "timestamp": now, "date": today,
            "duration_mins": duration_mins,
        }
        await db.staff_attendance.insert_one(doc)
        h, m = divmod(duration_mins, 60)
        dur = f"{h}h {m}m" if h else f"{m}m"
        return {"action": "checkout", "message": f"Checked out. Shift: {dur}", "timestamp": now.isoformat(), "duration_mins": duration_mins}


@staff_attendance_router.get("/me")
async def my_attendance(user: dict = Depends(get_current_user), days: int = 7):
    uid = user.get("_id") or user.get("id", "")
    iid = user.get("institute_id", "")
    since = datetime.now(timezone.utc) - timedelta(days=days)
    records = await db.staff_attendance.find(
        {"user_id": uid, "institute_id": iid, "timestamp": {"$gte": since}}
    ).sort("timestamp", -1).to_list(200)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last = await db.staff_attendance.find_one(
        {"user_id": uid, "institute_id": iid, "date": today},
        sort=[("timestamp", -1)]
    )
    current_status = last.get("action") if last else None
    return {"current_status": current_status, "records": [serialize_doc(r) for r in records]}


@staff_attendance_router.get("/dashboard")
async def attendance_dashboard(user: dict = Depends(require_admin), date: str = None):
    iid = user.get("institute_id")
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    records = await db.staff_attendance.find(
        {"institute_id": iid, "date": target_date}
    ).sort("timestamp", 1).to_list(1000)

    user_map: dict = {}
    for r in records:
        uid = r.get("user_id")
        if uid not in user_map:
            user_map[uid] = {
                "user_id": uid, "user_name": r.get("user_name", ""),
                "role": r.get("role", ""),
                "checkin_time": None, "checkout_time": None, "duration_mins": 0,
            }
        ts = r.get("timestamp")
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        if r.get("action") == "checkin" and not user_map[uid]["checkin_time"]:
            user_map[uid]["checkin_time"] = ts_str
        elif r.get("action") == "checkout":
            user_map[uid]["checkout_time"] = ts_str
            user_map[uid]["duration_mins"] = r.get("duration_mins", 0)

    return {"date": target_date, "records": list(user_map.values())}
