from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import serialize_doc, get_institute_branding
from dependencies import get_current_user
import base64
import logging

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import A5, landscape as rl_landscape
from reportlab.lib import colors as rl_colors
from reportlab.pdfgen import canvas as rl_canvas

staff_router = APIRouter(prefix="/staff", tags=["staff"])

ROLE_LABELS = {
    "admin": "ADMIN", "teacher": "TEACHER",
    "staff_member": "STAFF", "employer": "EMPLOYER",
}
ROLE_COLORS = {
    "admin": "#002EB8", "teacher": "#00C853",
    "staff_member": "#FF8F00", "employer": "#7C3AED",
}


async def _get_or_create_staff_number(user_id: str, role: str, institute_id: str) -> str:
    """Auto-generate a unique staff number like TCH-2026-0001"""
    existing = await db.users.find_one({"_id": ObjectId(user_id)}, {"staff_number": 1})
    if existing and existing.get("staff_number"):
        return existing["staff_number"]
    role_codes = {"admin": "ADM", "teacher": "TCH", "staff_member": "STF", "employer": "EMP"}
    code = role_codes.get(role, "STF")
    year = datetime.now(timezone.utc).year
    iid = institute_id or "GEN"
    counter = await db.counters.find_one_and_update(
        {"_id": f"staff_{code}_{iid}_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1)
    staff_number = f"{code}-{year}-{seq:04d}"
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"staff_number": staff_number}})
    return staff_number


@staff_router.get("/me")
async def staff_me(user: dict = Depends(get_current_user)):
    uid = user.get("_id") or user.get("id", "")
    iid = user.get("institute_id", "")
    branch_name = ""
    if user.get("branch_id"):
        try:
            branch = await db.branches.find_one({"_id": ObjectId(user["branch_id"])}, {"name": 1})
            branch_name = (branch or {}).get("name", "")
        except Exception:
            pass
    staff_number = await _get_or_create_staff_number(uid, user.get("role", ""), iid)
    inst_name, _, _ = await get_institute_branding(iid)
    return {
        "id": uid, "name": user.get("name", ""), "email": user.get("email", ""),
        "role": user.get("role", ""), "branch_name": branch_name,
        "staff_number": staff_number, "institute_name": inst_name,
        "phone": user.get("phone", ""), "has_photo": bool(user.get("staff_photo")),
    }


@staff_router.post("/photo")
async def upload_staff_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WEBP images allowed")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo must be under 2MB")
    encoded = base64.b64encode(content).decode()
    uid = user.get("_id") or user.get("id", "")
    await db.users.update_one(
        {"_id": ObjectId(uid)},
        {"$set": {"staff_photo": encoded, "staff_photo_mime": file.content_type}}
    )
    return {"message": "Photo uploaded successfully"}


