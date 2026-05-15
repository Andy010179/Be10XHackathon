import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock, Search, Send, ChevronLeft, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 20;

export default function FeeQueries() {
  const [data, setData]               = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage]               = useState(1);
  const [resolving, setResolving]     = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [commentSaving, setCommentSaving] = useState(null);
  const [expandedComment, setExpandedComment] = useState(null);

  useEffect(() => { fetchQueries(1); }, [statusFilter]);    // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchQueries(page); }, [page]);          // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQueries = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await axios.get(`${API}/api/admin/fee-queries?${params}`, { withCredentials: true });
      setData(res.data);
    } catch { toast.error("Failed to load fee queries"); }
    finally { setLoading(false); }
  };

  const handleResolve = async (queryId) => {
    setResolving(queryId);
    try {
      await axios.patch(`${API}/api/admin/fee-queries/${queryId}/resolve`, {}, { withCredentials: true });
      fetchQueries(page);
      toast.success("Query marked as resolved");
    } catch { toast.error("Failed to resolve query"); }
    finally { setResolving(null); }
  };

  const handleSendComment = async (queryId) => {
    const comment = (commentTexts[queryId] || "").trim();
    if (!comment) { toast.error("Comment cannot be empty"); return; }
    setCommentSaving(queryId);
    try {
      await axios.patch(`${API}/api/admin/fee-queries/${queryId}/comment`, { admin_comment: comment }, { withCredentials: true });
      setCommentTexts((prev) => ({ ...prev, [queryId]: "" }));
      fetchQueries(page);
      toast.success("Comment added");
    } catch { toast.error("Failed to add comment"); }
    finally { setCommentSaving(null); }
  };

  const items = (data.items || []).filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return q.student_name?.toLowerCase().includes(s) ||
      q.message?.toLowerCase().includes(s) ||
      q.student_email?.toLowerCase().includes(s);
  });

  const openCount = (data.items || []).filter((q) => q.status === "open").length;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Fee Queries</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">
            {openCount > 0 ? <span className="text-[#FF2B2B] font-medium">{openCount} open</span> : "All resolved"}
            &nbsp;·&nbsp;{data.total} total
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
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          data-testid="fee-query-status-filter"
          className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Queries List */}
      {loading ? (
        <div className="p-12 text-center text-[#8A8F98]">Loading...</div>
      ) : (
        <div className="space-y-3" data-testid="fee-queries-list">
          {items.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center">
              <MessageSquare size={40} className="text-[#E5E7EB] mx-auto mb-3" />
              <p className="text-sm text-[#8A8F98]">
                {search || statusFilter !== "all" ? "No queries match your filters" : "No fee queries submitted yet"}
              </p>
            </div>
          ) : items.map((q) => (
            <div key={q.id}
              className={`bg-white border rounded-xl p-5 transition-all ${q.status === "resolved" ? "border-[#E5E7EB] opacity-75" : "border-[#E5E7EB] shadow-sm"}`}
              data-testid={`query-card-${q.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-[#002EB8]/10 rounded-full flex items-center justify-center text-[#002EB8] font-cabinet font-bold text-sm shrink-0">
                    {q.student_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-sm text-[#0A0A0A]">{q.student_name || "Unknown Student"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize
                        ${q.status === "open" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A8F98] mb-2">{q.student_email}</p>
                    <p className="text-sm text-[#0A0A0A] bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-3 py-2">
                      {q.message}
                    </p>
                    {/* Admin comment display */}
                    {q.admin_comment && (
                      <div className="mt-2 flex items-start gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2">
                        <MessageSquare size={13} className="text-[#002EB8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-[#002EB8] mb-0.5">Admin Response · {q.commented_by || "Admin"}</p>
                          <p className="text-xs text-[#0A0A0A]">{q.admin_comment}</p>
                        </div>
                      </div>
                    )}
                    {/* Comment input */}
                    {expandedComment === q.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={commentTexts[q.id] || ""}
                          onChange={(e) => setCommentTexts((p) => ({ ...p, [q.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleSendComment(q.id)}
                          placeholder="Type your response..."
                          data-testid={`comment-input-${q.id}`}
                          className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#002EB8]"
                        />
                        <button onClick={() => handleSendComment(q.id)} disabled={commentSaving === q.id}
                          data-testid={`send-comment-${q.id}`}
                          className="px-3 py-1.5 bg-[#002EB8] text-white text-xs rounded-lg hover:bg-[#0024A0] disabled:opacity-50 flex items-center gap-1">
                          <Send size={11} /> {commentSaving === q.id ? "Sending..." : "Send"}
                        </button>
                        <button onClick={() => setExpandedComment(null)} className="text-xs text-[#8A8F98] hover:text-[#0A0A0A]">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setExpandedComment(q.id)}
                        data-testid={`add-comment-${q.id}`}
                        className="mt-2 text-xs text-[#002EB8] hover:underline flex items-center gap-1">
                        <MessageSquare size={11} /> {q.admin_comment ? "Edit response" : "Add response"}
                      </button>
                    )}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C853] text-white text-xs rounded-lg hover:opacity-90 disabled:opacity-50">
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
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
          <p className="text-xs text-[#8A8F98]">
            Page {data.page} of {data.pages} · {data.total} queries
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              data-testid="prev-page"
              className="p-1.5 border border-[#E5E7EB] rounded-lg text-[#8A8F98] hover:text-[#0A0A0A] disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              const pg = Math.max(1, Math.min(data.pages - 4, page - 2)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium border ${pg === page ? "bg-[#002EB8] text-white border-[#002EB8]" : "border-[#E5E7EB] text-[#0A0A0A] hover:bg-[#F8F9FA]"}`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
              data-testid="next-page"
              className="p-1.5 border border-[#E5E7EB] rounded-lg text-[#8A8F98] hover:text-[#0A0A0A] disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
