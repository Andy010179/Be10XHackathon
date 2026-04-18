from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from database import db
from helpers import WHATSAPP_VERIFY_TOKEN
import logging

logger = logging.getLogger(__name__)

webhooks_router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@webhooks_router.get("/whatsapp")
async def whatsapp_verify(request: Request):
    hub_mode = request.query_params.get("hub.mode")
    hub_token = request.query_params.get("hub.verify_token")
    hub_challenge = request.query_params.get("hub.challenge")
    if hub_mode == "subscribe" and hub_token == WHATSAPP_VERIFY_TOKEN:
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=hub_challenge or "")
    raise HTTPException(status_code=403, detail="Invalid verify token")


@webhooks_router.post("/whatsapp")
async def whatsapp_receive(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    contacts = value.get("contacts", [])
                    for msg in messages:
                        if msg.get("type") == "text":
                            phone = msg.get("from", "")
                            text = msg.get("text", {}).get("body", "")
                            name = contacts[0]["profile"]["name"] if contacts else f"WhatsApp +{phone}"
                            await db.enquiries.insert_one({
                                "student_name": name, "email": f"wa_{phone}@whatsapp.com",
                                "phone": phone, "courses": [], "stage": "new", "source": "whatsapp",
                                "notes": f"WhatsApp: {text[:200]}",
                                "created_at": datetime.now(timezone.utc),
                                "updated_at": datetime.now(timezone.utc),
                            })
                            logger.info(f"WhatsApp lead created: {name} ({phone})")
        else:
            form = await request.form()
            phone = str(form.get("From", "")).replace("whatsapp:", "").strip()
            text = str(form.get("Body", ""))
            name = str(form.get("ProfileName", f"WhatsApp {phone}"))
            if phone:
                await db.enquiries.insert_one({
                    "student_name": name, "email": f"wa_{phone.replace('+','')}@whatsapp.com",
                    "phone": phone, "courses": [], "stage": "new", "source": "whatsapp",
                    "notes": f"WhatsApp: {text[:200]}",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                })
                logger.info(f"Twilio WhatsApp lead: {name} ({phone})")
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}")
    return {"status": "ok"}
