# EduTech-LMS PRD

## Original Problem Statement
Create a full-stack Learning Management System (LMS) called "EduTech-LMS" with:
- Multi-tenant institute isolation
- Role-based dashboards (Super Admin, Admin, Teacher, Student, Parent, Employer)
- JWT Auth with Institute Code scoping
- CRM with Kanban and pagination
- Finance module with auto-generated PDFs
- Student Portal with digital ID cards and QR scanner for attendance
- Parent Portal with invoice downloads
- White-label branding (custom logos on PDFs/UI)
- Twilio SMS alerts
- Gemini 3 Flash AI summaries
- Resend email functionality
- Public Enquiry Web Forms
- Admin Data Management (export/restore XLSX)

## Architecture
```
/app/
├── backend/
│   ├── server.py              # Thin FastAPI entry (~165 lines)
│   ├── database.py            # MongoDB client
│   ├── models.py              # All Pydantic models
│   ├── helpers.py             # Shared helpers, constants, SMS, email
│   ├── dependencies.py        # Auth dependencies (get_current_user, require_admin, etc.)
│   ├── requirements.txt
│   └── routers/               # 19 router files
│       ├── auth.py            # /api/auth/*
│       ├── users.py           # /api/users/*
│       ├── branches.py        # /api/branches/*
│       ├── courses.py         # /api/courses/*
│       ├── enquiries.py       # /api/enquiries/* (paginated)
│       ├── academic.py        # /api/academic/* (schedules, batches)
│       ├── finance.py         # /api/finance/* (invoices, PDFs)
│       ├── dashboard.py       # /api/dashboard/* (stats, AI summary)
│       ├── students.py        # /api/students/*
│       ├── teacher.py         # /api/teacher/* (sessions, attendance, QR)
│       ├── attendance.py      # /api/attendance/qr-checkin
│       ├── payments.py        # /api/payments/* (Razorpay)
│       ├── portal.py          # /api/portal/* (student portal, ID card)
│       ├── webhooks.py        # /api/webhooks/* (WhatsApp)
│       ├── settings.py        # /api/settings/* (Razorpay, Twilio, Logo)
│       ├── admin.py           # /api/admin/* (fee queries, backup, parents)
│       ├── institutes.py      # /api/institutes/* (super admin)
│       ├── parent.py          # /api/parent/* (parent portal)
│       └── public.py          # /api/public/enquiry (web form)
├── frontend/
│   ├── src/
│       ├── App.js
│       ├── components/
│       │   ├── Layout.js
│       │   ├── portal/
│       │   │   ├── PortalIDCard.jsx
│       │   │   └── PortalQRCheckin.jsx
│       │   └── dashboard/
│       │       └── BranchDetailPanel.jsx
│       ├── contexts/AuthContext.js
│       └── pages/             # StudentPortal.js, Finance.js, UserManagement.js, etc.
├── memory/
│   ├── PRD.md
│   ├── test_credentials.md
│   └── CHANGELOG.md
```

## Key DB Schema
- institutes: {name, code, phone, address, is_active, logo_id}
- users: {name, email, password_hash, role, institute_id, student_id, branch_id}
- students: {name, email, phone, branch_id, course_ids, status, syllabus_percentage, batch_id, institute_id}
- enquiries: {student_name, email, phone, stage, source, notes, institute_id}
- invoices: {student_id, institute_id, base_fee, gst_amount, discount, total, paid_amount, balance, status}
- attendance: {session_id, student_id, status, method, created_at}
- app_settings: {key: "twilio"|"razorpay"|"logo", institute_id, ...credentials}

## 3rd Party Integrations
- Twilio SMS (requires user credentials via Settings UI)
- Razorpay payments (requires user credentials via Settings UI)
- Resend email (MOCKED - requires RESEND_API_KEY env var)
- Gemini 3 Flash AI (upcoming - uses Emergent LLM Key)
- jsQR (QR camera scanner in student portal)

## What's Been Implemented (as of 2026-04-18)
- [x] Multi-tenant institute isolation
- [x] JWT Auth with Institute Code scoping
- [x] Role-based dashboards (Super Admin, Admin, Teacher, Student, Parent)
- [x] CRM Kanban with pagination and search
- [x] Finance module: invoice generation, payments, auto-PDFs (invoice + receipt)
- [x] Student Portal: personal info, invoices, attendance, certificates, fee query
- [x] Digital ID card PDF generation in Student Portal
- [x] QR Attendance Camera Scanner (jsQR) in Student Portal
- [x] Parent Portal: dashboard, attendance, fees, academic view
- [x] Parent invoice/receipt PDF downloads
- [x] White-label branding: custom logo upload, logos on PDFs and UI
- [x] Twilio SMS integration (Settings UI + mark_attendance trigger)
- [x] Dashboard multi-tenancy isolation (branch filter)
- [x] Institute name in top header
- [x] Admin data management: XLSX backup + restore
- [x] Public Enquiry web form
- [x] WhatsApp webhook for lead capture
- [x] Refactoring Phase 1: Fixed hook deps, undefined vars, inline props
- [x] Extracted components: PortalIDCard, PortalQRCheckin, BranchDetailPanel
- [x] **Backend refactoring: server.py split into 19 router files (routers/ directory)**
- [x] **QR Scanner crash fixed: scanFrame try-catch + videoWidth > 0 guard**

- [x] **Phase 1 new features (2026-05-15)**:
  - Staff Portal (/staff-portal): photo upload, PDF ID card generator with Institute/Branch/Role/StaffNumber
  - Staff Unique Numbers auto-generated (ADM-2026-NNNN, TCH-2026-NNNN, STF-2026-NNNN)
  - Student Unique ID auto-generated on status→"Active" (e.g. DEFAULT-STU-2026-0001)
  - GST dropdown (1–30%, default 18%) on invoice creation; PDF label reflects actual rate
  - Fee Queries: Admin Comment field (inline response), Mark Resolved button, 20/page pagination latest-first
  - Parent Portal: Invoice/Receipt download buttons removed; replaced with "Contact Admin for PDF"
  - Nav item "Staff Portal" visible to admin/teacher/staff_member/employer roles

### P1 (High Priority)
- [ ] Gemini 3 Flash AI weekly performance summary on Dashboard
  - Use Emergent LLM Key (EMERGENT_LLM_KEY env var)
  - Endpoint: POST /api/dashboard/weekly-summary (already implemented!)
  - Add "Weekly Summary" button to Dashboard page
  - Display AI-generated summary in a modal/card

### P2 (Medium Priority)
- [ ] Resend email service - activate production mode
  - Requires user to set RESEND_API_KEY in backend .env
  - Update SENDER_EMAIL to verified domain sender
- [ ] Frontend modal extraction: split large pages into smaller components
  - UserManagement.js (665 lines): extract CreateUserModal, EditUserModal, ParentAccountForm
  - Finance.js (565 lines): extract CreateInvoiceModal, PaymentModal
  - Academic.js (575 lines): extract CreateSessionModal, CreateBatchModal

### P3 (Future/Backlog)
- [ ] Student self-registration flow
- [ ] Bulk student import via XLSX (admin)
- [ ] Advanced reporting (PDF attendance reports)
- [ ] Two-factor authentication
- [ ] Email templates customization
- [ ] WhatsApp messaging (not just webhook receipt)
