import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, X, Users, ShieldCheck, GraduationCap, Briefcase } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const ROLES = [
  { value: "employer", label: "Employer", icon: Briefcase, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "teacher", label: "Teacher", icon: ShieldCheck, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "student", label: "Student", icon: GraduationCap, color: "bg-blue-50 text-[#002EB8] border-blue-200" },
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "bg-red-50 text-red-700 border-red-200" },
];

const emptyForm = { name: "", email: "", password: "", role: "teacher", branch_id: "" };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/users`, { withCredentials: true }),
      axios.get(`${API}/api/branches`, { withCredentials: true }),
    ]).then(([u, b]) => {
      setUsers(u.data);
      setBranches(b.data);
    }).catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/users`, form, { withCredentials: true });
      setUsers([res.data, ...users]);
      setShowForm(false);
      setForm(emptyForm);
      toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/users/${id}`, { withCredentials: true });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted");
    } catch { toast.error("Failed to delete user"); }
  };

  const getRoleConfig = (role) => ROLES.find((r) => r.value === role) || ROLES[2];
  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  const filtered = users.filter((u) => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Stats
  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r.value]: users.filter((u) => u.role === r.value).length }), {});

  if (loading) return <div className="p-8 text-[#8A8F98] font-satoshi">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">User Management</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">{users.length} total accounts</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-user-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] transition-colors font-medium">
          <Plus size={16} /> Create User
        </button>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ROLES.map((role) => {
          const RoleIcon = role.icon;
          return (
            <button key={role.value} onClick={() => setFilterRole(filterRole === role.value ? "all" : role.value)}
              data-testid={`role-filter-${role.value}`}
              className={`flex items-center gap-3 p-3 border rounded-lg transition-all text-left ${filterRole === role.value ? "border-[#002EB8] bg-blue-50" : "border-[#E5E7EB] bg-white hover:border-[#002EB8]/40"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${role.color}`}>
                <RoleIcon size={14} />
              </div>
              <div>
                <p className="font-cabinet font-bold text-lg leading-none text-[#0A0A0A]">{roleCounts[role.value] || 0}</p>
                <p className="text-xs text-[#8A8F98] capitalize mt-0.5">{role.label}s</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        data-testid="user-search-input"
        className="w-full mb-4 px-4 py-2.5 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white"
      />

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#002EB8]" />
                <h2 className="font-cabinet font-bold text-lg tracking-tight">Create New Account</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} data-testid="create-user-form" className="p-6 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-2">Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <button key={role.value} type="button"
                        onClick={() => setForm({ ...form, role: role.value })}
                        data-testid={`role-option-${role.value}`}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 border rounded-md text-xs transition-all ${form.role === role.value ? "border-[#002EB8] bg-blue-50 text-[#002EB8]" : "border-[#E5E7EB] text-[#8A8F98] hover:border-[#002EB8]"}`}>
                        <RoleIcon size={16} />
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
              {form.role === "student" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                  <strong>Note:</strong> For student portal access, the email must match the email address in the student's record (created under Students module).
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="create-user-submit"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm" data-testid="users-table">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
              {["User", "Email", "Role", "Branch", "Joined", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8A8F98]">No users found</td></tr>
            ) : filtered.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              const RoleIcon = roleConfig.icon;
              return (
                <tr key={user.id} className="hover:bg-[#F8F9FA] transition-colors" data-testid={`user-row-${user.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#002EB8]/10 rounded-full flex items-center justify-center font-cabinet font-bold text-[#002EB8] text-sm">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-medium text-[#0A0A0A]">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8A8F98] text-xs">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded border w-fit capitalize ${roleConfig.color}`}>
                      <RoleIcon size={10} />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8A8F98] text-xs whitespace-nowrap">{getBranchName(user.branch_id)}</td>
                  <td className="px-4 py-3 text-[#8A8F98] text-xs whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== "admin" && (
                      <button onClick={() => handleDelete(user.id)} data-testid={`delete-user-${user.id}`}
                        className="text-[#8A8F98] hover:text-[#FF2B2B] transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
