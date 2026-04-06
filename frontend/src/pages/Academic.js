import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, X, AlertCircle, Calendar } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = ["Branches", "Batches", "Schedule"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Academic() {
  const [activeTab, setActiveTab] = useState("Branches");
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Branch form
  const [branchForm, setBranchForm] = useState({ name: "", location: "" });
  const [showBranchForm, setShowBranchForm] = useState(false);

  // Batch form
  const [batchForm, setBatchForm] = useState({ name: "", branch_id: "", course_id: "", teacher_id: "", start_time: "09:00", end_time: "11:00", days: [] });
  const [showBatchForm, setShowBatchForm] = useState(false);

  // Schedule form
  const [schedForm, setSchedForm] = useState({ course_id: "", teacher_id: "", room_id: "", branch_id: "", start_time: "", end_time: "", title: "" });
  const [schedError, setSchedError] = useState("");
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/branches`, { withCredentials: true }),
      axios.get(`${API}/api/courses`, { withCredentials: true }),
      axios.get(`${API}/api/academic/batches`, { withCredentials: true }),
      axios.get(`${API}/api/academic/schedule`, { withCredentials: true }),
      axios.get(`${API}/api/users`, { withCredentials: true }),
    ]).then(([b, c, batc, sch, u]) => {
      setBranches(b.data);
      setCourses(c.data);
      setBatches(batc.data);
      setSchedule(sch.data);
      setUsers(u.data.filter((u) => u.role === "teacher" || u.role === "admin"));
    }).catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const teachers = users;

  // Branch CRUD
  const addBranch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/branches`, branchForm, { withCredentials: true });
      setBranches([...branches, res.data]);
      setBranchForm({ name: "", location: "" });
      setShowBranchForm(false);
      toast.success("Branch added");
    } catch { toast.error("Failed to add branch"); }
    finally { setSaving(false); }
  };

  const deleteBranch = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    await axios.delete(`${API}/api/branches/${id}`, { withCredentials: true });
    setBranches(branches.filter((b) => b.id !== id));
    toast.success("Branch deleted");
  };

  // Batch CRUD
  const addBatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/academic/batches`, batchForm, { withCredentials: true });
      setBatches([...batches, res.data]);
      setBatchForm({ name: "", branch_id: "", course_id: "", teacher_id: "", start_time: "09:00", end_time: "11:00", days: [] });
      setShowBatchForm(false);
      toast.success("Batch created");
    } catch { toast.error("Failed to create batch"); }
    finally { setSaving(false); }
  };

  const deleteBatch = async (id) => {
    if (!window.confirm("Delete this batch?")) return;
    await axios.delete(`${API}/api/academic/batches/${id}`, { withCredentials: true });
    setBatches(batches.filter((b) => b.id !== id));
    toast.success("Batch deleted");
  };

  // Schedule CRUD
  const addSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSchedError("");
    try {
      const res = await axios.post(`${API}/api/academic/schedule`, schedForm, { withCredentials: true });
      setSchedule([...schedule, res.data]);
      setSchedForm({ course_id: "", teacher_id: "", room_id: "", branch_id: "", start_time: "", end_time: "", title: "" });
      setShowSchedForm(false);
      toast.success("Class scheduled!");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to schedule";
      setSchedError(msg);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const deleteSchedule = async (id) => {
    await axios.delete(`${API}/api/academic/schedule/${id}`, { withCredentials: true });
    setSchedule(schedule.filter((s) => s.id !== id));
    toast.success("Session removed");
  };

  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || id;
  const getCourseName = (id) => courses.find((c) => c.id === id)?.name || id;
  const getTeacherName = (id) => teachers.find((t) => t.id === id)?.name || id;

  if (loading) return <div className="p-8 text-[#8A8F98]">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      <div className="mb-6">
        <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Academic Hub</h1>
        <p className="text-sm text-[#8A8F98] mt-0.5">Manage branches, batches, and class schedules</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`academic-tab-${tab.toLowerCase()}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#002EB8] text-[#002EB8]"
                : "border-transparent text-[#8A8F98] hover:text-[#0A0A0A]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* BRANCHES TAB */}
      {activeTab === "Branches" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#8A8F98]">{branches.length} branches</p>
            <button onClick={() => setShowBranchForm(true)} data-testid="add-branch-button"
              className="flex items-center gap-2 px-3 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors">
              <Plus size={14} /> Add Branch
            </button>
          </div>

          {showBranchForm && (
            <form onSubmit={addBranch} data-testid="branch-form" className="mb-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Name</label>
                <input required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="Pune Branch" className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Location</label>
                <input required value={branchForm.location} onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
                  placeholder="City, State" className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm hover:bg-[#001A85] transition-colors">Save</button>
                <button type="button" onClick={() => setShowBranchForm(false)} className="px-3 py-2 border border-[#E5E7EB] rounded-md text-sm text-[#8A8F98] hover:bg-white">Cancel</button>
              </div>
            </form>
          )}

          <div className="border border-[#E5E7EB] divide-y divide-[#E5E7EB] rounded-lg overflow-hidden">
            {branches.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8A8F98]">No branches added yet</div>
            ) : branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8F9FA] transition-colors" data-testid={`branch-row-${b.id}`}>
                <div>
                  <p className="font-medium text-sm text-[#0A0A0A]">{b.name}</p>
                  <p className="text-xs text-[#8A8F98]">{b.location}</p>
                </div>
                <button onClick={() => deleteBranch(b.id)} className="text-[#8A8F98] hover:text-[#FF2B2B] transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BATCHES TAB */}
      {activeTab === "Batches" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#8A8F98]">{batches.length} batches</p>
            <button onClick={() => setShowBatchForm(true)} data-testid="add-batch-button"
              className="flex items-center gap-2 px-3 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors">
              <Plus size={14} /> Add Batch
            </button>
          </div>

          {showBatchForm && (
            <form onSubmit={addBatch} data-testid="batch-form" className="mb-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Batch Name</label>
                  <input required value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                    placeholder="HSC Batch A" className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Branch</label>
                  <select required value={batchForm.branch_id} onChange={(e) => setBatchForm({ ...batchForm, branch_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Course</label>
                  <select required value={batchForm.course_id} onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Teacher</label>
                  <select required value={batchForm.teacher_id} onChange={(e) => setBatchForm({ ...batchForm, teacher_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Start Time</label>
                  <input type="time" value={batchForm.start_time} onChange={(e) => setBatchForm({ ...batchForm, start_time: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">End Time</label>
                  <input type="time" value={batchForm.end_time} onChange={(e) => setBatchForm({ ...batchForm, end_time: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button key={day} type="button"
                      onClick={() => setBatchForm((f) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day] }))}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${batchForm.days.includes(day) ? "bg-[#002EB8] text-white border-[#002EB8]" : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8]"}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors">Save Batch</button>
                <button type="button" onClick={() => setShowBatchForm(false)} className="px-4 py-2 border border-[#E5E7EB] text-sm text-[#8A8F98] rounded-md hover:bg-white">Cancel</button>
              </div>
            </form>
          )}

          <div className="border border-[#E5E7EB] divide-y divide-[#E5E7EB] rounded-lg overflow-hidden">
            {batches.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8A8F98]">No batches yet</div>
            ) : batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8F9FA]">
                <div>
                  <p className="font-medium text-sm text-[#0A0A0A]">{b.name}</p>
                  <p className="text-xs text-[#8A8F98]">{getCourseName(b.course_id)} · {getBranchName(b.branch_id)} · {b.start_time}–{b.end_time}</p>
                  {b.days?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {b.days.map((d) => (
                        <span key={d} className="text-xs bg-[#F8F9FA] border border-[#E5E7EB] px-1.5 py-0.5 rounded font-mono">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteBatch(b.id)} className="text-[#8A8F98] hover:text-[#FF2B2B] p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === "Schedule" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#8A8F98]">{schedule.length} sessions scheduled</p>
            <button onClick={() => { setShowSchedForm(true); setSchedError(""); }} data-testid="add-schedule-button"
              className="flex items-center gap-2 px-3 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors">
              <Calendar size={14} /> Schedule Class
            </button>
          </div>

          {showSchedForm && (
            <form onSubmit={addSchedule} data-testid="schedule-form" className="mb-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg p-4 space-y-3">
              {schedError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-[#FF2B2B]" data-testid="schedule-conflict-error">
                  <AlertCircle size={16} />
                  <span>{schedError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Session Title</label>
                  <input value={schedForm.title} onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })}
                    placeholder="e.g. Physics - Chapter 5" className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Course</label>
                  <select required value={schedForm.course_id} onChange={(e) => setSchedForm({ ...schedForm, course_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Teacher</label>
                  <select required value={schedForm.teacher_id} onChange={(e) => setSchedForm({ ...schedForm, teacher_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Room / Venue</label>
                  <input required value={schedForm.room_id} onChange={(e) => setSchedForm({ ...schedForm, room_id: e.target.value })}
                    placeholder="Room A, Lab 1..." className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Branch</label>
                  <select required value={schedForm.branch_id} onChange={(e) => setSchedForm({ ...schedForm, branch_id: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Start Time</label>
                  <input required type="datetime-local" value={schedForm.start_time} onChange={(e) => setSchedForm({ ...schedForm, start_time: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">End Time</label>
                  <input required type="datetime-local" value={schedForm.end_time} onChange={(e) => setSchedForm({ ...schedForm, end_time: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} data-testid="schedule-submit-button" className="px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors">Schedule</button>
                <button type="button" onClick={() => setShowSchedForm(false)} className="px-4 py-2 border border-[#E5E7EB] text-sm text-[#8A8F98] rounded-md hover:bg-white">Cancel</button>
              </div>
            </form>
          )}

          <div className="border border-[#E5E7EB] divide-y divide-[#E5E7EB] rounded-lg overflow-hidden">
            {schedule.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8A8F98]">No sessions scheduled</div>
            ) : schedule.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8F9FA]" data-testid={`schedule-row-${s.id}`}>
                <div>
                  <p className="font-medium text-sm text-[#0A0A0A]">{s.title || getCourseName(s.course_id)}</p>
                  <p className="text-xs text-[#8A8F98]">
                    {getTeacherName(s.teacher_id)} · Room: {s.room_id} · {new Date(s.start_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <button onClick={() => deleteSchedule(s.id)} className="text-[#8A8F98] hover:text-[#FF2B2B] p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
