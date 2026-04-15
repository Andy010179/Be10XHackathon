import { useState } from "react";
import axios from "axios";
import { CheckCircle, User, Mail, Phone, MapPin, Home, BookOpen, ArrowRight, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const EMPTY = { student_name: "", email: "", phone: "", address: "", city: "", interest: "" };

export default function PublicEnquiryForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.student_name.trim()) e.student_name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.phone.trim() || !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) e.phone = "Valid phone number required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.interest.trim()) e.interest = "Please tell us which course you're interested in";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/public/enquiry`, {
        student_name: form.student_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        interest: form.interest.trim(),
      });
      setSubmitted(true);
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center px-4 py-12 font-satoshi">
      {/* Brand bar */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-[#002EB8] text-white px-5 py-2 rounded-full text-sm font-medium tracking-wide mb-4">
          EduTech LMS
        </div>
        <h1 className="font-cabinet font-black text-4xl sm:text-5xl tracking-tighter text-[#0A0A0A] mb-2">
          Start Your Learning Journey
        </h1>
        <p className="text-[#8A8F98] text-base max-w-sm mx-auto">
          Fill in your details and our team will reach out within 24 hours.
        </p>
      </div>

      <div className="w-full max-w-lg">
        {submitted ? (
          /* Success state */
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-lg p-10 text-center" data-testid="enquiry-success">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-[#00C853]" />
            </div>
            <h2 className="font-cabinet font-black text-2xl text-[#0A0A0A] mb-2">Enquiry Submitted!</h2>
            <p className="text-[#8A8F98] text-sm mb-6">
              Thank you! Your enquiry has been submitted successfully. Our team will get in touch with you very soon.
            </p>
            <button
              onClick={() => { setForm(EMPTY); setSubmitted(false); }}
              data-testid="submit-another-btn"
              className="px-6 py-2.5 border border-[#002EB8] text-[#002EB8] rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Submit Another Enquiry
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} noValidate
            className="bg-white border border-[#E5E7EB] rounded-2xl shadow-lg p-8 space-y-5"
            data-testid="public-enquiry-form">

            {errors.form && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {errors.form}
              </div>
            )}

            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                Student Name <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                <input
                  type="text"
                  value={form.student_name}
                  onChange={set("student_name")}
                  placeholder="Full name"
                  data-testid="field-student-name"
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${errors.student_name ? "border-[#FF2B2B] bg-red-50" : "border-[#E5E7EB] focus:border-[#002EB8]"}`}
                />
              </div>
              {errors.student_name && <p className="text-xs text-[#FF2B2B] mt-1">{errors.student_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                Email ID <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  data-testid="field-email"
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${errors.email ? "border-[#FF2B2B] bg-red-50" : "border-[#E5E7EB] focus:border-[#002EB8]"}`}
                />
              </div>
              {errors.email && <p className="text-xs text-[#FF2B2B] mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                Phone Number <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  data-testid="field-phone"
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${errors.phone ? "border-[#FF2B2B] bg-red-50" : "border-[#E5E7EB] focus:border-[#002EB8]"}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-[#FF2B2B] mt-1">{errors.phone}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                Address
              </label>
              <div className="relative">
                <Home size={15} className="absolute left-3 top-3.5 text-[#8A8F98]" />
                <textarea
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Street, landmark, area..."
                  rows={2}
                  data-testid="field-address"
                  className="w-full pl-9 pr-4 py-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#002EB8] resize-none transition-colors"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                City <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                <input
                  type="text"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Mumbai, Delhi, Bangalore..."
                  data-testid="field-city"
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${errors.city ? "border-[#FF2B2B] bg-red-50" : "border-[#E5E7EB] focus:border-[#002EB8]"}`}
                />
              </div>
              {errors.city && <p className="text-xs text-[#FF2B2B] mt-1">{errors.city}</p>}
            </div>

            {/* Interest in Course */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8A8F98] mb-1.5">
                Interest in Course <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-3 top-3.5 text-[#8A8F98]" />
                <textarea
                  value={form.interest}
                  onChange={set("interest")}
                  placeholder="Tell us what you'd like to learn — e.g. Web Development, Data Science, Digital Marketing..."
                  rows={3}
                  data-testid="field-interest"
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg text-sm focus:outline-none resize-none transition-colors ${errors.interest ? "border-[#FF2B2B] bg-red-50" : "border-[#E5E7EB] focus:border-[#002EB8]"}`}
                />
              </div>
              {errors.interest && <p className="text-xs text-[#FF2B2B] mt-1">{errors.interest}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="enquiry-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#002EB8] text-white font-semibold text-sm rounded-xl hover:bg-[#001A85] disabled:bg-[#8A8F98] transition-colors mt-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                : <>Submit Enquiry <ArrowRight size={16} /></>
              }
            </button>

            <p className="text-center text-xs text-[#8A8F98]">
              By submitting, you agree to be contacted by our admissions team.
            </p>
          </form>
        )}
      </div>

      <p className="mt-8 text-xs text-[#8A8F98]">© {new Date().getFullYear()} EduTech LMS. All rights reserved.</p>
    </div>
  );
}
