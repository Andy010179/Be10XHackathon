from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import Response
from datetime import datetime, timezone
from database import db
from helpers import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, FRONTEND_URL
from dependencies import get_current_user, require_admin
from models import RazorpaySettings, TwilioSettings
import base64

settings_router = APIRouter(prefix="/settings", tags=["settings"])


@settings_router.get("/razorpay")
async def get_razorpay_config(user: dict = Depends(require_admin)):
    db_settings = await db.app_settings.find_one({"key": "razorpay"})
    if db_settings and db_settings.get("key_id"):
        return {"key_id": db_settings.get("key_id", ""), "has_secret": bool(db_settings.get("key_secret", "")), "configured": bool(db_settings.get("key_id") and db_settings.get("key_secret")), "source": "database"}
    return {"key_id": RAZORPAY_KEY_ID or "", "has_secret": bool(RAZORPAY_KEY_SECRET), "configured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET), "source": "environment"}


@settings_router.post("/razorpay")
async def save_razorpay_config(data: RazorpaySettings, user: dict = Depends(require_admin)):
    await db.app_settings.update_one(
        {"key": "razorpay"},
        {"$set": {"key": "razorpay", "key_id": data.key_id, "key_secret": data.key_secret, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Razorpay settings saved successfully", "configured": True}


@settings_router.get("/twilio")
async def get_twilio_config(user: dict = Depends(require_admin)):
    db_settings = await db.app_settings.find_one({"key": "twilio"})
    if db_settings and db_settings.get("account_sid"):
        return {
            "account_sid": db_settings.get("account_sid", ""),
            "phone_number": db_settings.get("phone_number", ""),
            "has_auth_token": bool(db_settings.get("auth_token", "")),
            "configured": bool(db_settings.get("account_sid") and db_settings.get("auth_token") and db_settings.get("phone_number")),
            "source": "database"
        }
    return {
        "account_sid": TWILIO_ACCOUNT_SID or "",
        "phone_number": TWILIO_PHONE_NUMBER or "",
        "has_auth_token": bool(TWILIO_AUTH_TOKEN),
        "configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER),
        "source": "environment"
    }


@settings_router.post("/twilio")
async def save_twilio_config(data: TwilioSettings, user: dict = Depends(require_admin)):
    await db.app_settings.update_one(
        {"key": "twilio"},
        {"$set": {
            "key": "twilio",
            "account_sid": data.account_sid,
            "auth_token": data.auth_token,
            "phone_number": data.phone_number,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    return {"message": "Twilio settings saved successfully", "configured": True}


@settings_router.get("/logo")
async def get_logo(user: dict = Depends(get_current_user)):
    iid = user.get("institute_id")
    logo_doc = await db.app_settings.find_one({"key": "logo", "institute_id": iid}) if iid else None
    if not logo_doc or not logo_doc.get("data"):
        raise HTTPException(status_code=404, detail="No logo configured")
    img_bytes = base64.b64decode(logo_doc["data"])
    return Response(content=img_bytes, media_type=logo_doc.get("mime_type", "image/png"))


@settings_router.post("/logo")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 2MB")
    encoded = base64.b64encode(content).decode()
    iid = user.get("institute_id")
    await db.app_settings.update_one(
        {"key": "logo", "institute_id": iid},
        {"$set": {"key": "logo", "institute_id": iid, "data": encoded, "mime_type": file.content_type, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Logo uploaded successfully"}


@settings_router.get("/whatsapp-webhook")
async def get_whatsapp_info(request: Request, user: dict = Depends(require_admin)):
    from helpers import WHATSAPP_VERIFY_TOKEN
    backend_url = FRONTEND_URL or str(request.base_url).rstrip("/")
    return {"webhook_url": f"{backend_url}/api/webhooks/whatsapp", "verify_token": WHATSAPP_VERIFY_TOKEN}
