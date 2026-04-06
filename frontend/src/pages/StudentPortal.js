import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  Building2, LogOut, User, BookOpen, DollarSign,
  Award, MessageSquare, Pencil, X, Send, CheckCircle,
  Download, Clock, TrendingUp, CreditCard, Smartphone
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = [
  { key: "profile", label: "My Profile", icon: User },
  { key: "academics", label: "Courses & Attendance", icon: BookOpen },
  { key: "fees", label: "My Fees", icon: DollarSign },
  { key: "certificate", label: "Certificate", icon: Award },
  { key: "query", label: "Fee Query", icon: MessageSquare },
];

const STATUS_STYLES = {
  onboarding: "bg-yellow-50 text-yellow-700 border-yellow-200",
  active: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-[#002EB8] border-blue-200",
  dropped: "bg-red-50 text-red-700 border-red-200",
};

export default function StudentPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [student, setStudent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [querySending, setQuerySending] = useState(false);
  const [mockPayment, setMockPayment] = useState(null);
  const [rzpLoading, setRzpLoading] = useState(null);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (document.getElementById("rzp-script-portal")) return resolve(true);
      const s = document.createElement("script");
      s.id = "rzp-script-portal";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [meRes, invRes, attRes] = await Promise.all([
        axios.get(`${API}/api/portal/me`, { withCredentials: true }),
        axios.get(`${API}/api/portal/invoices`, { withCredentials: true }),
        axios.get(`${API}/api/portal/attendance`, { withCredentials: true }),
      ]);
      setStudent(meRes.data);
      setEditForm({ phone: meRes.data.phone || "", address: meRes.data.address || "", guardian_name: meRes.data.guardian_name || "", guardian_phone: meRes.data.guardian_phone || "" });
      setInvoices(invRes.data);
      setAttendance(attRes.data);

      // Try to fetch certificate
      if (meRes.data.status === "completed") {
        try {
          const certRes = await axios.get(`${API}/api/portal/certificate`, { withCredentials: true });
          setCertificate(certRes.data);
        } catch {}
      }
    } catch { toast.error("Failed to load portal data"); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/api/portal/me`, editForm, { withCredentials: true });
      setStudent(res.data);
      setEditing(false);
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setQuerySending(true);
    try {
      const res = await axios.post(`${API}/api/portal/fee-query`, { message: queryText }, { withCredentials: true });
      toast.success(res.data.message);
      setQueryText("");
    } catch { toast.error("Failed to submit query"); }
    finally { setQuerySending(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const downloadCertificate = async () => {
    if (!certificate) return;
    try {
      const response = await axios.get(`${API}/api/portal/certificate/pdf`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `EduTech_Certificate_${certificate.student_name?.replace(/\s/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF Certificate downloaded!");
    } catch {
      toast.error("Failed to download certificate");
    }
  };

  const handlePayNow = async (invoice) => {
    setRzpLoading(invoice.id);
    try {
      const orderRes = await axios.post(`${API}/api/payments/create-order`, {
        invoice_id: invoice.id,
        amount: invoice.balance,
      }, { withCredentials: true });
      const { order_id, amount, currency, key, mock } = orderRes.data;
      if (mock) {
        setMockPayment({ invoice, order_id, amount: invoice.balance });
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) return toast.error("Failed to load Razorpay");
      const options = {
        key, amount, currency, order_id,
        name: "EduTech LMS",
        description: `Fee for ${invoice.course_name}`,
        prefill: { name: student?.name || "" },
        handler: async (response) => {
          const verifyRes = await axios.post(`${API}/api/payments/verify`, {
            invoice_id: invoice.id,
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature,
            amount: invoice.balance,
          }, { withCredentials: true });
          if (verifyRes.data.success) {
            toast.success("Payment successful!");
            const [invRes] = await Promise.all([
              axios.get(`${API}/api/portal/invoices`, { withCredentials: true }),
            ]);
            setInvoices(invRes.data);
          }
        },
        theme: { color: "#002EB8" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Payment initiation failed");
    } finally {
      setRzpLoading(null);
    }
  };

  const handleMockPayConfirm = async () => {
    if (!mockPayment) return;
    try {
      const res = await axios.post(`${API}/api/payments/verify`, {
        invoice_id: mockPayment.invoice.id,
        payment_id: `pay_portal_mock_${Date.now()}`,
        order_id: mockPayment.order_id,
        amount: mockPayment.amount,
      }, { withCredentials: true });
      if (res.data.success) {
        toast.success("Mock payment successful!");
        const invRes = await axios.get(`${API}/api/portal/invoices`, { withCredentials: true });
        setInvoices(invRes.data);
      }
    } catch { toast.error("Mock payment failed"); }
    finally { setMockPayment(null); }
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
  const totalDue = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#002EB8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 font-satoshi max-w-4xl mx-auto">
      {/* Portal Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 mb-6" data-testid="portal-header">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#002EB8]/10 rounded-full flex items-center justify-center font-cabinet font-black text-[#002EB8] text-2xl">
              {student?.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-cabinet font-black text-2xl tracking-tight text-[#0A0A0A]">{student?.name || user?.name}</h1>
              <p className="text-sm text-[#8A8F98]">{user?.email}</p>
              {student?.status && (
                <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded border ${STATUS_STYLES[student.status] || ""}`}>
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-[#8A8F98] hover:text-[#FF2B2B] transition-colors">
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#E5E7EB]">
          <div className="text-center">
            <p className="font-cabinet font-black text-xl text-[#002EB8]">{attendancePct}%</p>
            <p className="text-xs text-[#8A8F98] mt-0.5">Attendance</p>
          </div>
          <div className="text-center border-x border-[#E5E7EB]">
            <p className="font-cabinet font-black text-xl text-[#00C853]">₹{totalPaid.toLocaleString()}</p>
            <p className="text-xs text-[#8A8F98] mt-0.5">Fees Paid</p>
          </div>
          <div className="text-center">
            <p className="font-cabinet font-black text-xl text-[#FF2B2B]">₹{totalDue.toLocaleString()}</p>
            <p className="text-xs text-[#8A8F98] mt-0.5">Due Balance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              data-testid={`portal-tab-${tab.key}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key ? "border-[#002EB8] text-[#002EB8]" : "border-transparent text-[#8A8F98] hover:text-[#0A0A0A]"
              }`}>
              <TabIcon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cabinet font-bold text-base">Personal Information</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} data-testid="edit-profile-button"
                className="flex items-center gap-1.5 text-sm text-[#002EB8] hover:underline">
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={16} /></button>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Full Name", value: student?.name },
                { label: "Email", value: student?.email },
                { label: "Phone", value: student?.phone || "—" },
                { label: "Date of Birth", value: student?.dob || "—" },
                { label: "Address", value: student?.address || "—" },
                { label: "Guardian Name", value: student?.guardian_name || "—" },
                { label: "Guardian Phone", value: student?.guardian_phone || "—" },
                { label: "Enrollment Date", value: student?.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString("en-IN") : "—" },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">{f.label}</p>
                  <p className="text-sm text-[#0A0A0A] font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Address", key: "address", type: "text" },
                { label: "Guardian Name", key: "guardian_name", type: "text" },
                { label: "Guardian Phone", key: "guardian_phone", type: "tel" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">{f.label}</label>
                  <input type={f.type} value={editForm[f.key] || ""} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                    data-testid={`edit-${f.key}`}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              ))}
              <button onClick={handleSaveProfile} disabled={saving} data-testid="save-profile-button"
                className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                {saving ? "Saving..." : <><CheckCircle size={14} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ACADEMICS TAB */}
      {activeTab === "academics" && (
        <div className="space-y-4">
          {/* Syllabus Progress */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="font-cabinet font-bold text-base mb-4">Course Progress</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#002EB8] rounded-full transition-all" style={{ width: `${student?.syllabus_percentage || 0}%` }} />
              </div>
              <span className="font-cabinet font-black text-lg text-[#002EB8] w-12 text-right">{student?.syllabus_percentage || 0}%</span>
            </div>
            <p className="text-xs text-[#8A8F98]">Syllabus completion based on class attendance</p>
          </div>

          {/* Attendance Records */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-cabinet font-bold text-base">Attendance Records</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[#00C853] font-medium">{presentCount} Present</span>
                <span className="text-[#FF2B2B] font-medium">{attendance.length - presentCount} Absent</span>
              </div>
            </div>
            {attendance.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8A8F98]">No attendance records yet</div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]" data-testid="attendance-records">
                {attendance.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F8F9FA]">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#8A8F98]" />
                      <span className="text-sm text-[#0A0A0A]">{a.marked_at ? new Date(a.marked_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize ${a.status === "present" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEES TAB */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {/* Mock Payment Modal */}
          {mockPayment && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-sm shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone size={20} className="text-[#002EB8]" />
                  <h3 className="font-cabinet font-bold text-lg">Razorpay (Demo Mode)</h3>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 text-xs text-yellow-800">
                  Add Razorpay keys in Settings for real payments.
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-[#8A8F98]">Course</span><span className="font-medium">{mockPayment.invoice.course_name}</span></div>
                  <div className="flex justify-between border-t border-[#E5E7EB] pt-2"><span className="text-[#8A8F98]">Amount</span><span className="font-bold text-[#002EB8]">₹{mockPayment.amount?.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMockPayment(null)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
                  <button onClick={handleMockPayConfirm} data-testid="portal-mock-pay-confirm" className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">
                    Simulate Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Total Paid</p>
              <p className="font-cabinet font-black text-2xl text-[#00C853] mt-1">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Balance Due</p>
              <p className="font-cabinet font-black text-2xl text-[#FF2B2B] mt-1">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB]">
              <h3 className="font-cabinet font-bold text-base">Invoice History</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8A8F98]">No invoices found</div>
            ) : (
              <table className="w-full text-sm" data-testid="portal-invoices">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                    {["Course", "Total", "Paid", "Balance", "Status", "Action"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8F9FA]">
                      <td className="px-4 py-2.5 text-[#0A0A0A] text-sm">{inv.course_name}</td>
                      <td className="px-4 py-2.5 font-medium">₹{inv.total?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-[#00C853]">₹{inv.paid_amount?.toLocaleString() || 0}</td>
                      <td className="px-4 py-2.5 text-[#FF2B2B]">₹{inv.balance?.toLocaleString() || 0}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded border capitalize ${inv.status === "paid" ? "bg-green-50 text-green-700 border-green-200" : inv.status === "partial" ? "bg-blue-50 text-[#002EB8] border-blue-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {(inv.balance || 0) > 0 ? (
                          <button
                            onClick={() => handlePayNow(inv)}
                            disabled={rzpLoading === inv.id}
                            data-testid={`portal-pay-btn-${inv.id}`}
                            className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline font-medium disabled:opacity-50"
                          >
                            <CreditCard size={12} />
                            {rzpLoading === inv.id ? "..." : "Pay Now"}
                          </button>
                        ) : (
                          <span className="text-xs text-[#00C853] flex items-center gap-1">
                            <CheckCircle size={12} /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CERTIFICATE TAB */}
      {activeTab === "certificate" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center">
          {certificate ? (
            <>
              <div className="w-20 h-20 bg-[#002EB8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award size={36} className="text-[#002EB8]" />
              </div>
              <h3 className="font-cabinet font-black text-2xl text-[#0A0A0A] mb-1">{certificate.student_name}</h3>
              <p className="text-sm text-[#8A8F98] mb-4">Course Completion Certificate</p>
              <div className="inline-block bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-6 py-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">Certificate ID</p>
                <p className="font-mono font-bold text-[#002EB8]">{certificate.certificate_id}</p>
              </div>
              <p className="text-sm text-[#8A8F98] mb-6">
                Issued: {new Date(certificate.issued_date).toLocaleDateString("en-IN", { dateStyle: "long" })}
              </p>
              <button onClick={downloadCertificate} data-testid="download-certificate-button"
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
                <Download size={16} /> Download PDF Certificate
              </button>
            </>
          ) : (
            <>
              <Award size={48} className="text-[#E5E7EB] mx-auto mb-4" />
              <h3 className="font-cabinet font-bold text-lg text-[#0A0A0A] mb-2">No Certificate Yet</h3>
              <p className="text-sm text-[#8A8F98]">Complete your course to receive your certificate.</p>
              {student?.syllabus_percentage > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 justify-center">
                    <TrendingUp size={16} className="text-[#002EB8]" />
                    <span className="text-sm text-[#002EB8] font-medium">{student.syllabus_percentage}% completed</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* FEE QUERY TAB */}
      {activeTab === "query" && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <h3 className="font-cabinet font-bold text-base mb-2">Raise a Fee Query</h3>
          <p className="text-sm text-[#8A8F98] mb-4">Have a question about your fees? Send a message to the admin and they'll respond shortly.</p>
          <form onSubmit={handleQuery} data-testid="fee-query-form" className="space-y-4">
            <textarea
              value={queryText} onChange={(e) => setQueryText(e.target.value)}
              placeholder="Describe your fee-related query here..."
              rows={5} required data-testid="fee-query-input"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] resize-none"
            />
            <button type="submit" disabled={querySending || !queryText.trim()}
              data-testid="fee-query-submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98] transition-colors font-medium">
              {querySending ? "Sending..." : <><Send size={14} /> Submit Query</>}
            </button>
          </form>
          <div className="mt-6 p-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-md">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1">How it works</p>
            <ul className="text-xs text-[#8A8F98] space-y-1 list-disc list-inside">
              <li>Your query is sent to the institute admin</li>
              <li>An email notification is sent to admin immediately</li>
              <li>Expect a response within 24 hours</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
