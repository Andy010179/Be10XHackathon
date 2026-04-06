import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CreditCard, Webhook, Eye, EyeOff, CheckCircle, Copy, ExternalLink, Info, Key } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const [rzpConfig, setRzpConfig] = useState({ key_id: "", has_secret: false, configured: false, source: "" });
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const [webhookInfo, setWebhookInfo] = useState({ webhook_url: "", verify_token: "" });

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
    </div>
  );
}
