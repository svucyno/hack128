import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DinoLogin from "../components/DinoLogin";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAuthErrorMessage,
  signInStudentAccount,
  signInWithGooglePopup,
  signInWithMicrosoftPopup,
} from "../lib/auth";
import { postServerJson } from "../lib/serverApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState("");
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetData, setResetData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const updateReset = (key, value) =>
    setResetData((prev) => ({
      ...prev,
      [key]: value,
    }));

  useEffect(() => {
    if (!location.state) return;

    if (location.state.email) {
      setFormData((prev) => ({
        ...prev,
        email: location.state.email,
      }));
      setResetData((prev) => ({
        ...prev,
        email: location.state.email,
      }));
    }

    if (location.state.message) {
      setInfoMessage(location.state.message);
    }
  }, [location.state]);

  const isBusy =
    isSubmitting ||
    Boolean(activeProvider) ||
    isSendingOtp ||
    isResettingPassword;

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

  const handleProviderLogin = async (provider) => {
    setErrorMessage("");
    setInfoMessage("");
    setActiveProvider(provider);

    try {
      if (provider === "google") {
        await signInWithGooglePopup();
      } else {
        await signInWithMicrosoftPopup();
      }
      navigate("/workspace/resume-analyzer");
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setErrorMessage(getAuthErrorMessage(error, "login"));
    } finally {
      setActiveProvider("");
    }
  };

  const handleOpenResetPanel = () => {
    setErrorMessage("");
    setInfoMessage("");
    setOtpSent(false);
    setResetData({
      email: String(formData.email || "").trim(),
      code: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowResetPanel(true);
  };

  const handleSendOtp = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!String(resetData.email || "").trim()) {
      setErrorMessage("Enter your email to receive the OTP.");
      return;
    }

    setIsSendingOtp(true);
    try {
      await postServerJson("/otp/request", {
        body: {
          email: resetData.email.trim(),
        },
      });
      setOtpSent(true);
      setInfoMessage(
        "OTP sent. Enter the code and your new password below.",
      );
    } catch (error) {
      console.error("OTP request error:", error);
      setErrorMessage(getAuthErrorMessage(error, "login"));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!String(resetData.email || "").trim()) {
      setErrorMessage("Enter your email first.");
      return;
    }
    if (!String(resetData.code || "").trim()) {
      setErrorMessage("Enter the OTP sent to your email.");
      return;
    }
    if (!String(resetData.newPassword || "").trim()) {
      setErrorMessage("Enter a new password.");
      return;
    }
    if (resetData.newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsResettingPassword(true);
    try {
      await postServerJson("/otp/verify", {
        body: {
          email: resetData.email.trim(),
          code: resetData.code.trim(),
        },
      });
      await postServerJson("/otp/reset-password", {
        body: {
          email: resetData.email.trim(),
          code: resetData.code.trim(),
          newPassword: resetData.newPassword,
        },
      });
      setFormData((prev) => ({
        ...prev,
        email: resetData.email.trim(),
        password: "",
      }));
      setShowResetPanel(false);
      setOtpSent(false);
      setResetData({
        email: resetData.email.trim(),
        code: "",
        newPassword: "",
        confirmPassword: "",
      });
      setInfoMessage("Password updated. You can sign in with the new password now.");
    } catch (error) {
      console.error("Reset password error:", error);
      setErrorMessage(error?.message || "Could not reset the password.");
    } finally {
      setIsResettingPassword(false);
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
                disabled={isBusy}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Password</span>
                <button
                  type="button"
                  onClick={handleOpenResetPanel}
                  disabled={isBusy}
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200/85 transition hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => update("password", event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                placeholder="Enter your password"
                required
                disabled={isBusy}
              />
            </label>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleProviderLogin("google")}
                disabled={isBusy}
                className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {activeProvider === "google" ? "Connecting..." : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => void handleProviderLogin("microsoft")}
                disabled={isBusy}
                className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MicrosoftIcon />
                {activeProvider === "microsoft"
                  ? "Connecting..."
                  : "Continue with Microsoft"}
              </button>
            </div>
            <div className="text-center text-xs uppercase tracking-[0.18em] text-white/35">
              Or continue with email
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isBusy}
              >
                {isSubmitting ? "Signing In..." : "Login"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/75"
                disabled={isBusy}
              >
                Create account
              </button>
            </div>
          </form>

          {showResetPanel ? (
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Reset password</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">
                    Request an OTP, then enter the code and your new password here.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPanel(false);
                    setOtpSent(false);
                    setErrorMessage("");
                    setInfoMessage("");
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-white/70">Email</span>
                  <input
                    type="email"
                    value={resetData.email}
                    onChange={(event) => updateReset("email", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                    placeholder="you@student.edu"
                    disabled={isBusy}
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isBusy}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>

                {otpSent ? (
                  <>
                    <label className="grid gap-2 text-sm">
                      <span className="text-white/70">OTP Code</span>
                      <input
                        type="text"
                        value={resetData.code}
                        onChange={(event) => updateReset("code", event.target.value)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                        placeholder="Enter 6-digit OTP"
                        disabled={isBusy}
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-white/70">New Password</span>
                        <input
                          type="password"
                          value={resetData.newPassword}
                          onChange={(event) => updateReset("newPassword", event.target.value)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                          placeholder="Enter new password"
                          disabled={isBusy}
                        />
                      </label>

                      <label className="grid gap-2 text-sm">
                        <span className="text-white/70">Confirm Password</span>
                        <input
                          type="password"
                          value={resetData.confirmPassword}
                          onChange={(event) => updateReset("confirmPassword", event.target.value)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
                          placeholder="Re-enter new password"
                          disabled={isBusy}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isBusy}
                      className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isResettingPassword ? "Resetting..." : "Reset Password"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3.1l3 2.3c1.8-1.6 2.9-4 2.9-6.9 0-.7-.1-1.5-.2-2.2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.6 0 4.7-.8 6.3-2.3l-3-2.3c-.8.5-1.9.9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.1 2.4C5.2 18.9 8.3 21 12 21Z"
      />
      <path
        fill="#4A90E2"
        d="M6.6 13.4c-.2-.5-.3-1-.3-1.4s.1-1 .3-1.4l-3.1-2.4C2.9 9.3 2.5 10.6 2.5 12s.4 2.7 1 3.8l3.1-2.4Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.7c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 3.9 14.6 3 12 3 8.3 3 5.2 5.1 3.5 8.2l3.1 2.4c.8-2.2 2.9-3.9 5.4-3.9Z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" fill="#F25022" />
      <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
      <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
      <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
    </svg>
  );
}
