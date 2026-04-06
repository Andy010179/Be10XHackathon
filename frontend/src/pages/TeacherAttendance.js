import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Building2, LogOut, QrCode, CheckCircle, XCircle, Users, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

export default function TeacherAttendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, stuRes] = await Promise.all([
        axios.get(`${API}/api/teacher/sessions`, { withCredentials: true }),
        axios.get(`${API}/api/teacher/students`, { withCredentials: true }),
      ]);
      setSessions(sessRes.data);
      setStudents(stuRes.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const selectSession = async (session) => {
    setActiveSession(session);
    setShowQr(false);
    setQrUrl("");
    try {
      const res = await axios.get(`${API}/api/teacher/attendance/${session.id}`, { withCredentials: true });
      const att = {};
      res.data.forEach((a) => { att[a.student_id] = a.status; });
      setAttendance(att);
    } catch {}
  };

  const loadQr = async () => {
    if (!activeSession) return;
    try {
      const res = await axios.get(`${API}/api/teacher/qr/${activeSession.id}`, { withCredentials: true });
      setQrUrl(res.data.qr_url);
      setShowQr(true);
    } catch { toast.error("Failed to load QR"); }
  };

  const markAttendance = async (studentId, status) => {
    if (!activeSession) return toast.error("Select a session first");
    setMarking(studentId);
    const prev = attendance[studentId];
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    try {
      await axios.post(`${API}/api/teacher/attendance`, {
        session_id: activeSession.id,
        student_id: studentId,
        status,
      }, { withCredentials: true });
    } catch {
      setAttendance((prev) => ({ ...prev, [studentId]: prev }));
      toast.error("Failed to mark attendance");
    } finally { setMarking(null); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-satoshi">
      {/* Mobile Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#002EB8] rounded flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="font-cabinet font-bold text-sm text-[#0A0A0A] tracking-tight">Attendance</p>
            <p className="text-xs text-[#8A8F98]">{user?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-[#8A8F98] hover:text-[#FF2B2B] transition-colors p-2">
          <LogOut size={18} />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Session Selector */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Select Session</p>
            <button onClick={fetchData} className="text-[#8A8F98] hover:text-[#002EB8] transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#8A8F98] text-center py-4">No sessions scheduled</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  data-testid={`session-btn-${s.id}`}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-all text-sm ${
                    activeSession?.id === s.id
                      ? "border-[#002EB8] bg-blue-50 text-[#002EB8]"
                      : "border-[#E5E7EB] hover:border-[#002EB8] text-[#0A0A0A]"
                  }`}
                >
                  <p className="font-medium">{s.title || "Class Session"}</p>
                  <p className="text-xs text-[#8A8F98] mt-0.5">
                    {new Date(s.start_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}{s.room_id}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {activeSession && (
          <>
            {/* QR Code */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm text-[#0A0A0A]">Session QR Code</p>
                <button
                  onClick={loadQr}
                  data-testid="show-qr-button"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#002EB8] text-white text-xs rounded-md hover:bg-[#001A85] transition-colors"
                >
                  <QrCode size={12} /> {showQr ? "Refresh" : "Show"} QR
                </button>
              </div>
              {showQr && qrUrl && (
                <div className="flex flex-col items-center py-4" data-testid="qr-code-display">
                  <img src={qrUrl} alt="Session QR Code" className="w-48 h-48 border border-[#E5E7EB] rounded-lg" />
                  <p className="text-xs text-[#8A8F98] mt-2 font-mono">EDUTECH-SESSION-{activeSession.id.slice(-8).toUpperCase()}</p>
                </div>
              )}
            </div>

            {/* Attendance Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-center">
                <p className="font-cabinet font-black text-2xl text-[#0A0A0A]">{students.length}</p>
                <p className="text-xs text-[#8A8F98] font-mono mt-0.5">Total</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="font-cabinet font-black text-2xl text-[#00C853]">{presentCount}</p>
                <p className="text-xs text-green-600 font-mono mt-0.5">Present</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="font-cabinet font-black text-2xl text-[#FF2B2B]">{absentCount}</p>
                <p className="text-xs text-red-600 font-mono mt-0.5">Absent</p>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden" data-testid="attendance-list">
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
                <Users size={16} className="text-[#8A8F98]" />
                <p className="font-medium text-sm text-[#0A0A0A]">Students ({students.length})</p>
              </div>
              <div className="divide-y divide-[#E5E7EB]">
                {students.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#8A8F98]">No active students found</div>
                ) : students.map((student) => {
                  const status = attendance[student.id];
                  const isMarking = marking === student.id;
                  return (
                    <div key={student.id} className="flex items-center justify-between px-4 py-3" data-testid={`student-attendance-${student.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-cabinet font-bold text-sm ${
                          status === "present" ? "bg-green-100 text-[#00C853]" :
                          status === "absent" ? "bg-red-100 text-[#FF2B2B]" :
                          "bg-[#F8F9FA] text-[#8A8F98]"
                        }`}>
                          {student.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#0A0A0A]">{student.name}</p>
                          <p className="text-xs text-[#8A8F98]">{student.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markAttendance(student.id, "present")}
                          disabled={isMarking}
                          data-testid={`present-btn-${student.id}`}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            status === "present"
                              ? "bg-[#00C853] text-white"
                              : "border border-[#E5E7EB] text-[#8A8F98] hover:border-[#00C853] hover:text-[#00C853]"
                          } disabled:opacity-50`}
                        >
                          <CheckCircle size={12} /> P
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, "absent")}
                          disabled={isMarking}
                          data-testid={`absent-btn-${student.id}`}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            status === "absent"
                              ? "bg-[#FF2B2B] text-white"
                              : "border border-[#E5E7EB] text-[#8A8F98] hover:border-[#FF2B2B] hover:text-[#FF2B2B]"
                          } disabled:opacity-50`}
                        >
                          <XCircle size={12} /> A
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!activeSession && !loading && (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center">
            <QrCode size={40} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#8A8F98]">Select a session above to start marking attendance</p>
          </div>
        )}
      </div>
    </div>
  );
}
