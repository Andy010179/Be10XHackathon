import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Users2, Clock, LogIn, LogOut, Calendar, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function fmt(mins) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function StaffAttendance() {
  const [qrData, setQrData] = useState("");
  const [qrDate, setQrDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAll(); }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qrRes, dashRes] = await Promise.all([
        fetch(`${API}/api/staff-attendance/institute-qr`, { credentials: "include" }),
        fetch(`${API}/api/staff-attendance/dashboard?date=${selectedDate}`, { credentials: "include" }),
      ]);
      if (qrRes.ok) { const d = await qrRes.json(); setQrData(d.qr_data); setQrDate(d.date); }
      if (dashRes.ok) { const d = await dashRes.json(); setRecords(d.records || []); }
    } catch { toast.error("Failed to load attendance data"); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success("Refreshed");
  };

  const presentCount = records.filter((r) => r.checkin_time).length;
  const checkedOutCount = records.filter((r) => r.checkout_time).length;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Staff Attendance</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">QR check-in/out dashboard</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} data-testid="refresh-attendance-btn"
          className="p-2 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:text-[#002EB8] hover:border-[#002EB8] transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Panel */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col items-center">
          <h3 className="font-cabinet font-bold text-base text-[#0A0A0A] mb-1">Today's Check-In QR</h3>
          <p className="text-xs text-[#8A8F98] mb-4">Display this for staff to scan — resets daily</p>
          {qrData ? (
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-sm" data-testid="institute-qr-code">
              <QRCodeSVG value={qrData} size={180} level="M" />
            </div>
          ) : (
            <div className="w-44 h-44 bg-[#F8F9FA] rounded-xl flex items-center justify-center text-[#8A8F98] text-xs">
              Loading QR...
            </div>
          )}
          <p className="text-xs text-[#8A8F98] mt-3 font-mono">{qrDate || "—"}</p>
          <p className="text-xs text-[#8A8F98] mt-1 text-center">Staff open their Staff Portal and use the camera to scan this QR to check in or out</p>
        </div>

        {/* Dashboard Stats + Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date filter + stats */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-md px-3 py-2 bg-white">
              <Calendar size={14} className="text-[#8A8F98]" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="attendance-date-picker"
                className="text-sm text-[#0A0A0A] bg-transparent focus:outline-none" />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-[#00C853]">
                <CheckCircle size={15} /> <span className="font-semibold">{presentCount}</span> checked in
              </div>
              <div className="flex items-center gap-1.5 text-[#8A8F98]">
                <XCircle size={15} /> <span className="font-semibold">{checkedOutCount}</span> checked out
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-[#8A8F98]">
              <Users2 size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No attendance records for {selectedDate}</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden" data-testid="attendance-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Staff</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Role</th>
                    <th className="text-center px-3 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Check In</th>
                    <th className="text-center px-3 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Check Out</th>
                    <th className="text-center px-3 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {records.map((r) => (
                    <tr key={r.user_id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{r.user_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-[#F0F4FF] text-[#002EB8] px-2 py-0.5 rounded-full capitalize">{r.role?.replace("_", " ")}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.checkin_time
                          ? <span className="flex items-center justify-center gap-1 text-[#00C853]"><LogIn size={12} />{fmtTime(r.checkin_time)}</span>
                          : <span className="text-[#8A8F98]">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.checkout_time
                          ? <span className="flex items-center justify-center gap-1 text-[#FF2B2B]"><LogOut size={12} />{fmtTime(r.checkout_time)}</span>
                          : <span className="text-[#8A8F98]">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.duration_mins > 0
                          ? <span className="flex items-center justify-center gap-1 text-[#002EB8]"><Clock size={12} />{fmt(r.duration_mins)}</span>
                          : <span className="text-[#8A8F98]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