@staff_router.get("/id-card")
async def download_staff_id_card(user: dict = Depends(get_current_user)):
    uid = user.get("_id") or user.get("id", "")
    iid = user.get("institute_id", "")
    staff_user = await db.users.find_one({"_id": ObjectId(uid)})
    if not staff_user:
        raise HTTPException(status_code=404, detail="User not found")

    staff_number = await _get_or_create_staff_number(uid, staff_user.get("role", ""), iid)

    branch_name = ""
    if staff_user.get("branch_id"):
        try:
            branch = await db.branches.find_one({"_id": ObjectId(staff_user["branch_id"])}, {"name": 1})
            branch_name = (branch or {}).get("name", "")
        except Exception:
            pass

    inst_name, logo_b64, logo_mime = await get_institute_branding(iid)
    role = staff_user.get("role", "staff_member")
    role_label = ROLE_LABELS.get(role, "STAFF")
    role_color = ROLE_COLORS.get(role, "#002EB8")
    personal_phone = staff_user.get("phone", "")
    # Get institute contact from settings
    inst_contact = ""
    try:
        inst_doc = await db.institutes.find_one({"_id": ObjectId(iid)}, {"phone": 1})
        inst_contact = (inst_doc or {}).get("phone", "") if inst_doc else ""
    except Exception:
        pass

    card_w, card_h = rl_landscape(A5)
    buf = BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(card_w, card_h))

    # Background
    c.setFillColor(rl_colors.HexColor("#F8F9FA"))
    c.rect(0, 0, card_w, card_h, fill=1, stroke=0)

    # Left panel (colored sidebar)
    c.setFillColor(rl_colors.HexColor(role_color))
    c.rect(0, 0, 130, card_h, fill=1, stroke=0)

    # Role label on sidebar (vertical)
    c.saveState()
    c.setFillColor(rl_colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.translate(20, card_h / 2)
    c.rotate(90)
    c.drawCentredString(0, 0, role_label)
    c.restoreState()

    # Photo area on sidebar
    photo_x, photo_y, photo_w, photo_h = 15, card_h - 180, 100, 110
    if staff_user.get("staff_photo"):
        try:
            ph_buf = BytesIO(base64.b64decode(staff_user["staff_photo"]))
            c.drawImage(ph_buf, photo_x, photo_y, width=photo_w, height=photo_h,
                        preserveAspectRatio=True, mask="auto")
        except Exception:
            c.setFillColor(rl_colors.HexColor("#FFFFFF40"))
            c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
    else:
        c.setFillColor(rl_colors.HexColor("#FFFFFF30"))
        c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
        c.setFillColor(rl_colors.HexColor("#FFFFFF80"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2, "No Photo")

    # Right content area
    cx = 150
    # Institute header
    if logo_b64:
        try:
            logo_buf_img = BytesIO(base64.b64decode(logo_b64))
            c.drawImage(logo_buf_img, cx, card_h - 55, width=45, height=35,
                        preserveAspectRatio=True, mask="auto")
            cx_text = cx + 54
        except Exception:
            cx_text = cx
    else:
        cx_text = cx

    c.setFillColor(rl_colors.HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(cx_text, card_h - 32, inst_name.upper())
    c.setFillColor(rl_colors.HexColor("#8A8F98"))
    c.setFont("Helvetica", 8)
    c.drawString(cx_text, card_h - 46, "STAFF IDENTITY CARD")

    # Divider
    c.setStrokeColor(rl_colors.HexColor(role_color))
    c.setLineWidth(2)
    c.line(cx, card_h - 62, card_w - 18, card_h - 62)

    # Staff name
    c.setFillColor(rl_colors.HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 17)
    c.drawString(cx, card_h - 88, staff_user.get("name", "—"))

    def draw_field(label, value, y):
        c.setFillColor(rl_colors.HexColor("#8A8F98"))
        c.setFont("Helvetica", 7)
        c.drawString(cx, y + 11, label.upper())
        c.setFillColor(rl_colors.HexColor("#0A0A0A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(cx, y, str(value) if value else "—")

    draw_field("Staff Number", staff_number, card_h - 120)
    draw_field("Branch", branch_name or "All Branches", card_h - 148)

    # Contact info row
    col2_x = cx + (card_w - cx - 18) / 2
    c.setFillColor(rl_colors.HexColor("#8A8F98"))
    c.setFont("Helvetica", 7)
    c.drawString(cx, card_h - 161, "INSTITUTE CONTACT")
    c.drawString(col2_x, card_h - 161, "PERSONAL MOBILE")
    c.setFillColor(rl_colors.HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(cx, card_h - 173, inst_contact or "—")
    c.drawString(col2_x, card_h - 173, personal_phone or "—")

    # Staff number badge
    badge_y = card_h - 215
    c.setFillColor(rl_colors.HexColor(role_color))
    c.roundRect(cx, badge_y, 100, 22, 4, fill=1, stroke=0)
    c.setFillColor(rl_colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx + 50, badge_y + 7, staff_number)

    # Footer
    c.setFillColor(rl_colors.HexColor("#0A0A0A"))
    c.rect(0, 0, card_w, 20, fill=1, stroke=0)
    c.setFillColor(rl_colors.white)
    c.setFont("Helvetica", 7)
    c.drawCentredString(card_w / 2, 6, f"This card is the property of {inst_name}. If found, please return.")

    c.save()
    buf.seek(0)
    safe_name = staff_user.get("name", "Staff").replace(" ", "_")
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Staff_ID_{safe_name}.pdf"})


@staff_router.put("/phone")
async def update_staff_phone(data: dict, user: dict = Depends(get_current_user)):
    phone = (data.get("phone") or "").strip()
    uid = user.get("_id") or user.get("id", "")
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"phone": phone}})
    return {"message": "Phone updated", "phone": phone}
