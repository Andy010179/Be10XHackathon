import { Users, X, Briefcase, ShieldCheck, GraduationCap, UserCheck } from "lucide-react";

const ROLES = [
  { value: "employer", label: "Employer", icon: Briefcase, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "teacher", label: "Teacher", icon: ShieldCheck, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "student", label: "Student", icon: GraduationCap, color: "bg-blue-50 text-[#002EB8] border-blue-200" },
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "bg-red-50 text-red-700 border-red-200" },
  { value: "parent", label: "Parent", icon: UserCheck, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

export function CreateUserModal({
  onClose, form, setForm, handleSubmit, saving,
  branches, students,
  selectedStudent, setSelectedStudent,
  studentSearch, setStudentSearch,
  showStudentDropdown, setShowStudentDropdown,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#002EB8]" />
            <h2 className="font-cabinet font-bold text-lg tracking-tight">Create New Account</h2>
          </div>
          <button onClick={onClose} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} data-testid="create-user-form" className="p-6 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-2">Role</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <button key={role.value} type="button"
                    onClick={() => { setForm({ ...form, role: role.value }); setSelectedStudent(null); setStudentSearch(""); }}
                    data-testid={`role-option-${role.value}`}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 border rounded-md text-xs transition-all ${form.role === role.value ? "border-[#002EB8] bg-blue-50 text-[#002EB8]" : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8]"}`}>
                    <RoleIcon size={16} /><span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {form.role === "student" ? (
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Link to Existing Student</label>
              <div className="relative">
                <input value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setShowStudentDropdown(true); }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Search student by name or email..."
                  data-testid="student-link-search"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                {showStudentDropdown && studentSearch.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-[#E5E7EB] rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {students.filter((s) =>
                      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                    ).slice(0, 10).map((s) => (
                      <button key={s.id} type="button"
                        onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); setShowStudentDropdown(false); }}
                        data-testid={`student-option-${s.id}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#F8F9FA] border-b border-[#E5E7EB] last:border-0">
                        <p className="font-medium text-[#0A0A0A]">{s.name}</p>
                        <p className="text-xs text-[#8A8F98]">{s.email}</p>
                      </button>
                    ))}
                    {students.filter((s) =>
                      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="px-3 py-2 text-xs text-[#8A8F98]">No students found</p>
                    )}
                  </div>
                )}
              </div>
              {selectedStudent && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs">
                  <p className="font-medium text-[#002EB8]">{selectedStudent.name}</p>
                  <p className="text-[#8A8F98]">{selectedStudent.email}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Full Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma" data-testid="user-name-input"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Email Address</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@domain.com" data-testid="user-email-input"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Password</label>
            <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters" data-testid="user-password-input"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
          </div>
          {form.role !== "admin" && (
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Branch (Optional)</label>
              <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
            <button type="submit" disabled={saving} data-testid="create-user-submit"
              className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
