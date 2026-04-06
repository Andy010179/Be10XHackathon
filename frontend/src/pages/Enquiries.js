import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, X, Phone, Mail, GripVertical, Trash2, Pencil, MapPin, Upload, Download } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STAGES = [
  { key: "new", label: "New", color: "bg-[#002EB8]", light: "bg-blue-50 border-blue-200" },
  { key: "followup", label: "Follow-up", color: "bg-[#FFD600]", light: "bg-yellow-50 border-yellow-200" },
  { key: "missed", label: "Missed", color: "bg-orange-500", light: "bg-orange-50 border-orange-200" },
  { key: "declined", label: "Declined", color: "bg-[#FF2B2B]", light: "bg-red-50 border-red-200" },
  { key: "converted", label: "Converted", color: "bg-[#00C853]", light: "bg-green-50 border-green-200" },
];

const SOURCE_LABELS = {
  manual: "Walk-in", website: "Website", whatsapp: "WhatsApp",
  google_forms: "Google Form", promotion: "Promotion",
};

const emptyForm = { student_name: "", email: "", phone: "", city: "", source: "manual", stage: "new", notes: "" };

const VALID_SOURCES = Object.keys(SOURCE_LABELS);
const VALID_STAGES = ["new", "followup", "missed", "declined", "converted"];

function parseEnquiryCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const col = (alts) => headers.findIndex((h) => alts.some((a) => h.includes(a)));
  const nameIdx   = col(["name"]);
  const emailIdx  = col(["email", "mail"]);
  const phoneIdx  = col(["phone", "mobile", "contact"]);
  const cityIdx   = col(["city", "location", "place"]);
  const sourceIdx = col(["source", "channel"]);
  const stageIdx  = col(["stage", "status"]);
  const notesIdx  = col(["notes", "remark", "comment"]);
  if (nameIdx === -1) return null;
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const source = VALID_SOURCES.includes(cols[sourceIdx]) ? cols[sourceIdx] : "manual";
    const stage  = VALID_STAGES.includes(cols[stageIdx])   ? cols[stageIdx]  : "new";
    return {
      student_name: cols[nameIdx]  || "",
      email:        cols[emailIdx] || "",
      phone:        cols[phoneIdx] || "",
      city:         cols[cityIdx]  || "",
      source,
      stage,
      notes: cols[notesIdx] || "",
    };
  }).filter((r) => r.student_name);
}

