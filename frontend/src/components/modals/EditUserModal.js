import { Pencil, X, Briefcase, ShieldCheck, GraduationCap, UserCheck } from "lucide-react";

const ROLES = [
  { value: "employer", label: "Employer", icon: Briefcase, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "teacher", label: "Teacher", icon: ShieldCheck, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "student", label: "Student", icon: GraduationCap, color: "bg-blue-50 text-[#002EB8] border-blue-200" },
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "bg-red-50 text-red-700 border-red-200" },
  { value: "parent", label: "Parent", icon: UserCheck, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

export function EditUserModal({ onClose, editForm, setEditForm, handleEditSave, editSaving }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-[#002EB8]" />
            <h2 className="font-cabinet font-bold text-lg tracking-tight">Edit User</h2>
          </div>
          <button onClick={onClose} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
        </div>
        <form onSubmit={handleEditSave} data-testid="edit-user-form" className="p-6 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Full Name</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              data-testid="edit-user-name"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Email Address</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              data-testid="edit-user-email"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-2">Role</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <button key={role.value} type="button" onClick={() => setEditForm({ ...editForm, role: role.value })}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 border rounded-md text-xs transition-all ${editForm.role === role.value ? "border-[#002EB8] bg-blue-50 text-[#002EB8]" : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8]"}`}>
                    <RoleIcon size={16} /><span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Joining Date</label>
            <input type="date" value={editForm.joining_date} onChange={(e) => setEditForm({ ...editForm, joining_date: e.target.value })}
              data-testid="edit-user-joining-date"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">
              Reset Password <span className="normal-case text-[#8A8F98]">(leave blank to keep current)</span>
            </label>
            <input type="password" minLength={6} value={editForm.new_password || ""}
              onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
              placeholder="New password (min 6 characters)"
              data-testid="edit-user-new-password"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
            {editForm.new_password?.length > 0 && editForm.new_password.length < 6 && (
              <p className="text-xs text-[#FF2B2B] mt-1">Password must be at least 6 characters</p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
            <button type="submit" disabled={editSaving} data-testid="edit-user-submit"
              className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
              {editSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
