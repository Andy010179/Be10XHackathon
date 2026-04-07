import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, GraduationCap, UserCheck, RefreshCw,
  X, Pencil, ChevronDown, ChevronUp, CreditCard
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = ["Personal Details", "Academics", "Financials", "Lifecycle Actions"];

const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active:     { label: "Active",     style: "bg-green-50 text-green-700 border-green-200" },
  completed:  { label: "Completed",  style: "bg-blue-50 text-[#002EB8] border-blue-200" },
  dropped:    { label: "Dropped",    style: "bg-red-50 text-red-700 border-red-200" },
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent]     = useState(null);
  const [invoices, setInvoices]   = useState([]);
  const [branches, setBranches]   = useState([]);
  const [batches, setBatches]     = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("Personal Details");
  const [saving, setSaving]       = useState(false);

  // Personal edit
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm]       = useState({});
  const [personalSaving, setPersonalSaving]   = useState(false);

  // Payment history per invoice
  const [payHistory, setPayHistory]               = useState({});
  const [expandedInvoice, setExpandedInvoice]     = useState(null);
  const [payHistoryLoading, setPayHistoryLoading] = useState({});

  // Onboard form
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);

  // Fetch on mount — deps intentionally empty (id is from URL params; API/axios are module-level constants)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openPersonalEdit = () => {
    setPersonalForm({
      name:           student.name || "",
      phone:          student.phone || "",
      dob:            student.dob || "",
      branch_id:      student.branch_id || "",
      address:        student.address || "",
      guardian_name:  student.guardian_name || "",
      guardian_phone: student.guardian_phone || "",
      id_proof:       student.id_proof || "",
      institute_name: student.institute_name || "",
    });
    setEditingPersonal(true);
  };

  const handlePersonalSave = async (e) => {
    e.preventDefault();
    setPersonalSaving(true);
    try {
      const res = await axios.put(`${API}/api/students/${id}`, personalForm, { withCredentials: true });
      setStudent(res.data);
      setEditingPersonal(false);
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally { setPersonalSaving(false); }
  };

  const togglePayHistory = async (invoiceId) => {
    if (expandedInvoice === invoiceId) { setExpandedInvoice(null); return; }
    setExpandedInvoice(invoiceId);
    if (!payHistory[invoiceId]) {
      setPayHistoryLoading((p) => ({ ...p, [invoiceId]: true }));
      try {
        const res = await axios.get(`${API}/api/finance/invoices/${invoiceId}/payments`, { withCredentials: true });
        setPayHistory((p) => ({ ...p, [invoiceId]: res.data }));
      } catch { toast.error("Failed to load payment history"); }
      finally { setPayHistoryLoading((p) => ({ ...p, [invoiceId]: false })); }
    }
  };

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
    if (!selectedBatches.length) return toast.error("Select at least one batch");
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students/${id}/onboard`, { batch_ids: selectedBatches }, { withCredentials: true });
      setStudent(res.data);
      setShowOnboardForm(false);
      toast.success(`Student enrolled in ${selectedBatches.length} batch(es)!`);
    } catch { toast.error("Failed to onboard"); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm("Mark student as completed and generate certificate?")) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/students/${id}/complete`, {}, { withCredentials: true });
      setStudent((s) => ({ ...s, status: "completed", syllabus_percentage: 100 }));
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

  const toggleBatch = (bId) =>
    setSelectedBatches((p) => p.includes(bId) ? p.filter((b) => b !== bId) : [...p, bId]);

  const getBranchName = (bid) => branches.find((b) => b.id === bid)?.name || "—";
  const getCourseName = (cid) => courses.find((c) => c.id === cid)?.name || cid;
  const getBatchName  = (bid) => batches.find((b) => b.id === bid)?.name || "—";

  if (loading) return <div className="p-8 text-[#8A8F98] font-satoshi">Loading student...</div>;
  if (!student) return <div className="p-8 text-[#8A8F98] font-satoshi">Student not found</div>;

  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.onboarding;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Back */}
      <button onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-sm text-[#8A8F98] hover:text-[#0A0A0A] mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Students
      </button>

      {/* Header Card */}
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
          <button key={tab} onClick={() => setActiveTab(tab)}
            data-testid={`student-tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
              ${activeTab === tab ? "border-[#002EB8] text-[#002EB8]" : "border-transparent text-[#8A8F98] hover:text-[#0A0A0A]"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* PERSONAL DETAILS */}
      {activeTab === "Personal Details" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-cabinet font-bold text-base">Personal Information</h3>
            {!editingPersonal ? (
              <button onClick={openPersonalEdit} data-testid="edit-personal-button"
                className="flex items-center gap-1.5 text-sm text-[#002EB8] hover:underline">
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <button onClick={() => setEditingPersonal(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={16} /></button>
            )}
          </div>

          {!editingPersonal ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Full Name",          value: student.name },
                { label: "Email",              value: student.email },
                { label: "Phone",              value: student.phone || "—" },
                { label: "Date of Birth",      value: student.dob || "—" },
                { label: "Branch",             value: getBranchName(student.branch_id) },
                { label: "Address",            value: student.address || "—" },
                { label: "Guardian Name",      value: student.guardian_name || "—" },
                { label: "Guardian Phone",     value: student.guardian_phone || "—" },
                { label: "ID Proof",           value: student.id_proof || "—" },
                { label: "School / Institute", value: student.institute_name || "—" },
                { label: "Enrollment Date",    value: student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString("en-IN") : "—" },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">{f.label}</p>
                  <p className="text-sm text-[#0A0A0A] font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handlePersonalSave} data-testid="personal-edit-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[
                  { label: "Full Name",              key: "name",           type: "text" },
                  { label: "Phone",                  key: "phone",          type: "tel" },
                  { label: "Date of Birth",          key: "dob",            type: "date" },
                  { label: "Address",                key: "address",        type: "text" },
                  { label: "Guardian Name",          key: "guardian_name",  type: "text" },
                  { label: "Guardian Phone",         key: "guardian_phone", type: "tel" },
                  { label: "ID Proof (Aadhaar/PAN)", key: "id_proof",       type: "text" },
                  { label: "School / Institute",     key: "institute_name", type: "text" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">{f.label}</label>
                    <input type={f.type} value={personalForm[f.key] || ""}
                      onChange={(e) => setPersonalForm({ ...personalForm, [f.key]: e.target.value })}
                      data-testid={`edit-personal-${f.key}`}
                      className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Branch</label>
                  <select value={personalForm.branch_id || ""}
                    onChange={(e) => setPersonalForm({ ...personalForm, branch_id: e.target.value })}
                    data-testid="edit-personal-branch"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingPersonal(false)}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={personalSaving} data-testid="personal-save-button"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {personalSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {student.notes && !editingPersonal && (
            <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">Notes</p>
              <p className="text-sm text-[#0A0A0A]">{student.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ACADEMICS */}
      {activeTab === "Academics" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
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
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F8F9FA]">
              <h3 className="font-cabinet font-bold text-base">Invoices & Payment History</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#8A8F98]">No invoices for this student</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="student-invoices-table">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                      {["Course", "Total", "Paid", "Balance", "Status", "Payments"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <React.Fragment key={inv.id}>
                        <tr key={inv.id} className="border-b border-[#E5E7EB] hover:bg-[#F8F9FA]">
                          <td className="px-4 py-3 text-[#0A0A0A]">{inv.course_name}</td>
                          <td className="px-4 py-3 font-medium">₹{inv.total?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[#00C853] font-medium">₹{(inv.paid_amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-[#FF2B2B] font-medium">₹{(inv.balance || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded border capitalize
                              ${inv.status === "paid"    ? "bg-green-50 text-green-700 border-green-200" :
                                inv.status === "partial" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => togglePayHistory(inv.id)}
                              data-testid={`payment-history-toggle-${inv.id}`}
                              className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline font-medium">
                              <CreditCard size={12} />
                              {expandedInvoice === inv.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              History
                            </button>
                          </td>
                        </tr>
                        {expandedInvoice === inv.id && (
                          <tr key={`${inv.id}-history`}>
                            <td colSpan={6} className="px-4 py-3 bg-blue-50/30 border-b border-[#E5E7EB]">
                              {payHistoryLoading[inv.id] ? (
                                <p className="text-xs text-[#8A8F98]">Loading payment history...</p>
                              ) : (payHistory[inv.id]?.length > 0) ? (
                                <div>
                                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] mb-2">Payment Transactions</p>
                                  <div className="space-y-1.5">
                                    {payHistory[inv.id].map((p) => (
                                      <div key={p.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-xs">
                                        <div className="flex items-center gap-3">
                                          <span className={`px-2 py-0.5 rounded border capitalize
                                            ${p.method === "manual" ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                                            {p.method || "manual"}
                                          </span>
                                          <span className="text-[#8A8F98] font-mono">{p.payment_id?.slice(-12)}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-[#8A8F98]">
                                            {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                                          </span>
                                          <span className="font-bold text-[#00C853]">₹{p.amount?.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-[#8A8F98] italic">No payment transactions recorded yet.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIFECYCLE ACTIONS */}
      {activeTab === "Lifecycle Actions" && (
        <div className="space-y-4">
          {/* Status buttons */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="font-cabinet font-bold text-base mb-3">Status Management</h3>
            <div className="flex flex-wrap gap-2">
              {["onboarding", "active", "completed", "dropped"].map((status) => (
                <button key={status} onClick={() => updateStatus(status)}
                  disabled={saving || student.status === status}
                  data-testid={`status-btn-${status}`}
                  className={`px-4 py-2 text-sm rounded-md border font-medium transition-all capitalize
                    ${student.status === status
                      ? "bg-[#002EB8] text-white border-[#002EB8]"
                      : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8] hover:text-[#002EB8]"
                    } disabled:opacity-60`}>
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Action cards */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-3">
            <h3 className="font-cabinet font-bold text-base mb-1">Lifecycle Actions</h3>

            {/* Onboard */}
            <div className="border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-[#0A0A0A]">Complete Onboarding</p>
                  <p className="text-xs text-[#8A8F98] mt-0.5">Assign to batch(es) and mark as Active</p>
                </div>
                <button onClick={() => setShowOnboardForm(!showOnboardForm)}
                  data-testid="onboard-button"
                  className="flex items-center gap-2 px-3 py-2 bg-[#002EB8] text-white text-xs rounded-md hover:bg-[#001A85]">
                  <UserCheck size={14} /> Onboard
                </button>
              </div>
              {showOnboardForm && (
                <form onSubmit={handleOnboard} className="mt-4 space-y-3">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {batches.length === 0 ? (
                      <p className="text-xs text-[#8A8F98]">No batches available. Create batches in Academic Hub first.</p>
                    ) : batches.map((b) => (
                      <label key={b.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors
                          ${selectedBatches.includes(b.id) ? "border-[#002EB8] bg-blue-50" : "border-[#E5E7EB] hover:border-[#002EB8]/40"}`}>
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
                    <p className="text-xs text-[#002EB8]">{selectedBatches.length} batch(es) selected</p>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving || !selectedBatches.length}
                      className="px-4 py-2 bg-[#00C853] text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50">
                      Assign ({selectedBatches.length})
                    </button>
                    <button type="button" onClick={() => setShowOnboardForm(false)}
                      className="px-3 py-2 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:bg-[#F8F9FA]">
                      <X size={14} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Mark Complete */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Mark as Completed</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Generate a completion certificate</p>
              </div>
              <button onClick={handleComplete} disabled={saving || student.status === "completed"}
                data-testid="complete-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#00C853] text-white text-xs rounded-md hover:opacity-90 disabled:opacity-50">
                <CheckCircle size={14} /> Complete
              </button>
            </div>

            {/* Promote */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Initiate Next-Year Promotion</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Create a new CRM re-enrolment lead</p>
              </div>
              <button onClick={handlePromote} disabled={saving} data-testid="promote-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#FFD600] text-[#0A0A0A] text-xs rounded-md hover:opacity-90 disabled:opacity-50">
                <GraduationCap size={14} /> Promote
              </button>
            </div>

            {/* Drop */}
            <div className="border border-red-100 rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A]">Mark as Dropped</p>
                <p className="text-xs text-[#8A8F98] mt-0.5">Student has left the institute</p>
              </div>
              <button onClick={() => updateStatus("dropped")}
                disabled={saving || student.status === "dropped"}
                data-testid="drop-button"
                className="flex items-center gap-2 px-3 py-2 bg-[#FF2B2B] text-white text-xs rounded-md hover:opacity-90 disabled:opacity-50">
                <RefreshCw size={14} /> Drop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
