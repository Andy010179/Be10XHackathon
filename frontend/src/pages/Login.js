import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Building2, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

function formatError(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === "teacher") {
        navigate("/teacher/attendance");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-satoshi">
      {/* Left: Hero */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #002EB8 0%, #001A85 60%, #0A0A0A 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1664273891579-22f28332f3c4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <span className="font-cabinet font-black text-2xl tracking-tighter">EduTech LMS</span>
          </div>
          <h1 className="font-cabinet font-black text-5xl lg:text-6xl tracking-tighter leading-none mb-6">
            Manage Your<br />
            <span className="text-[#FFD600]">Institute</span><br />
            Smarter.
          </h1>
          <p className="text-white/70 text-lg max-w-sm">
            Complete CRM, academic scheduling, finance, and student lifecycle management — all in one platform.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Active Students", value: "2,400+" },
            { label: "Conversion Rate", value: "68%" },
            { label: "Branches", value: "12" },
          ].map((stat) => (
            <div key={stat.label} className="border border-white/20 rounded-lg p-4">
              <p className="font-cabinet font-black text-2xl text-[#FFD600]">{stat.value}</p>
              <p className="text-white/60 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#002EB8] rounded flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="font-cabinet font-black text-xl tracking-tighter text-[#0A0A0A]">EduTech LMS</span>
          </div>

          <div className="mb-8">
            <h2 className="font-cabinet font-black text-4xl tracking-tighter text-[#0A0A0A] mb-2">
              Sign in
            </h2>
            <p className="text-[#8A8F98] text-sm">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                placeholder="admin@edutech.com"
                className="w-full border border-[#E5E7EB] rounded-md px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#8A8F98] focus:outline-none focus:border-[#002EB8] focus:ring-2 focus:ring-[#002EB8]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                  placeholder="••••••••"
                  className="w-full border border-[#E5E7EB] rounded-md px-4 py-3 pr-10 text-sm text-[#0A0A0A] placeholder:text-[#8A8F98] focus:outline-none focus:border-[#002EB8] focus:ring-2 focus:ring-[#002EB8]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8F98] hover:text-[#0A0A0A]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#002EB8] hover:bg-[#001A85] disabled:bg-[#8A8F98] text-white font-medium py-3 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-[#F8F9FA] rounded-md border border-[#E5E7EB]">
            <p className="text-xs font-mono uppercase tracking-[0.1em] text-[#8A8F98] mb-2">Demo Credentials</p>
            <div className="space-y-1 text-sm text-[#0A0A0A]">
              <p><span className="text-[#8A8F98]">Email:</span> admin@edutech.com</p>
              <p><span className="text-[#8A8F98]">Password:</span> admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
