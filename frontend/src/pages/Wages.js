import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DollarSign, Users2, BarChart2, Plus, RefreshCw } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "This Month" },
];

export default function Wages() {
  const [config, setConfig] = useState({ teacher_per_lecture_rate: 0, staff_per_conversion_rate: 0 });
  const [configSaving, setConfigSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showLecModal, setShowLecModal] = useState(false);
  const [lecForm, setLecForm] = useState({ user_id: "", notes: "", override_amount: "" });
  const [lecSaving, setLecSaving] = useState(false);

  useEffect(() => { fetchConfig(); fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSummary(); fetchLogs(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/api/wages/config`, { credentials: "include" });
      if (res.ok) setConfig(await res.json());
    } catch { /* silent */ }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/users`, { credentials: "include" });
      if (res.ok) {
        const all = await res.json();
        setUsers(all.filter((u) => ["teacher", "staff_member"].includes(u.role)));
      }
    } catch { /* silent */ }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/wages/summary?period=${period}`, { credentials: "include" });
      if (res.ok) setSummary(await res.json());
    } catch { toast.error("Failed to load wage summary"); }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/api/wages/logs?period=${period}`, { credentials: "include" });
      if (res.ok) setLogs(await res.json());
    } catch { /* silent */ }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await fetch(`${API}/api/wages/config`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_per_lecture_rate: parseFloat(config.teacher_per_lecture_rate) || 0,
          staff_per_conversion_rate: parseFloat(config.staff_per_conversion_rate) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Wage rates saved!");
    } catch { toast.error("Failed to save configuration"); }
    finally { setConfigSaving(false); }
  };

  const handleLogLecture = async (e) => {
    e.preventDefault();
    setLecSaving(true);
    try {
      const body = { user_id: lecForm.user_id, notes: lecForm.notes };
      if (lecForm.override_amount) body.override_amount = parseFloat(lecForm.override_amount);
      const res = await fetch(`${API}/api/wages/logs/lecture`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      toast.success("Lecture wage logged!");
      setShowLecModal(false);
      setLecForm({ user_id: "", notes: "", override_amount: "" });
      fetchSummary(); fetchLogs();
    } catch (err) { toast.error(err.message || "Failed"); }
    finally { setLecSaving(false); }
  };

  return (
    <div className="p-6 lg:p-8 font-satoshi space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Wage Management</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">Configure rates and track staff payroll</p>
        </div>
        <button onClick={() => setShowLecModal(true)} data-testid="log-lecture-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md font-medium hover:bg-[#001A85]">
          <Plus size={15} /> Log Lecture
        </button>
      </div>

      {/* Config Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h3 className="font-cabinet font-bold text-base text-[#0A0A0A] mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-[#002EB8]" /> Wage Rate Configuration
        </h3>
        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1.5">Teacher Rate (₹ per Lecture)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98] text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={config.teacher_per_lecture_rate}
                onChange={(e) => setConfig({ ...config, teacher_per_lecture_rate: e.target.value })}
                data-testid="teacher-rate-input"
                className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
            <p className="text-xs text-[#8A8F98] mt-1">Auto-applied when a lecture is logged for a teacher</p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1.5">Staff Rate (₹ per Conversion)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98] text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={config.staff_per_conversion_rate}
                onChange={(e) => setConfig({ ...config, staff_per_conversion_rate: e.target.value })}
                data-testid="staff-rate-input"
                className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
            <p className="text-xs text-[#8A8F98] mt-1">Auto-applied when a staff member converts a CRM lead</p>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={configSaving} data-testid="save-wage-config-btn"
              className="px-5 py-2 bg-[#002EB8] text-white text-sm rounded-md font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
              {configSaving ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </form>
      </div>

      {/* Period filter + Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-[#F8F9FA] p-1 rounded-lg border border-[#E5E7EB]">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} data-testid={`period-${p.key}`}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${period === p.key ? "bg-white text-[#0A0A0A] shadow-sm border border-[#E5E7EB]" : "text-[#8A8F98] hover:text-[#0A0A0A]"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => { fetchSummary(); fetchLogs(); }}
            className="p-2 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:text-[#002EB8] hover:border-[#002EB8] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#E5E7EB] divide-x divide-y lg:divide-y-0 divide-[#E5E7EB] mb-5">
            <div className="p-5 bg-white">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Total Payable</p>
              <p className="font-cabinet font-black text-2xl text-[#002EB8]">₹{(summary.total || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="p-5 bg-white">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Staff Members</p>
              <p className="font-cabinet font-black text-2xl text-[#0A0A0A]">{summary.summary?.length || 0}</p>
            </div>
            <div className="p-5 bg-white">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Total Lectures</p>
              <p className="font-cabinet font-black text-2xl text-[#00C853]">{summary.summary?.reduce((a, u) => a + u.lecture_count, 0) || 0}</p>
            </div>
            <div className="p-5 bg-white">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Total Conversions</p>
              <p className="font-cabinet font-black text-2xl text-[#FFD600]">{summary.summary?.reduce((a, u) => a + u.conversion_count, 0) || 0}</p>
            </div>
          </div>
        )}

        {/* Summary table */}
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : !summary?.summary?.length ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-[#8A8F98]">
            <BarChart2 size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No wage records for this period</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden" data-testid="wage-summary-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Role</th>
                  <th className="text-center px-3 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Lectures</th>
                  <th className="text-center px-3 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Conversions</th>
                  <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Total Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {summary.summary.map((u) => (
                  <tr key={u.user_id} className="hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{u.user_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-[#F0F4FF] text-[#002EB8] px-2 py-0.5 rounded-full capitalize">{u.role?.replace("_", " ")}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-[#00C853]">{u.lecture_count}</td>
                    <td className="px-3 py-3 text-center font-mono text-[#FFD600]">{u.conversion_count}</td>
                    <td className="px-4 py-3 text-right font-cabinet font-bold text-[#002EB8]">₹{u.total_wage.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Lecture Modal */}
      {showLecModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Log Teacher Lecture</h3>
              <button onClick={() => setShowLecModal(false)} className="text-[#8A8F98]">✕</button>
            </div>
            <form onSubmit={handleLogLecture} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Teacher *</label>
                <select required value={lecForm.user_id} onChange={(e) => setLecForm({ ...lecForm, user_id: e.target.value })}
                  data-testid="lecture-teacher-select"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                  <option value="">Select teacher...</option>
                  {users.filter((u) => u.role === "teacher").map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Notes</label>
                <input value={lecForm.notes} onChange={(e) => setLecForm({ ...lecForm, notes: e.target.value })}
                  placeholder="e.g. Physics Chapter 5" data-testid="lecture-notes-input"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Override Amount (leave blank for default rate)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98] text-sm">₹</span>
                  <input type="number" min="0" step="0.01" value={lecForm.override_amount}
                    onChange={(e) => setLecForm({ ...lecForm, override_amount: e.target.value })}
                    placeholder={`Default: ₹${config.teacher_per_lecture_rate || 0}`}
                    className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLecModal(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={lecSaving} data-testid="log-lecture-submit"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {lecSaving ? "Logging..." : "Log Lecture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
