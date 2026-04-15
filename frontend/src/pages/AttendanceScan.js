import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, QrCode, LogIn, X, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AttendanceScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const sessionId = searchParams.get("session");

  const [status, setStatus] = useState("idle"); // idle | loading | success | error | already
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID found in this QR code URL.");
      return;
    }
    if (user && user.role === "student") {
      submitCheckIn();
    }
    // If not logged in, we show the login prompt — user clicks and comes back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, sessionId]);

  const submitCheckIn = async () => {
    setStatus("loading");
    try {
      const res = await axios.post(
        `${API}/api/attendance/qr-checkin`,
        { session_id: sessionId },
        { withCredentials: true }
      );
      if (res.data.already_marked) {
        setStatus("already");
        setMessage(res.data.message || "Attendance already recorded.");
      } else {
        setStatus("success");
        setMessage(res.data.message || "Marked Present!");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Check-in failed. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 size={32} className="text-[#002EB8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-satoshi">
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-lg w-full max-w-sm p-8 text-center">
        {/* Header */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#002EB8]/10">
          <QrCode size={32} className="text-[#002EB8]" />
        </div>
        <h1 className="font-cabinet font-black text-2xl tracking-tight text-[#0A0A0A] mb-1">Attendance Check-in</h1>
        <p className="text-sm text-[#8A8F98] mb-6">EduTech LMS · QR Attendance</p>

        {/* Status: Not logged in */}
        {!user && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-[#002EB8]">
              Please log in as a student to mark your attendance for this session.
            </div>
            <button
              onClick={() => navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
              data-testid="scan-login-button"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#002EB8] text-white text-sm rounded-lg hover:bg-[#001A85] font-medium transition-colors"
            >
              <LogIn size={16} /> Log in to Check In
            </button>
            {sessionId && (
              <p className="text-xs text-[#8A8F98] font-mono">Session: {sessionId}</p>
            )}
          </div>
        )}

        {/* Status: Wrong role */}
        {user && user.role !== "student" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Only students can check in via QR. You are logged in as <strong>{user.role}</strong>.
            </div>
            <button onClick={() => navigate("/")}
              className="w-full px-5 py-3 border border-[#E5E7EB] text-[#8A8F98] text-sm rounded-lg hover:bg-[#F8F9FA]">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Status: Loading */}
        {user && user.role === "student" && status === "loading" && (
          <div className="space-y-4">
            <Loader2 size={32} className="text-[#002EB8] animate-spin mx-auto" />
            <p className="text-sm text-[#8A8F98]">Marking your attendance...</p>
          </div>
        )}

        {/* Status: Success */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto" data-testid="checkin-success">
              <CheckCircle size={32} className="text-[#00C853]" />
            </div>
            <p className="text-lg font-bold text-[#00C853]">Present!</p>
            <p className="text-sm text-[#8A8F98]">{message}</p>
            <button onClick={() => navigate("/portal")}
              className="w-full px-5 py-3 bg-[#002EB8] text-white text-sm rounded-lg hover:bg-[#001A85] font-medium">
              Go to My Portal
            </button>
          </div>
        )}

        {/* Status: Already marked */}
        {status === "already" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto" data-testid="checkin-already">
              <CheckCircle size={32} className="text-[#002EB8]" />
            </div>
            <p className="text-lg font-bold text-[#002EB8]">Already Marked</p>
            <p className="text-sm text-[#8A8F98]">{message}</p>
            <button onClick={() => navigate("/portal")}
              className="w-full px-5 py-3 border border-[#E5E7EB] text-[#8A8F98] text-sm rounded-lg hover:bg-[#F8F9FA]">
              View My Attendance
            </button>
          </div>
        )}

        {/* Status: Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto" data-testid="checkin-error">
              <X size={32} className="text-[#FF2B2B]" />
            </div>
            <p className="text-lg font-bold text-[#FF2B2B]">Check-in Failed</p>
            <p className="text-sm text-[#8A8F98]">{message}</p>
            <button onClick={() => navigate("/portal?tab=checkin")}
              className="w-full px-5 py-3 bg-[#002EB8] text-white text-sm rounded-lg hover:bg-[#001A85] font-medium">
              Try Manual Check-in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
