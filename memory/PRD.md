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
- **Issue 1**: Advanced Student Profile Editing
  - Edit form: Name, Phone, DOB, Branch, Guardian Name/Phone, ID Proof, School/Institute
  - Payment History tab in Financials (expandable per invoice row)
  - Backend: StudentUpdate model + new fields (id_proof, institute_name)
  
- **Issue 2**: Global Table Sorting, Filtering, Column Toggles
  - Finance: sort by any column, status filter, student/course search, Columns toggle (Base Fee/GST/Discount)
  - Students: sortable by Name, Status, Progress columns
  - AttendanceReports: search by student name + sortable columns
  - CRM Pipeline: search bar filters cards by name/email/phone/city

- **Issue 3**: User Management Password Controls
  - CSV bulk import now sets default password = "User123"
  - Edit User modal has "Reset Password" optional field
  - Backend: UserUpdate model with new_password field + hash on update

- **Issue 4**: Student-Linked User Creation
  - Create User with role=student → shows searchable student dropdown
  - Links user.student_id → student.user_id bidirectionally
  - Teacher/Admin/Employer creation unchanged

- **Issue 5**: Student Portal + Admin Fee Queries
  - Student portal has 5 tabs: Profile, Courses & Attendance, My Fees, Certificate, Fee Query
  - Admin "Fee Queries" page at /fee-queries (new route + nav item)
  - Admin can see all submitted queries, filter by status/search, mark as resolved
  - Backend: GET /api/admin/fee-queries, PATCH /api/admin/fee-queries/:id/resolve

## Key API Endpoints (Complete List)
- POST /api/auth/login, logout, GET /api/auth/me
- GET/POST /api/branches, /api/courses
- GET/POST/PUT/DELETE /api/enquiries
- PATCH /api/enquiries/:id/stage (auto-converts to student)
- POST /api/enquiries/bulk-import
- GET/POST/PUT/DELETE /api/users
- POST /api/users (now handles student_id for linking)
- GET/POST /api/students, GET/PUT /api/students/:id
- PATCH /api/students/:id/status
- POST /api/students/:id/onboard, complete, promote
- GET /api/students/:id/certificate
- GET/POST /api/finance/invoices, POST /api/finance/calculate
- PATCH /api/finance/invoices/:id/pay (now records to payments collection)
- GET /api/finance/invoices/:id/payments (NEW - payment history)
- POST /api/finance/nudge/:student_id
- GET /api/academic/batches, schedules
- GET /api/teacher/attendance/batch-report
- POST /api/portal/fee-query
- GET /api/admin/fee-queries (NEW)
- PATCH /api/admin/fee-queries/:id/resolve (NEW)
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

## P1/P2 Backlog
- Gemini 3 Flash AI weekly summary (P1)
- Resend production key activation (P2)

## Refactoring TODO
- server.py is ~1500 lines; break into /routers directory when next major feature added
