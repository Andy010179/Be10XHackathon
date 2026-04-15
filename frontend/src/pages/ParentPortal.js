import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  User, BookOpen, DollarSign, GraduationCap, LogOut,
  CheckCircle, X, Clock, ChevronRight, Building2
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "attendance", label: "Attendance", icon: BookOpen },
  { key: "fees", label: "Fees", icon: DollarSign },
  { key: "academic", label: "Academics", icon: GraduationCap },
];

export default function ParentPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [academic, setAcademic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "parent") { navigate("/"); return; }
    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeTab === "attendance" && attendance.length === 0) fetchAttendance();
    if (activeTab === "fees" && fees.length === 0) fetchFees();
    if (activeTab === "academic" && !academic) fetchAcademic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/api/parent/dashboard`, { withCredentials: true });
      setDashboard(res.data);
    } catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API}/api/parent/attendance`, { withCredentials: true });
      setAttendance(res.data);
    } catch { toast.error("Failed to load attendance"); }
  };

  const fetchFees = async () => {
    try {
      const res = await axios.get(`${API}/api/parent/fees`, { withCredentials: true });
      setFees(res.data);
    } catch { toast.error("Failed to load fees"); }
  };

  const fetchAcademic = async () => {
    try {
      const res = await axios.get(`${API}/api/parent/academic`, { withCredentials: true });
      setAcademic(res.data);
    } catch { toast.error("Failed to load academics"); }
  };

  const handleLogout = async () => { await logout(); navigate("/login"); };

  if (loading) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center"><p className="text-[#8A8F98]">Loading...</p></div>;

  const student = dashboard?.student;
  const attSummary = dashboard?.attendance_summary || {};
  const feeSummary = dashboard?.fee_summary || {};

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-satoshi">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#002EB8] rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-cabinet font-bold text-base text-[#0A0A0A]">Parent Portal</p>
            <p className="text-xs text-[#8A8F98]">{user?.name || "Parent"}</p>
          </div>
        </div>
        <button onClick={handleLogout} data-testid="parent-logout"
          className="flex items-center gap-1.5 text-sm text-[#8A8F98] hover:text-[#0A0A0A]">
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Student banner */}
        {student && (
          <div className="bg-[#002EB8] text-white rounded-xl p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-widest mb-1">Monitoring</p>
              <h2 className="font-cabinet font-black text-2xl tracking-tight">{student.name}</h2>
              <p className="text-sm text-white/70 mt-0.5">{student.email} · {student.status?.toUpperCase()}</p>
            </div>
            <div className="hidden sm:flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{attSummary.percentage ?? "—"}%</p>
                <p className="text-xs text-white/70">Attendance</p>
              </div>
              <div>
                <p className="text-2xl font-bold">₹{(feeSummary.balance || 0).toLocaleString("en-IN")}</p>
                <p className="text-xs text-white/70">Balance Due</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1 mb-5 overflow-x-auto" data-testid="parent-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              data-testid={`tab-${key}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors flex-1 justify-center ${activeTab === key ? "bg-[#002EB8] text-white font-medium" : "text-[#8A8F98] hover:text-[#0A0A0A]"}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Attendance", value: `${attSummary.percentage ?? 0}%`, sub: `${attSummary.present}/${attSummary.total} sessions`, ok: (attSummary.percentage ?? 0) >= 75 },
                { label: "Total Fees", value: `₹${(feeSummary.total || 0).toLocaleString("en-IN")}`, sub: "Total payable", ok: true },
                { label: "Balance Due", value: `₹${(feeSummary.balance || 0).toLocaleString("en-IN")}`, sub: feeSummary.balance > 0 ? "Outstanding" : "Cleared", ok: feeSummary.balance === 0 },
              ].map(({ label, value, sub, ok }) => (
                <div key={label} className={`bg-white border rounded-xl p-4 ${ok ? "border-[#E5E7EB]" : "border-red-200 bg-red-50/50"}`}>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-widest mb-1">{label}</p>
                  <p className={`text-2xl font-bold font-cabinet ${ok ? "text-[#0A0A0A]" : "text-[#FF2B2B]"}`}>{value}</p>
                  <p className="text-xs text-[#8A8F98] mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-3">Student Details</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                {[
                  ["Name", student?.name], ["Email", student?.email],
                  ["Phone", student?.phone || "—"], ["Status", student?.status?.toUpperCase()],
                  ["Address", student?.address || "—"], ["Guardian", student?.guardian_name || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-[#8A8F98]">{k}:</span>
                    <p className="text-[#0A0A0A] font-medium truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Attendance Records</h3>
              <span className="text-xs text-[#8A8F98]">{attendance.length} records</span>
            </div>
            {attendance.length === 0 ? (
              <p className="text-center text-[#8A8F98] text-sm py-10">No attendance records found.</p>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {attendance.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">{r.course_name || "Session"}</p>
                      <p className="text-xs text-[#8A8F98]">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}</p>
                    </div>
                    {r.status === "present"
                      ? <CheckCircle size={16} className="text-[#00C853]" />
                      : <X size={16} className="text-[#FF2B2B]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEES TAB */}
        {activeTab === "fees" && (
          <div className="space-y-3">
            {fees.length === 0 ? (
              <p className="text-center text-[#8A8F98] text-sm py-10">No invoices found.</p>
            ) : fees.map((inv) => (
              <div key={inv.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{inv.course_name || "Course"}</p>
                    <p className="text-xs text-[#8A8F98]">{inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "partial" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                    {inv.status?.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-[#8A8F98]">Total</span><p className="font-medium">₹{(inv.total || 0).toLocaleString("en-IN")}</p></div>
                  <div><span className="text-[#8A8F98]">Paid</span><p className="font-medium text-[#00C853]">₹{(inv.paid_amount || 0).toLocaleString("en-IN")}</p></div>
                  <div><span className="text-[#8A8F98]">Balance</span><p className={`font-medium ${inv.balance > 0 ? "text-[#FF2B2B]" : "text-[#00C853]"}`}>₹{(inv.balance || 0).toLocaleString("en-IN")}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACADEMIC TAB */}
        {activeTab === "academic" && academic && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-3">Enrolled Batches</h3>
              {academic.batches?.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No batches enrolled yet.</p>
              ) : academic.batches?.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-[#E5E7EB] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-[#8A8F98]">{b.start_date ? `Started ${new Date(b.start_date).toLocaleDateString("en-IN")}` : "—"}</p>
                  </div>
                  <span className="text-xs text-[#8A8F98]">{b.status || "active"}</span>
                </div>
              ))}
            </div>
            {academic.schedules?.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-3">Upcoming Schedule</h3>
                {academic.schedules.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-[#E5E7EB] last:border-0">
                    <Clock size={14} className="text-[#8A8F98] shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{s.title || s.subject || "Class"}</p>
                      <p className="text-xs text-[#8A8F98]">{s.start_time ? new Date(s.start_time).toLocaleString("en-IN") : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
