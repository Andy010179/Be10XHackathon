# EduTech-LMS PRD

## Original Problem Statement
Build a multi-tenant Learning Management System (EduTech-LMS) with advanced features:
- Multi-tenant institute isolation
- Parent login portal, Public Enquiry Web Forms
- CRM Pagination, Admin Data Management
- Finance Automated PDFs, Portal QR Code Attendance
- Twilio SMS alerts, Gemini 3 Flash AI summaries, Resend email
- White-label branding with custom logos
- Parent invoice downloads, Student digital ID cards, Student QR scanner

## Phases & Status

### Phase 1 — COMPLETE ✅
- Staff ID Card generation (PDF) + Staff Portal photo upload
- GST Dropdown (1-30%) in Finance Invoices  
- Fee Query Admin comments, "Mark Resolved", pagination
- Auto-generation of Student Unique IDs
- Disabled Parent Portal Invoice/Receipt downloads

### Phase 2 — COMPLETE ✅ (May 2026)
- **CRM Pipeline**: Hide converted leads after 24h with "Show Archived" toggle + "Converted by" attribution badge
- **Revenue PDF Export**: `GET /api/dashboard/revenue-pdf` with branch/student/parent/amount details
- **SuperAdmin Settings Sync**: Per-institute settings view/edit + Push Global Settings (Twilio/Razorpay) to all institutes

### Phase 3 — COMPLETE ✅ (May 2026)
- **Wage System** (`/wages`): Admin configures teacher-per-lecture & staff-per-conversion rates; auto-creates wage logs on CRM conversion; manual lecture log; daily/weekly/monthly summary
- **Staff QR Attendance** (`/staff-attendance`): Admin sees daily rotating QR code; staff scan via camera in Staff Portal to check in/out; attendance dashboard with date picker
- **Library Repository** (`/library`): 3 tabs (Books/Videos/Links); PDF file upload; YouTube/URL adding; search; download; visible to all roles

## Architecture
```
/app/
├── backend/
│   ├── server.py              # Thin entry point
│   ├── models.py              # Pydantic models (incl. WageConfig, WageLogCreate)
│   ├── database.py            # MongoDB connection
│   ├── dependencies.py        # Auth / Role dependencies
│   ├── helpers.py             # PDF logic, utility functions
│   └── routers/
│       ├── auth.py, users.py, finance.py, staff.py, enquiries.py, dashboard.py
│       ├── institutes.py      # + settings sync endpoints
│       ├── wages.py           # NEW: Wage system
│       ├── staff_attendance.py # NEW: QR attendance
│       └── library.py         # NEW: Library repository
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js   # + Revenue PDF export
│       │   ├── Enquiries.js   # + show_archived toggle + converted_by badge
│       │   ├── SuperAdmin.js  # + settings sync modals
│       │   ├── StaffPortal.js # + QR check-in section
│       │   ├── Library.js     # NEW
│       │   ├── StaffAttendance.js # NEW
│       │   └── Wages.js       # NEW
│       └── components/
│           └── Layout.js      # + Wages, Staff Attendance, Library nav items
```

## Key DB Collections
- `institutes`, `users`, `enquiries`, `invoices`, `students`, `branches`
- `wage_configs` — per-institute wage rate config
- `wage_logs` — individual wage entries (type: lecture|conversion)
- `staff_attendance` — QR check-in/out records
- `library` — library items (book/video/url)

## API Routes
- `GET /api/wages/config` — wage config for institute
- `PUT /api/wages/config` — update rates
- `GET /api/wages/logs` — list logs with period filter
- `GET /api/wages/summary` — aggregate summary
- `POST /api/wages/logs/lecture` — manual lecture log
- `GET /api/staff-attendance/institute-qr` — daily QR token
- `POST /api/staff-attendance/scan` — check in/out
- `GET /api/staff-attendance/me` — my attendance (staff)
- `GET /api/staff-attendance/dashboard` — admin view
- `GET /api/library` — list items
- `POST /api/library` — add item
- `DELETE /api/library/{id}` — delete
- `GET /api/library/{id}/download` — stream PDF
- `GET /api/institutes/{id}/settings` — super admin get settings
- `PUT /api/institutes/{id}/settings` — super admin update settings
- `POST /api/institutes/push-global-settings` — push to all institutes
- `GET /api/dashboard/revenue-pdf` — Revenue by Branch PDF

## Backlog / Upcoming Tasks
### P1
- Gemini 3 Flash AI weekly performance summary for Dashboard (uses Emergent LLM Key)
- Frontend modal extraction refactoring: UserManagement.js, Finance.js, Academic.js

### P2
- Transition Resend email from MOCK to production (requires user API key)
- Twilio SMS: user must provide API credentials in Settings

## Known Issues
- Resend Email is MOCKED (no real API key configured)
- Twilio SMS: credentials must be entered by admin in Settings page
