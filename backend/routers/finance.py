from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import serialize_doc, ifilter, get_institute_branding, send_nudge_email, RESEND_API_KEY
from dependencies import get_current_user, require_admin
from models import FeeCalculate, PaymentUpdate
import uuid
import base64
import resend
import asyncio

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors as rl_colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

finance_router = APIRouter(prefix="/finance", tags=["finance"])


@finance_router.get("/invoices")
async def list_invoices(user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find(ifilter(user)).sort("created_at", -1).to_list(1000)
    return [serialize_doc(i) for i in invoices]


@finance_router.post("/calculate")
async def calculate_fee(data: FeeCalculate, user: dict = Depends(require_admin)):
    gst_rate = max(1.0, min(30.0, data.gst_rate)) / 100.0
    gst_amount = round(data.base_fee * gst_rate, 2)
    total = round((data.base_fee + gst_amount) - data.discount, 2)
    doc = {
        "student_id": data.student_id, "student_name": data.student_name,
        "course_id": data.course_id, "course_name": data.course_name,
        "base_fee": data.base_fee, "gst_rate": data.gst_rate, "gst_amount": gst_amount,
        "discount": data.discount, "total": total,
        "paid_amount": 0, "balance": total,
        "status": "pending",
        "institute_id": user.get("institute_id"),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.invoices.insert_one(doc)
    return serialize_doc({**doc, "_id": result.inserted_id})


@finance_router.patch("/invoices/{invoice_id}/pay")
async def mark_paid(invoice_id: str, data: PaymentUpdate, user: dict = Depends(require_admin)):
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    new_paid = invoice.get("paid_amount", 0) + data.amount
    new_balance = max(0, invoice.get("total", 0) - new_paid)
    new_status = "paid" if new_balance <= 0 else "partial"
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"paid_amount": new_paid, "balance": new_balance, "status": new_status}}
    )
    await db.payments.insert_one({
        "invoice_id": invoice_id,
        "payment_id": f"pay_manual_{uuid.uuid4().hex[:12]}",
        "order_id": None,
        "amount": data.amount,
        "method": "manual",
        "student_id": invoice.get("student_id", ""),
        "created_at": datetime.now(timezone.utc),
    })
    return serialize_doc(await db.invoices.find_one({"_id": ObjectId(invoice_id)}))


@finance_router.get("/invoices/{invoice_id}/payments")
async def get_invoice_payments(invoice_id: str, user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"invoice_id": invoice_id}).sort("created_at", -1).to_list(100)
    return [serialize_doc(p) for p in payments]


