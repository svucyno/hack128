import { ref, serverTimestamp, update } from "firebase/database";
import { db } from "../firebase";
import {
  createEmptyAdaptiveLearningState,
  normalizeAdaptiveLearningState,
} from "./adaptiveLearning";
import {
  createEmptyMockInterviewState,
  normalizeMockInterviewState,
} from "./mockInterview";

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
  jobApplications = [],
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
    jobApplications: normalizeJobApplications(jobApplications),
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

export function buildInitialMockInterviewState() {
  return {
    ...createEmptyMockInterviewState(),
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
    mockInterview: buildInitialMockInterviewState(),
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

export async function saveMockInterviewState(uid, payload) {
  if (!uid) {
    return;
  }

  await update(ref(db, `users/${uid}/mockInterview`), {
    ...pruneUndefined(normalizeMockInterviewState(payload)),
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

export function normalizeJobApplications(applications = []) {
  return (Array.isArray(applications) ? applications : [])
    .map((application) => {
      const status = normalizeApplicationStatus(application?.status);
      const strategyNotes = String(
        application?.strategyNotes || application?.notes || "",
      ).trim();

      return pruneUndefined({
        id: String(application?.id || "").trim(),
        company: String(application?.company || "").trim(),
        role: String(application?.role || "").trim(),
        department: String(application?.department || "").trim(),
        jobLocation: String(application?.jobLocation || application?.location || "").trim(),
        workMode: normalizeWorkMode(application?.workMode),
        salary: String(application?.salary || application?.package || "").trim(),
        source: normalizeApplicationSource(application?.source),
        jobLink: String(application?.jobLink || "").trim(),
        applicationLink: String(application?.applicationLink || "").trim(),
        jobDescription: String(application?.jobDescription || "").trim(),
        requiredSkills: normalizeStringArray(
          application?.requiredSkills ?? application?.keySkillsRequired,
          24,
        ),
        mustHaveKeywords: normalizeStringArray(application?.mustHaveKeywords, 24),
        importantKeywords: normalizeStringArray(application?.importantKeywords, 24),
        experienceRequired: String(application?.experienceRequired || "").trim(),
        eligibility: String(application?.eligibility || "").trim(),
        linkedResumeVersion: String(application?.linkedResumeVersion || "").trim(),
        linkedResumeScore: Number.isFinite(Number(application?.linkedResumeScore))
          ? Math.max(0, Math.min(100, Math.round(Number(application.linkedResumeScore))))
          : null,
        resumeTailored: application?.resumeTailored === true,
        portfolioUrl: String(application?.portfolioUrl || "").trim(),
        githubUrl: String(application?.githubUrl || "").trim(),
        linkedinUrl: String(application?.linkedinUrl || "").trim(),
        status,
        priority: normalizePriority(application?.priority),
        savedDate: String(application?.savedDate || "").trim(),
        appliedDate: String(application?.appliedDate || "").trim(),
        deadline: String(application?.deadline || "").trim(),
        recruiterName: String(application?.recruiterName || "").trim(),
        recruiterContact: String(application?.recruiterContact || "").trim(),
        referralUsed: application?.referralUsed === true,
        interviewRounds: normalizeInterviewRounds(application?.interviewRounds),
        followUpDate: String(application?.followUpDate || "").trim(),
        followUpStatus: normalizeFollowUpStatus(application?.followUpStatus),
        responseReceived: application?.responseReceived === true,
        nextAction: String(application?.nextAction || "").trim(),
        whyFit: String(application?.whyFit || "").trim(),
        resumeChangesNeeded: String(application?.resumeChangesNeeded || "").trim(),
        talkingPoints: String(application?.talkingPoints || "").trim(),
        risksGaps: String(application?.risksGaps || "").trim(),
        compensationNotes: String(application?.compensationNotes || "").trim(),
        customizationsMade: String(application?.customizationsMade || "").trim(),
        strategyNotes,
        finalOutcome: String(application?.finalOutcome || "").trim(),
        notes: strategyNotes,
        createdAtIso: String(application?.createdAtIso || "").trim(),
        updatedAtIso: String(application?.updatedAtIso || "").trim(),
        taskSync: {
          deadline: application?.taskSync?.deadline !== false,
          followUp: application?.taskSync?.followUp !== false,
          interview: application?.taskSync?.interview !== false,
        },
      });
    })
    .filter((application) => application.id && application.company && application.role)
    .slice(0, 160);
}

function normalizeInterviewRounds(rounds = []) {
  return (Array.isArray(rounds) ? rounds : [])
    .map((round) => {
      const scheduledAt = String(round?.scheduledAt || "").trim();
      const derivedDate = extractDateOnly(scheduledAt);
      const derivedTime = extractTimeOnly(scheduledAt);

      return pruneUndefined({
        id: String(round?.id || "").trim(),
        name: String(round?.name || round?.label || "").trim(),
        date: String(round?.date || derivedDate).trim(),
        time: String(round?.time || derivedTime).trim(),
        type: normalizeRoundType(round?.type),
        status: normalizeRoundStatus(round?.status),
        prepFocus: String(round?.prepFocus || "").trim(),
        notes: String(round?.notes || round?.note || "").trim(),
      });
    })
    .filter((round) => round.id && round.name)
    .slice(0, 12);
}

function normalizeApplicationStatus(value) {
  const normalized = String(value || "wishlist").trim().toLowerCase();

  if (normalized === "interview") {
    return "interviewing";
  }

  if (
    ["wishlist", "ready", "applied", "interviewing", "offer", "closed"].includes(normalized)
  ) {
    return normalized;
  }

  return "wishlist";
}

function normalizeApplicationSource(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["linkedin", "careers", "referral", "college", "other"];
  return allowed.includes(normalized) ? normalized : "";
}

function normalizeWorkMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["remote", "hybrid", "on-site"];
  return allowed.includes(normalized) ? normalized : "";
}

function normalizePriority(value) {
  const normalized = String(value || "medium").trim().toLowerCase();
  return ["high", "medium", "low"].includes(normalized) ? normalized : "medium";
}

function normalizeFollowUpStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "sent", "responded", "not-needed"].includes(normalized)) {
    return normalized;
  }

  return "";
}

function normalizeRoundType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = [
    "hr",
    "technical",
    "demo",
    "managerial",
    "teaching-demo",
    "assignment",
    "other",
  ];
  return allowed.includes(normalized) ? normalized : "";
}

function normalizeRoundStatus(value) {
  const normalized = String(value || "planned").trim().toLowerCase();
  if (normalized === "selected") {
    return "cleared";
  }

  if (["planned", "completed", "cleared", "rejected"].includes(normalized)) {
    return normalized;
  }

  return "planned";
}

function normalizeStringArray(value, limit = 24) {
  const tokens = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n,;]+/);

  const seen = new Set();
  return tokens
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function extractDateOnly(value) {
  const safeValue = String(value || "").trim();
  const dateTimeMatch = safeValue.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (dateTimeMatch?.[1]) {
    return dateTimeMatch[1];
  }

  const dateOnlyMatch = safeValue.match(/^(\d{4}-\d{2}-\d{2})$/);
  return dateOnlyMatch?.[1] || "";
}

function extractTimeOnly(value) {
  const safeValue = String(value || "").trim();
  const timeMatch = safeValue.match(/T(\d{2}:\d{2})/);
  return timeMatch?.[1] || "";
}
