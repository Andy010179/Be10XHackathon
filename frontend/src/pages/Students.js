import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Search, X, ChevronRight, Users, RefreshCw, CheckSquare, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active:      { label: "Active",      style: "bg-green-50 text-green-700 border-green-200" },
  completed:   { label: "Completed",   style: "bg-blue-50 text-[#002EB8] border-blue-200" },
  dropped:     { label: "Dropped",     style: "bg-red-50 text-red-700 border-red-200" },
};

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", branch_id: "", course_ids: [],
    dob: "", address: "", guardian_name: "", guardian_phone: ""
  });

  // Multi-select & promotion
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [promoting, setPromoting] = useState(false);
  const [promoResults, setPromoResults] = useState(null);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/students`, { withCredentials: true }),
      axios.get(`${API}/api/branches`, { withCredentials: true }),
      axios.get(`${API}/api/courses`, { withCredentials: true }),
    ]).then(([s, b, c]) => {
      setStudents(s.data);
      setBranches(b.data);
      setCourses(c.data);
    }).catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const aVal = a[sortCol] || ""; const bVal = b[sortCol] || "";
    if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="ml-1 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp size={11} className="ml-1 text-[#002EB8]" /> : <ChevronDown size={11} className="ml-1 text-[#002EB8]" />;
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setPromoResults(null);
  };

  const handleBulkPromotion = async () => {
    const targets = students.filter((s) => selectedIds.has(s.id));
    if (!targets.length) return;
    if (!window.confirm(`Generate re-enrolment leads for ${targets.length} selected student(s)?`)) return;
    setPromoting(true);
    setPromoResults(null);
    const results = [];
    for (const s of targets) {
      try {
        await axios.post(`${API}/api/enquiries`, {
          student_name: s.name,
          email: s.email,
          phone: s.phone,
          city: s.address || "",
          source: "re-enrollment",
          stage: "new",
          notes: `Re-enrolment lead generated from student record (status: ${s.status})`,
        }, { withCredentials: true });
        results.push({ name: s.name, status: "ok" });
      } catch (err) {
        results.push({ name: s.name, status: "error", reason: err.response?.data?.detail || "Failed" });
      }
    }
    setPromoResults(results);
    const ok = results.filter((r) => r.status === "ok").length;
    toast.success(`${ok} re-enrolment lead(s) added to CRM Pipeline`);
    setPromoting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students`, form, { withCredentials: true });
      setStudents([res.data, ...students]);
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", branch_id: "", course_ids: [], dob: "", address: "", guardian_name: "", guardian_phone: "" });
      toast.success("Student added!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add student");
    } finally { setSaving(false); }
  };

  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  if (loading) return <div className="p-8 text-[#8A8F98]">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Students</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">{students.length} total students enrolled</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-student-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Search + Status Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            data-testid="student-search-input"
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelectedIds(new Set()); }}
          data-testid="status-filter-select"
          className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white text-[#0A0A0A]">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-[#002EB8] text-white px-5 py-3 rounded-lg mb-4 shadow-lg" data-testid="bulk-action-bar">
          <div className="flex items-center gap-3">
            <CheckSquare size={18} />
            <span className="font-medium text-sm">{selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleBulkPromotion} disabled={promoting}
              data-testid="generate-reenrolment-button"
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-[#002EB8] rounded-md text-sm font-medium hover:bg-[#EEF2FF] disabled:opacity-60 transition-colors">
              {promoting
                ? <><RefreshCw size={13} className="animate-spin" /> Generating...</>
                : <><Users size={13} /> Generate Re-enrolment Leads</>
              }
            </button>
            <button onClick={clearSelection} className="text-white/70 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Promotion Results */}
      {promoResults && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-4" data-testid="promo-results">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-sm text-[#0A0A0A]">
              Re-enrolment Results — {promoResults.filter((r) => r.status === "ok").length}/{promoResults.length} leads created in CRM
            </p>
            <button onClick={() => setPromoResults(null)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {promoResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${
                r.status === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-[#FF2B2B] border-red-200"
              }`}>
                <span className="font-medium">{r.status === "ok" ? "✓" : "✗"}</span>
                <span className="truncate font-medium">{r.name}</span>
                {r.status === "error" && <span className="ml-auto shrink-0">{r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
              <h2 className="font-cabinet font-bold text-lg tracking-tight">Add New Student</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} data-testid="student-form" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name", key: "name", type: "text", required: true, span: 2 },
                  { label: "Email", key: "email", type: "email", required: true },
                  { label: "Phone", key: "phone", type: "tel", required: true },
                  { label: "Date of Birth", key: "dob", type: "date" },
                  { label: "Address", key: "address", type: "text", span: 2 },
                  { label: "Guardian Name", key: "guardian_name", type: "text" },
                  { label: "Guardian Phone", key: "guardian_phone", type: "tel" },
                ].map((field) => (
                  <div key={field.key} className={field.span === 2 ? "col-span-2" : ""}>
                    <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">{field.label}</label>
                    <input
                      type={field.type} required={field.required} value={form[field.key] || ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      data-testid={`student-${field.key}-input`}
                      className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Branch</label>
                  <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="student-submit-button" className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Saving..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="students-table">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    data-testid="select-all-checkbox"
                    className="accent-[#002EB8] cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                {[
                  { col: "name", label: "Name" },
                  { col: "email", label: "Contact" },
                  { col: "branch_id", label: "Branch" },
                  { col: "status", label: "Status" },
                  { col: "syllabus_percentage", label: "Progress" },
                ].map(({ col, label }) => (
                  <th key={col} onClick={() => handleSort(col)}
                    className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap cursor-pointer select-none hover:text-[#002EB8] transition-colors">
                    <div className="flex items-center">{label}<SortIcon col={col} /></div>
                  </th>
                ))}
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8A8F98]">
                  {search ? "No students match your search" : "No students added yet"}
                </td></tr>
              ) : filtered.map((student) => {
                const status = STATUS_CONFIG[student.status] || STATUS_CONFIG.onboarding;
                const isSelected = selectedIds.has(student.id);
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors cursor-pointer ${isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-[#F8F9FA]"}`}
                    onClick={() => navigate(`/students/${student.id}`)}
                    data-testid={`student-row-${student.id}`}
                  >
                    <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(e, student.id)}
                        data-testid={`student-checkbox-${student.id}`}
                        className="accent-[#002EB8] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-cabinet font-bold text-sm ${isSelected ? "bg-[#002EB8] text-white" : "bg-[#002EB8]/10 text-[#002EB8]"}`}>
                          {student.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-[#0A0A0A]">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#8A8F98] text-xs">{student.email}</p>
                      <p className="text-[#0A0A0A] text-xs mt-0.5">{student.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-[#8A8F98] text-xs whitespace-nowrap">{getBranchName(student.branch_id)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded border ${status.style}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div className="h-full bg-[#002EB8] rounded-full transition-all"
                            style={{ width: `${student.syllabus_percentage || 0}%` }} />
                        </div>
                        <span className="text-xs text-[#8A8F98] font-mono">{student.syllabus_percentage || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-[#8A8F98]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
