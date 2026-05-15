import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { Plus, X, Download, Trash2, BookOpen, Video, Link2, Search, Upload, ExternalLink } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TYPES = [
  { key: "book",  label: "Books",   icon: BookOpen,  color: "#002EB8" },
  { key: "video", label: "Videos",  icon: Video,     color: "#FF2B2B" },
  { key: "url",   label: "Links",   icon: Link2,     color: "#00C853" },
];

const TYPE_ICONS = { book: BookOpen, video: Video, url: Link2 };
const TYPE_COLORS = { book: "#002EB8", video: "#FF2B2B", url: "#00C853" };

export default function Library() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("book");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "book", category: "General", description: "", url: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const canAdd = ["admin", "teacher"].includes(user?.role);

  useEffect(() => { fetchItems(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/library?type=${activeTab}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      setItems(await res.json());
    } catch { toast.error("Failed to load library"); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (activeTab === "book" && !file) { toast.error("Please select a PDF file"); return; }
    if ((activeTab === "video" || activeTab === "url") && !form.url.trim()) { toast.error("Please enter a URL"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("type", activeTab);
      fd.append("category", form.category);
      fd.append("description", form.description);
      fd.append("url", form.url);
      if (file) fd.append("file", file);
      const res = await fetch(`${API}/api/library`, { method: "POST", credentials: "include", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      toast.success("Item added to library!");
      setShowForm(false);
      setForm({ title: "", type: "book", category: "General", description: "", url: "" });
      setFile(null);
      fetchItems();
    } catch (err) { toast.error(err.message || "Failed to add item"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await fetch(`${API}/api/library/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Item deleted");
      fetchItems();
    } catch { toast.error("Failed to delete"); }
  };

  const handleDownload = async (item) => {
    try {
      const res = await fetch(`${API}/api/library/${item.id}/download`, { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Download failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${item.title}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err.message || "Download failed"); }
  };

  const filtered = items.filter((it) =>
    !search || it.title?.toLowerCase().includes(search.toLowerCase()) ||
    it.category?.toLowerCase().includes(search.toLowerCase())
  );

  const ActiveIcon = TYPE_ICONS[activeTab];
  const activeColor = TYPE_COLORS[activeTab];

  return (
    <div className="p-6 lg:p-8 font-satoshi">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cabinet font-black text-3xl tracking-tighter text-[#0A0A0A]">Library</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">Books, videos, and learning resources</p>
        </div>
        {canAdd && (
          <button onClick={() => setShowForm(true)} data-testid="add-library-item-btn"
            className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] hover:bg-[#001A85] text-white text-sm rounded-md font-medium transition-colors">
            <Plus size={15} /> Add Resource
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#F8F9FA] p-1 rounded-lg w-fit border border-[#E5E7EB]">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} data-testid={`library-tab-${t.key}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === t.key ? "bg-white text-[#0A0A0A] shadow-sm border border-[#E5E7EB]" : "text-[#8A8F98] hover:text-[#0A0A0A]"}`}>
              <Icon size={14} style={{ color: activeTab === t.key ? t.color : undefined }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or category..."
          data-testid="library-search"
          className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#002EB8] bg-white" />
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8A8F98]">
          <ActiveIcon size={32} className="mx-auto mb-3 opacity-30" style={{ color: activeColor }} />
          <p className="text-sm">No {activeTab === "book" ? "books" : activeTab === "video" ? "videos" : "links"} yet.</p>
          {canAdd && <p className="text-xs mt-1">Click "Add Resource" to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="library-grid">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.type] || BookOpen;
            const color = TYPE_COLORS[item.type] || "#002EB8";
            return (
              <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:shadow-sm transition-shadow group"
                data-testid={`library-item-${item.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={17} style={{ color }} />
                  </div>
                  {canAdd && (
                    <button onClick={() => handleDelete(item.id)} data-testid={`delete-library-${item.id}`}
                      className="opacity-0 group-hover:opacity-100 text-[#8A8F98] hover:text-[#FF2B2B] transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h4 className="font-semibold text-sm text-[#0A0A0A] mb-1 line-clamp-2">{item.title}</h4>
                {item.category && (
                  <span className="inline-block text-xs bg-[#F8F9FA] text-[#8A8F98] px-2 py-0.5 rounded-full mb-2">{item.category}</span>
                )}
                {item.description && <p className="text-xs text-[#8A8F98] mb-3 line-clamp-2">{item.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F0F0F0]">
                  <span className="text-xs text-[#8A8F98]">By {item.created_by || "—"}</span>
                  {item.has_file && (
                    <button onClick={() => handleDownload(item)} data-testid={`download-library-${item.id}`}
                      className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline font-medium">
                      <Download size={11} /> Download
                    </button>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" data-testid={`open-library-${item.id}`}
                      className="flex items-center gap-1 text-xs text-[#002EB8] hover:underline font-medium">
                      <ExternalLink size={11} /> Open
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white">
              <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Add Library Resource</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#8A8F98]" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Resource Type</label>
                <div className="flex gap-2">
                  {TYPES.map((t) => (
                    <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                      className={`flex-1 py-2 border rounded-md text-xs font-medium transition-colors ${activeTab === t.key ? "border-[#002EB8] text-[#002EB8] bg-[#002EB8]/5" : "border-[#E5E7EB] text-[#8A8F98]"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Physics NCERT Part 1"
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Physics, Maths…"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              </div>
              {activeTab === "book" ? (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">PDF File *</label>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full py-2 border-2 border-dashed border-[#E5E7EB] rounded-md text-sm text-[#8A8F98] hover:border-[#002EB8] hover:text-[#002EB8] flex items-center justify-center gap-2 transition-colors">
                    <Upload size={14} /> {file ? file.name : "Choose PDF (max 10MB)"}
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8A8F98] mb-1">
                    {activeTab === "video" ? "Video URL *" : "Link URL *"}
                  </label>
                  <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://…"
                    className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={saving} data-testid="add-library-submit"
                  className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm font-medium hover:bg-[#001A85] disabled:bg-[#8A8F98]">
                  {saving ? "Adding..." : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
