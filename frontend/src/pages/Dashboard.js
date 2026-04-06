import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, ResponsiveContainer
} from "recharts";
import { TrendingUp, Users, DollarSign, Target, Sparkles, RefreshCw, Filter, X, ArrowRight, Building2, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const COLORS = ["#002EB8", "#FFD600", "#00C853", "#FF2B2B", "#8A8F98"];

function KPICard({ title, value, subtitle, icon: Icon, color = "#002EB8" }) {
  return (
    <div className="bg-white border border-[#E5E7EB] p-6 hover:shadow-sm transition-shadow" data-testid={`kpi-card-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">{title}</p>
          <p className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">{value}</p>
        </div>
        <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {subtitle && <p className="text-xs text-[#8A8F98] font-satoshi">{subtitle}</p>}
    </div>
  );
}

// Custom bar shape that shows a cursor pointer hint
const ClickableBar = (props) => {
  const { x, y, width, height, fill } = props;
  return (
    <g style={{ cursor: "pointer" }}>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
    </g>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  // Branch detail drill-down
  const [branchDetail, setBranchDetail] = useState(null);
  const [branchDetailLoading, setBranchDetailLoading] = useState(false);
  const [showBranchDetail, setShowBranchDetail] = useState(false);

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => { fetchStats(); }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/api/branches`, { withCredentials: true });
      setBranches(res.data);
    } catch {}
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = selectedBranch ? `?branch_id=${selectedBranch}` : "";
      const res = await axios.get(`${API}/api/dashboard/stats${params}`, { withCredentials: true });
      setStats(res.data);
    } catch {
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchDetail = useCallback(async (branchId, branchName) => {
    setBranchDetailLoading(true);
    setShowBranchDetail(true);
    setBranchDetail(null);
    try {
      const res = await axios.get(`${API}/api/dashboard/branch-detail/${branchId}`, { withCredentials: true });
      setBranchDetail(res.data);
    } catch {
      toast.error(`Failed to load ${branchName} details`);
      setShowBranchDetail(false);
    } finally {
      setBranchDetailLoading(false);
    }
  }, []);

  const handleBarClick = (data) => {
    if (data?.activePayload?.[0]?.payload?.branch_id) {
      const { branch_id, branch } = data.activePayload[0].payload;
      fetchBranchDetail(branch_id, branch);
    }
  };

  const handleBranchChange = (val) => {
    setSelectedBranch(val);
    setShowBranchDetail(false);
    setBranchDetail(null);
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await axios.post(`${API}/api/dashboard/weekly-summary`, {}, { withCredentials: true });
      setSummary(res.data.summary);
      toast.success("Weekly summary generated!");
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const selectedBranchName = branches.find((b) => b.id === selectedBranch)?.name || "All Branches";

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 font-satoshi">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Dashboard</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">
            {selectedBranch ? `${selectedBranchName} performance overview` : "Institute performance overview"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-md px-3 py-2 bg-white">
            <Filter size={14} className="text-[#8A8F98]" />
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="text-sm text-[#0A0A0A] bg-transparent focus:outline-none"
              data-testid="branch-filter"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchStats}
            className="p-2 border border-[#E5E7EB] rounded-md bg-white text-[#8A8F98] hover:text-[#002EB8] hover:border-[#002EB8] transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Branch filter chip */}
      {selectedBranch && (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 bg-[#002EB8]/10 text-[#002EB8] px-3 py-1 rounded-full font-medium border border-[#002EB8]/20">
            <Building2 size={13} /> {selectedBranchName}
          </span>
          <button onClick={() => handleBranchChange("")} className="text-[#8A8F98] hover:text-[#002EB8] flex items-center gap-1 text-xs">
            <X size={12} /> Clear filter
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E5E7EB] divide-x divide-y lg:divide-y-0 divide-[#E5E7EB]">
        <KPICard title="Total Revenue" value={`₹${((stats?.total_revenue || 0) / 1000).toFixed(0)}K`}
          subtitle="Total collected payments" icon={DollarSign} color="#002EB8" />
        <KPICard title="Outstanding" value={`₹${((stats?.outstanding_balance || 0) / 1000).toFixed(0)}K`}
          subtitle="Pending balance to collect" icon={TrendingUp} color="#FF2B2B" />
        <KPICard title="Total Students" value={stats?.total_students || 0}
          subtitle={`${stats?.active_students || 0} currently active`} icon={Users} color="#00C853" />
        <KPICard title="Conversion Rate" value={`${stats?.conversion_rate || 0}%`}
          subtitle={`${stats?.total_enquiries || 0} total enquiries`} icon={Target} color="#FFD600" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by Branch — clickable bars */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-cabinet font-bold text-lg tracking-tight text-[#0A0A0A]">Revenue by Branch</h3>
            <span className="text-xs text-[#8A8F98] flex items-center gap-1">
              <ArrowRight size={11} /> Click a bar for details
            </span>
          </div>
          <p className="text-xs text-[#8A8F98] mb-3">Collected fee revenue per branch</p>
          {(stats?.revenue_by_branch || []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#8A8F98] text-sm">No branch data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.revenue_by_branch}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                onClick={handleBarClick}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#8A8F98" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8F98" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium text-[#0A0A0A] mb-1">{payload[0].payload.branch}</p>
                        <p className="text-[#002EB8]">Revenue: ₹{payload[0].value?.toLocaleString()}</p>
                        <p className="text-[#8A8F98] mt-1">Click to see line items</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} shape={<ClickableBar fill="#002EB8" />}>
                  {(stats?.revenue_by_branch || []).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={showBranchDetail && branchDetail?.branch_name === entry.branch ? "#001A85" : "#002EB8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Enrolments by Category */}
        <div className="bg-white border border-[#E5E7EB] p-6">
          <h3 className="font-cabinet font-bold text-lg tracking-tight text-[#0A0A0A] mb-4">Enrolments by Category</h3>
          {(stats?.enrolments_by_category || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.enrolments_by_category} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name">
                  {stats.enrolments_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#8A8F98] text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Branch Detail Drill-Down Panel */}
      {showBranchDetail && (
        <div className="bg-white border border-[#002EB8]/30 rounded-lg overflow-hidden" data-testid="branch-detail-panel">
          <div className="flex items-center justify-between px-6 py-4 bg-[#002EB8]/5 border-b border-[#002EB8]/20">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-[#002EB8]" />
              <div>
                <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">
                  {branchDetail ? `${branchDetail.branch_name} — Revenue Details` : "Loading..."}
                </h3>
                {branchDetail?.location && (
                  <p className="text-xs text-[#8A8F98]">{branchDetail.location}</p>
                )}
              </div>
              {branchDetail && (
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-xs font-mono bg-green-50 text-[#00C853] border border-green-200 px-2.5 py-1 rounded-full">
                    ₹{branchDetail.total_revenue?.toLocaleString()} Collected
                  </span>
                  <span className="text-xs font-mono bg-red-50 text-[#FF2B2B] border border-red-200 px-2.5 py-1 rounded-full">
                    ₹{branchDetail.total_balance?.toLocaleString()} Pending
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => { setShowBranchDetail(false); setBranchDetail(null); }}
              className="text-[#8A8F98] hover:text-[#0A0A0A] p-1">
              <X size={18} />
            </button>
          </div>

          {branchDetailLoading ? (
            <div className="flex items-center justify-center p-10">
              <div className="w-7 h-7 border-4 border-[#002EB8] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : branchDetail?.items?.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8A8F98]">No revenue records found for this branch.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="branch-detail-table">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                    {["Student", "Email", "Course", "Total Fee", "Paid", "Balance", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {(branchDetail?.items || []).map((item, i) => (
                    <tr key={i} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{item.student_name}</td>
                      <td className="px-4 py-3 text-[#8A8F98] text-xs">{item.student_email}</td>
                      <td className="px-4 py-3 text-[#8A8F98]">{item.course || "—"}</td>
                      <td className="px-4 py-3 font-medium">₹{item.total?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#00C853] font-medium">₹{item.paid?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#FF2B2B] font-medium">₹{item.balance?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                          item.status === "paid" ? "bg-green-50 text-green-700 border-green-200" :
                          item.status === "partial" ? "bg-blue-50 text-[#002EB8] border-blue-200" :
                          "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}>{item.status || "pending"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Monthly Trends */}
      <div className="bg-white border border-[#E5E7EB] p-6">
        <h3 className="font-cabinet font-bold text-lg tracking-tight text-[#0A0A0A] mb-1">Monthly Enrolment Trends</h3>
        {selectedBranch && (
          <p className="text-xs text-[#8A8F98] mb-3">Filtered to {selectedBranchName}</p>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={stats?.monthly_trends || []} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8F98" }} />
            <YAxis tick={{ fontSize: 11, fill: "#8A8F98" }} />
            <Tooltip />
            <Line type="monotone" dataKey="enrolments" stroke="#002EB8" strokeWidth={2} dot={{ fill: "#002EB8", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Weekly Summary */}
      <div className="bg-white border border-[#E5E7EB] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#002EB8]" />
            <h3 className="font-cabinet font-bold text-lg tracking-tight text-[#0A0A0A]">AI Weekly Summary</h3>
            <span className="text-xs font-mono bg-[#002EB8]/10 text-[#002EB8] px-2 py-0.5 rounded-full">Gemini 3 Flash</span>
          </div>
          <button onClick={generateSummary} disabled={summaryLoading} data-testid="generate-summary-button"
            className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] hover:bg-[#001A85] disabled:bg-[#8A8F98] text-white text-sm rounded-md transition-colors font-medium">
            {summaryLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
            Generate Summary
          </button>
        </div>
        {summary ? (
          <div className="bg-[#F8F9FA] rounded-md p-4 text-sm text-[#0A0A0A] whitespace-pre-line leading-relaxed border-l-4 border-[#002EB8]" data-testid="weekly-summary-text">
            {summary}
          </div>
        ) : (
          <div className="text-sm text-[#8A8F98] italic">
            Click "Generate Summary" to get an AI-powered weekly performance analysis.
          </div>
        )}
      </div>
    </div>
  );
}
