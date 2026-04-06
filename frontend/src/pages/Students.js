import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Search, X, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active: { label: "Active", style: "bg-green-50 text-green-700 border-green-200" },
  completed: { label: "Completed", style: "bg-blue-50 text-[#002EB8] border-blue-200" },
  dropped: { label: "Dropped", style: "bg-red-50 text-red-700 border-red-200" },
};

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", branch_id: "", course_ids: [],
    dob: "", address: "", guardian_name: "", guardian_phone: ""
  });

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

  const filtered = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

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

  if (loading) return <div className="p-8 text-[#8A8F98]">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
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

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          data-testid="student-search-input"
          className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white"
        />
      </div>

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
                {["Name", "Contact", "Branch", "Status", "Progress", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8A8F98]">
                  {search ? "No students match your search" : "No students added yet"}
                </td></tr>
              ) : filtered.map((student) => {
                const status = STATUS_CONFIG[student.status] || STATUS_CONFIG.onboarding;
                return (
                  <tr key={student.id} className="hover:bg-[#F8F9FA] transition-colors cursor-pointer" onClick={() => navigate(`/students/${student.id}`)} data-testid={`student-row-${student.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#002EB8]/10 rounded-full flex items-center justify-center font-cabinet font-bold text-[#002EB8] text-sm">
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
                          <div
                            className="h-full bg-[#002EB8] rounded-full transition-all"
                            style={{ width: `${student.syllabus_percentage || 0}%` }}
                          />
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
