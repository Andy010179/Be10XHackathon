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

## Backlog / Next Items
- P0: Email notifications for nudges (Resend/SendGrid)
- P0: Employer user creation UI
- P1: Student login portal
- P1: Course management UI (CRUD for courses)
- P1: Full attendance reports per student
- P2: Razorpay/Stripe payment integration
- P2: Google Forms / WhatsApp webhook sync
- P2: Certificate download as PDF
- P2: Advanced analytics (cohort analysis)
- P3: Multi-tenant support (institute-level isolation)
