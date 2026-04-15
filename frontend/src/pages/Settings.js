import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CreditCard, Webhook, Eye, EyeOff, CheckCircle, Copy, ExternalLink, Info, Key, Database, Download, Upload, Trash2, AlertTriangle, X } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const [rzpConfig, setRzpConfig] = useState({ key_id: "", has_secret: false, configured: false, source: "" });
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const [webhookInfo, setWebhookInfo] = useState({ webhook_url: "", verify_token: "" });

  // Admin data management state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/settings/razorpay`, { withCredentials: true }),
      axios.get(`${API}/api/settings/whatsapp-webhook`, { withCredentials: true }),
    ]).then(([rzp, wh]) => {
      setRzpConfig(rzp.data);
      setKeyId(rzp.data.key_id || "");
      setWebhookInfo(wh.data);
    }).catch(() => toast.error("Failed to load settings"));
  }, []);

  const handleSaveRazorpay = async (e) => {
    e.preventDefault();
    if (!keyId || !keySecret) {
      toast.error("Both Key ID and Key Secret are required");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/settings/razorpay`, { key_id: keyId, key_secret: keySecret }, { withCredentials: true });
      toast.success(res.data.message);
      setRzpConfig((prev) => ({ ...prev, key_id: keyId, has_secret: true, configured: true, source: "database" }));
      setKeySecret("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/backup`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `edutech_backup_${ts}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Failed to download backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please upload a .xlsx file");
      return;
    }
    setRestoreLoading(true);
    setRestoreResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/api/admin/restore`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRestoreResult(res.data.restored);
      toast.success(res.data.message || "Restore completed!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Restore failed");
    } finally {
      setRestoreLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== "DELETE ALL") return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${API}/api/admin/data`, { withCredentials: true });
      const counts = res.data.deleted || {};
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      toast.success(`Deleted ${total} records across all collections`);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 font-satoshi max-w-3xl">
      <div className="mb-6">
        <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Settings</h1>
        <p className="text-sm text-[#8A8F98] mt-0.5">Configure payment gateways and integrations</p>
      </div>

      {/* Razorpay Settings */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA]">
          <div className="w-9 h-9 bg-[#002EB8]/10 rounded-md flex items-center justify-center">
            <CreditCard size={18} className="text-[#002EB8]" />
          </div>
          <div className="flex-1">
            <h2 className="font-cabinet font-bold text-base text-[#0A0A0A]">Razorpay Integration</h2>
            <p className="text-xs text-[#8A8F98]">Accept student fee payments via Razorpay</p>
          </div>
          {rzpConfig.configured ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#00C853] bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle size={12} /> Active
            </span>
          ) : (
            <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
              Not configured
            </span>
          )}
        </div>
        <form onSubmit={handleSaveRazorpay} className="p-6 space-y-4" data-testid="razorpay-settings-form">
          {rzpConfig.configured && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-800">
              <CheckCircle size={14} className="mt-0.5 shrink-0" />
              <span>Razorpay is configured ({rzpConfig.source}). Enter new keys below to update.</span>
            </div>
          )}
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">
              Key ID
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
              <input
                type="text"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="rzp_live_xxxxxxxxxxxx"
                data-testid="razorpay-key-id-input"
                className="w-full border border-[#E5E7EB] rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#002EB8] font-mono"
              />
            </div>
            <p className="text-xs text-[#8A8F98] mt-1">Found in Razorpay Dashboard → Settings → API Keys</p>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">
              Key Secret {rzpConfig.has_secret && <span className="text-[#00C853] normal-case font-sans">(already set)</span>}
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
              <input
                type={showSecret ? "text" : "password"}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={rzpConfig.has_secret ? "Enter new secret to update" : "rzp_secret_xxxx"}
                data-testid="razorpay-key-secret-input"
                className="w-full border border-[#E5E7EB] rounded-md pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#002EB8] font-mono"
              />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8F98] hover:text-[#0A0A0A]">
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              data-testid="save-razorpay-button"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98] font-medium transition-colors"
            >
              {saving ? "Saving..." : <><CheckCircle size={14} /> Save Razorpay Keys</>}
            </button>
            <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#8A8F98] hover:text-[#002EB8]">
              <ExternalLink size={13} /> Get Keys
            </a>
          </div>
        </form>
      </div>

      {/* WhatsApp Webhook Settings */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA]">
          <div className="w-9 h-9 bg-[#25D366]/10 rounded-md flex items-center justify-center">
            <Webhook size={18} className="text-[#25D366]" />
          </div>
          <div>
            <h2 className="font-cabinet font-bold text-base text-[#0A0A0A]">WhatsApp CRM Webhook</h2>
            <p className="text-xs text-[#8A8F98]">Auto-capture leads from WhatsApp messages</p>
          </div>
        </div>
        <div className="p-6 space-y-4" data-testid="whatsapp-webhook-section">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-[#002EB8] flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>Incoming WhatsApp messages are automatically converted into CRM leads in the Pipeline.</span>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookInfo.webhook_url}
                data-testid="webhook-url-input"
                className="flex-1 border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm bg-[#F8F9FA] font-mono text-[#0A0A0A]"
              />
              <button onClick={() => copyToClipboard(webhookInfo.webhook_url)}
                data-testid="copy-webhook-url"
                className="px-3 py-2.5 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:text-[#002EB8] hover:border-[#002EB8] transition-colors">
                <Copy size={15} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Verify Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookInfo.verify_token}
                data-testid="verify-token-input"
                className="flex-1 border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm bg-[#F8F9FA] font-mono text-[#0A0A0A]"
              />
              <button onClick={() => copyToClipboard(webhookInfo.verify_token)}
                className="px-3 py-2.5 border border-[#E5E7EB] rounded-md text-[#8A8F98] hover:text-[#002EB8] hover:border-[#002EB8] transition-colors">
                <Copy size={15} />
              </button>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-4 text-xs space-y-2 text-[#8A8F98]">
            <p className="font-medium text-[#0A0A0A] text-sm mb-2">Setup Instructions</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li><strong>Meta WhatsApp Business API:</strong> Go to Meta Developer Console → WhatsApp → Configuration → Webhook. Paste the URL and Verify Token above.</li>
              <li><strong>Twilio WhatsApp:</strong> In Twilio Console → Messaging → WhatsApp Sandbox → "When a message comes in", set the webhook URL above (HTTP POST).</li>
              <li>All incoming messages will automatically create new CRM leads in the Pipeline with source "whatsapp".</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Admin Data Management */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mt-5">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA]">
          <div className="w-9 h-9 bg-[#0A0A0A]/10 rounded-md flex items-center justify-center">
            <Database size={18} className="text-[#0A0A0A]" />
          </div>
          <div>
            <h2 className="font-cabinet font-bold text-base text-[#0A0A0A]">Data Management</h2>
            <p className="text-xs text-[#8A8F98]">Backup, restore, or permanently delete all institutional data</p>
          </div>
        </div>
        <div className="p-6 space-y-6" data-testid="data-management-section">
          {/* Backup */}
          <div className="flex items-start justify-between gap-4 p-4 border border-[#E5E7EB] rounded-lg">
            <div>
              <p className="font-medium text-sm text-[#0A0A0A] mb-0.5">Download Backup</p>
              <p className="text-xs text-[#8A8F98]">Export all enquiries, students, invoices, and attendance to an Excel (.xlsx) file</p>
            </div>
            <button onClick={handleDownloadBackup} disabled={backupLoading}
              data-testid="download-backup-button"
              className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98] font-medium transition-colors shrink-0">
              <Download size={14} /> {backupLoading ? "Downloading..." : "Backup .xlsx"}
            </button>
          </div>

          {/* Restore */}
          <div className="p-4 border border-[#E5E7EB] rounded-lg">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="font-medium text-sm text-[#0A0A0A] mb-0.5">Restore from Backup</p>
                <p className="text-xs text-[#8A8F98]">Upload a previously downloaded .xlsx backup to re-import records (skips duplicates by email)</p>
              </div>
              <label className={`flex items-center gap-2 px-4 py-2 border border-[#002EB8] text-[#002EB8] text-sm rounded-md hover:bg-blue-50 font-medium transition-colors cursor-pointer shrink-0 ${restoreLoading ? "opacity-50 pointer-events-none" : ""}`}
                data-testid="restore-backup-label">
                <Upload size={14} /> {restoreLoading ? "Restoring..." : "Upload .xlsx"}
                <input type="file" accept=".xlsx" className="hidden" onChange={handleRestoreFile} disabled={restoreLoading} data-testid="restore-backup-input" />
              </label>
            </div>
            {restoreResult && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-xs" data-testid="restore-result">
                <p className="font-medium text-green-800 mb-1">Restore Summary</p>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(restoreResult).map(([k, v]) => (
                    <span key={k} className="text-green-700 capitalize">{k}: <strong>{v}</strong> inserted</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delete All */}
          <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm text-[#FF2B2B] mb-0.5">Delete All Data</p>
                <p className="text-xs text-red-600">
                  Permanently deletes all enquiries, students, invoices, payments, fee queries, and attendance records.
                  <strong> User accounts are NOT deleted.</strong> This cannot be undone.
                </p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                data-testid="delete-all-button"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF2B2B] text-white text-sm rounded-md hover:bg-red-700 font-medium transition-colors shrink-0">
                <Trash2 size={14} /> Delete All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-[#FF2B2B]" />
                <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Confirm Data Deletion</h3>
              </div>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="text-[#8A8F98] hover:text-[#0A0A0A]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                <p className="font-medium mb-1">This action is irreversible!</p>
                <p className="text-xs">We strongly recommend downloading a backup before proceeding.</p>
              </div>
              <div>
                <p className="text-sm text-[#0A0A0A] mb-2">
                  Type <strong className="font-mono text-[#FF2B2B]">DELETE ALL</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ALL"
                  data-testid="delete-confirm-input"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FF2B2B]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                  className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">
                  Cancel
                </button>
                <button onClick={handleDeleteAll} disabled={deleteConfirmText !== "DELETE ALL" || deleting}
                  data-testid="confirm-delete-all-button"
                  className="flex-1 bg-[#FF2B2B] text-white py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-[#8A8F98] transition-colors">
                  {deleting ? "Deleting..." : "Delete All Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
