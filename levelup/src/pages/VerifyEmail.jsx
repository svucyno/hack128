import { useEffect, useState } from "react";
import {
  applyActionCode,
  checkActionCode,
  updatePassword,
} from "firebase/auth";
import StudentNavbar from "../components/StudentNavbar";
import { auth } from "../firebase";

function getHashParams() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
  return new URLSearchParams(query);
}

export default function VerifyEmail() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const params = getHashParams();
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (mode !== "verifyEmail" || !oobCode) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const run = async () => {
      try {
        const info = await checkActionCode(auth, oobCode);
        setEmail(info.data?.email || "");
        await applyActionCode(auth, oobCode);
        setStatus("verified");
        setMessage("Email verified successfully. Set a new password below.");
      } catch (error) {
        console.error("Verify email error:", error);
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      }
    };

    run();
  }, []);

  const handleSetPassword = async () => {
    if (!newPassword || !confirm) {
      setStatus("error");
      setMessage("Enter and confirm the new password.");
      return;
    }
    if (newPassword !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (!auth.currentUser) {
      setStatus("error");
      setMessage("Please sign in to set your new password.");
      return;
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      setStatus("success");
      setMessage("Password updated. You can now sign in.");
    } catch (error) {
      console.error("Update password error:", error);
      setStatus("error");
      setMessage(error.message || "Failed to update password.");
    }
  };

  return (
    <div className="authPage">
      <StudentNavbar />
      <main className="authMain">
        <div className="authSplit">
          <div className="authCard">
            <div className="authKicker">Verify email</div>
            <h1 className="authTitle">Set your new password</h1>
            <p className="authSub">{email ? `Verified: ${email}` : "Complete verification to continue."}</p>

            {message && (
              <div className={`authBanner ${status === "error" ? "authBannerError" : ""}`}>
                {message}
              </div>
            )}

            <label className="authLabel" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              className="authInput"
              type="password"
              placeholder="Create a strong password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={status !== "verified"}
            />

            <label className="authLabel" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="authInput"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={status !== "verified"}
            />

            <button
              className="authButton"
              type="button"
              onClick={handleSetPassword}
              disabled={status !== "verified"}
            >
              Update Password
            </button>

            <div className="authFooter">
              Already verified?{" "}
              <button className="authLink" type="button" onClick={() => (window.location.hash = "#/login")}>
                Go to login
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
