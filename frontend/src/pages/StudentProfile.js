import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, GraduationCap, UserCheck, RefreshCw, X } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = ["Personal Details", "Academics", "Financials", "Lifecycle Actions"];

const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", style: "bg-yellow-50 text-yellow-700 border-yellow-200", next: "active" },
  active: { label: "Active", style: "bg-green-50 text-green-700 border-green-200", next: "completed" },
  completed: { label: "Completed", style: "bg-blue-50 text-[#002EB8] border-blue-200", next: null },
  dropped: { label: "Dropped", style: "bg-red-50 text-red-700 border-red-200", next: null },
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Personal Details");
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/students/${id}`, { withCredentials: true }),
      axios.get(`${API}/api/finance/invoices`, { withCredentials: true }),
      axios.get(`${API}/api/branches`, { withCredentials: true }),
      axios.get(`${API}/api/academic/batches`, { withCredentials: true }),
      axios.get(`${API}/api/courses`, { withCredentials: true }),
    ]).then(([s, inv, b, bat, c]) => {
      setStudent(s.data);
      setInvoices(inv.data.filter((i) => i.student_id === id));
      setBranches(b.data);
      setBatches(bat.data);
      setCourses(c.data);
    }).catch(() => toast.error("Failed to load student"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/api/students/${id}/status`, { status }, { withCredentials: true });
      setStudent(res.data);
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (selectedBatches.length === 0) return toast.error("Select at least one batch");
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students/${id}/onboard`, { batch_ids: selectedBatches }, { withCredentials: true });
      setStudent(res.data);
      setShowOnboardForm(false);
      toast.success(`Student enrolled in ${selectedBatches.length} batch(es)!`);
    } catch { toast.error("Failed to onboard"); }
    finally { setSaving(false); }
  };

  const toggleBatch = (batchId) =>
    setSelectedBatches((prev) => prev.includes(batchId) ? prev.filter((b) => b !== batchId) : [...prev, batchId]);

  const handleComplete = async () => {
    if (!window.confirm("Mark student as completed and generate certificate?")) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students/${id}/complete`, {}, { withCredentials: true });
      setStudent({ ...student, status: "completed", syllabus_percentage: 100 });
      toast.success(`Certificate generated! ID: ${res.data.certificate?.certificate_id}`);
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const handlePromote = async () => {
    if (!window.confirm("Generate a new CRM lead for next-year re-enrolment?")) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students/${id}/promote`, {}, { withCredentials: true });
      toast.success(`New lead created! Enquiry ID: ${res.data.enquiry_id}`);
    } catch { toast.error("Failed to promote"); }
    finally { setSaving(false); }
  };

  const getBranchName = (bid) => branches.find((b) => b.id === bid)?.name || "—";
  const getCourseName = (cid) => courses.find((c) => c.id === cid)?.name || cid;
  const getBatchName = (bid) => batches.find((b) => b.id === bid)?.name || "—";

  if (loading) return <div className="p-8 text-[#8A8F98]">Loading student...</div>;
  if (!student) return <div className="p-8 text-[#8A8F98]">Student not found</div>;

  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.onboarding;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <button onClick={() => navigate("/students")} className="flex items-center gap-2 text-sm text-[#8A8F98] hover:text-[#0A0A0A] mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Students
      </button>

      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 mb-6" data-testid="student-profile-header">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#002EB8]/10 rounded-full flex items-center justify-center font-cabinet font-black text-[#002EB8] text-2xl">
              {student.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-cabinet font-black text-2xl tracking-tight text-[#0A0A0A]">{student.name}</h1>
              <p className="text-sm text-[#8A8F98]">{student.email} · {student.phone}</p>
              <p className="text-xs text-[#8A8F98] mt-0.5">{getBranchName(student.branch_id)}</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={`text-sm px-3 py-1 rounded border font-medium ${statusCfg.style}`} data-testid="student-status-badge">
              {statusCfg.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#002EB8] rounded-full" style={{ width: `${student.syllabus_percentage || 0}%` }} />
              </div>
              <span className="text-xs font-mono text-[#8A8F98]">{student.syllabus_percentage || 0}% syllabus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} data-testid={`student-tab-${tab.toLowerCase().replace(/\s/g, "-")}`}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab ? "border-[#002EB8] text-[#002EB8]" : "border-transparent text-[#8A8F98] hover:text-[#0A0A0A]"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* PERSONAL DETAILS */}
      {activeTab === "Personal Details" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: "Full Name", value: student.name },
              { label: "Email", value: student.email },
              { label: "Phone", value: student.phone },
              { label: "Date of Birth", value: student.dob || "—" },
              { label: "Address", value: student.address || "—" },
              { label: "Branch", value: getBranchName(student.branch_id) },
              { label: "Guardian Name", value: student.guardian_name || "—" },
              { label: "Guardian Phone", value: student.guardian_phone || "—" },
              { label: "Enrollment Date", value: student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString("en-IN") : "—" },
            ].map((field) => (
              <div key={field.label}>
                <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">{field.label}</p>
                <p className="text-sm text-[#0A0A0A] font-medium">{field.value}</p>
              </div>
            ))}
          </div>
          {student.notes && (
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">Notes</p>
              <p className="text-sm text-[#0A0A0A]">{student.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ACADEMICS */}
      {activeTab === "Academics" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">Current Batch</p>
              <p className="text-sm font-medium text-[#0A0A0A]">{student.batch_id ? getBatchName(student.batch_id) : "Not assigned"}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">Status</p>
              <span className={`text-xs px-2 py-1 rounded border ${statusCfg.style}`}>{statusCfg.label}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-2">Syllabus Progress</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#002EB8] rounded-full transition-all" style={{ width: `${student.syllabus_percentage || 0}%` }} />
              </div>
              <span className="text-sm font-mono font-bold text-[#002EB8]">{student.syllabus_percentage || 0}%</span>
            </div>
          </div>
          {student.course_ids?.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-2">Enrolled Courses</p>
              <div className="flex flex-wrap gap-2">
                {student.course_ids.map((cid) => (
                  <span key={cid} className="text-xs bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-1 rounded">{getCourseName(cid)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FINANCIALS */}
      {activeTab === "Financials" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8A8F98]">No invoices for this student</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                  {["Course", "Total", "Paid", "Balance", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 text-[#0A0A0A]">{inv.course_name}</td>
                    <td className="px-4 py-3 font-medium">₹{inv.total?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#00C853]">₹{inv.paid_amount?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-[#FF2B2B]">₹{inv.balance?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border capitalize ${
                        inv.status === "paid" ? "bg-green-50 text-green-700 border-green-200" :
                        inv.status === "partial" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* LIFECYCLE ACTIONS */}
      {activeTab === "Lifecycle Actions" && (
        <div className="space-y-4">
          {/* Status Toggle */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="font-cabinet font-bold text-base mb-3">Status Management</h3>
            <div className="flex flex-wrap gap-2">
              {["onboarding", "active", "completed", "dropped"].map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={saving || student.status === status}
                  data-testid={`status-btn-${status}`}
                  className={`px-4 py-2 text-sm rounded-md border font-medium transition-all capitalize
                    ${student.status === status
                      ? "bg-[#002EB8] text-white border-[#002EB8]"
                      : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8] hover:text-[#002EB8]"
                    } disabled:opacity-60`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-3">
            <h3 className="font-cabinet font-bold text-base mb-3">Lifecycle Actions</h3>

            {/* Onboard to Batch */}
            <div className="border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-[#0A0A0A]">Complete Onboarding</p>
                  <p className="text-xs text-[#8A8F98] mt-0.5">Assign student to a batch and mark as Active</p>
                </div>
                <button
                  onClick={() => setShowOnboardForm(!showOnboardForm)}
                  data-testid="onboard-button"
                  className="flex items-center gap-2 px-3 py-2 bg-[#002EB8] text-white text-xs rounded-md hover:bg-[#001A85] transition-colors"
                >
                  <UserCheck size={14} /> Onboard
                </button>
              </div>
              {showOnboardForm && (
                <form onSubmit={handleOnboard} className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] mb-2">Select Batches (multiple allowed)</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {batches.length === 0 ? (
                        <p className="text-xs text-[#8A8F98]">No batches available. Create batches in Academic Hub first.</p>
                      ) : batches.map((b) => (
                        <label key={b.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${selectedBatches.includes(b.id) ? "border-[#002EB8] bg-blue-50" : "border-[#E5E7EB] hover:border-[#002EB8]/40"}`}>
                          <input type="checkbox" checked={selectedBatches.includes(b.id)} onChange={() => toggleBatch(b.id)}
                            data-testid={`batch-checkbox-${b.id}`} className="accent-[#002EB8]" />
                          <div>
                            <p className="text-sm font-medium text-[#0A0A0A]">{b.name}</p>
                            <p className="text-xs text-[#8A8F98]">{b.start_time}–{b.end_time} · {b.days?.join(", ")}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedBatches.length > 0 && (
                      <p className="text-xs text-[#002EB8] mt-1">{selectedBatches.length} batch(es) selected</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving || selectedBatches.length === 0} className="px-4 py-2 bg-[#00C853] text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50">
                      Assign {selectedBatches.length > 0 ? `(${selectedBatches.length})` : ""}
                    </button>
                    <button type="button" onClick={() => setShowOnboardForm(false)} className="px-3 py-2 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:bg-[#F8F9FA]"><X size={14} /></button>
                  </div>
                </form>
              )}
            </div>

            {/* Mark Complete */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Mark as Completed</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Generate a completion certificate for this student</p>
              </div>
              <button
                onClick={handleComplete}
                disabled={saving || student.status === "completed"}
                data-testid="complete-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#00C853] text-white text-xs rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <CheckCircle size={14} /> Complete
              </button>
            </div>

            {/* Promote to Next Year */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Initiate Next-Year Promotion</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Create a new CRM lead for re-enrolment next year</p>
              </div>
              <button
                onClick={handlePromote}
                disabled={saving}
                data-testid="promote-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#FFD600] text-[#0A0A0A] text-xs rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <GraduationCap size={14} /> Promote
              </button>
            </div>

            {/* Drop */}
            <div className="border border-red-100 rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Mark as Dropped</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Student has left the institute</p>
              </div>
              <button
                onClick={() => updateStatus("dropped")}
                disabled={saving || student.status === "dropped"}
                data-testid="drop-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#FF2B2B] text-white text-xs rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <RefreshCw size={14} /> Drop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
