import { useRef } from "react";
import { CreditCard, Download, Upload, User } from "lucide-react";

export function PortalIDCard({ student, studentPhoto, photoUploading, idCardLoading, handlePhotoUpload, handleDownloadIdCard }) {
  const photoInputRef = useRef(null);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#002EB8]/10 rounded-full flex items-center justify-center">
              <CreditCard size={20} className="text-[#002EB8]" />
            </div>
            <div>
              <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">Student ID Card</h3>
              <p className="text-xs text-[#8A8F98]">Your digital identity card — download and print</p>
            </div>
          </div>
          <button
            onClick={handleDownloadIdCard}
            disabled={idCardLoading}
            data-testid="download-id-card-btn"
            className="flex items-center gap-2 px-4 py-2 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98] font-medium transition-colors"
          >
            <Download size={14} />
            {idCardLoading ? "Generating..." : "Download PDF"}
          </button>
        </div>

        {/* Preview card */}
        <div className="rounded-xl overflow-hidden border border-[#E5E7EB] max-w-lg mx-auto">
          <div className="bg-[#001C82] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white font-cabinet font-bold text-base tracking-wide">{student?.institute_name || "Institute"}</p>
              <p className="text-[#AAB8F5] text-xs mt-0.5">STUDENT IDENTITY CARD</p>
            </div>
            <CreditCard size={28} className="text-[#AAB8F5]" />
          </div>

          <div className="bg-[#F8F9FA] px-5 py-4 flex gap-4">
            {/* Photo */}
            <div className="shrink-0">
              <div className="w-20 h-24 rounded-lg border-2 border-[#E5E7EB] bg-white overflow-hidden flex items-center justify-center">
                {studentPhoto || student?.photo ? (
                  <img
                    src={studentPhoto || `data:${student?.photo_mime || "image/jpeg"};base64,${student?.photo}`}
                    alt="Student"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-[#8A8F98]" />
                )}
              </div>
              <label
                htmlFor="student-photo-input"
                className="mt-2 flex items-center justify-center gap-1 text-xs text-[#002EB8] cursor-pointer hover:underline"
                data-testid="upload-photo-btn"
              >
                {photoUploading ? "Uploading..." : <><Upload size={10} /> Upload photo</>}
              </label>
              <input
                id="student-photo-input"
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Name</p>
                <p className="font-cabinet font-bold text-sm text-[#0A0A0A]">{student?.name || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Student ID</p>
                  <p className="text-xs font-medium font-mono">{student?.enrollment_no || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Mobile</p>
                  <p className="text-xs font-medium">{student?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Course</p>
                  <p className="text-xs font-medium truncate">{student?.course_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Joined</p>
                  <p className="text-xs font-medium">
                    {student?.created_at
                      ? new Date(student.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-[#EEF2FF] rounded-md px-3 py-2">
                <p className="text-xs text-[#8A8F98] uppercase tracking-wide">Parent / Guardian</p>
                <p className="text-xs font-medium">{student?.guardian_name || "—"}</p>
                <p className="text-xs text-[#8A8F98]">{student?.guardian_phone || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
