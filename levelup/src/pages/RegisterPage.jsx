import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import ThemeToggle from "../components/ThemeToggle";
import { auth } from "../firebase";
import { getAuthErrorMessage, registerStudentAccount } from "../lib/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputTypes = {
    email: "email",
    password: "password",
    confirmPassword: "password",
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (form.password.trim().length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerStudentAccount(form);
      await signOut(auth);
      navigate("/login", {
        replace: true,
        state: {
          email: form.email.trim().toLowerCase(),
          message: "Registration successful. Sign in with the same email and password.",
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage(getAuthErrorMessage(error, "register"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-page min-h-screen px-4 py-10">
      <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />
      <div className="mx-auto max-w-5xl rounded-[36px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-200">
            Student Registration
          </div>
          <h1 className="mt-4 text-4xl font-black">Create your student profile</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
            Create a basic account with your name, email, and password to access the workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          {errorMessage && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:col-span-2">
              {errorMessage}
            </div>
          )}
          {[
            ["fullName", "Full Name"],
            ["email", "Email"],
            ["password", "Password"],
            ["confirmPassword", "Confirm Password"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-2 text-sm">
              <span className="text-white/70">{label}</span>
              <input
                type={inputTypes[key] || "text"}
                value={form[key]}
                onChange={(event) => update(key, event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                placeholder={label}
                required
              />
            </label>
          ))}

          <div className="md:col-span-2 flex flex-wrap items-center gap-4 pt-2">
            <button
              className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Register & Go To Login"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/75"
            >
              Already have an account?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
