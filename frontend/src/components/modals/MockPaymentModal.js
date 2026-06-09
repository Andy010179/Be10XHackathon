import { Smartphone } from "lucide-react";

export function MockPaymentModal({ mockPayment, onClose, handleConfirm }) {
  if (!mockPayment) return null;
  return (
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
          <button onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
          <button onClick={handleConfirm} data-testid="mock-payment-confirm"
            className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">
            Simulate Payment
          </button>
        </div>
      </div>
    </div>
  );
}
