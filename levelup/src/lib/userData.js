import { ref, serverTimestamp, update } from "firebase/database";
import { db } from "../firebase";
import {
  createEmptyAdaptiveLearningState,
  normalizeAdaptiveLearningState,
} from "./adaptiveLearning";

function pruneUndefined(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneUndefined(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, pruneUndefined(nestedValue)])
        .filter(([, nestedValue]) => nestedValue !== undefined),
    );
  }

  if (typeof value === "function" || value === undefined) {
    return undefined;
  }

  return value;
}

export function toFileMetadata(file) {
  if (!file) {
    return null;
  }

  const metadata = pruneUndefined({
    name: typeof file.name === "string" ? file.name : "",
    size: Number.isFinite(Number(file.size)) ? Number(file.size) : 0,
    type: typeof file.type === "string" ? file.type : "",
    lastModified: Number.isFinite(Number(file.lastModified))
      ? Number(file.lastModified)
      : 0,
  });

  return Object.keys(metadata).length ? metadata : null;
}

export function createWorkspaceStatePayload({
  searchQuery = "",
  notifications = 0,
  uploadedFiles = {},
  processing = {},
  calendarTasks = [],
  lastVisitedRoute = "",
} = {}) {
  return pruneUndefined({
    searchQuery: String(searchQuery || ""),
    notifications: Number.isFinite(Number(notifications))
      ? Number(notifications)
      : 0,
    uploadedFiles: Object.fromEntries(
      Object.entries(uploadedFiles || {})
        .map(([key, file]) => [key, toFileMetadata(file)])
        .filter(([, value]) => value),
    ),
    processing: Object.fromEntries(
      Object.entries(processing || {}).map(([key, value]) => [key, Boolean(value)]),
    ),
    calendarTasks: normalizeCalendarTasks(calendarTasks),
    lastVisitedRoute: String(lastVisitedRoute || ""),
  });
}

export function buildInitialWorkspaceState() {
  return {
    ...createWorkspaceStatePayload(),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  };
}

export function buildInitialResumeWorkspaceState() {
  return {
    inputMode: "file",
    sourceMode: "",
    manualText: "",
    manualWordCount: 0,
    jobDescription: "",
    jobDescriptionWordCount: 0,
    selectedFile: null,
    latestAnalysis: null,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  };
}

export function buildInitialCareerGuidanceState() {
  return {
    activeChatId: "",
    status: "idle",
    latestSummary: "",
    latestTargetRole: "",
    latestFocusAreas: [],
    latestRecommendedRoles: [],
    latestSuggestedQuestions: [],
    latestSkillGapAnalysis: {
      matchedSkills: [],
      missingSkills: [],
      prioritySkills: [],
    },
    latestRoadmap: null,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  };
}

export function buildInitialAdaptiveLearningState() {
  return {
    ...createEmptyAdaptiveLearningState(),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  };
}

export function buildUserRegistrationRecord({ fullName, email }) {
  const safeName = String(fullName || "").trim();
  const safeEmail = String(email || "").trim().toLowerCase();
  const nowIso = new Date().toISOString();

  return {
    name: safeName,
    email: safeEmail,
    role: "Student",
    avatar: safeName.charAt(0).toUpperCase() || "S",
    emailVerified: false,
    createdAt: serverTimestamp(),
    createdAtIso: nowIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
    account: {
      name: safeName,
      email: safeEmail,
      role: "Student",
      authProvider: "email_password",
      registrationMethod: "email_password",
      loginCount: 0,
      emailVerified: false,
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      lastLoginAt: null,
      lastLoginAtIso: "",
      lastLoginMethod: "",
    },
    activity: {
      lastAction: "registered",
      registeredAt: serverTimestamp(),
      registeredAtIso: nowIso,
      lastLoginAt: null,
      lastLoginAtIso: "",
    },
    workspaceState: buildInitialWorkspaceState(),
    resumeOverview: {
      status: "idle",
      latestResumeFileName: "",
    },
    resumeWorkspace: buildInitialResumeWorkspaceState(),
    careerGuidance: buildInitialCareerGuidanceState(),
    adaptiveLearning: buildInitialAdaptiveLearningState(),
  };
}

export async function saveWorkspaceState(uid, payload) {
  if (!uid) {
    return;
  }

  await update(ref(db, `users/${uid}/workspaceState`), {
    ...createWorkspaceStatePayload(payload),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

export async function saveResumeWorkspaceState(uid, payload) {
  if (!uid) {
    return;
  }

  await update(ref(db, `users/${uid}/resumeWorkspace`), {
    ...pruneUndefined(payload),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

export async function saveAdaptiveLearningState(uid, payload) {
  if (!uid) {
    return;
  }

  await update(ref(db, `users/${uid}/adaptiveLearning`), {
    ...pruneUndefined(normalizeAdaptiveLearningState(payload)),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

function normalizeCalendarTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task) =>
      pruneUndefined({
        id: String(task?.id || "").trim(),
        title: String(task?.title || "").trim(),
        note: String(task?.note || "").trim(),
        day: String(task?.day || "").trim(),
        time: String(task?.time || "").trim(),
        createdAtIso: String(task?.createdAtIso || "").trim(),
      }),
    )
    .filter((task) => task.id && task.title && task.day && task.time)
    .slice(0, 80);
}
