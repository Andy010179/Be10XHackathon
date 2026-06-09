import { X } from "lucide-react";

export function EditScheduleModal({ onClose, form, setForm, onSubmit, saving, courses, teachers }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="font-cabinet font-bold">Edit Session</h3>
          <button onClick={onClose}><X size={18} className="text-[#8A8F98]" /></button>
        </div>
        <form onSubmit={onSubmit} data-testid="edit-schedule-form" className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Session Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]">
                <option value="">Select Teacher</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Room / Venue</label>
              <input value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">Start Time</label>
              <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1">End Time</label>
              <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#002EB8]" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#8A8F98] py-2 rounded-md text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#002EB8] text-white py-2 rounded-md text-sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
