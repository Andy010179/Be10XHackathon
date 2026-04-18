import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Building2, Plus, X, Users, FileText, ToggleLeft, ToggleRight,
  Eye, EyeOff, Trash2, Pencil, TrendingUp, Shield, KeyRound
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const EMPTY_FORM = { name: "", code: "", admin_name: "", admin_email: "", admin_password: "", phone: "", address: "" };

export default function SuperAdmin() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [editInst, setEditInst] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [resetInst, setResetInst] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  const openEdit = (inst) => {
    setEditInst(inst);
    setEditForm({ name: inst.name, phone: inst.phone || "", address: inst.address || "" });
  };

  const openReset = (inst) => {
    setResetInst(inst);
    setNewPassword("");
    setShowNewPw(false);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await axios.patch(`${API}/api/institutes/${editInst.id}`, editForm, { withCredentials: true });
      toast.success("Institute updated!");
      setEditInst(null);
      fetchInstitutes();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update institute");
    } finally { setEditSaving(false); }
  };

  const setEdit = (f) => (e) => setEditForm((p) => ({ ...p, [f]: e.target.value }));

  useEffect(() => { fetchInstitutes(); }, []);

  const fetchInstitutes = async () => {
    try {
      const res = await axios.get(`${API}/api/institutes`, { withCredentials: true });
      setInstitutes(res.data);
    } catch { toast.error("Failed to load institutes"); }
    finally { setLoading(false); }
  };

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/api/institutes`, form, { withCredentials: true });
      toast.success(`Institute '${form.name}' created!`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchInstitutes();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create institute");
    } finally { setSaving(false); }
  };

  const toggleActive = async (inst) => {
    try {
      await axios.patch(`${API}/api/institutes/${inst.id}`, { is_active: !inst.is_active }, { withCredentials: true });
      fetchInstitutes();
      toast.success(`Institute ${inst.is_active ? "deactivated" : "activated"}`);
    } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (inst) => {
    if (!window.confirm(`Delete '${inst.name}'? This also removes all its admin users.`)) return;
    try {
      await axios.delete(`${API}/api/institutes/${inst.id}`, { withCredentials: true });
      toast.success("Institute deleted");
      fetchInstitutes();
    } catch { toast.error("Failed to delete"); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setResetSaving(true);
    try {
      const res = await axios.post(
        `${API}/api/institutes/${resetInst.id}/reset-admin-password`,
        { new_password: newPassword },
        { withCredentials: true }
      );
      toast.success(`Password updated for ${res.data.admin_email}`);
      setResetInst(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    } finally { setResetSaving(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-satoshi">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-[#002EB8]" />
            <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Super Admin</h1>
          </div>
          <p className="text-sm text-[#8A8F98]">{institutes.length} institute{institutes.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-institute-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-lg hover:bg-[#001A85] font-medium">
          <Plus size={14} /> New Institute
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#8A8F98]">Loading...</div>
      ) : institutes.length === 0 ? (
        <div className="text-center py-16 text-[#8A8F98]">No institutes yet. Create one to get started.</div>
      ) : (
        <div className="grid gap-4" data-testid="institutes-list">
          {institutes.map((inst) => (
            <div key={inst.id} data-testid={`institute-${inst.id}`}
              className={`bg-white border rounded-xl p-5 flex items-start justify-between gap-4 ${inst.is_active ? "border-[#E5E7EB]" : "border-orange-200 bg-orange-50/50"}`}>
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-[#002EB8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-[#002EB8]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">{inst.name}</h3>
                    <span className="bg-[#0A0A0A]/10 text-[#0A0A0A] text-xs font-mono px-2 py-0.5 rounded">{inst.code}</span>
                    {!inst.is_active && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                  <div className="flex gap-5 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[#8A8F98]"><Users size={11} /> {inst.student_count || 0} students</span>
                    <span className="flex items-center gap-1 text-xs text-[#8A8F98]"><FileText size={11} /> {inst.enquiry_count || 0} enquiries</span>
                    <span className="flex items-center gap-1 text-xs text-[#8A8F98]"><TrendingUp size={11} /> {inst.user_count || 0} users</span>
                  </div>
                  {inst.phone && <p className="text-xs text-[#8A8F98] mt-0.5">{inst.phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(inst)} data-testid={`edit-institute-${inst.id}`}
                  className="text-[#8A8F98] hover:text-[#002EB8] transition-colors" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => openReset(inst)} data-testid={`reset-pw-${inst.id}`}
                  className="text-[#8A8F98] hover:text-[#FFB300] transition-colors" title="Reset Admin Password">
                  <KeyRound size={15} />
                </button>
                <button onClick={() => toggleActive(inst)} data-testid={`toggle-${inst.id}`}
                  className="text-[#8A8F98] hover:text-[#0A0A0A] transition-colors" title={inst.is_active ? "Deactivate" : "Activate"}>
                  {inst.is_active ? <ToggleRight size={22} className="text-[#00C853]" /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => handleDelete(inst)} data-testid={`delete-institute-${inst.id}`}
                  className="text-[#8A8F98] hover:text-[#FF2B2B] transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Institute Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Create New Institute</h3>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4" data-testid="create-institute-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Institute Name *</label>
                  <input required value={form.name} onChange={set("name")} placeholder="Sunrise Academy"
                    data-testid="inst-name-input"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Institute Code *</label>
                  <input required value={form.code} onChange={set("code")} placeholder="SUNRISE01" maxLength={12}
                    data-testid="inst-code-input"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#002EB8]" />
                  <p className="text-xs text-[#8A8F98] mt-0.5">Used for login. Uppercase, no spaces.</p>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Phone</label>
                  <input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div className="col-span-2 border-t border-[#E5E7EB] pt-3">
                  <p className="text-xs font-semibold text-[#0A0A0A] mb-3">Admin Account</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Admin Name *</label>
                      <input required value={form.admin_name} onChange={set("admin_name")} placeholder="John Doe"
                        data-testid="inst-admin-name"
                        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Admin Email *</label>
                      <input required type="email" value={form.admin_email} onChange={set("admin_email")} placeholder="admin@sunrise.com"
                        data-testid="inst-admin-email"
                        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Admin Password *</label>
                      <div className="relative">
                        <input required type={showPw ? "text" : "password"} value={form.admin_password} onChange={set("admin_password")}
                          placeholder="Min. 6 chars" minLength={6}
                          data-testid="inst-admin-pw"
                          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:border-[#002EB8]" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8F98]">
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-lg text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="create-institute-submit"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Creating..." : "Create Institute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reset Admin Password Modal */}
      {resetInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Reset Admin Password</h3>
                <p className="text-xs text-[#8A8F98] mt-0.5">{resetInst.name} · <span className="font-mono">{resetInst.code}</span></p>
              </div>
              <button onClick={() => setResetInst(null)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4" data-testid="reset-password-form">
              <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-lg px-4 py-3 text-xs text-[#8A6000]">
                This will update the password for the <strong>admin account</strong> of this institute. The admin will need to use the new password on next login.
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">New Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    autoComplete="new-password"
                    data-testid="new-password-input"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:border-[#002EB8]"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8F98] hover:text-[#0A0A0A]">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setResetInst(null)}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-lg text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={resetSaving} data-testid="reset-password-submit"
                  className="flex-1 bg-[#FFB300] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#FF8F00] disabled:bg-[#8A8F98]">
                  {resetSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Institute Modal */}
      {editInst && (        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Edit Institute</h3>
                <p className="text-xs text-[#8A8F98] mt-0.5">Code <span className="font-mono">{editInst.code}</span> cannot be changed</p>
              </div>
              <button onClick={() => setEditInst(null)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4" data-testid="edit-institute-form">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Institute Name *</label>
                <input required value={editForm.name} onChange={setEdit("name")} placeholder="Academy Name"
                  data-testid="edit-inst-name"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Phone</label>
                <input value={editForm.phone} onChange={setEdit("phone")} placeholder="+91 98765 43210"
                  data-testid="edit-inst-phone"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Address</label>
                <textarea value={editForm.address} onChange={setEdit("address")} rows={2}
                  placeholder="Street, city, state..."
                  data-testid="edit-inst-address"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8] resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditInst(null)}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-lg text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={editSaving} data-testid="save-institute-btn"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
