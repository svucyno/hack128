import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { push, ref, runTransaction, serverTimestamp, set, update } from "firebase/database";
import { auth, db } from "../firebase";
import { buildUserRegistrationRecord } from "./userData";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function toSafeString(value) {
  return String(value || "").trim();
}

export function getAuthErrorMessage(error, mode = "login") {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return mode === "register"
        ? error?.message || "Could not create the account."
        : error?.message || "Could not sign in.";
  }
}

export async function registerStudentAccount(formData) {
  const email = normalizeEmail(formData.email);
  const password = formData.password;
  const fullName = toSafeString(formData.fullName);

  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName) {
    await updateProfile(credential.user, { displayName: fullName });
  }

  await set(ref(db, `users/${credential.user.uid}`), buildUserRegistrationRecord({
    fullName,
    email,
  }));

  return credential.user;
}

export async function signInStudentAccount(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const nowIso = new Date().toISOString();
  const displayName = toSafeString(credential.user.displayName) || "Student";

  await Promise.all([
    runTransaction(ref(db, `users/${credential.user.uid}/account/loginCount`), (currentValue) => {
      const nextValue = Number(currentValue || 0);
      return nextValue + 1;
    }),
    update(ref(db, `users/${credential.user.uid}`), {
      name: displayName,
      email: normalizedEmail,
      role: "Student",
      avatar: displayName.charAt(0).toUpperCase() || "S",
      emailVerified: Boolean(credential.user.emailVerified),
      lastLoginAt: serverTimestamp(),
      lastLoginAtIso: nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
      "account/name": displayName,
      "account/email": normalizedEmail,
      "account/emailVerified": Boolean(credential.user.emailVerified),
      "account/lastLoginAt": serverTimestamp(),
      "account/lastLoginAtIso": nowIso,
      "account/lastLoginMethod": "email_password",
      "activity/lastAction": "login",
      "activity/lastLoginAt": serverTimestamp(),
      "activity/lastLoginAtIso": nowIso,
    }),
    set(push(ref(db, `users/${credential.user.uid}/activity/loginEvents`)), {
      at: serverTimestamp(),
      atIso: nowIso,
      email: normalizedEmail,
      method: "email_password",
    }),
  ]);

  return credential.user;
}

export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  await sendPasswordResetEmail(auth, normalizedEmail);
}
