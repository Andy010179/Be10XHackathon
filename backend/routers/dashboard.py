from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import ifilter, EMERGENT_LLM_KEY, get_institute_branding, serialize_doc
from dependencies import require_admin_or_employer
from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid
import logging

from reportlab.lib.pagesizes import A4, landscape as rl_landscape
from reportlab.lib import colors as rl_colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

logger = logging.getLogger(__name__)

dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_router.get("/stats")
async def get_stats(branch_id: str = None, user: dict = Depends(require_admin_or_employer)):
    iid_filter = ifilter(user)
    student_filter = ifilter(user, {"branch_id": branch_id}) if branch_id else ifilter(user)

    if branch_id:
        branch_students = await db.students.find(student_filter, {"_id": 1}).to_list(5000)
        branch_student_ids = [str(s["_id"]) for s in branch_students]
        invoice_filter = ifilter(user, {"student_id": {"$in": branch_student_ids}}) if branch_student_ids else {"_id": None}
    else:
        invoice_filter = ifilter(user)

    invoices = await db.invoices.find(invoice_filter, {"paid_amount": 1, "balance": 1, "student_id": 1}).to_list(10000)
    total_revenue = sum(i.get("paid_amount", 0) for i in invoices)
    outstanding_balance = sum(i.get("balance", 0) for i in invoices)

    total_students = await db.students.count_documents(student_filter)
    active_students = await db.students.count_documents({**student_filter, "status": "active"})

    total_enquiries = await db.enquiries.count_documents(iid_filter)
    converted_enquiries = await db.enquiries.count_documents(ifilter(user, {"stage": "converted"}))
    conversion_rate = round((converted_enquiries / total_enquiries * 100) if total_enquiries > 0 else 0, 1)

    branches = await db.branches.find(iid_filter).to_list(100)
    if branch_id:
        selected = next((b for b in branches if str(b["_id"]) == branch_id), None)
        revenue_by_branch = [{"branch": selected.get("name", ""), "branch_id": branch_id, "revenue": total_revenue}] if selected else []
    else:
        all_students = await db.students.find(iid_filter, {"_id": 1, "branch_id": 1}).to_list(5000)
        student_branch_map = {str(s["_id"]): s.get("branch_id") for s in all_students}
        all_invoices = await db.invoices.find(iid_filter, {"paid_amount": 1, "student_id": 1}).to_list(10000)
        branch_revenue_map: dict = {}
        for inv in all_invoices:
            sid = inv.get("student_id", "")
            bid = student_branch_map.get(sid, "")
            branch_revenue_map[bid] = branch_revenue_map.get(bid, 0) + inv.get("paid_amount", 0)
        revenue_by_branch = [
            {"branch": b.get("name"), "branch_id": str(b["_id"]), "revenue": branch_revenue_map.get(str(b["_id"]), 0)}
            for b in branches
        ]

    if branch_id:
        enrolled_students = await db.students.find(student_filter, {"course_ids": 1}).to_list(5000)
        course_id_list = list(set(cid for s in enrolled_students for cid in (s.get("course_ids") or [])))
        courses = await db.courses.find(ifilter(user, {"_id": {"$in": [ObjectId(c) for c in course_id_list if c]}}), {"category": 1}).to_list(1000) if course_id_list else []
    else:
        courses = await db.courses.find(iid_filter, {"category": 1}).to_list(1000)
    category_map = {}
    for c in courses:
        cat = c.get("category", "Other")
        category_map[cat] = category_map.get(cat, 0) + 1
    enrolments_by_category = [{"name": k, "value": v} for k, v in category_map.items()]

    monthly_trends = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_start = now.replace(day=1) - timedelta(days=i * 30)
        month_end = month_start + timedelta(days=30)
        count = await db.students.count_documents({**student_filter, "created_at": {"$gte": month_start, "$lt": month_end}})
        monthly_trends.append({"month": month_start.strftime("%b"), "enrolments": count})

    return {
        "total_revenue": total_revenue, "outstanding_balance": outstanding_balance,
        "total_students": total_students, "active_students": active_students,
        "conversion_rate": conversion_rate, "total_enquiries": total_enquiries,
        "revenue_by_branch": revenue_by_branch, "enrolments_by_category": enrolments_by_category,
        "monthly_trends": monthly_trends,
    }


