from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import serialize_doc, get_institute_branding, RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL, notify_parent, hash_password
from dependencies import get_current_user
from models import PersonalUpdate, FeeQuery
import uuid
import base64
import resend
import asyncio
import logging

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import A4, A5
from reportlab.lib import colors as rl_colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

portal_router = APIRouter(prefix="/portal", tags=["portal"])


@portal_router.get("/me")
async def portal_me(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return {"id": user.get("_id"), "name": user.get("name"), "email": user.get("email"), "role": user.get("role"), "no_student_record": True}
    return serialize_doc(student)


@portal_router.put("/me")
async def portal_update_me(data: PersonalUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.students.update_one({"email": user.get("email")}, {"$set": update})
    student = await db.students.find_one({"email": user.get("email")})
    return serialize_doc(student)


@portal_router.get("/invoices")
async def portal_invoices(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return []
    invoices = await db.invoices.find({"student_id": str(student["_id"])}).sort("created_at", -1).to_list(100)
    return [serialize_doc(i) for i in invoices]


@portal_router.get("/attendance")
async def portal_attendance(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        return []
    attendance = await db.attendance.find({"student_id": str(student["_id"])}).sort("marked_at", -1).to_list(200)
    return [serialize_doc(a) for a in attendance]


@portal_router.get("/certificate")
async def portal_certificate(user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student or student.get("status") != "completed":
        raise HTTPException(status_code=404, detail="No certificate found. Complete your course first.")
    cert = await db.certificates.find_one({"student_id": str(student["_id"])})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not yet generated.")
    return serialize_doc(cert)


@portal_router.get("/certificate/pdf")
async def portal_certificate_pdf(user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import landscape
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.colors import HexColor
    student = await db.students.find_one({"email": user.get("email")})
    if not student or student.get("status") != "completed":
        raise HTTPException(status_code=404, detail="No certificate found. Complete your course first.")
    cert = await db.certificates.find_one({"student_id": str(student["_id"])})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not yet generated.")
    buf = BytesIO()
    page_w, page_h = landscape(A4)
    c = rl_canvas.Canvas(buf, pagesize=landscape(A4))
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#002EB8"))
    c.setLineWidth(7)
    c.rect(18, 18, page_w - 36, page_h - 36, fill=0, stroke=1)
    c.setStrokeColor(HexColor("#FFD600"))
    c.setLineWidth(2)
    c.rect(30, 30, page_w - 60, page_h - 60, fill=0, stroke=1)
    c.setFillColor(HexColor("#002EB8"))
    c.rect(18, page_h - 95, page_w - 36, 77, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(page_w / 2, page_h - 54, "EDUTECH LMS")
    c.setFont("Helvetica", 11)
    c.drawCentredString(page_w / 2, page_h - 74, "CERTIFICATE OF COMPLETION")
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(page_w / 2, page_h - 136, "This is to certify that")
    student_name = cert.get("student_name", "Student")
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 38)
    c.drawCentredString(page_w / 2, page_h - 186, student_name)
    c.setStrokeColor(HexColor("#FFD600"))
    c.setLineWidth(2.5)
    name_w = c.stringWidth(student_name, "Helvetica-Bold", 38)
    c.line(page_w / 2 - name_w / 2 - 12, page_h - 194, page_w / 2 + name_w / 2 + 12, page_h - 194)
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(page_w / 2, page_h - 226, "has successfully completed all required coursework and examinations")
    c.drawCentredString(page_w / 2, page_h - 246, "and is hereby awarded this Certificate of Completion.")
    box_x = page_w / 2 - 190
    box_y = page_h - 330
    c.setFillColor(HexColor("#F8F9FA"))
    c.roundRect(box_x, box_y, 380, 58, 8, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#E5E7EB"))
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, 380, 58, 8, fill=0, stroke=1)
    c.line(page_w / 2, box_y + 6, page_w / 2, box_y + 52)
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(page_w / 2 - 95, box_y + 45, "CERTIFICATE ID")
    c.drawCentredString(page_w / 2 + 95, box_y + 45, "ISSUE DATE")
    c.setFillColor(HexColor("#002EB8"))
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2 - 95, box_y + 18, cert.get("certificate_id", "N/A"))
    issued = cert.get("issued_date", "")
    try:
        issued_str = datetime.fromisoformat(issued.replace("Z", "+00:00")).strftime("%B %d, %Y")
    except Exception:
        issued_str = issued[:10] if issued else "N/A"
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2 + 95, box_y + 18, issued_str)
    c.setFillColor(HexColor("#EEF2FF"))
    c.rect(18, 18, page_w - 36, 28, fill=1, stroke=0)
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(page_w / 2, 28, "EduTech LMS  ·  Institute Management Platform  ·  Digitally Authenticated Certificate")
    c.save()
    buf.seek(0)
    safe_name = student_name.replace(" ", "_")
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=EduTech_Certificate_{safe_name}.pdf"
    })


@portal_router.post("/fee-query")
async def portal_fee_query(data: FeeQuery, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"email": user.get("email")})
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    await db.fee_queries.insert_one({
        "student_id": str(student["_id"]), "student_name": student.get("name"),
        "student_email": user.get("email"), "message": data.message,
        "status": "open", "created_at": datetime.now(timezone.utc)
    })
    if RESEND_API_KEY:
        admin = await db.users.find_one({"role": "admin"})
        if admin and admin.get("email"):
            try:
                resend.api_key = RESEND_API_KEY
                html = f"""<html><body style="font-family:sans-serif;padding:24px;">
                <h2 style="color:#002EB8;">Fee Query Received</h2>
                <p><strong>From:</strong> {student.get('name')} ({user.get('email')})</p>
                <p><strong>Query:</strong> {data.message}</p>
                <p style="color:#8A8F98;font-size:12px;">EduTech LMS — Student Portal</p>
                </body></html>"""
                params = {"from": f"EduTech LMS <{SENDER_EMAIL}>", "to": [admin["email"]], "subject": f"Fee Query from {student.get('name')}", "html": html}
                await asyncio.to_thread(resend.Emails.send, params)
            except Exception as e:
                logger.error(f"Email error: {e}")
    return {"message": "Fee query submitted. Admin will respond shortly."}


@portal_router.post("/photo")
async def upload_portal_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    from fastapi import UploadFile, File
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo must be under 2MB")
    encoded = base64.b64encode(content).decode()
    uid = user.get("id") or str(user.get("_id", ""))
    student = await db.students.find_one({"user_id": uid})
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    await db.students.update_one(
        {"_id": student["_id"]},
        {"$set": {"photo": encoded, "photo_mime": file.content_type}}
    )
    return {"message": "Photo uploaded successfully"}


@portal_router.get("/id-card")
async def get_student_id_card(user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import landscape as rl_landscape
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as rl_canvas
    uid = user.get("id") or str(user.get("_id", ""))
    student = await db.students.find_one({"user_id": uid})
    if not student:
        raise HTTPException(status_code=404, detail="No student record found")
    sid = str(student["_id"])
    parent = await db.users.find_one({"role": "parent", "student_id": sid}, {"name": 1, "phone": 1})
    parent_name = parent.get("name", "") if parent else student.get("guardian_name", "")
    parent_phone = parent.get("phone", "") if parent else student.get("guardian_phone", "")
    course_name = ""
    for cid in (student.get("course_ids") or []):
        try:
            course = await db.courses.find_one({"_id": ObjectId(cid)}, {"name": 1})
            if course:
                course_name = course.get("name", "")
                break
        except Exception:
            pass
    iid = user.get("institute_id") or student.get("institute_id", "")
    inst_name, logo_b64, logo_mime = await get_institute_branding(iid)
    joined = student.get("created_at") or student.get("enrollment_date", "")
    try:
        joined_str = joined.strftime("%d %b %Y") if hasattr(joined, "strftime") else str(joined)[:10]
    except Exception:
        joined_str = "—"
    card_w, card_h = rl_landscape(A5)
    buf = BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(card_w, card_h))
    c.setFillColor(HexColor("#001C82"))
    c.rect(0, card_h - 80, card_w, 80, fill=1, stroke=0)
    c.setFillColor(HexColor("#F8F9FA"))
    c.rect(0, 0, card_w, card_h - 80, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(18, card_h - 34, inst_name.upper())
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#AAB8F5"))
    c.drawString(18, card_h - 52, "STUDENT IDENTITY CARD")
    if logo_b64:
        try:
            logo_buf_img = BytesIO(base64.b64decode(logo_b64))
            c.drawImage(logo_buf_img, card_w - 80, card_h - 72, width=60, height=52, preserveAspectRatio=True, mask="auto")
        except Exception:
            pass
    photo_x, photo_y, photo_w, photo_h = 18, card_h - 200, 90, 110
    if student.get("photo"):
        try:
            ph_buf = BytesIO(base64.b64decode(student["photo"]))
            c.drawImage(ph_buf, photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True, mask="auto")
        except Exception:
            c.setFillColor(HexColor("#E5E7EB"))
            c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
    else:
        c.setFillColor(HexColor("#E5E7EB"))
        c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#8A8F98"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2, "No Photo")
    info_x = photo_x + photo_w + 18
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(info_x, card_h - 102, student.get("name", "—"))

    def draw_field(label, value, y):
        c.setFillColor(HexColor("#8A8F98"))
        c.setFont("Helvetica", 7)
        c.drawString(info_x, y + 11, label.upper())
        c.setFillColor(HexColor("#0A0A0A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(info_x, y, value or "—")

    draw_field("Student ID", student.get("enrollment_no", sid[-8:].upper()), card_h - 128)
    draw_field("Course", course_name[:35] if course_name else "—", card_h - 153)
    draw_field("Joined", joined_str, card_h - 178)
    draw_field("Mobile", student.get("phone", "—"), card_h - 203)
    c.setFillColor(HexColor("#EEF2FF"))
    c.roundRect(info_x, card_h - 237, card_w - info_x - 18, 28, 4, fill=1, stroke=0)
    c.setFillColor(HexColor("#8A8F98"))
    c.setFont("Helvetica", 7)
    c.drawString(info_x + 8, card_h - 218, "PARENT / GUARDIAN")
    c.setFillColor(HexColor("#0A0A0A"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(info_x + 8, card_h - 230, f"{parent_name or '—'}  |  {parent_phone or '—'}")
    c.setFillColor(HexColor("#001C82"))
    c.rect(0, 0, card_w, 22, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(card_w / 2, 7, "This card is issued by the institute. If found, please return to the institute.")
    c.save()
    buf.seek(0)
    safe_name = student.get("name", "student").replace(" ", "_")
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ID_Card_{safe_name}.pdf"})


@portal_router.post("/invite-parent")
async def invite_parent_from_portal(data: dict, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["student", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    student_user_id = user.get("id") or str(user.get("_id", ""))
    student = await db.students.find_one({"user_id": student_user_id})
    if not student:
        raise HTTPException(status_code=404, detail="No student record linked to this account")
    student_id = str(student["_id"])
    parent_email = data.get("email", "").lower().strip()
    parent_name = data.get("name", "Guardian").strip()
    parent_phone = data.get("phone", "")
    iid = user.get("institute_id")
    if not parent_email:
        raise HTTPException(status_code=400, detail="Parent email required")
    existing = await db.users.find_one({"email": parent_email, "role": "parent", "student_id": student_id})
    if existing:
        raise HTTPException(status_code=400, detail="Parent already linked to this student")
    tmp_password = f"Parent@{uuid.uuid4().hex[:6]}"
    parent_doc = {
        "name": parent_name, "email": parent_email,
        "password_hash": hash_password(tmp_password),
        "role": "parent", "student_id": student_id,
        "phone": parent_phone, "institute_id": iid,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(parent_doc)
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$addToSet": {"parent_ids": str(result.inserted_id)}}
    )
    html = f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#002EB8;padding:24px 28px;border-radius:8px 8px 0 0">
      <h1 style="color:white;margin:0;font-size:20px">EduTech LMS — Parent Portal Access</h1>
    </div>
    <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:0 0 8px 8px;padding:28px">
      <p>Dear <strong>{parent_name}</strong>,</p>
      <p>You have been granted access to monitor <strong>{student.get('name')}</strong>'s progress.</p>
      <p>Login at: <a href="{FRONTEND_URL}/parent-portal">{FRONTEND_URL}/parent-portal</a></p>
      <p><strong>Email:</strong> {parent_email}<br><strong>Temporary Password:</strong> {tmp_password}</p>
    </div></body></html>"""
    await notify_parent(parent_email, parent_name, student.get("name", ""), "EduTech LMS — Parent Portal Invite", html)
    return {"message": "Parent account created", "temp_password": tmp_password}
