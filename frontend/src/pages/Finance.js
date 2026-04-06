import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Bell, X, CreditCard } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  partial: "bg-blue-50 text-[#002EB8] border-blue-200",
  paid: "bg-green-50 text-[#00C853] border-green-200",
};

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(null);
  const [nudging, setNudging] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    student_id: "", student_name: "", course_id: "", course_name: "", base_fee: "", discount: "0"
  });
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/finance/invoices`, { withCredentials: true }),
      axios.get(`${API}/api/students`, { withCredentials: true }),
      axios.get(`${API}/api/courses`, { withCredentials: true }),
    ]).then(([inv, std, crs]) => {
      setInvoices(inv.data);
      setStudents(std.data);
      setCourses(crs.data);
    }).catch(() => toast.error("Failed to load finance data"))
      .finally(() => setLoading(false));
  }, []);

  const handleStudentChange = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    setForm((f) => ({ ...f, student_id: studentId, student_name: student?.name || "" }));
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    setForm((f) => ({ ...f, course_id: courseId, course_name: course?.name || "", base_fee: String(course?.base_fee || "") }));
  };

  const gstAmount = Math.round((parseFloat(form.base_fee) || 0) * 0.18 * 100) / 100;
  const totalAmount = Math.round(((parseFloat(form.base_fee) || 0) + gstAmount - (parseFloat(form.discount) || 0)) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        base_fee: parseFloat(form.base_fee),
        discount: parseFloat(form.discount) || 0,
      };
      const res = await axios.post(`${API}/api/finance/calculate`, payload, { withCredentials: true });
      setInvoices([res.data, ...invoices]);
      setShowForm(false);
      setForm({ student_id: "", student_name: "", course_id: "", course_name: "", base_fee: "", discount: "0" });
      toast.success("Invoice generated successfully!");
    } catch { toast.error("Failed to generate invoice"); }
    finally { setSaving(false); }
  };

  const handlePayment = async (invoiceId) => {
    if (!payAmount || isNaN(payAmount)) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const res = await axios.patch(
        `${API}/api/finance/invoices/${invoiceId}/pay`,
        { amount: parseFloat(payAmount) },
        { withCredentials: true }
      );
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? res.data : inv));
      setShowPayForm(null);
      setPayAmount("");
      toast.success("Payment recorded!");
    } catch { toast.error("Failed to record payment"); }
  };

  const handleNudge = async (studentId) => {
    setNudging(studentId);
    try {
      const res = await axios.post(`${API}/api/finance/nudge/${studentId}`, {}, { withCredentials: true });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send nudge");
    } finally { setNudging(null); }
  };

  const totalRevenue = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance || 0), 0);

  if (loading) return <div className="p-8 text-[#8A8F98]">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Finance</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">Fee management &amp; invoicing (18% GST applied)</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="generate-invoice-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] p-4">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Total Collected</p>
          <p className="font-cabinet font-black text-2xl tracking-tighter text-[#00C853] mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] p-4">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Outstanding</p>
          <p className="font-cabinet font-black text-2xl tracking-tighter text-[#FF2B2B] mt-1">₹{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-cabinet font-bold text-lg tracking-tight">Generate Invoice</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} data-testid="invoice-form" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Student</label>
                  <select required value={form.student_id} onChange={(e) => handleStudentChange(e.target.value)}
                    data-testid="invoice-student-select"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Student</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Course</label>
                  <select required value={form.course_id} onChange={(e) => handleCourseChange(e.target.value)}
                    data-testid="invoice-course-select"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                    <option value="">Select Course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name} (₹{c.base_fee?.toLocaleString()})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Base Fee (₹)</label>
                  <input type="number" required value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Discount (₹)</label>
                  <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    data-testid="invoice-discount-input"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              </div>
              {form.base_fee && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-3 text-sm space-y-1" data-testid="invoice-breakdown">
                  <div className="flex justify-between text-[#8A8F98]"><span>Base Fee</span><span>₹{parseFloat(form.base_fee || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#8A8F98]"><span>GST (18%)</span><span>₹{gstAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#8A8F98]"><span>Discount</span><span>-₹{parseFloat(form.discount || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-[#0A0A0A] border-t border-[#E5E7EB] pt-1 mt-1"><span>Total</span><span>₹{totalAmount.toLocaleString()}</span></div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="invoice-submit-button" className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-sm shadow-xl p-6">
            <h3 className="font-cabinet font-bold text-lg mb-3">Record Payment</h3>
            <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount received (₹)" data-testid="payment-amount-input"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#002EB8]" />
            <div className="flex gap-3">
              <button onClick={() => setShowPayForm(null)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
              <button onClick={() => handlePayment(showPayForm)} data-testid="payment-submit-button" className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invoices-table">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                {["Student", "Course", "Base Fee", "GST", "Discount", "Total", "Paid", "Balance", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {invoices.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#8A8F98]">No invoices yet — generate the first one!</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#F8F9FA] transition-colors" data-testid={`invoice-row-${inv.id}`}>
                  <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">{inv.student_name}</td>
                  <td className="px-4 py-3 text-[#8A8F98] whitespace-nowrap max-w-[140px] truncate">{inv.course_name}</td>
                  <td className="px-4 py-3 text-[#0A0A0A] whitespace-nowrap">₹{inv.base_fee?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#0A0A0A] whitespace-nowrap">₹{inv.gst_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#8A8F98] whitespace-nowrap">₹{inv.discount?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">₹{inv.total?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#00C853] whitespace-nowrap">₹{inv.paid_amount?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-[#FF2B2B] whitespace-nowrap">₹{inv.balance?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded border capitalize ${STATUS_STYLES[inv.status] || "bg-gray-100 text-gray-600"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {inv.status !== "paid" && (
                        <button
                          onClick={() => setShowPayForm(inv.id)}
                          data-testid={`record-payment-${inv.id}`}
                          className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline"
                        >
                          <CreditCard size={12} /> Pay
                        </button>
                      )}
                      {(inv.balance || 0) > 0 && (
                        <button
                          onClick={() => handleNudge(inv.student_id)}
                          disabled={nudging === inv.student_id}
                          data-testid={`nudge-button-${inv.id}`}
                          className="flex items-center gap-1 text-xs text-[#FF2B2B] hover:underline disabled:opacity-50"
                        >
                          <Bell size={12} /> {nudging === inv.student_id ? "..." : "Nudge"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