@dashboard_router.get("/branch-detail/{branch_id}")
async def get_branch_revenue_detail(branch_id: str, user: dict = Depends(require_admin_or_employer)):
    branch = await db.branches.find_one(ifilter(user, {"_id": ObjectId(branch_id)}))
    if not branch:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Branch not found")
    students = await db.students.find(ifilter(user, {"branch_id": branch_id})).to_list(1000)
    student_map = {str(s["_id"]): s for s in students}
    student_ids = list(student_map.keys())
    if not student_ids:
        return {"branch_name": branch.get("name"), "total_revenue": 0, "total_balance": 0, "items": []}
    invoices = await db.invoices.find(ifilter(user, {"student_id": {"$in": student_ids}})).to_list(10000)
    items = []
    for inv in invoices:
        sid = inv.get("student_id", "")
        student = student_map.get(sid, {})
        items.append({
            "invoice_id": str(inv["_id"]),
            "student_name": student.get("name", "Unknown"),
            "student_email": student.get("email", ""),
            "course": inv.get("course_name", ""),
            "total": inv.get("total", 0),
            "paid": inv.get("paid_amount", 0),
            "balance": inv.get("balance", 0),
            "status": inv.get("status", ""),
            "date": inv.get("created_at", "").isoformat() if hasattr(inv.get("created_at", ""), "isoformat") else str(inv.get("created_at", "")),
        })
    items.sort(key=lambda x: x["paid"], reverse=True)
    return {
        "branch_name": branch.get("name"),
        "location": branch.get("location", ""),
        "total_revenue": sum(i.get("paid_amount", 0) for i in invoices),
        "total_balance": sum(i.get("balance", 0) for i in invoices),
        "items": items,
    }


@dashboard_router.post("/weekly-summary")
async def generate_weekly_summary(user: dict = Depends(require_admin_or_employer)):
    iid_filter = ifilter(user)
    invoices = await db.invoices.find(iid_filter).to_list(10000)
    total_revenue = sum(i.get("paid_amount", 0) for i in invoices)
    outstanding = sum(i.get("balance", 0) for i in invoices)
    total_students = await db.students.count_documents(iid_filter)
    new_enquiries = await db.enquiries.count_documents({
        **iid_filter,
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    })
    total_enq = await db.enquiries.count_documents(iid_filter)
    converted = await db.enquiries.count_documents(ifilter(user, {"stage": "converted"}))
    stats = {
        "total_revenue_INR": total_revenue, "outstanding_balance_INR": outstanding,
        "total_students": total_students, "new_enquiries_this_week": new_enquiries,
        "conversion_rate": f"{round((converted/total_enq*100) if total_enq > 0 else 0, 1)}%"
    }
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"weekly-summary-{uuid.uuid4()}",
            system_message="You are an educational institute analytics assistant. Generate professional, concise weekly summaries in 3-4 bullet points using rupee (₹) for currency. Be specific with numbers. Keep under 150 words."
        ).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(
            text=f"Generate a weekly performance summary for an educational institute with these stats: {stats}. Include key insights and one actionable recommendation."
        ))
        return {"summary": response, "stats": stats}
    except Exception as e:
        logger.error(f"AI summary error: {e}")
        return {
            "summary": f"• Revenue collected this period: ₹{total_revenue:,.0f}\n• Outstanding balance: ₹{outstanding:,.0f}\n• {total_students} students enrolled, {new_enquiries} new enquiries this week\n• Conversion rate: {stats['conversion_rate']} — consider follow-up calls to improve.",
            "stats": stats
        }


