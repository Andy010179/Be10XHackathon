import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enquiries from "./pages/Enquiries";
import Academic from "./pages/Academic";
import Finance from "./pages/Finance";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import TeacherAttendance from "./pages/TeacherAttendance";
import Courses from "./pages/Courses";
import UserManagement from "./pages/UserManagement";
import StudentPortal from "./pages/StudentPortal";
import AttendanceReports from "./pages/AttendanceReports";
import Settings from "./pages/Settings";
import FeeQueries from "./pages/FeeQueries";
import AttendanceScan from "./pages/AttendanceScan";
import PublicEnquiryForm from "./pages/PublicEnquiryForm";
import SuperAdmin from "./pages/SuperAdmin";
import StaffPortal from "./pages/StaffPortal";
import ParentPortal from "./pages/ParentPortal";
import Library from "./pages/Library";
import StaffAttendance from "./pages/StaffAttendance";
import Wages from "./pages/Wages";

// Role constants — defined once to avoid inline array recreation on every render
const SUPER_ADMIN_ROLES = ["super_admin"];
const ADMIN_TEACHER_ROLES = ["admin", "teacher"];
const ADMIN_ONLY_ROLES = ["admin"];
const ADMIN_EMPLOYER_ROLES = ["admin", "employer"];
const STUDENT_ADMIN_ROLES = ["student", "admin"];
const STAFF_ROLES = ["admin", "teacher", "staff_member", "employer"];

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#002EB8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8A8F98] font-satoshi">Loading EduTech LMS...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "teacher") return <Navigate to="/teacher/attendance" replace />;
    if (user.role === "student") return <Navigate to="/portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <>
      <Toaster position="top-right" richColors expand={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/attendance/scan" element={<AttendanceScan />} />
        <Route path="/enquiry" element={<PublicEnquiryForm />} />
        <Route path="/parent-portal" element={<ParentPortal />} />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute roles={SUPER_ADMIN_ROLES}>
              <Layout><SuperAdmin /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance"
          element={
            <ProtectedRoute roles={ADMIN_TEACHER_ROLES}>
              <TeacherAttendance />
            </ProtectedRoute>
          }
        />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={ADMIN_EMPLOYER_ROLES}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enquiries"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Enquiries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Academic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute roles={STUDENT_ADMIN_ROLES}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-reports"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <AttendanceReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fee-queries"
            element={
              <ProtectedRoute roles={ADMIN_ONLY_ROLES}>
                <FeeQueries />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Staff Portal — outside the shared Layout wrapper */}
        <Route
          path="/staff-portal"
          element={
            <ProtectedRoute roles={STAFF_ROLES}>
              <Layout><StaffPortal /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Layout><Library /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wages"
          element={
            <ProtectedRoute roles={["admin", "employer"]}>
              <Layout><Wages /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-attendance"
          element={
            <ProtectedRoute roles={["admin", "employer"]}>
              <Layout><StaffAttendance /></Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
