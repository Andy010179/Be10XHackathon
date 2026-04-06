import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, X, Phone, Mail, GripVertical, Trash2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STAGES = [
  { key: "new", label: "New", color: "bg-[#002EB8]", light: "bg-blue-50 border-blue-200" },
  { key: "followup", label: "Follow-up", color: "bg-[#FFD600]", light: "bg-yellow-50 border-yellow-200" },
  { key: "missed", label: "Missed", color: "bg-orange-500", light: "bg-orange-50 border-orange-200" },
  { key: "declined", label: "Declined", color: "bg-[#FF2B2B]", light: "bg-red-50 border-red-200" },
  { key: "converted", label: "Converted", color: "bg-[#00C853]", light: "bg-green-50 border-green-200" },
];

const SOURCE_LABELS = {
  manual: "Walk-in",
  website: "Website",
  whatsapp: "WhatsApp",
  google_forms: "Google Form",
  promotion: "Promotion",
};

function EnquiryCard({ enquiry, onDragStart, onDelete, onStageChange }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, enquiry.id)}
      className="bg-white border border-[#E5E7EB] rounded-md p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow group"
      data-testid={`enquiry-card-${enquiry.id}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="font-medium text-sm text-[#0A0A0A] leading-tight">{enquiry.student_name}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(enquiry.id)}
            className="text-[#8A8F98] hover:text-[#FF2B2B] p-0.5 transition-colors"
          >
            <Trash2 size={12} />
          </button>
          <GripVertical size={12} className="text-[#8A8F98]" />
        </div>
      </div>
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-[#8A8F98]">
          <Phone size={10} />
          <span>{enquiry.phone}</span>
        </div>
        {enquiry.email && (
          <div className="flex items-center gap-1.5 text-xs text-[#8A8F98]">
            <Mail size={10} />
            <span className="truncate">{enquiry.email}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs bg-[#F8F9FA] text-[#8A8F98] px-2 py-0.5 rounded font-mono">
          {SOURCE_LABELS[enquiry.source] || enquiry.source}
        </span>
      </div>
      {enquiry.notes && (
        <p className="text-xs text-[#8A8F98] mt-2 italic truncate">{enquiry.notes}</p>
      )}
    </div>
  );
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    student_name: "", email: "", phone: "", source: "manual", stage: "new", notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEnquiries(); }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await axios.get(`${API}/api/enquiries`, { withCredentials: true });
      setEnquiries(res.data);
    } catch { toast.error("Failed to load enquiries"); }
    finally { setLoading(false); }
  };

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDrop = async (e, stage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggingId) return;
    const prev = [...enquiries];
    setEnquiries((enqs) => enqs.map((eq) => eq.id === draggingId ? { ...eq, stage } : eq));
    try {
      await axios.patch(`${API}/api/enquiries/${draggingId}/stage`, { stage }, { withCredentials: true });
      toast.success("Stage updated");
    } catch {
      setEnquiries(prev);
      toast.error("Failed to update stage");
    }
    setDraggingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this enquiry?")) return;
    setEnquiries((enqs) => enqs.filter((e) => e.id !== id));
    try {
      await axios.delete(`${API}/api/enquiries/${id}`, { withCredentials: true });
      toast.success("Enquiry deleted");
    } catch {
      fetchEnquiries();
      toast.error("Failed to delete");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/enquiries`, form, { withCredentials: true });
      setEnquiries((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ student_name: "", email: "", phone: "", source: "manual", stage: "new", notes: "" });
      toast.success("Enquiry added!");
    } catch {
      toast.error("Failed to add enquiry");
    } finally {
      setSaving(false);
    }
  };

  const getStageEnquiries = (stage) => enquiries.filter((e) => e.stage === stage);

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">CRM Pipeline</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">{enquiries.length} total enquiries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="add-enquiry-button"
          className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] hover:bg-[#001A85] text-white text-sm rounded-md transition-colors font-medium"
        >
          <Plus size={16} />
          Add Enquiry
        </button>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-cabinet font-bold text-lg tracking-tight">New Enquiry</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} data-testid="enquiry-form" className="p-6 space-y-4">
              {[
                { label: "Student Name", key: "student_name", type: "text", required: true },
                { label: "Email", key: "email", type: "email" },
                { label: "Phone", key: "phone", type: "tel", required: true },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    data-testid={`enquiry-${field.key}-input`}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] transition-colors"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]"
                  >
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA] transition-colors">Cancel</button>
                <button type="submit" disabled={saving} data-testid="enquiry-submit-button" className="flex-1 bg-[#002EB8] hover:bg-[#001A85] text-white py-2 rounded-md text-sm font-medium transition-colors disabled:bg-[#8A8F98]">
                  {saving ? "Saving..." : "Add Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div key={s.key} className="flex-shrink-0 w-64 h-64 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6" data-testid="kanban-board">
          {STAGES.map((stage) => {
            const cards = getStageEnquiries(stage.key);
            const isOver = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`flex-shrink-0 w-64 rounded-lg border-2 transition-colors ${isOver ? "border-[#002EB8] bg-blue-50/50" : "border-[#E5E7EB] bg-[#F8F9FA]"}`}
                data-testid={`kanban-column-${stage.key}`}
              >
                <div className="p-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="font-cabinet font-bold text-sm text-[#0A0A0A]">{stage.label}</span>
                    <span className="ml-auto bg-white border border-[#E5E7EB] text-[#8A8F98] text-xs rounded-full w-6 h-6 flex items-center justify-center font-mono">
                      {cards.length}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {cards.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onDragStart={handleDragStart}
                      onDelete={handleDelete}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-[#8A8F98] italic">
                      Drop cards here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
