import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { IdCard, Upload, Download, User, Building2, Phone, Hash, Camera, CheckCircle, X, Clock, LogIn, LogOut, QrCode } from "lucide-react";
import jsQR from "jsqr";

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
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const fileRef                     = useRef(null);
  const videoRef                    = useRef(null);
  const canvasRef                   = useRef(null);
  const streamRef                   = useRef(null);
  const animRef                     = useRef(null);

  useEffect(() => { fetchProfile(); fetchAttendance(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API}/api/staff-attendance/me`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setAttendanceStatus(data.current_status);
      setAttendanceLogs(data.records || []);
    } catch { /* silent */ }
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

  // Camera / QR attendance helpers
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraActive(true);
      scanFrame();
    } catch (e) { setCameraError("Camera access denied or unavailable: " + e.message); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const scanFrame = useCallback(() => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4 || video.videoWidth === 0) {
        animRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        stopCamera();
        submitAttendanceScan(code.data);
        return;
      }
    } catch { /* continue scanning */ }
    animRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAttendanceScan = async (qrData) => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`${API}/api/staff-attendance/scan`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: qrData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Scan failed");
      setScanResult({ success: true, message: data.message, action: data.action });
      toast.success(data.message);
      fetchAttendance();
    } catch (err) { setScanResult({ success: false, message: err.message }); toast.error(err.message); }
    finally { setScanning(false); }
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

      {/* QR Attendance Section */}
      <div className="mt-5">
        <h2 className="font-cabinet font-bold text-lg tracking-tight text-[#0A0A0A] mb-3 flex items-center gap-2">
          <QrCode size={18} className="text-[#002EB8]" /> Attendance Check-In
        </h2>

        {/* Current status */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-4 ${attendanceStatus === "checkin" ? "bg-green-50 border-green-200" : "bg-[#F8F9FA] border-[#E5E7EB]"}`}>
          <div className={`w-3 h-3 rounded-full ${attendanceStatus === "checkin" ? "bg-[#00C853] animate-pulse" : "bg-[#8A8F98]"}`} />
          <div>
            <p className="text-sm font-semibold text-[#0A0A0A]">
              {attendanceStatus === "checkin" ? "Currently Checked In" : "Not Checked In Today"}
            </p>
            <p className="text-xs text-[#8A8F98]">
              {attendanceStatus === "checkin" ? "Scan QR to check out" : "Scan the institute QR code to check in"}
            </p>
          </div>
        </div>

        {/* Camera scanner */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4">
          {!cameraActive ? (
            <button onClick={startCamera} disabled={scanning} data-testid="staff-start-camera-btn"
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#002EB8]/40 text-[#002EB8] rounded-lg text-sm font-medium hover:bg-[#002EB8]/5 transition-colors disabled:opacity-50">
              <Camera size={16} /> {attendanceStatus === "checkin" ? "Scan to Check Out" : "Scan to Check In"}
            </button>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-[#002EB8]">
              <video ref={videoRef} muted playsInline className="w-full max-h-56 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-white rounded-lg opacity-70" />
              </div>
              <button onClick={stopCamera} data-testid="staff-stop-camera-btn"
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
                <X size={14} />
              </button>
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white bg-black/40 py-1">
                Point at the institute QR code
              </p>
            </div>
          )}
          {cameraError && <p className="text-xs text-[#FF2B2B] mt-2">{cameraError}</p>}
          {scanResult && (
            <div className={`mt-3 p-3 rounded-lg border flex items-center gap-2 ${scanResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
              data-testid="staff-scan-result">
              {scanResult.success ? <CheckCircle size={16} className="text-[#00C853] shrink-0" /> : <X size={16} className="text-[#FF2B2B] shrink-0" />}
              <p className="text-sm font-medium">{scanResult.message}</p>
            </div>
          )}
        </div>

        {/* Recent logs */}
        {attendanceLogs.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB]">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8A8F98]">Recent Attendance (7 days)</p>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {attendanceLogs.slice(0, 10).map((log, i) => (
                <div key={log.id || i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {log.action === "checkin"
                      ? <LogIn size={14} className="text-[#00C853]" />
                      : <LogOut size={14} className="text-[#FF2B2B]" />}
                    <span className="text-sm text-[#0A0A0A] capitalize">{log.action === "checkin" ? "Check In" : "Check Out"}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#8A8F98] font-mono">{log.date}</p>
                    {log.duration_mins > 0 && (
                      <p className="text-xs text-[#002EB8] flex items-center gap-1 justify-end">
                        <Clock size={10} /> {Math.floor(log.duration_mins / 60)}h {log.duration_mins % 60}m
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

