import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, TrendingDown, Award, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const PCT_COLOR = (pct) => {
  if (pct >= 75) return "#00C853";
  if (pct >= 50) return "#FFD600";
  return "#FF2B2B";
};

export default function AttendanceReports() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol]       = useState("attendance_pct");
  const [sortDir, setSortDir]       = useState("desc");

  useEffect(() => {
    axios.get(`${API}/api/academic/batches`, { withCredentials: true })
      .then((r) => setBatches(r.data))
      .catch(() => toast.error("Failed to load batches"));
    fetchReport("all");
  }, []);

  const fetchReport = async (batchId) => {
    setLoading(true);
    try {
      const url = batchId && batchId !== "all"
        ? `${API}/api/teacher/batch-report?batch_id=${batchId}`
        : `${API}/api/teacher/batch-report`;
      const res = await axios.get(url, { withCredentials: true });
      setReport(res.data);
    } catch {
      toast.error("Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = (val) => {
    setSelectedBatch(val);
    fetchReport(val);
  };

  const totalStudents = report.length;
  const avgPct = totalStudents > 0
    ? Math.round(report.reduce((s, r) => s + r.attendance_pct, 0) / totalStudents)
    : 0;
  const highest = report.length > 0 ? report.reduce((a, b) => a.attendance_pct > b.attendance_pct ? a : b, report[0]) : null;
  const lowest  = report.length > 0 ? report.reduce((a, b) => a.attendance_pct < b.attendance_pct ? a : b, report[0]) : null;
  const atRisk  = report.filter((r) => r.attendance_pct < 75).length;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="ml-1 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp size={11} className="ml-1 text-[#002EB8]" /> : <ChevronDown size={11} className="ml-1 text-[#002EB8]" />;
  };

  const displayedReport = [...report]
    .filter((r) => !searchQuery || r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aV = a[sortCol]; const bV = b[sortCol];
      if (typeof aV === "string") return sortDir === "asc" ? (aV||"").localeCompare(bV||"") : (bV||"").localeCompare(aV||"");
      return sortDir === "asc" ? (aV||0) - (bV||0) : (bV||0) - (aV||0);
    });

  const chartData = report.slice(0, 20).map((r) => ({
    name: r.student_name.split(" ")[0],
    fullName: r.student_name,
    pct: r.attendance_pct,
  }));

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">
            Attendance Reports
          </h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">
            Student attendance analytics per batch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#8A8F98]" />
          <select
            value={selectedBatch}
            onChange={(e) => handleBatchChange(e.target.value)}
            data-testid="batch-filter-select"
            className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white"
          >
            <option value="all">All Students</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4" data-testid="stat-total-students">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#8A8F98]" />
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Total Students</p>
          </div>
          <p className="font-cabinet font-black text-2xl text-[#0A0A0A]">{totalStudents}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4" data-testid="stat-avg-attendance">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#8A8F98]" />
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Avg Attendance</p>
          </div>
          <p className={`font-cabinet font-black text-2xl ${PCT_COLOR(avgPct) === '#00C853' ? 'text-[#00C853]' : PCT_COLOR(avgPct) === '#FFD600' ? 'text-yellow-600' : 'text-[#FF2B2B]'}`}>
            {avgPct}%
          </p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-[#8A8F98]" />
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Highest</p>
          </div>
          <p className="font-cabinet font-black text-2xl text-[#00C853]">{highest?.attendance_pct ?? 0}%</p>
          <p className="text-xs text-[#8A8F98] truncate">{highest?.student_name || "—"}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4" data-testid="stat-at-risk">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-[#8A8F98]" />
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">At Risk (&lt;75%)</p>
          </div>
          <p className="font-cabinet font-black text-2xl text-[#FF2B2B]">{atRisk}</p>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-6">
          <h3 className="font-cabinet font-bold text-base mb-4">Attendance by Student</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8F98" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8A8F98" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-[#0A0A0A]">{d.fullName}</p>
                      <p className="text-[#002EB8]">Attendance: {d.pct}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={PCT_COLOR(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-[#8A8F98]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-[#00C853]" /> ≥75% Good</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-yellow-400" /> 50-74% Average</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-[#FF2B2B]" /> &lt;50% At Risk</span>
          </div>
        </div>
      )}

      {/* Search + Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name..."
              data-testid="attendance-search-input"
              className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-7 h-7 border-4 border-[#002EB8] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="attendance-report-table">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                  {[
                    { col: "student_name",   label: "Student" },
                    { col: "status",         label: "Status" },
                    { col: "total_sessions", label: "Total Sessions" },
                    { col: "present",        label: "Present" },
                    { col: "absent",         label: "Absent" },
                    { col: "attendance_pct", label: "Attendance %" },
                  ].map(({ col, label }) => (
                    <th key={col} onClick={() => handleSort(col)}
                      className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap cursor-pointer select-none hover:text-[#002EB8] transition-colors">
                      <div className="flex items-center">{label}<SortIcon col={col} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {displayedReport.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#8A8F98]">
                      {searchQuery ? "No students match your search" : "No attendance data found for this batch."}
                    </td>
                  </tr>
                ) : (
                  displayedReport.map((row) => (
                    <tr key={row.student_id} className="hover:bg-[#F8F9FA] transition-colors" data-testid={`report-row-${row.student_id}`}>
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{row.student_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                          row.status === "active"    ? "bg-green-50 text-green-700 border-green-200" :
                          row.status === "completed" ? "bg-blue-50 text-[#002EB8] border-blue-200" :
                          "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[#8A8F98]">{row.total_sessions}</td>
                      <td className="px-4 py-3 text-[#00C853] font-medium">{row.present}</td>
                      <td className="px-4 py-3 text-[#FF2B2B] font-medium">{row.absent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${row.attendance_pct}%`, backgroundColor: PCT_COLOR(row.attendance_pct) }} />
                          </div>
                          <span className="font-medium text-[#0A0A0A] text-xs w-10">{row.attendance_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