@finance_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    iid = invoice.get("institute_id") or user.get("institute_id")
    inst_name, logo_b64, logo_mime = await get_institute_branding(iid or "")
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('InvTitle', parent=styles['Normal'], fontSize=22, textColor=rl_colors.HexColor('#002EB8'), fontName='Helvetica-Bold', spaceAfter=4)
    sub_style = ParagraphStyle('InvSub', parent=styles['Normal'], fontSize=9, textColor=rl_colors.HexColor('#8A8F98'), spaceAfter=16)
    sec_style = ParagraphStyle('SecHead', parent=styles['Normal'], fontSize=11, textColor=rl_colors.HexColor('#0A0A0A'), fontName='Helvetica-Bold', spaceAfter=8, spaceBefore=16)
    story = []
    if logo_b64:
        try:
            logo_buf = BytesIO(base64.b64decode(logo_b64))
            story.append(RLImage(logo_buf, width=3.5*cm, height=1.8*cm))
            story.append(Spacer(1, 4))
        except Exception:
            story.append(Paragraph(inst_name, title_style))
    else:
        story.append(Paragraph(inst_name, title_style))
    story.append(Paragraph("Learning Management System", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=rl_colors.HexColor('#002EB8'), spaceAfter=16))
    created_at = invoice.get("created_at", datetime.now(timezone.utc))
    date_str = created_at.strftime("%d %B %Y") if hasattr(created_at, 'strftime') else str(created_at)[:10]
    status = invoice.get("status", "pending").upper()
    status_color = '#00C853' if status == "PAID" else ('#002EB8' if status == "PARTIAL" else '#FF2B2B')
    story.append(Paragraph(f'<font size="16" color="#0A0A0A"><b>INVOICE</b></font>  <font size="11" color="{status_color}">({status})</font>', styles['Normal']))
    story.append(Spacer(1, 10))
    meta = [
        ["Invoice Ref:", invoice_id[-12:].upper()],
        ["Date:", date_str],
        ["Student:", invoice.get("student_name", "—")],
        ["Course:", invoice.get("course_name", "—")],
    ]
    meta_t = Table(meta, colWidths=[3.5*cm, 13*cm])
    meta_t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'), ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10), ('TEXTCOLOR', (0,0), (0,-1), rl_colors.HexColor('#8A8F98')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_t)
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.HexColor('#E5E7EB'), spaceAfter=12))
    story.append(Paragraph("Fee Breakdown", sec_style))
    bal = invoice.get('balance', 0)
    fee_data = [
        ["Description", "Amount (Rs.)"],
        ["Base Course Fee", f"Rs. {invoice.get('base_fee', 0):,.2f}"],
        ["GST (18%)", f"Rs. {invoice.get('gst_amount', 0):,.2f}"],
        ["Discount Applied", f"- Rs. {invoice.get('discount', 0):,.2f}"],
        ["Total Payable", f"Rs. {invoice.get('total', 0):,.2f}"],
        ["Amount Paid", f"Rs. {invoice.get('paid_amount', 0):,.2f}"],
        ["Balance Due", f"Rs. {bal:,.2f}"],
    ]
    fee_t = Table(fee_data, colWidths=[11*cm, 5.5*cm])
    bal_bg = rl_colors.HexColor('#FF2B2B') if bal > 0 else rl_colors.HexColor('#00C853')
    fee_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), rl_colors.HexColor('#002EB8')),
        ('TEXTCOLOR', (0,0), (-1,0), rl_colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,4), (-1,4), 'Helvetica-Bold'), ('FONTNAME', (0,6), (-1,6), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('BACKGROUND', (0,4), (-1,4), rl_colors.HexColor('#F0F4FF')),
        ('BACKGROUND', (0,6), (-1,6), bal_bg),
        ('TEXTCOLOR', (0,6), (-1,6), rl_colors.white),
        ('ROWBACKGROUNDS', (0,1), (-1,3), [rl_colors.white, rl_colors.HexColor('#F8F9FA')]),
        ('GRID', (0,0), (-1,-1), 0.5, rl_colors.HexColor('#E5E7EB')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8), ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(fee_t)
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.HexColor('#E5E7EB'), spaceAfter=8))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=rl_colors.HexColor('#8A8F98'), alignment=1)
    story.append(Paragraph(f"Generated by {inst_name}  |  {datetime.now(timezone.utc).strftime('%d %B %Y')}", footer_style))
    doc.build(story)
    buf.seek(0)
    safe_name = invoice.get('student_name', 'student').replace(' ', '_')
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{safe_name}_{invoice_id[-8:]}.pdf"})


