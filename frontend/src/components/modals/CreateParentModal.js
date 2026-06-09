import { X, UserCheck } from "lucide-react";

export function CreateParentModal({ onClose, parentForm, setParentForm, handleCreateParent, parentSaving, students }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-purple-600" />
            <h3 className="font-cabinet font-bold text-base">Create Parent Account</h3>
          </div>
          <button onClick={onClose} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
        </div>
        <form onSubmit={handleCreateParent} className="p-6 space-y-4" data-testid="create-parent-form">
          {[
            { label: "Parent Name *", field: "parent_name", ph: "Guardian Full Name", req: true },
            { label: "Parent Email *", field: "parent_email", ph: "parent@example.com", req: true },
            { label: "Phone", field: "parent_phone", ph: "+91 98765 43210", req: false },
          ].map(({ label, field, ph, req }) => (
            <div key={field}>
              <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">{label}</label>
              <input required={req} value={parentForm[field]}
                onChange={(e) => setParentForm((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={ph}
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Link to Student *</label>
            <select required value={parentForm.student_id}
              onChange={(e) => setParentForm((p) => ({ ...p, student_id: e.target.value }))}
              data-testid="parent-student-select"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8] bg-white">
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-[#002EB8]">
            A temporary password will be generated and shown after creation. The parent will receive login details via email.
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2.5 rounded-lg text-sm hover:bg-[#F8F9FA]">Cancel</button>
            <button type="submit" disabled={parentSaving} data-testid="create-parent-submit"
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-[#8A8F98]">
              {parentSaving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
