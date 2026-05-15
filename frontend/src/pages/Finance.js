import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Bell, X, CreditCard, Smartphone, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Columns, Filter, FileText, Receipt
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  partial:  "bg-blue-50 text-[#002EB8] border-blue-200",
  paid:     "bg-green-50 text-[#00C853] border-green-200",
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const s = document.createElement("script");
    s.id = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={12} className="opacity-30 ml-1" />;
  return sortDir === "asc" ? <ChevronUp size={12} className="ml-1 text-[#002EB8]" /> : <ChevronDown size={12} className="ml-1 text-[#002EB8]" />;
}

export default function Finance() {
  const [invoices, setInvoices]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showPayForm, setShowPayForm] = useState(null);
  const [nudging, setNudging]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [mockPayment, setMockPayment] = useState(null);
  const [rzpLoading, setRzpLoading]   = useState(null);
  const [payAmount, setPayAmount]     = useState("");

  // Sorting
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Filtering
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Column visibility
  const [visibleCols, setVisibleCols]         = useState({ base_fee: true, gst: false, discount: false });
  const [showColDropdown, setShowColDropdown] = useState(false);
  const colDropdownRef = useRef(null);

  // Payment history
  const [expandedInvoice, setExpandedInvoice]     = useState(null);
  const [payHistory, setPayHistory]               = useState({});
  const [payHistoryLoading, setPayHistoryLoading] = useState({});

  const [form, setForm] = useState({
    student_id: "", student_name: "", course_id: "", course_name: "", base_fee: "", discount: "0", gst_rate: "18"
  });

  // Fetch all data on mount — deps intentionally empty (module-level constants API/axios don't need re-run)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleClickOutside = (e) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) {
        setShowColDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStudentChange = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    setForm((f) => ({ ...f, student_id: studentId, student_name: student?.name || "" }));
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    setForm((f) => ({ ...f, course_id: courseId, course_name: course?.name || "", base_fee: String(course?.base_fee || "") }));
  };

  const gstRate    = parseFloat(form.gst_rate) || 18;
  const gstAmount   = Math.round((parseFloat(form.base_fee) || 0) * (gstRate / 100) * 100) / 100;
  const totalAmount = Math.round(((parseFloat(form.base_fee) || 0) + gstAmount - (parseFloat(form.discount) || 0)) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, base_fee: parseFloat(form.base_fee), discount: parseFloat(form.discount) || 0, gst_rate: parseFloat(form.gst_rate) || 18 };
      const res = await axios.post(`${API}/api/finance/calculate`, payload, { withCredentials: true });
      setInvoices([res.data, ...invoices]);
      setShowForm(false);
      setForm({ student_id: "", student_name: "", course_id: "", course_name: "", base_fee: "", discount: "0", gst_rate: "18" });
      toast.success("Invoice generated successfully!");
    } catch { toast.error("Failed to generate invoice"); }
    finally { setSaving(false); }
  };

  const handlePayment = async (invoiceId) => {
    if (!payAmount || isNaN(payAmount)) { toast.error("Enter a valid amount"); return; }
    try {
      const res = await axios.patch(`${API}/api/finance/invoices/${invoiceId}/pay`,
        { amount: parseFloat(payAmount) }, { withCredentials: true });
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? res.data : inv));
      // Refresh payment history if expanded
      if (expandedInvoice === invoiceId) {
        const histRes = await axios.get(`${API}/api/finance/invoices/${invoiceId}/payments`, { withCredentials: true });
        setPayHistory((p) => ({ ...p, [invoiceId]: histRes.data }));
      }
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

  const handleRazorpay = async (invoice) => {
    setRzpLoading(invoice.id);
    try {
      const orderRes = await axios.post(`${API}/api/payments/create-order`,
        { invoice_id: invoice.id, amount: invoice.balance }, { withCredentials: true });
      const { order_id, amount, currency, key, mock } = orderRes.data;
      if (mock) { setMockPayment({ invoice, order_id, amount: invoice.balance }); return; }
      const loaded = await loadRazorpayScript();
      if (!loaded) return toast.error("Failed to load Razorpay");
      const options = {
        key, amount, currency, order_id,
        name: "EduTech LMS",
        description: `Fee for ${invoice.course_name}`,
        prefill: { name: invoice.student_name },
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
            const invRes = await axios.get(`${API}/api/finance/invoices`, { withCredentials: true });
            setInvoices(invRes.data);
          }
        },
        theme: { color: "#002EB8" },
      };
      new window.Razorpay(options).open();
    } catch { toast.error("Payment initiation failed"); }
    finally { setRzpLoading(null); }
  };

  const handleMockPaymentConfirm = async () => {
    if (!mockPayment) return;
    try {
      const res = await axios.post(`${API}/api/payments/verify`, {
        invoice_id: mockPayment.invoice.id,
        payment_id: `pay_mock_${Date.now()}`,
        order_id: mockPayment.order_id,
        amount: mockPayment.amount,
      }, { withCredentials: true });
      if (res.data.success) {
        toast.success("Mock payment successful!");
        const invRes = await axios.get(`${API}/api/finance/invoices`, { withCredentials: true });
        setInvoices(invRes.data);
      }
    } catch { toast.error("Mock payment failed"); }
    finally { setMockPayment(null); }
  };

  const downloadPdf = async (invoiceId, type) => {
    try {
      const res = await fetch(`${API}/api/finance/invoices/${invoiceId}/${type}`, { credentials: "include" });
      if (!res.ok) {
        let detail = `Failed to download ${type}`;
        try { const e = await res.json(); if (e.detail) detail = e.detail; } catch {}
        toast.error(detail);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_${invoiceId.slice(-8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${type}`);
    }
  };

  const togglePayHistory = async (invoiceId) => {    if (expandedInvoice === invoiceId) { setExpandedInvoice(null); return; }
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

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // Filter + Sort
  const displayedInvoices = [...invoices]
    .filter((inv) => {
      const matchSearch = !search ||
        inv.student_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.course_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortCol]; const bVal = b[sortCol];
      if (typeof aVal === "string") return sortDir === "asc" ? (aVal || "").localeCompare(bVal || "") : (bVal || "").localeCompare(aVal || "");
      return sortDir === "asc" ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });

  const totalRevenue     = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance || 0), 0);

  const SortTh = ({ col, label, className = "" }) => (
    <th onClick={() => handleSort(col)}
      className={`text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap cursor-pointer select-none hover:text-[#002EB8] transition-colors ${className}`}>
      <div className="flex items-center">
        {label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </div>
    </th>
  );

  if (loading) return <div className="p-8 text-[#8A8F98] font-satoshi">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Finance</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">Fee management &amp; invoicing (GST-inclusive)</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="generate-invoice-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Total Collected</p>
          <p className="font-cabinet font-black text-2xl text-[#00C853] mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98]">Outstanding</p>
          <p className="font-cabinet font-black text-2xl text-[#FF2B2B] mt-1">₹{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or course..." data-testid="finance-search-input"
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#8A8F98]" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="finance-status-filter"
            className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="relative" ref={colDropdownRef}>
          <button onClick={() => setShowColDropdown((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-md text-sm text-[#8A8F98] hover:border-[#002EB8] hover:text-[#002EB8] transition-colors">
            <Columns size={14} /> Columns
          </button>
          {showColDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3 z-20 min-w-[150px]">
              {[
                { key: "base_fee", label: "Base Fee" },
                { key: "gst",      label: "GST" },
                { key: "discount", label: "Discount" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-[#0A0A0A] hover:text-[#002EB8]">
                  <input type="checkbox" checked={visibleCols[key]}
                    onChange={() => setVisibleCols((v) => ({ ...v, [key]: !v[key] }))}
                    className="accent-[#002EB8]" />
                  {label}
                </label>
              ))}
            </div>
          )}
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
                  <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">GST Rate (%)</label>
                  <select value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                    data-testid="gst-rate-select"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] bg-white">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>{r}%{r === 18 ? " (Default)" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Discount (₹)</label>
                <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  data-testid="invoice-discount-input"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              {form.base_fee && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-3 text-sm space-y-1" data-testid="invoice-breakdown">
                  <div className="flex justify-between text-[#8A8F98]"><span>Base Fee</span><span>₹{parseFloat(form.base_fee||0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#8A8F98]"><span>GST ({gstRate}%)</span><span>₹{gstAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#8A8F98]"><span>Discount</span><span>-₹{parseFloat(form.discount||0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-[#0A0A0A] border-t border-[#E5E7EB] pt-1 mt-1"><span>Total</span><span>₹{totalAmount.toLocaleString()}</span></div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="invoice-submit-button"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="flex justify-between"><span className="text-[#8A8F98]">Student</span><span className="font-medium">{mockPayment.invoice.student_name}</span></div>
              <div className="flex justify-between"><span className="text-[#8A8F98]">Course</span><span className="font-medium">{mockPayment.invoice.course_name}</span></div>
              <div className="flex justify-between border-t border-[#E5E7EB] pt-2"><span className="text-[#8A8F98]">Amount</span><span className="font-bold text-[#002EB8]">₹{mockPayment.amount?.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMockPayment(null)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
              <button onClick={handleMockPaymentConfirm} data-testid="mock-payment-confirm"
                className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">
                Simulate Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-sm shadow-xl p-6">
            <h3 className="font-cabinet font-bold text-lg mb-3">Record Manual Payment</h3>
            <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount received (₹)" data-testid="payment-amount-input"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#002EB8]" />
            <div className="flex gap-3">
              <button onClick={() => setShowPayForm(null)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
              <button onClick={() => handlePayment(showPayForm)} data-testid="payment-submit-button"
                className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">Record</button>
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
                <SortTh col="student_name" label="Student" />
                <SortTh col="course_name" label="Course" />
                {visibleCols.base_fee && <SortTh col="base_fee" label="Base Fee" />}
                {visibleCols.gst      && <SortTh col="gst_amount" label="GST (18%)" />}
                {visibleCols.discount && <SortTh col="discount" label="Discount" />}
                <SortTh col="total"       label="Total" />
                <SortTh col="paid_amount" label="Paid" />
                <SortTh col="balance"     label="Balance" />
                <SortTh col="status"      label="Status" />
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-[#8A8F98]">
                  {search || statusFilter !== "all" ? "No invoices match your filters" : "No invoices yet — generate the first one!"}
                </td></tr>
              ) : displayedInvoices.map((inv) => (
                <React.Fragment key={inv.id}>
                  <tr key={inv.id} className="border-b border-[#E5E7EB] hover:bg-[#F8F9FA] transition-colors" data-testid={`invoice-row-${inv.id}`}>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">{inv.student_name}</td>
                    <td className="px-4 py-3 text-[#8A8F98] whitespace-nowrap max-w-[140px] truncate">{inv.course_name}</td>
                    {visibleCols.base_fee && <td className="px-4 py-3 whitespace-nowrap">₹{inv.base_fee?.toLocaleString()}</td>}
                    {visibleCols.gst      && <td className="px-4 py-3 whitespace-nowrap">₹{inv.gst_amount?.toLocaleString()}</td>}
                    {visibleCols.discount && <td className="px-4 py-3 text-[#8A8F98] whitespace-nowrap">₹{(inv.discount || 0).toLocaleString()}</td>}
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">₹{inv.total?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#00C853] font-medium whitespace-nowrap">₹{(inv.paid_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#FF2B2B] font-medium whitespace-nowrap">₹{(inv.balance || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded border capitalize ${STATUS_STYLES[inv.status] || "bg-gray-100 text-gray-600"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => togglePayHistory(inv.id)}
                          data-testid={`history-btn-${inv.id}`}
                          className="flex items-center gap-0.5 text-xs text-[#8A8F98] hover:text-[#002EB8] transition-colors">
                          {expandedInvoice === inv.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          Hist.
                        </button>
                        <button onClick={() => downloadPdf(inv.id, "pdf")}
                          data-testid={`invoice-pdf-btn-${inv.id}`}
                          className="flex items-center gap-1 text-xs text-[#8A8F98] hover:text-[#002EB8] transition-colors"
                          title="Download Invoice PDF">
                          <FileText size={12} /> PDF
                        </button>
                        {inv.paid_amount > 0 && (
                          <button onClick={() => downloadPdf(inv.id, "receipt")}
                            data-testid={`receipt-btn-${inv.id}`}
                            className="flex items-center gap-1 text-xs text-[#00C853] hover:underline"
                            title="Download Receipt">
                            <Receipt size={12} /> Rcpt
                          </button>
                        )}
                        {inv.status !== "paid" && (
                          <button onClick={() => setShowPayForm(inv.id)} data-testid={`record-payment-${inv.id}`}
                            className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline">
                            <CreditCard size={12} /> Pay
                          </button>
                        )}
                        {(inv.balance || 0) > 0 && (
                          <button onClick={() => handleRazorpay(inv)} disabled={rzpLoading === inv.id}
                            data-testid={`razorpay-btn-${inv.id}`}
                            className="flex items-center gap-1 text-xs text-purple-600 hover:underline disabled:opacity-50">
                            <Smartphone size={12} /> {rzpLoading === inv.id ? "..." : "RZP"}
                          </button>
                        )}
                        {(inv.balance || 0) > 0 && (
                          <button onClick={() => handleNudge(inv.student_id)} disabled={nudging === inv.student_id}
                            data-testid={`nudge-button-${inv.id}`}
                            className="flex items-center gap-1 text-xs text-[#FF2B2B] hover:underline disabled:opacity-50">
                            <Bell size={12} /> {nudging === inv.student_id ? "..." : "Nudge"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedInvoice === inv.id && (
                    <tr key={`${inv.id}-hist`}>
                      <td colSpan={12} className="px-4 py-3 bg-blue-50/30 border-b border-[#E5E7EB]">
                        {payHistoryLoading[inv.id] ? (
                          <p className="text-xs text-[#8A8F98]">Loading...</p>
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
                                    <span className="text-[#8A8F98] font-mono">{p.payment_id?.slice(-14)}</span>
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
      </div>
    </div>
  );
}
