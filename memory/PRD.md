# EduTech-LMS PRD

## Problem Statement
Build a full-stack Learning Management System (LMS) called EduTech-LMS with:
- Multi-role auth (Admin, Teacher, Employer, Student)
- Course + Batch + Schedule management
- CRM Pipeline (Enquiries → Leads → Conversion)
- Student lifecycle (Onboarding → Active → Completed/Dropped)
- Finance & Invoicing with Razorpay
- Student Portal (self-service)
- PDF Certificates
- Attendance tracking
- Email notifications (Resend)
- WhatsApp webhook CRM integration

## Tech Stack
- Frontend: React.js + Shadcn UI + TailwindCSS
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Auth: JWT (httpOnly cookies)
- PDF: reportlab
- Payments: Razorpay
- Email: Resend (MOCKED without key)

## Core Architecture
```
/app/
├── backend/
│   ├── server.py              # Main FastAPI app (~1500 lines, APIRouter separations)
│   └── requirements.txt
├── frontend/
│   └── src/pages/             # All page components
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## Key DB Collections
- users: { email, password_hash, role, full_name, is_active, student_id (for student-linked users) }
- students: { user_id, enrollment_no, course_ids, branch_id, status, email, phone, dob, address, guardian_name, guardian_phone, notes, id_proof, institute_name, syllabus_percentage }
- enquiries: { name, email, phone, city, source, stage, notes }
- invoices: { student_id, course_id, base_fee, gst_amount, discount, total, paid_amount, balance, status }
- payments: { invoice_id, payment_id, order_id, amount, method, student_id, created_at }
- fee_queries: { student_id, student_name, student_email, message, status, created_at, resolved_at }
- branches, batches, schedules, courses, certificates, attendance

## What's Been Implemented (as of April 2026)

### Phase 1 & 2 (Complete)
- JWT Auth (login/logout/me/refresh)
- Course CRUD + Batches + Schedules (Academic Hub)
- Student management with lifecycle (onboarding/active/completed/dropped)
- Finance invoicing with GST calc (18%), Razorpay mock/real payments
- User Management (CRUD + CSV bulk import)
- CRM Pipeline (Kanban drag-drop, CSV bulk import, city field)
- Student Portal (self-service: profile edit, attendance, fees, certificate)

### Phase 3 & 4 (Complete)
- PDF Certificate generation (reportlab, downloadable from portal)
- Attendance batch reports with bar chart visualization
- WhatsApp webhook router (Meta + Twilio)
- Settings page for Razorpay key management
- Dashboard drill-down analytics with branch revenue filter
- Student Bulk Promotion (generates re-enrolment CRM leads)
- Auto-create Student record on CRM enquiry conversion
- New Enquiry city field + per-enquiry editing

### Phase 5 (Complete — April 2026)
- Advanced Student Profile Editing (id_proof, institute_name)
- Payment History tab in Finance (expandable per invoice row)
- Global Table Sorting/Filtering (Finance, Students, AttendanceReports)
- CRM Search (name/email/phone/city)
- User Password Resets via Edit User modal
- Student-Linked User Creation (role=student shows student dropdown)
- Student Portal Fee Query tab + Admin Fee Queries page (/fee-queries)
- Code Quality Pass: fixed missing hook deps, array index keys, inline objects

### Phase 7 (Complete — April 2026)
- **Multi-Tenant Institute Isolation**:
  - Super Admin role (superadmin@edutech.com / SuperAdmin@123, no institute code needed)
  - `institutes` collection with CRUD — Super Admin only
  - Login accepts optional `institute_code` field — scopes user lookup to that institute
  - `ifilter(user, extra)` helper applied to ALL MongoDB queries — complete data isolation
  - Startup migration: all pre-existing data auto-assigned to DEFAULT institute
  - Super Admin panel at `/super-admin` — create/toggle/delete institutes
  - Each institute gets its own admin account on creation
- **Parent Login Portal**:
  - `parent` role added — users with role=parent have `student_id` field
  - Admin can create parent accounts in UserManagement → Parent Accounts tab
  - Student portal profile tab has "Parent / Guardian Access" invite section
  - Backend: POST /api/portal/invite-parent, GET/POST/DELETE /api/admin/parents
  - Parent portal at `/parent-portal` — Overview, Attendance, Fees, Academics tabs
  - Backend: GET /api/parent/dashboard, /attendance, /fees, /academic
  - Low attendance notification helper (triggers < 75% → emails linked parents via Resend)
  - Parent email notifications MOCKED (Resend key not configured)
- **CRM Pipeline Pagination**: Server-side pagination (15/page), paginated Kanban board with Prev/Next controls, page count, server-side search via ?search= param
- **Admin Data Management UI** (in Settings): Download Backup (.xlsx from /api/admin/backup), Restore from .xlsx (/api/admin/restore), Delete All with server-validated "DELETE ALL" confirmation modal
- **Finance Automated PDFs**: Invoice PDF (/api/finance/invoices/{id}/pdf) and Payment Receipt (/api/finance/invoices/{id}/receipt) — ReportLab generated, downloadable from Finance table rows
- **Portal QR Code Attendance**:
  - Fixed TeacherAttendance.js QR display (blob responseType instead of JSON)
  - New /attendance/scan page (AttendanceScan.js) for QR URL landing — auto check-in for logged-in students
  - Student Portal "QR Check-in" tab with manual session code entry
  - Backend /api/attendance/qr-checkin endpoint with student roster verification

## Key API Endpoints (Complete List)
- POST /api/auth/login, logout, GET /api/auth/me
- GET/POST /api/branches, /api/courses
- GET /api/enquiries?page=1&limit=15&search=X (paginated, returns {items,total,page,pages})
- POST/PUT/DELETE /api/enquiries
- PATCH /api/enquiries/:id/stage (auto-converts to student)
- POST /api/enquiries/bulk-import
- GET/POST/PUT/DELETE /api/users
- GET/POST /api/students, GET/PUT /api/students/:id
- PATCH /api/students/:id/status
- POST /api/students/:id/onboard, complete, promote
- GET /api/students/:id/certificate
- GET/POST /api/finance/invoices, POST /api/finance/calculate
- PATCH /api/finance/invoices/:id/pay (records to payments collection)
- GET /api/finance/invoices/:id/payments (payment history)
- GET /api/finance/invoices/:id/pdf (Invoice PDF — NEW Phase 6)
- GET /api/finance/invoices/:id/receipt (Payment Receipt PDF — NEW Phase 6)
- POST /api/finance/nudge/:student_id
- GET /api/academic/batches, schedules
- GET /api/teacher/qr/{session_id} (returns PNG blob)
- GET /api/teacher/attendance/batch-report
- POST /api/attendance/qr-checkin (NEW Phase 6 — student QR check-in)
- GET /api/portal/me, PUT /api/portal/me
- GET /api/portal/invoices, /api/portal/attendance, /api/portal/certificate
- POST /api/portal/fee-query
- GET /api/admin/fee-queries
- PATCH /api/admin/fee-queries/:id/resolve
- GET /api/admin/backup (returns .xlsx blob — NEW Phase 6)
- POST /api/admin/restore (accepts .xlsx file — NEW Phase 6)
- DELETE /api/admin/data (requires body {confirm: "DELETE ALL"} — NEW Phase 6)
- GET/POST /api/settings/razorpay
- POST /api/payments/create-order, verify
- GET/POST /api/webhooks/whatsapp
- GET /api/dashboard/stats

## Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Razorpay | Working (mock/real) | Keys managed via /settings page |
| Resend Email | MOCKED | Needs RESEND_API_KEY in .env |
| PDF (reportlab) | Working | |
| WhatsApp Webhook | Working | |

### Code Quality Pass (April 2026)
- Fixed empty `catch {}` blocks in TeacherAttendance, StudentPortal, Dashboard (added `console.error`)
- Fixed array-index-as-key in UserManagement, Students, Enquiries, Dashboard (×3), AttendanceReports — now use stable entity IDs
- Extracted inline chart config objects to module-level constants (Dashboard.js, AttendanceReports.js) to prevent unnecessary re-renders
- Added `// eslint-disable-next-line react-hooks/exhaustive-deps` to all intentional fetch-on-mount effects (API/axios are module-level constants, not component state)
- Confirmed Python `is None` / `is not None` patterns are **correct PEP 8 idioms** — not changed