@finance_router.get("/invoices/{invoice_id}/receipt")
async def download_receipt_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.get("paid_amount", 0):
        raise HTTPException(status_code=400, detail="No payments recorded for this invoice")
    iid = invoice.get("institute_id") or user.get("institute_id")
    inst_name, logo_b64, logo_mime = await get_institute_branding(iid or "")
    payments = await db.payments.find({"invoice_id": invoice_id}).sort("created_at", -1).to_list(100)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RecTitle', parent=styles['Normal'], fontSize=22, textColor=rl_colors.HexColor('#00C853'), fontName='Helvetica-Bold', spaceAfter=4)
    sub_style = ParagraphStyle('RecSub', parent=styles['Normal'], fontSize=9, textColor=rl_colors.HexColor('#8A8F98'), spaceAfter=16)
    sec_style = ParagraphStyle('SecH', parent=styles['Normal'], fontSize=11, textColor=rl_colors.HexColor('#0A0A0A'), fontName='Helvetica-Bold', spaceAfter=8, spaceBefore=16)
    story = []
    if logo_b64:
        try:
            logo_buf = BytesIO(base64.b64decode(logo_b64))
            story.append(RLImage(logo_buf, width=3.5*cm, height=1.8*cm))
            story.append(Spacer(1, 4))
        except Exception:
            story.append(Paragraph(inst_name, title_style))
    else:
        story.append(Paragraph(inst_name, title_style))
    story.append(Paragraph("Payment Receipt", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=rl_colors.HexColor('#00C853'), spaceAfter=16))
    story.append(Paragraph('<font size="16" color="#0A0A0A"><b>PAYMENT RECEIPT</b></font>', styles['Normal']))
    story.append(Spacer(1, 10))
    meta = [
        ["Student:", invoice.get("student_name", "—")],
        ["Course:", invoice.get("course_name", "—")],
        ["Total Fee:", f"Rs. {invoice.get('total', 0):,.2f}"],
        ["Amount Paid:", f"Rs. {invoice.get('paid_amount', 0):,.2f}"],
        ["Balance:", f"Rs. {invoice.get('balance', 0):,.2f}"],
        ["Status:", invoice.get("status", "pending").upper()],
    ]
    meta_t = Table(meta, colWidths=[3.5*cm, 13*cm])
    meta_t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'), ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10), ('TEXTCOLOR', (0,0), (0,-1), rl_colors.HexColor('#8A8F98')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_t)
    story.append(Spacer(1, 16))
    if payments:
        story.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.HexColor('#E5E7EB'), spaceAfter=12))
        story.append(Paragraph("Payment Transactions", sec_style))
        pay_data = [["#", "Payment ID", "Method", "Amount (Rs.)", "Date"]]
        for i, p in enumerate(payments, 1):
            pd_at = p.get("created_at", "")
            pd_str = pd_at.strftime("%d %b %Y") if hasattr(pd_at, 'strftime') else str(pd_at)[:10]
            pay_data.append([
                str(i),
                str(p.get("payment_id", ""))[-14:],
                (p.get("method") or "manual").capitalize(),
                f"Rs. {p.get('amount', 0):,.2f}",
                pd_str,
            ])
        pay_t = Table(pay_data, colWidths=[0.8*cm, 5*cm, 3*cm, 4*cm, 3.7*cm])
        pay_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), rl_colors.HexColor('#00C853')),
            ('TEXTCOLOR', (0,0), (-1,0), rl_colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('ALIGN', (3,0), (3,-1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [rl_colors.white, rl_colors.HexColor('#F0FFF4')]),
            ('GRID', (0,0), (-1,-1), 0.5, rl_colors.HexColor('#E5E7EB')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 7), ('TOPPADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(pay_t)
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.HexColor('#E5E7EB'), spaceAfter=8))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=rl_colors.HexColor('#8A8F98'), alignment=1)
    story.append(Paragraph(f"Thank you for your payment  |  {inst_name}  |  {datetime.now(timezone.utc).strftime('%d %B %Y')}", footer_style))
    doc.build(story)
    buf.seek(0)
    safe_name = invoice.get('student_name', 'student').replace(' ', '_')
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt_{safe_name}_{invoice_id[-8:]}.pdf"})


@finance_router.post("/nudge/{student_id}")
async def send_nudge(student_id: str, user: dict = Depends(require_admin)):
    invoices = await db.invoices.find({"student_id": student_id, "balance": {"$gt": 0}}).to_list(100)
    if not invoices:
        raise HTTPException(status_code=404, detail="No outstanding invoices found")
    total_balance = sum(i.get("balance", 0) for i in invoices)
    await db.nudge_logs.insert_one({
        "student_id": student_id, "invoice_count": len(invoices),
        "total_balance": total_balance, "sent_at": datetime.now(timezone.utc),
        "sent_by": user.get("id") or user.get("_id")
    })
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    email_sent = False
    if student and student.get("email"):
        email_sent = await send_nudge_email(student["email"], student.get("name", "Student"), total_balance)
    msg = f"Payment reminder logged. Outstanding: ₹{total_balance:,.2f}"
    if email_sent:
        msg += " · Email sent via Resend"
    elif RESEND_API_KEY:
        msg += " · Email delivery attempted"
    else:
        msg += " · Add RESEND_API_KEY to .env to enable emails"
    return {"message": msg, "email_sent": email_sent, "total_balance": total_balance}