@dashboard_router.get("/revenue-pdf")
async def download_revenue_pdf(user: dict = Depends(require_admin_or_employer)):
    iid = user.get("institute_id")
    inst_name, logo_b64, _ = await get_institute_branding(iid or "")
    branches = await db.branches.find(ifilter(user)).to_list(100)
    all_students = await db.students.find(ifilter(user), {"_id": 1, "name": 1, "branch_id": 1}).to_list(5000)
    student_map = {str(s["_id"]): s for s in all_students}
    student_ids = list(student_map.keys())

    # Fetch parent info keyed by student_id
    parents = await db.users.find(
        {"role": "parent", "student_id": {"$in": student_ids}},
        {"student_id": 1, "name": 1, "phone": 1}
    ).to_list(5000)
    parent_map = {p.get("student_id"): p for p in parents}

    invoices = await db.invoices.find(ifilter(user)).to_list(10000)

    # Build branch → invoice rows
    branch_rows: dict = {}
    for inv in invoices:
        sid = inv.get("student_id", "")
        student = student_map.get(sid, {})
        bid = student.get("branch_id", "")
        parent = parent_map.get(sid, {})
        row = {
            "student": student.get("name", "—"),
            "parent": parent.get("name", "—"),
            "parent_phone": parent.get("phone", "—"),
            "course": inv.get("course_name", "—"),
            "paid": inv.get("paid_amount", 0),
            "balance": inv.get("balance", 0),
            "status": inv.get("status", "pending"),
        }
        branch_rows.setdefault(bid, []).append(row)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=rl_landscape(A4),
        rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("T", parent=styles["Normal"], fontSize=18,
        textColor=rl_colors.HexColor("#002EB8"), fontName="Helvetica-Bold", spaceAfter=2)
    sub_style = ParagraphStyle("S", parent=styles["Normal"], fontSize=9,
        textColor=rl_colors.HexColor("#8A8F98"), spaceAfter=12)
    branch_style = ParagraphStyle("B", parent=styles["Normal"], fontSize=12,
        textColor=rl_colors.HexColor("#0A0A0A"), fontName="Helvetica-Bold", spaceAfter=6, spaceBefore=12)

    story = [
        Paragraph(inst_name.upper(), title_style),
        Paragraph(f"Revenue Report by Branch — Generated {datetime.now(timezone.utc).strftime('%d %b %Y')}", sub_style),
        HRFlowable(width="100%", thickness=2, color=rl_colors.HexColor("#002EB8"), spaceAfter=12),
    ]

    grand_total = 0
    for branch in branches:
        bid = str(branch["_id"])
        rows = branch_rows.get(bid, [])
        story.append(Paragraph(f"{branch.get('name', 'Unknown Branch')}  —  {branch.get('location', '')}", branch_style))
        if not rows:
            story.append(Paragraph("No invoices for this branch.", sub_style))
            continue
        header = [["Student Name", "Parent Name", "Parent Mobile", "Course", "Paid (Rs.)", "Balance (Rs.)", "Status"]]
        data_rows = [
            [r["student"], r["parent"], r["parent_phone"], r["course"],
             f"{r['paid']:,.0f}", f"{r['balance']:,.0f}", r["status"].upper()]
            for r in rows
        ]
        branch_total = sum(r["paid"] for r in rows)
        grand_total += branch_total
        data_rows.append(["", "", "", f"Branch Total:", f"{branch_total:,.0f}", "", ""])
        t = Table(header + data_rows, colWidths=[4.5*cm, 3.5*cm, 3*cm, 4*cm, 2.8*cm, 2.8*cm, 2.2*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#002EB8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), rl_colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (4, 0), (5, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [rl_colors.white, rl_colors.HexColor("#F8F9FA")]),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (0, -1), (-1, -1), rl_colors.HexColor("#F0F4FF")),
            ("GRID", (0, 0), (-1, -1), 0.4, rl_colors.HexColor("#E5E7EB")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#002EB8"), spaceAfter=8))
    story.append(Paragraph(f"Grand Total Revenue: Rs. {grand_total:,.2f}", ParagraphStyle(
        "GT", parent=styles["Normal"], fontSize=11, fontName="Helvetica-Bold",
        textColor=rl_colors.HexColor("#002EB8"))))

    doc.build(story)
    buf.seek(0)
    fname = f"Revenue_Report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={fname}"})
