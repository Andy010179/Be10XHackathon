import { X } from "lucide-react";

export function InvoiceFormModal({
  onClose, form, setForm, handleSubmit, saving,
  students, courses,
  handleStudentChange, handleCourseChange,
  gstRate, gstAmount, totalAmount,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-cabinet font-bold text-lg tracking-tight">Generate Invoice</h2>
          <button onClick={onClose} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
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
              <div className="flex justify-between text-[#8A8F98]"><span>Base Fee</span><span>₹{parseFloat(form.base_fee || 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-[#8A8F98]"><span>GST ({gstRate}%)</span><span>₹{gstAmount.toLocaleString()}</span></div>
              <div className="flex justify-between text-[#8A8F98]"><span>Discount</span><span>-₹{parseFloat(form.discount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-[#0A0A0A] border-t border-[#E5E7EB] pt-1 mt-1"><span>Total</span><span>₹{totalAmount.toLocaleString()}</span></div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
            <button type="submit" disabled={saving} data-testid="invoice-submit-button"
              className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
              {saving ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
