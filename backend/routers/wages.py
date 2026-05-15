from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
from models import WageConfig, WageLogCreate

wages_router = APIRouter(prefix="/wages", tags=["wages"])


@wages_router.get("/config")
async def get_wage_config(user: dict = Depends(require_admin)):
    iid = user.get("institute_id")
    config = await db.wage_configs.find_one({"institute_id": iid}, {"_id": 0})
    if not config:
        return {"teacher_per_lecture_rate": 0.0, "staff_per_conversion_rate": 0.0, "institute_id": iid}
    return config


@wages_router.put("/config")
async def update_wage_config(data: WageConfig, user: dict = Depends(require_admin)):
    iid = user.get("institute_id")
    doc = {
        "teacher_per_lecture_rate": max(0.0, data.teacher_per_lecture_rate),
        "staff_per_conversion_rate": max(0.0, data.staff_per_conversion_rate),
        "institute_id": iid,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.wage_configs.update_one({"institute_id": iid}, {"$set": doc}, upsert=True)
    result = await db.wage_configs.find_one({"institute_id": iid}, {"_id": 0})
    return result


@wages_router.get("/logs")
async def get_wage_logs(
    user: dict = Depends(require_admin),
    user_id: str = None,
    period: str = "monthly",
    year: int = None,
    month: int = None,
):
    iid = user.get("institute_id")
    start, end = _period_range(period, year, month)
    q = {"institute_id": iid, "created_at": {"$gte": start, "$lt": end}}
    if user_id:
        q["user_id"] = user_id
    logs = await db.wage_logs.find(q).sort("created_at", -1).to_list(1000)
    return [serialize_doc(log_item) for log_item in logs]


@wages_router.get("/summary")
async def get_wage_summary(
    user: dict = Depends(require_admin),
    period: str = "monthly",
    year: int = None,
    month: int = None,
):
    iid = user.get("institute_id")
    start, end = _period_range(period, year, month)
    q = {"institute_id": iid, "created_at": {"$gte": start, "$lt": end}}
    logs = await db.wage_logs.find(q).to_list(5000)

    user_summary: dict = {}
    for log in logs:
        uid = log.get("user_id", "")
        if uid not in user_summary:
            user_summary[uid] = {
                "user_id": uid,
                "user_name": log.get("user_name", "Unknown"),
                "role": log.get("role", ""),
                "total_wage": 0.0,
                "lecture_count": 0,
                "conversion_count": 0,
            }
        user_summary[uid]["total_wage"] = round(user_summary[uid]["total_wage"] + log.get("amount", 0), 2)
        if log.get("type") == "lecture":
            user_summary[uid]["lecture_count"] += 1
        elif log.get("type") == "conversion":
            user_summary[uid]["conversion_count"] += 1

    return {
        "period": period,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "summary": list(user_summary.values()),
        "total": round(sum(u["total_wage"] for u in user_summary.values()), 2),
    }


@wages_router.post("/logs/lecture")
async def log_lecture_wage(data: WageLogCreate, user: dict = Depends(require_admin)):
    """Admin manually records a lecture delivered by a teacher."""
    iid = user.get("institute_id")
    config = await db.wage_configs.find_one({"institute_id": iid}, {"_id": 0})
    rate = (config or {}).get("teacher_per_lecture_rate", 0.0)
    amount = data.override_amount if data.override_amount is not None else rate

    teacher = await db.users.find_one({"_id": __import__("bson").ObjectId(data.user_id)}, {"name": 1, "role": 1})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    log = {
        "user_id": data.user_id,
        "user_name": teacher.get("name", ""),
        "role": teacher.get("role", ""),
        "type": "lecture",
        "amount": amount,
        "notes": data.notes or f"Lecture on {datetime.now(timezone.utc).strftime('%d %b %Y')}",
        "institute_id": iid,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.wage_logs.insert_one(log)
    return serialize_doc({**log, "_id": result.inserted_id})


def _period_range(period: str, year: int = None, month: int = None):
    now = datetime.now(timezone.utc)
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif period == "weekly":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    else:
        y = year or now.year
        m = month or now.month
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(y, m + 1, 1, tzinfo=timezone.utc)
    return start, end
