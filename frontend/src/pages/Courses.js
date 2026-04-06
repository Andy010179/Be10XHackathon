import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, BookOpen } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = ["HSC", "Competitive", "Engineering", "Medical", "Commerce", "Science", "Arts", "Technology", "Other"];

const emptyForm = { name: "", category: "", branch_id: "", base_fee: "", teacher_id: "" };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/courses`, { withCredentials: true }),
      axios.get(`${API}/api/branches`, { withCredentials: true }),
      axios.get(`${API}/api/users`, { withCredentials: true }),
    ]).then(([c, b, u]) => {
      setCourses(c.data);
      setBranches(b.data);
      setTeachers(u.data.filter((u) => u.role === "teacher" || u.role === "admin"));
    }).catch(() => toast.error("Failed to load courses"))
      .finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (course) => {
    setForm({ name: course.name, category: course.category, branch_id: course.branch_id, base_fee: String(course.base_fee), teacher_id: course.teacher_id || "" });
    setEditId(course.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, base_fee: parseFloat(form.base_fee) || 0, teacher_id: form.teacher_id || null };
    try {
      if (editId) {
        const res = await axios.put(`${API}/api/courses/${editId}`, payload, { withCredentials: true });
        setCourses((prev) => prev.map((c) => c.id === editId ? res.data : c));
        toast.success("Course updated!");
      } else {
        const res = await axios.post(`${API}/api/courses`, payload, { withCredentials: true });
        setCourses((prev) => [res.data, ...prev]);
        toast.success("Course created!");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save course");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course?")) return;
    try {
      await axios.delete(`${API}/api/courses/${id}`, { withCredentials: true });
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Course deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || "—";
  const getTeacherName = (id) => teachers.find((t) => t.id === id)?.name || "—";

  const filtered = courses.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColors = {
    HSC: "bg-blue-50 text-blue-700 border-blue-200",
    Competitive: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Engineering: "bg-purple-50 text-purple-700 border-purple-200",
    Medical: "bg-green-50 text-green-700 border-green-200",
    Commerce: "bg-orange-50 text-orange-700 border-orange-200",
  };

  if (loading) return <div className="p-8 text-[#8A8F98] font-satoshi">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Courses</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">{courses.length} courses configured</p>
        </div>
        <button onClick={openAdd} data-testid="add-course-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
          <Plus size={16} /> Add Course
        </button>
      </div>

      {/* Search */}
      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search courses by name or category..."
        data-testid="course-search-input"
        className="w-full mb-4 px-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white"
      />

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#002EB8]" />
                <h2 className="font-cabinet font-bold text-lg tracking-tight">{editId ? "Edit Course" : "New Course"}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} data-testid="course-form" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Course Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. JEE Main 2025 Batch" data-testid="course-name-input"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Category</label>
                  <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    data-testid="course-category-select"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Base Fee (₹)</label>
                  <input required type="number" min="0" value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: e.target.value })}
                    placeholder="35000" data-testid="course-fee-input"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Branch</label>
                  <select required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    data-testid="course-branch-select"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Assigned Teacher</label>
                  <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Not Assigned</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              {form.base_fee && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-3 text-sm">
                  <div className="flex justify-between text-[#8A8F98]"><span>Base Fee</span><span>₹{parseFloat(form.base_fee || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#8A8F98]"><span>GST (18%)</span><span>₹{(parseFloat(form.base_fee || 0) * 0.18).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-[#0A0A0A] border-t border-[#E5E7EB] pt-1 mt-1">
                    <span>Total (incl. GST)</span><span>₹{(parseFloat(form.base_fee || 0) * 1.18).toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="course-submit-button"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Saving..." : editId ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <div className="border border-[#E5E7EB] rounded-lg p-8 text-center bg-white">
          <BookOpen size={32} className="text-[#E5E7EB] mx-auto mb-2" />
          <p className="text-sm text-[#8A8F98]">{search ? "No courses match your search" : "No courses yet — add the first one"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="courses-grid">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:shadow-sm transition-shadow group" data-testid={`course-card-${course.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[#002EB8]/10 rounded-lg flex items-center justify-center">
                  <BookOpen size={18} className="text-[#002EB8]" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(course)} data-testid={`edit-course-${course.id}`}
                    className="p-1.5 text-[#8A8F98] hover:text-[#002EB8] hover:bg-blue-50 rounded transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(course.id)} data-testid={`delete-course-${course.id}`}
                    className="p-1.5 text-[#8A8F98] hover:text-[#FF2B2B] hover:bg-red-50 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-cabinet font-bold text-base tracking-tight text-[#0A0A0A] mb-1 leading-snug">{course.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded border ${categoryColors[course.category] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {course.category}
                </span>
              </div>
              <div className="space-y-1.5 text-sm border-t border-[#E5E7EB] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Base Fee</span>
                  <span className="font-medium text-[#0A0A0A]">₹{course.base_fee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Total (+ GST)</span>
                  <span className="font-medium text-[#002EB8]">₹{(course.base_fee * 1.18)?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Branch</span>
                  <span className="text-[#0A0A0A] text-xs">{getBranchName(course.branch_id)}</span>
                </div>
                {course.teacher_id && (
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Teacher</span>
                    <span className="text-[#0A0A0A] text-xs">{getTeacherName(course.teacher_id)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
