import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock, Search } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function FeeQueries() {
  const [queries, setQueries]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolving, setResolving]     = useState(null);

  useEffect(() => { fetchQueries(); }, []);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/fee-queries`, { withCredentials: true });
      setQueries(res.data);
    } catch { toast.error("Failed to load fee queries"); }
    finally { setLoading(false); }
  };

  const handleResolve = async (queryId) => {
    setResolving(queryId);
    try {
      await axios.patch(`${API}/api/admin/fee-queries/${queryId}/resolve`, {}, { withCredentials: true });
      setQueries((prev) => prev.map((q) => q.id === queryId ? { ...q, status: "resolved" } : q));
      toast.success("Query marked as resolved");
    } catch { toast.error("Failed to resolve query"); }
    finally { setResolving(null); }
  };

  const filtered = queries.filter((q) => {
    const matchSearch = !search ||
      q.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.message?.toLowerCase().includes(search.toLowerCase()) ||
      q.student_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = queries.filter((q) => q.status === "open").length;

  if (loading) return <div className="p-8 text-[#8A8F98] font-satoshi">Loading fee queries...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Fee Queries</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">
            {openCount > 0
              ? <span className="text-[#FF2B2B] font-medium">{openCount} open</span>
              : "All resolved"} · {queries.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
          <MessageSquare size={14} className="text-yellow-600" />
          <span className="text-xs text-yellow-700 font-medium">{openCount} pending</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or query text..."
            data-testid="fee-query-search"
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="fee-query-status-filter"
          className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Queries List */}
      <div className="space-y-3" data-testid="fee-queries-list">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center">
            <MessageSquare size={40} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#8A8F98]">
              {search || statusFilter !== "all" ? "No queries match your filters" : "No fee queries submitted yet"}
            </p>
          </div>
        ) : filtered.map((q) => (
          <div key={q.id}
            className={`bg-white border rounded-lg p-5 transition-opacity ${q.status === "resolved" ? "border-[#E5E7EB] opacity-70" : "border-[#E5E7EB]"}`}
            data-testid={`query-card-${q.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 bg-[#002EB8]/10 rounded-full flex items-center justify-center text-[#002EB8] font-cabinet font-bold text-sm shrink-0">
                  {q.student_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium text-sm text-[#0A0A0A]">{q.student_name || "Unknown Student"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize
                      ${q.status === "open" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8F98] mb-2">{q.student_email}</p>
                  <p className="text-sm text-[#0A0A0A] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md px-3 py-2">
                    {q.message}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-[#8A8F98]">
                  <Clock size={11} />
                  {q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                </div>
                {q.status === "open" ? (
                  <button onClick={() => handleResolve(q.id)} disabled={resolving === q.id}
                    data-testid={`resolve-query-${q.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C853] text-white text-xs rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
                    <CheckCircle size={12} />
                    {resolving === q.id ? "Resolving..." : "Mark Resolved"}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-[#00C853]">
                    <CheckCircle size={11} />
                    {q.resolved_at ? new Date(q.resolved_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Resolved"}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
