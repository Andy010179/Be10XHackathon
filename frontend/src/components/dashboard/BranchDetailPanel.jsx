import { Building2, X } from "lucide-react";

const STATUS_CLASSES = {
  paid: "bg-green-50 text-green-700 border-green-200",
  partial: "bg-blue-50 text-[#002EB8] border-blue-200",
};

export function BranchDetailPanel({ showBranchDetail, branchDetail, branchDetailLoading, onClose }) {
  if (!showBranchDetail) return null;

  const statusClass = (status) =>
    STATUS_CLASSES[status] ?? "bg-yellow-50 text-yellow-700 border-yellow-200";

  return (
    <div className="bg-white border border-[#002EB8]/30 rounded-lg overflow-hidden" data-testid="branch-detail-panel">
      <div className="flex items-center justify-between px-6 py-4 bg-[#002EB8]/5 border-b border-[#002EB8]/20">
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-[#002EB8]" />
          <div>
            <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">
              {branchDetail ? `${branchDetail.branch_name} — Revenue Details` : "Loading..."}
            </h3>
            {branchDetail?.location && (
              <p className="text-xs text-[#8A8F98]">{branchDetail.location}</p>
            )}
          </div>
          {branchDetail && (
            <div className="flex items-center gap-4 ml-4">
              <span className="text-xs font-mono bg-green-50 text-[#00C853] border border-green-200 px-2.5 py-1 rounded-full">
                ₹{branchDetail.total_revenue?.toLocaleString()} Collected
              </span>
              <span className="text-xs font-mono bg-red-50 text-[#FF2B2B] border border-red-200 px-2.5 py-1 rounded-full">
                ₹{branchDetail.total_balance?.toLocaleString()} Pending
              </span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-[#8A8F98] hover:text-[#0A0A0A] p-1">
          <X size={18} />
        </button>
      </div>

      {branchDetailLoading ? (
        <div className="flex items-center justify-center p-10">
          <div className="w-7 h-7 border-4 border-[#002EB8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branchDetail?.items?.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#8A8F98]">No revenue records found for this branch.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="branch-detail-table">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                {["Student", "Email", "Course", "Total Fee", "Paid", "Balance", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {(branchDetail?.items || []).map((item, i) => (
                <tr key={item.invoice_id || item.student_email || i} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0A0A0A]">{item.student_name}</td>
                  <td className="px-4 py-3 text-[#8A8F98] text-xs">{item.student_email}</td>
                  <td className="px-4 py-3 text-[#8A8F98]">{item.course || "—"}</td>
                  <td className="px-4 py-3 font-medium">₹{item.total?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#00C853] font-medium">₹{item.paid?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#FF2B2B] font-medium">₹{item.balance?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize ${statusClass(item.status)}`}>
                      {item.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