function EnquiryCard({ enquiry, onDragStart, onDelete, onEdit }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, enquiry.id)}
      className="bg-white border border-[#E5E7EB] rounded-md p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow group"
      data-testid={`enquiry-card-${enquiry.id}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="font-medium text-sm text-[#0A0A0A] leading-tight">{enquiry.student_name}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(enquiry)} data-testid={`edit-enquiry-${enquiry.id}`}
            className="text-[#8A8F98] hover:text-[#002EB8] p-0.5 transition-colors">
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete(enquiry.id)}
            className="text-[#8A8F98] hover:text-[#FF2B2B] p-0.5 transition-colors">
            <Trash2 size={11} />
          </button>
          <GripVertical size={12} className="text-[#8A8F98]" />
        </div>
      </div>
      <div className="space-y-1 mb-2">
        {enquiry.phone && (
          <div className="flex items-center gap-1.5 text-xs text-[#8A8F98]">
            <Phone size={10} /><span>{enquiry.phone}</span>
          </div>
        )}
        {enquiry.email && (
          <div className="flex items-center gap-1.5 text-xs text-[#8A8F98]">
            <Mail size={10} /><span className="truncate">{enquiry.email}</span>
          </div>
        )}
        {enquiry.city && (
          <div className="flex items-center gap-1.5 text-xs text-[#8A8F98]">
            <MapPin size={10} /><span>{enquiry.city}</span>
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

// FormFields is defined OUTSIDE the component to prevent re-mount on every keystroke
function FormFields({ f, setF, testPrefix = "" }) {
  return (
    <>
      {[
        { label: "Student Name", key: "student_name", type: "text", required: true },
        { label: "Email", key: "email", type: "email" },
        { label: "Phone", key: "phone", type: "tel", required: true },
      ].map((field) => (
        <div key={field.key}>
          <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">{field.label}</label>
          <input type={field.type} value={f[field.key]} onChange={(e) => setF({ ...f, [field.key]: e.target.value })}
            required={field.required} data-testid={`${testPrefix}enquiry-${field.key}-input`}
            className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
        </div>
      ))}
      <div>
        <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">City / Location</label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
          <input type="text" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}
            placeholder="e.g. Mumbai, Pune, Nagpur" data-testid={`${testPrefix}enquiry-city-input`}
            className="w-full border border-[#E5E7EB] rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Source</label>
          <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}
            className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Stage</label>
          <select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}
            className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-1.5">Notes</label>
        <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2}
          className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8] resize-none" />
      </div>
    </>
  );
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Edit
  const [editEnquiry, setEditEnquiry] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // CSV import
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults, setCsvResults] = useState(null);
  const csvInputRef = useRef(null);

  const downloadSampleCSV = () => {
    const csv = [
      "name,email,phone,city,source,stage,notes",
      "Rahul Sharma,rahul@example.com,9876543210,Mumbai,website,new,Interested in Python course",
      "Priya Verma,priya@example.com,9876500001,Pune,manual,followup,Called twice no answer",
      "Arun Mehta,arun@example.com,9000000001,Nashik,promotion,new,Scholarship inquiry",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "enquiry_import_sample.csv";
    a.click();
  };

  const handleCSVFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvResults(null);
    const text = await file.text();
    const rows = parseEnquiryCSV(text);
    if (rows === null) {
      toast.error("CSV must have at least a 'name' column");
      setCsvImporting(false);
      return;
    }
    if (rows.length === 0) {
      toast.error("No valid rows found in CSV");
      setCsvImporting(false);
      return;
    }
    const results = [];
    for (const row of rows) {
      try {
        const res = await axios.post(`${API}/api/enquiries`, row, { withCredentials: true });
        setEnquiries((prev) => [res.data, ...prev]);
        results.push({ name: row.student_name, stage: row.stage, status: "ok" });
      } catch (err) {
        results.push({ name: row.student_name, stage: row.stage, status: "error", reason: err.response?.data?.detail || "Failed" });
      }
    }
    setCsvResults(results);
    const ok = results.filter((r) => r.status === "ok").length;
    toast.success(`Imported ${ok} of ${rows.length} enquiries`);
    setCsvImporting(false);
    e.target.value = "";
  };

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
      const res = await axios.patch(`${API}/api/enquiries/${draggingId}/stage`, { stage }, { withCredentials: true });
      if (stage === "converted") {
        if (res.data.student_created) {
          toast.success("Enquiry converted! Student record created in Students module.");
        } else {
          toast.success("Enquiry converted. Student record already exists.");
        }
      } else {
        toast.success("Stage updated");
      }
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
      setForm(emptyForm);
      toast.success("Enquiry added!");
    } catch {
      toast.error("Failed to add enquiry");
    } finally { setSaving(false); }
  };

  const openEdit = (enq) => {
    setEditEnquiry(enq);
    setEditForm({
      student_name: enq.student_name || "",
      email: enq.email || "",
      phone: enq.phone || "",
      city: enq.city || "",
      source: enq.source || "manual",
      stage: enq.stage || "new",
      notes: enq.notes || "",
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await axios.put(`${API}/api/enquiries/${editEnquiry.id}`, editForm, { withCredentials: true });
      setEnquiries((prev) => prev.map((eq) => eq.id === editEnquiry.id ? res.data : eq));
      setEditEnquiry(null);
      if (editForm.stage === "converted") {
        if (res.data.student_created) {
          toast.success("Enquiry updated! Student record created in Students module.");
        } else {
          toast.success("Enquiry updated. Student record already exists.");
        }
      } else {
        toast.success("Enquiry updated!");
      }
    } catch {
      toast.error("Failed to update enquiry");
    } finally { setEditSaving(false); }
  };

  const getStageEnquiries = (stage) => enquiries.filter((e) => e.stage === stage);

  // removed inline FormFields — defined at module level above to prevent focus loss

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">CRM Pipeline</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">{enquiries.length} total enquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadSampleCSV} title="Download CSV template"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] text-[#8A8F98] text-sm rounded-md hover:border-[#002EB8] hover:text-[#002EB8] transition-colors">
            <Download size={14} /> Template
          </button>
          <button onClick={() => csvInputRef.current?.click()} disabled={csvImporting}
            data-testid="import-enquiries-csv-button"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] text-[#8A8F98] text-sm rounded-md hover:border-[#002EB8] hover:text-[#002EB8] transition-colors disabled:opacity-50">
            <Upload size={14} /> {csvImporting ? "Importing..." : "Import CSV"}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
          <button onClick={() => setShowForm(true)} data-testid="add-enquiry-button"
            className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] hover:bg-[#001A85] text-white text-sm rounded-md transition-colors font-medium">
            <Plus size={16} /> Add Enquiry
          </button>
        </div>
      </div>

      {/* CSV Import Results */}
      {csvResults && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4" data-testid="csv-import-results">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm text-[#0A0A0A]">
              Import Results — {csvResults.filter((r) => r.status === "ok").length}/{csvResults.length} successful
            </p>
            <button onClick={() => setCsvResults(null)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {csvResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${
                r.status === "ok"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-[#FF2B2B] border-red-200"
              }`}>
                <span className="font-medium shrink-0">{r.status === "ok" ? "✓" : "✗"}</span>
                <span className="font-medium truncate">{r.name}</span>
                {r.status === "ok" && <span className="text-[#8A8F98] ml-auto shrink-0 capitalize">{r.stage}</span>}
                {r.status === "error" && <span className="ml-auto shrink-0">{r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Enquiry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
              <h2 className="font-cabinet font-bold text-lg tracking-tight">New Enquiry</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} data-testid="enquiry-form" className="p-6 space-y-4">
              <FormFields f={form} setF={setForm} testPrefix="" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={saving} data-testid="enquiry-submit-button"
                  className="flex-1 bg-[#002EB8] hover:bg-[#001A85] text-white py-2 rounded-md text-sm font-medium disabled:bg-[#8A8F98]">
                  {saving ? "Saving..." : "Add Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Enquiry Modal */}
      {editEnquiry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-[#002EB8]" />
                <h2 className="font-cabinet font-bold text-lg tracking-tight">Edit Enquiry</h2>
              </div>
              <button onClick={() => setEditEnquiry(null)} className="text-[#8A8F98] hover:text-[#0A0A0A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSave} data-testid="edit-enquiry-form" className="p-6 space-y-4">
              <FormFields f={editForm} setF={setEditForm} testPrefix="edit-" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditEnquiry(null)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm hover:bg-[#F8F9FA]">Cancel</button>
                <button type="submit" disabled={editSaving} data-testid="edit-enquiry-submit"
                  className="flex-1 bg-[#002EB8] hover:bg-[#001A85] text-white py-2 rounded-md text-sm font-medium disabled:bg-[#8A8F98]">
                  {editSaving ? "Saving..." : "Save Changes"}
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
              <div key={stage.key} onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={() => setDragOverStage(null)} onDrop={(e) => handleDrop(e, stage.key)}
                className={`flex-shrink-0 w-64 rounded-lg border-2 transition-colors ${isOver ? "border-[#002EB8] bg-blue-50/50" : "border-[#E5E7EB] bg-[#F8F9FA]"}`}
                data-testid={`kanban-column-${stage.key}`}>
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
                    <EnquiryCard key={enquiry.id} enquiry={enquiry}
                      onDragStart={handleDragStart} onDelete={handleDelete} onEdit={openEdit} />
                  ))}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-[#8A8F98] italic">Drop cards here</div>
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
