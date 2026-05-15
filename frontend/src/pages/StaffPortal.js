import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { IdCard, Upload, Download, User, Building2, Phone, Hash, Camera, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const ROLE_COLORS = {
  admin: "#002EB8", teacher: "#00C853",
  staff_member: "#FF8F00", employer: "#7C3AED",
};
const ROLE_LABELS = {
  admin: "Admin", teacher: "Teacher",
  staff_member: "Staff Member", employer: "Employer",
};

export default function StaffPortal() {
  const { user } = useAuth();
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [editPhone, setEditPhone]   = useState(false);
  const [phone, setPhone]           = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const fileRef                     = useRef(null);

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/staff/me`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProfile(data);
      setPhone(data.phone || "");
    } catch { toast.error("Failed to load staff profile"); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG or WEBP allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/staff/photo`, { method: "POST", credentials: "include", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Upload failed"); }
      toast.success("Photo uploaded! It will appear on your ID card.");
      fetchProfile();
    } catch (err) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDownloadIdCard = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/api/staff/id-card`, { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Staff_ID_${profile?.name?.replace(/\s/g, "_") || "Card"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ID Card downloaded!");
    } catch (err) { toast.error(err.message || "Failed to download ID card"); }
    finally { setDownloading(false); }
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      const res = await fetch(`${API}/api/staff/phone`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditPhone(false);
      fetchProfile();
      toast.success("Phone updated");
    } catch { toast.error("Failed to update phone"); }
    finally { setSavingPhone(false); }
  };

  if (loading) return <div className="p-8 text-center text-[#8A8F98]">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-[#FF2B2B]">Failed to load profile</div>;

  const roleColor = ROLE_COLORS[profile.role] || "#002EB8";
  const roleLabel = ROLE_LABELS[profile.role] || profile.role;

  return (
    <div className="p-6 lg:p-8 font-satoshi max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Staff Portal</h1>
        <p className="text-sm text-[#8A8F98] mt-0.5">Manage your profile and download your ID card</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm mb-5">
        {/* Colored top bar */}
        <div className="h-2" style={{ background: roleColor }} />
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F0F4FF] border-2"
                style={{ borderColor: roleColor }}>
                {profile.has_photo ? (
                  <div className="w-full h-full bg-[#F0F4FF] flex items-center justify-center text-[#002EB8]">
                    <CheckCircle size={28} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-[#8A8F98]" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="upload-photo-btn"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm hover:bg-[#F8F9FA] transition-colors"
                title="Upload photo">
                <Camera size={12} className="text-[#0A0A0A]" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload} className="hidden" data-testid="photo-file-input" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-cabinet font-bold text-xl text-[#0A0A0A]">{profile.name}</h2>
                  <p className="text-sm text-[#8A8F98]">{profile.email}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white shrink-0"
                  style={{ background: roleColor }}>{roleLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-0.5">Staff Number</p>
                  <div className="flex items-center gap-1.5">
                    <Hash size={13} className="text-[#8A8F98]" />
                    <span className="text-sm font-mono font-bold text-[#0A0A0A]" data-testid="staff-number">{profile.staff_number || "—"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-0.5">Institute</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#8A8F98]" />
                    <span className="text-sm text-[#0A0A0A]">{profile.institute_name || "—"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-0.5">Branch</p>
                  <span className="text-sm text-[#0A0A0A]">{profile.branch_name || "All Branches"}</span>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-0.5">Mobile</p>
                  {editPhone ? (
                    <div className="flex items-center gap-1.5">
                      <input value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="border border-[#E5E7EB] rounded px-2 py-0.5 text-sm w-36 focus:outline-none focus:border-[#002EB8]"
                        data-testid="phone-input" />
                      <button onClick={handleSavePhone} disabled={savingPhone}
                        className="text-xs text-[#002EB8] font-medium hover:underline disabled:opacity-50">
                        {savingPhone ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditPhone(false)} className="text-xs text-[#8A8F98] hover:text-[#0A0A0A]">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-[#8A8F98]" />
                      <span className="text-sm text-[#0A0A0A]">{profile.phone || "—"}</span>
                      <button onClick={() => setEditPhone(true)} data-testid="edit-phone-btn"
                        className="text-xs text-[#002EB8] hover:underline">Edit</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Photo upload card */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={16} className="text-[#8A8F98]" />
            <h3 className="font-semibold text-sm text-[#0A0A0A]">Upload Photo</h3>
          </div>
          <p className="text-xs text-[#8A8F98] mb-3">
            Your photo will be printed on your ID card. Accepted: JPEG, PNG, WEBP (max 2MB).
          </p>
          {profile.has_photo && (
            <p className="text-xs text-[#00C853] flex items-center gap-1 mb-2">
              <CheckCircle size={11} /> Photo uploaded
            </p>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            data-testid="upload-photo-card-btn"
            className="w-full py-2 border border-dashed border-[#E5E7EB] rounded-lg text-sm text-[#8A8F98] hover:border-[#002EB8] hover:text-[#002EB8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <Upload size={14} /> {uploading ? "Uploading..." : "Choose Photo"}
          </button>
        </div>

        {/* ID card download */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <IdCard size={16} className="text-[#8A8F98]" />
            <h3 className="font-semibold text-sm text-[#0A0A0A]">Staff ID Card</h3>
          </div>
          <p className="text-xs text-[#8A8F98] mb-3">
            Download your official ID card with your photo, staff number, and institute details as a PDF.
          </p>
          <button onClick={handleDownloadIdCard} disabled={downloading}
            data-testid="download-id-card-btn"
            className="w-full py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: roleColor }}>
            <Download size={14} /> {downloading ? "Generating..." : "Download ID Card"}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 bg-[#F0F4FF] border border-[#C7D2FE] rounded-xl p-4 text-xs text-[#002EB8]">
        <strong>Tips:</strong> Upload a clear, front-facing photo before downloading the ID card for best results. Your personal mobile number will appear on the card alongside the institute's contact.
      </div>
    </div>
  );
}
