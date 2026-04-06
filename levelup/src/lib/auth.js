import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  get,
  push,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { auth, db, googleProvider, microsoftProvider } from "../firebase";
import { buildUserRegistrationRecord } from "./userData";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function toSafeString(value) {
  return String(value || "").trim();
}

function getDisplayName(user, email = "") {
  const safeEmail = normalizeEmail(email || user?.email || "");
  const fallbackName = safeEmail.split("@")[0] || "Student";
  return toSafeString(user?.displayName) || fallbackName;
}

async function syncStudentSignInRecord(user, { email, method }) {
  const safeEmail = normalizeEmail(email || user?.email || "");
  const displayName = getDisplayName(user, safeEmail);
  const avatar = displayName.charAt(0).toUpperCase() || "S";
  const nowIso = new Date().toISOString();
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    const baseRecord = buildUserRegistrationRecord({
      fullName: displayName,
      email: safeEmail,
    });

    await set(userRef, {
      ...baseRecord,
      name: displayName,
      email: safeEmail,
      role: "Student",
      avatar,
      emailVerified: Boolean(user.emailVerified),
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
      account: {
        ...baseRecord.account,
        name: displayName,
        email: safeEmail,
        role: "Student",
        authProvider: method,
        registrationMethod: method,
        emailVerified: Boolean(user.emailVerified),
        loginCount: 0,
        createdAt: serverTimestamp(),
        createdAtIso: nowIso,
        lastLoginAt: serverTimestamp(),
        lastLoginAtIso: nowIso,
        lastLoginMethod: method,
      },
      activity: {
        ...baseRecord.activity,
        lastAction: "login",
        lastLoginAt: serverTimestamp(),
        lastLoginAtIso: nowIso,
      },
    });
  } else {
    const existingProfile = snapshot.val() || {};

    await update(userRef, {
      name: displayName,
      email: safeEmail,
      role: "Student",
      avatar,
      emailVerified: Boolean(user.emailVerified),
      lastLoginAt: serverTimestamp(),
      lastLoginAtIso: nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
      "account/name": displayName,
      "account/email": safeEmail,
      "account/role": existingProfile?.account?.role || "Student",
      "account/authProvider": method,
      "account/registrationMethod": existingProfile?.account?.registrationMethod || method,
      "account/emailVerified": Boolean(user.emailVerified),
      "account/lastLoginAt": serverTimestamp(),
      "account/lastLoginAtIso": nowIso,
      "account/lastLoginMethod": method,
      "activity/lastAction": "login",
      "activity/lastLoginAt": serverTimestamp(),
      "activity/lastLoginAtIso": nowIso,
    });
  }

  await Promise.all([
    runTransaction(ref(db, `users/${user.uid}/account/loginCount`), (currentValue) => {
      const nextValue = Number(currentValue || 0);
      return nextValue + 1;
    }),
    set(push(ref(db, `users/${user.uid}/activity/loginEvents`)), {
      at: serverTimestamp(),
      atIso: nowIso,
      email: safeEmail,
      method,
    }),
  ]);
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
    case "auth/popup-closed-by-user":
      return "The sign-in popup was closed before completing.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already linked to a different sign-in method.";
    case "auth/operation-not-allowed":
      return "This sign-in provider is not enabled yet.";
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
  await syncStudentSignInRecord(credential.user, {
    email: normalizedEmail,
    method: "email_password",
  });

  return credential.user;
}

async function signInWithSocialProvider(provider, method) {
  const credential = await signInWithPopup(auth, provider);
  await syncStudentSignInRecord(credential.user, {
    email: credential.user.email || "",
    method,
  });
  return credential.user;
}

export function signInWithGooglePopup() {
  return signInWithSocialProvider(googleProvider, "google");
}

export function signInWithMicrosoftPopup() {
  return signInWithSocialProvider(microsoftProvider, "microsoft");
}

export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  await sendPasswordResetEmail(auth, normalizedEmail);
}
