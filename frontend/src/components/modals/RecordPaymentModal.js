export function RecordPaymentModal({ onClose, payAmount, setPayAmount, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-sm shadow-xl p-6">
        <h3 className="font-cabinet font-bold text-lg mb-3">Record Manual Payment</h3>
        <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
          placeholder="Amount received (₹)" data-testid="payment-amount-input"
          className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#002EB8]" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
          <button onClick={onSubmit} data-testid="payment-submit-button"
            className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85]">Record</button>
        </div>
      </div>
    </div>
  );
}