### Phase 8 — Bug Fix (April 2026)
- **Dashboard Multi-Tenancy Isolation Fix**: All dashboard and attendance report queries were missing `ifilter(user)` — fixed across 4 endpoints:
  - `get_stats()`: student_filter, invoice_filter, enquiries, branches, courses, monthly trends — all now scoped by institute_id
  - `get_branch_revenue_detail()`: branch lookup, students, invoices — scoped
  - `generate_weekly_summary()`: invoices, students, enquiries — scoped
  - `get_batch_attendance_report()`: students — scoped
  - New institutes now correctly show 0 students, 0 revenue, 0 conversion rate, empty branches, empty trends, empty attendance report
- **Twilio SMS Parent Alerts**:
  - `twilio==9.10.5` installed and added to requirements.txt
  - `get_twilio_settings()` helper reads from `app_settings` collection (DB-first, env fallback)
  - `send_sms_alert(to_phone, message)` async helper — gracefully skips with warning if Twilio not configured
  - `mark_attendance()` updated: when status=="absent", looks up linked parent users (role=parent, student_id match) and fires async SMS task per parent phone
  - `GET /api/settings/twilio` — returns current config (account_sid, phone_number, has_auth_token, configured, source)
  - `POST /api/settings/twilio` — saves Account SID, Auth Token, Phone Number to `app_settings` collection
  - Settings page `/settings` — new "Twilio SMS Alerts" card with Account SID, Auth Token (show/hide), Phone Number fields; Active/Not configured badge
- **Gemini 3 Flash AI Weekly Summary**: Already implemented (from prior session). `POST /api/dashboard/weekly-summary` with Emergent LLM Key.

## Key API Endpoints (Complete List — Phase 8 additions)
- GET /api/settings/twilio — returns Twilio config
- POST /api/settings/twilio — saves Twilio credentials to DB

## Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Razorpay | Working (mock/real) | Keys managed via /settings page |
| Resend Email | MOCKED | Needs RESEND_API_KEY in .env |
| PDF (reportlab) | Working | |
| WhatsApp Webhook | Working | |
| Twilio SMS | Ready (awaiting credentials) | Settings UI in /settings page |
| Gemini 3 Flash | Working | Emergent LLM Key in .env |

## P2 Backlog
- Resend production key activation (P2)
- server.py refactor into /routers directory (P2)

## Refactoring TODO
- server.py is ~2350 lines; break into /routers directory when next major feature added
