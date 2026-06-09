import { X } from "lucide-react";

export function EditBranchModal({ onClose, form, setForm, onSubmit, saving }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="font-cabinet font-bold">Edit Branch</h3>
          <button onClick={onClose}><X size={18} className="text-[#8A8F98]" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3" data-testid="edit-branch-form">
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Location</label>
            <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
