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
        <Route
          path="/teacher/attendance"
          element={
            <ProtectedRoute roles={["admin", "teacher"]}>
              <TeacherAttendance />
            </ProtectedRoute>
          }
        />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["admin", "employer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enquiries"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Enquiries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Academic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
        </Route>
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
