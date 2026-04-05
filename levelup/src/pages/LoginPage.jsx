import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DinoLogin from "../components/DinoLogin";
import ThemeToggle from "../components/ThemeToggle";
import { getAuthErrorMessage, signInStudentAccount } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!location.state) return;

    if (location.state.email) {
      setFormData((prev) => ({
        ...prev,
        email: location.state.email,
      }));
    }

    if (location.state.message) {
      setInfoMessage(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      await signInStudentAccount(formData.email, formData.password);
      navigate("/workspace/resume-analyzer");
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(getAuthErrorMessage(error, "login"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-page min-h-screen px-4 py-10">
      <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />
      <div className="mx-auto grid max-w-6xl gap-6 rounded-[36px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[1fr_0.92fr] md:p-8">
        <div className="rounded-[30px] border border-white/10 bg-black/25 p-6">
          <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-200">
            Student Login
          </div>
          <h1 className="mt-4 text-4xl font-black">Access your career intelligence workspace</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
            Sign in to continue with resume analysis, ATS scoring, AI career guidance, tutor videos, performance predictions, and adaptive learning.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            {infoMessage && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {infoMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {errorMessage}
              </div>
            )}
            <label className="grid gap-2 text-sm">
              <span className="text-white/70">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => update("email", event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                placeholder="you@student.edu"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-white/70">Password</span>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => update("password", event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                placeholder="Enter your password"
                required
              />
            </label>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing In..." : "Login"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/75"
              >
                Create account
              </button>
            </div>
          </form>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/30">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-rose-400/10 blur-3xl" />
          <div className="relative h-[520px]">
            <DinoLogin mood="excited" typing />
          </div>
        </div>
      </div>
    </div>
  );
}
