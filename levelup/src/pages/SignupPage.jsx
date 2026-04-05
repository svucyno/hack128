import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { ref, serverTimestamp, set } from "firebase/database";
import { auth, db, googleProvider } from "../firebase";

const baseFields = ["name", "email", "password", "confirm", "phone", "city", "terms"];
const studentFields = ["college", "department", "year", "roll"];
const teacherFields = ["college", "department", "designation", "staffId"];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    college: "",
    department: "",
    year: "",
    phone: "",
    city: "",
    roll: "",
    designation: "",
    staffId: "",
    terms: false,
  });
  const [role, setRole] = useState("");
  const [usedGoogle, setUsedGoogle] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [googleUser, setGoogleUser] = useState({ uid: "", email: "" });

  useEffect(() => {
    const savedRole = sessionStorage.getItem("signupRole");
    if (savedRole === "student" || savedRole === "teacher") {
      setRole(savedRole);
    }
  }, []);

  useEffect(() => undefined, []);

  const completion = useMemo(() => {
    const roleFields = role === "teacher" ? teacherFields : role === "student" ? studentFields : [];
    const allFields = [...baseFields, ...roleFields];
    const filled = allFields.reduce((count, key) => {
      if (key === "terms") return count + (formData.terms ? 1 : 0);
      return count + (String(formData[key]).trim() ? 1 : 0);
    }, 0);
    return allFields.length ? Math.round((filled / allFields.length) * 100) : 0;
  }, [formData, role]);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async (uid, email, loginMethod) => {
    const isStudent = role === "student";
    const isTeacher = role === "teacher";
    const profile = {
      role,
      name: formData.name.trim(),
      email: email.trim().toLowerCase(),
      college: formData.college.trim(),
      department: formData.department.trim(),
      year: formData.year.trim(),
      phone: formData.phone.trim(),
      city: formData.city.trim(),
      roll: isStudent ? formData.roll.trim() : "",
      designation: isTeacher ? formData.designation.trim() : isStudent ? "Student" : "",
      staffId: isTeacher ? formData.staffId.trim() : "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      loginCount: 1,
      loginMethod,
    };
    await set(ref(db, `users/${uid}`), profile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (usedGoogle) {
      return;
    }
    if (!role) {
      alert("Please select a role to continue.");
      return;
    }
    if (!formData.terms) {
      alert("Please accept the Terms & Privacy Policy.");
      return;
    }
    if (!formData.email.trim() || !formData.password || !formData.confirm) {
      alert("Please complete your email and password.");
      return;
    }
    const strongPassword =
      formData.password.length >= 8 &&
      /[A-Z]/.test(formData.password) &&
      /[a-z]/.test(formData.password) &&
      /\d/.test(formData.password) &&
      /[^A-Za-z0-9]/.test(formData.password);
    if (!strongPassword) {
      alert("Password must be 8+ chars with upper, lower, number, and symbol.");
      return;
    }
    if (formData.password !== formData.confirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      if (formData.name.trim()) {
        await updateProfile(result.user, { displayName: formData.name.trim() });
      }
      const actionCodeSettings = {
        url: `${window.location.origin}${window.location.pathname}#/verify`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(result.user, actionCodeSettings);
      await saveProfile(result.user.uid, formData.email, "password");
      alert("Account created. Check your email to verify, then sign in.");
      window.location.hash = "#/login";
      setUsedGoogle(false);
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("This email is already registered. Please sign in instead.");
      } else if (error.code === "auth/weak-password") {
        alert("Password is too weak. Use at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please enter a valid email address.");
      } else if (error.code === "auth/operation-not-allowed") {
        alert("Email/password sign-up is disabled in Firebase.");
      } else {
        alert(`Signup failed: ${error.message}`);
      }
    }
  };

  const handleGoogleSignup = async () => {
    if (!role) {
      alert("Please select a role to continue.");
      return;
    }
    if (!formData.terms) {
      alert("Please accept the Terms & Privacy Policy.");
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const displayName = result.user.displayName || "";
      const displayEmail = result.user.email || "";
      setFormData((prev) => ({
        ...prev,
        name: displayName || prev.name,
        email: displayEmail || prev.email,
        password: "",
        confirm: "",
      }));
      setUsedGoogle(true);
      setGoogleUser({ uid: result.user.uid, email: displayEmail || "" });
      setWelcomeMessage("Google sign-in successful. Please complete your profile.");
    } catch (error) {
      console.error("Google signup error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        alert("Google sign-up was closed. Please try again.");
      } else if (error.code === "auth/operation-not-allowed") {
        alert("Google sign-up is disabled in Firebase.");
      } else {
        alert(`Google sign-up failed: ${error.message}`);
      }
    }
  };

  const handleGoogleProfileSave = async () => {
    if (!googleUser.uid) {
      alert("Google account not detected. Please try again.");
      return;
    }
    if (!role) {
      alert("Please select a role to continue.");
      return;
    }
    if (!formData.terms) {
      alert("Please accept the Terms & Privacy Policy.");
      return;
    }
    try {
      await saveProfile(googleUser.uid, googleUser.email || formData.email || "", "google");
      alert("Profile saved. Please sign in.");
      window.location.hash = "#/login";
    } catch (error) {
      console.error("Google profile save error:", error);
      alert(`Could not save profile: ${error.message}`);
    }
  };

  const selectRole = (nextRole) => {
    setRole(nextRole);
    sessionStorage.setItem("signupRole", nextRole);
    setFormData((prev) => ({
      ...prev,
      year: nextRole === "student" ? prev.year : "",
      roll: nextRole === "student" ? prev.roll : "",
      designation: nextRole === "teacher" ? prev.designation : "",
      staffId: nextRole === "teacher" ? prev.staffId : "",
    }));
  };

  return (
    <div className="authPage authPageSignup">
      <div className="fireGlow" />
      <div className="fireParticles" aria-hidden="true">
        {Array.from({ length: 26 }).map((_, index) => (
          <span key={index} className="fireParticle" />
        ))}
      </div>
      <main className="authMain">
        <div className="signupShell">
          <div className="signupHeader">
            <div className="authKicker">Join the climb</div>
            <h1 className="authTitle">Create your LevelUp account</h1>
            <p className="authSub">
              Set up your profile once and unlock courses, quizzes, and progress tracking.
            </p>
            {welcomeMessage && <div className="authBanner">{welcomeMessage}</div>}
          </div>

          <div className="signupProgress">
            <div className="signupProgressTop">
              <span>Profile completion</span>
              <span>{role ? `${completion}%` : "Select role"}</span>
            </div>
            <div className="signupProgressBar">
              <div className="signupProgressFill" style={{ width: role ? `${completion}%` : "6%" }} />
            </div>
          </div>

          <form className="signupForm" autoComplete="off" onSubmit={handleSubmit}>
            <div className="signupSection">
              <div className="signupSectionTitle">Select your role</div>
              {!role ? (
                <div className="roleGrid">
                  <button
                    className={`roleCard ${role === "student" ? "is-active" : ""}`}
                    type="button"
                    onClick={() => selectRole("student")}
                  >
                    <div className="roleTitle">Student</div>
                    <div className="roleSub">Track courses, quizzes, and streaks</div>
                  </button>
                  <button
                    className={`roleCard ${role === "teacher" ? "is-active" : ""}`}
                    type="button"
                    onClick={() => selectRole("teacher")}
                  >
                    <div className="roleTitle">Teacher</div>
                    <div className="roleSub">Create courses, grade, and manage learners</div>
                  </button>
                </div>
              ) : (
                <div className="roleSelected">
                  <div>
                    <div className="roleTitle">{role === "student" ? "Student" : "Teacher"}</div>
                    <div className="roleSub">
                      {role === "student"
                        ? "Track courses, quizzes, and streaks"
                        : "Create courses, grade, and manage learners"}
                    </div>
                  </div>
                  <button
                    className="authLink"
                    type="button"
                    onClick={() => {
                      setRole("");
                      sessionStorage.removeItem("signupRole");
                    }}
                  >
                    Change role
                  </button>
                </div>
              )}
            </div>

            {role && (
              <div className="signupSection">
                <div className="signupSectionTitle">Account details</div>
                <button className="authButton authGoogle" type="button" onClick={handleGoogleSignup}>
                  <span className="authGoogleIcon">G</span>
                  Continue with Google
                </button>
                <div className="authDivider">
                  <span>or create with email</span>
                </div>
                <div className="signupGrid">
                  <div>
                    <label className="authLabel" htmlFor="signup-name">Full name</label>
                    <input
                      className="authInput"
                      id="signup-name"
                      type="text"
                      value={formData.name}
                      placeholder="Dheeraj Rangu"
                      autoComplete="off"
                      disabled={usedGoogle}
                      onChange={(event) => updateField("name", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-email">Email</label>
                    <input
                      className="authInput"
                      id="signup-email"
                      name="levelup_email"
                      type="email"
                      value={formData.email}
                      placeholder="you@college.edu"
                      autoComplete="off"
                      disabled={usedGoogle}
                      onChange={(event) => updateField("email", event.target.value)}
                    />
                  </div>
                  {!usedGoogle && (
                    <>
                      <div>
                        <label className="authLabel" htmlFor="signup-password">Password</label>
                        <input
                          className="authInput"
                          id="signup-password"
                          name="levelup_password"
                          type="password"
                          value={formData.password}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          onChange={(event) => updateField("password", event.target.value)}
                        />
                        <div className="authHint">Use 8+ chars with upper, lower, number, symbol.</div>
                      </div>
                      <div>
                        <label className="authLabel" htmlFor="signup-confirm">Confirm password</label>
                        <input
                          className="authInput"
                          id="signup-confirm"
                          name="levelup_confirm"
                          type="password"
                          value={formData.confirm}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                          onChange={(event) => updateField("confirm", event.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {role === "student" && (
              <div className="signupSection">
                <div className="signupSectionTitle">Student details</div>
                <div className="signupGrid">
                  <div>
                    <label className="authLabel" htmlFor="signup-college">College / School</label>
                    <input
                      className="authInput"
                      id="signup-college"
                      type="text"
                      value={formData.college}
                      placeholder="Dino Institute of Tech"
                      onChange={(event) => updateField("college", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-dept">Department / Branch</label>
                    <input
                      className="authInput"
                      id="signup-dept"
                      type="text"
                      value={formData.department}
                      placeholder="Computer Science"
                      onChange={(event) => updateField("department", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-year">Year / Semester</label>
                    <input
                      className="authInput"
                      id="signup-year"
                      type="text"
                      value={formData.year}
                      placeholder="3rd Year / Sem 6"
                      onChange={(event) => updateField("year", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-roll">Roll number / ID</label>
                    <input
                      className="authInput"
                      id="signup-roll"
                      type="text"
                      value={formData.roll}
                      placeholder="CSE-23-045"
                      onChange={(event) => updateField("roll", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {role === "teacher" && (
              <div className="signupSection">
                <div className="signupSectionTitle">Teacher details</div>
                <div className="signupGrid">
                  <div>
                    <label className="authLabel" htmlFor="signup-college">College / School</label>
                    <input
                      className="authInput"
                      id="signup-college"
                      type="text"
                      value={formData.college}
                      placeholder="Dino Institute of Tech"
                      onChange={(event) => updateField("college", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-dept">Department / Branch</label>
                    <input
                      className="authInput"
                      id="signup-dept"
                      type="text"
                      value={formData.department}
                      placeholder="Computer Science"
                      onChange={(event) => updateField("department", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-designation">Designation</label>
                    <input
                      className="authInput"
                      id="signup-designation"
                      type="text"
                      value={formData.designation}
                      placeholder="Assistant Professor"
                      onChange={(event) => updateField("designation", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-staff">Staff ID</label>
                    <input
                      className="authInput"
                      id="signup-staff"
                      type="text"
                      value={formData.staffId}
                      placeholder="FAC-1021"
                      onChange={(event) => updateField("staffId", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {role && (
              <div className="signupSection">
                <div className="signupSectionTitle">Contact</div>
                <div className="signupGrid">
                  <div>
                    <label className="authLabel" htmlFor="signup-phone">Phone number</label>
                    <input
                      className="authInput"
                      id="signup-phone"
                      type="tel"
                      value={formData.phone}
                      placeholder="+91 98765 43210"
                      onChange={(event) => updateField("phone", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="authLabel" htmlFor="signup-city">City</label>
                    <input
                      className="authInput"
                      id="signup-city"
                      type="text"
                      value={formData.city}
                      placeholder="Hyderabad"
                      onChange={(event) => updateField("city", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {role && (
              <>
                <label className="authCheckbox signupTerms">
                  <input
                    type="checkbox"
                    checked={formData.terms}
                    onChange={(event) => updateField("terms", event.target.checked)}
                  />
                  I agree to the Terms & Privacy Policy.
                </label>

                {!usedGoogle && (
                  <button className="authButton signupButton" type="submit">Create Account</button>
                )}
                {usedGoogle && (
                  <button className="authButton signupButton" type="button" onClick={handleGoogleProfileSave}>
                    Save Profile
                  </button>
                )}
              </>
            )}
          </form>

          <div className="authFooter">
            Already have an account?{" "}
            <button
              className="authLink"
              type="button"
              onClick={() => (window.location.hash = "#/login")}
            >
              Sign in
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
