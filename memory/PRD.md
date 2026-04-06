# EduTech-LMS PRD

## Project Overview
Full-stack EduTech CRM-LMS platform built with React + FastAPI + MongoDB.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, shadcn/ui, recharts, sonner, lucide-react
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, bcrypt, emergentintegrations (Gemini 3 Flash)
- **Database**: MongoDB (test_database)
- **Auth**: JWT (httpOnly cookies), role-based (Admin/Employer/Teacher/Student)
- **AI**: Gemini 3 Flash via emergentintegrations for weekly summary

## User Roles
- **Admin**: Full access (all modules)
- **Employer**: Dashboard only (analytics + AI summary)
- **Teacher**: Teacher Attendance UI only (mobile-first)
- **Student**: (future - profile view)

## Implemented Features (MVP)

### 1. Authentication (JWT + Cookies)
- Login/Logout with httpOnly cookies
- Role-based protected routes
- Admin seeded on startup (admin@edutech.com / admin123)

### 2. CRM Pipeline (Enquiries)
- Kanban drag-and-drop board
- 5 stages: New, Follow-up, Missed, Declined, Converted
- Add/Delete enquiries

### 3. Academic Hub
- Branch management (CRUD)
- Batch management with days/timings
- Class scheduling with conflict checker (teacher + room overlap detection)

### 4. Financial Engine
- Invoice generation with 18% GST calculation
- Fee breakdown display
- Payment recording
- Nudge notifications for overdue balances

### 5. Employer Dashboard
- KPI cards: Revenue, Outstanding, Students, Conversion Rate
- Bar Chart: Revenue per Branch
- Pie Chart: Enrolments by Category
- Line Chart: Monthly Enrolment Trends
- AI Weekly Summary (Gemini 3 Flash)
- Branch filter

### 6. Teacher Light UI (Mobile-first)
- Session selection
- QR code generation per session
- One-tap Present/Absent marking
- Live attendance stats
- Auto-updates syllabus percentage

### 7. Student Lifecycle Management
- Student list with search
- Full profile with 4 tabs: Personal, Academics, Financials, Lifecycle Actions
- Status toggle (onboarding/active/completed/dropped)
- Batch assignment/onboarding
- Certificate generation
- Next-year promotion (creates CRM lead)

## Sample Data (auto-seeded)
- 3 Branches (Pune, Mumbai, Nashik)
- 5 Courses (HSC, CET, JEE, NEET, CA)
- 5 Sample Enquiries across all stages
- 4 Sample Students

## API Base URL
https://skill-academy-77.preview.emergentagent.com

## Admin Credentials
- Email: admin@edutech.com
- Password: admin123

## Date Created
February 2026

## What's Been Implemented

### Phase 1 (MVP — Feb 2026)
- JWT Auth, CRM Kanban, Academic Hub (conflict checker), Finance (GST), Dashboard (charts + AI), Teacher Attendance (QR), Student Lifecycle

### Phase 2 (Feb 2026)
- **Course Management UI** — Full CRUD with card grid, category badges, edit/delete, GST preview
- **User Management** — Create Employer/Teacher/Student accounts with role selector, branch assignment, role stat cards
- **Email Nudge (Resend)** — Integrated Resend library; sends fee reminder HTML emails when RESEND_API_KEY is set; graceful fallback with toast when not configured. Sender: andykool010179@gmail.com
- **Razorpay Payments** — Full integration with mock mode (when no keys); real Razorpay checkout when keys provided; payment verify updates invoice status; mock payment modal for demo
- **Student Self-Service Portal** — 5 tabs: Profile (editable), Courses & Attendance, My Fees, Certificate Download (HTML), Fee Query form with email notification to admin

## Pending Integrations
- Add RESEND_API_KEY to backend/.env for live email nudges (domain verification required for andykool010179@gmail.com)
- Add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET to backend/.env for live payments

## Prioritized Backlog
- P0: WhatsApp webhook for CRM lead auto-capture ✅ DONE
- P0: PDF certificate generation (instead of HTML) ✅ DONE
- P1: Student fee payment from portal (Razorpay in student portal) ✅ DONE
- P1: Attendance reports per batch ✅ DONE
- P1: Settings page for Razorpay keys ✅ DONE
- P2: Multi-tenant institute isolation
- P2: Parent login portal


### Phase 4 (Feb 2026) — Edit Flows & UX Fixes
- **User Management**: Edit user (email, role, joining date) pencil icon + PUT /api/users/:id
- **User Management**: CSV bulk import for students (auto-password, results panel, template CSV download)
- **Academic Hub**: Edit Branch, Batch, Schedule via pencil icons + modal forms + PUT endpoints
- **Lifecycle Actions**: Multi-batch checkbox select (batch_ids array) when onboarding students
- **CRM Pipeline**: Edit per enquiry card via pencil icon (hover), full edit modal with all fields
- **New Enquiry**: City/Location field with map-pin icon, shown on kanban cards


### Phase 5 (Feb 2026) — CRM Enhancements + Dashboard Drill-down + Bulk Promotion
- **CRM Pipeline**: Bulk CSV import for enquiries with all 7 fields (name, email, phone, city, source, stage, notes) + Template download
- **CRM Pipeline**: Enquiry form focus-loss fixed (FormFields moved to module-level)
- **CRM Pipeline**: `re-enrollment` source label added to SOURCE_LABELS
- **Dashboard**: Branch filter now correctly filters ALL KPIs, charts, and monthly trends (invoice-level filtering)
- **Dashboard**: Revenue by Branch bar chart is clickable → drill-down panel with line-by-line invoice details (student, course, paid, balance, status)
- **Students**: Multi-select checkboxes + select-all, Status filter dropdown
- **Students**: Bulk Promotion — select students → Generate Re-enrolment Leads → creates CRM enquiries (source: re-enrollment)
