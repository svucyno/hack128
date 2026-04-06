import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const dbTimestamp = admin.database.ServerValue.TIMESTAMP;
const MAX_HISTORY_MESSAGES = 10;
const MAX_CHAT_TITLE_LENGTH = 54;
let cachedGeminiKey = "";
let cachedGeminiClient = null;

const STRING_LIST_SCHEMA = {
  type: "array",
  items: { type: "string" },
};

const RECOMMENDED_ROLE_SCHEMA = {
  type: "object",
  properties: {
    role: { type: "string" },
    fitScore: { type: "number" },
    reason: { type: "string" },
  },
  required: ["role", "fitScore", "reason"],
};

const ROADMAP_WEEK_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    goal: { type: "string" },
    tasks: STRING_LIST_SCHEMA,
    resources: STRING_LIST_SCHEMA,
  },
  required: ["label", "goal", "tasks", "resources"],
};

const ROADMAP_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    durationWeeks: { type: "number" },
    weeks: {
      type: "array",
      items: ROADMAP_WEEK_SCHEMA,
    },
  },
  required: ["title", "durationWeeks", "weeks"],
};

const PROFILE_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    overview: { type: "string" },
    strengths: STRING_LIST_SCHEMA,
    concerns: STRING_LIST_SCHEMA,
  },
  required: ["headline", "overview", "strengths", "concerns"],
};

const PARSED_RESUME_DATA_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    education: STRING_LIST_SCHEMA,
    skills: STRING_LIST_SCHEMA,
    experience: STRING_LIST_SCHEMA,
    projects: STRING_LIST_SCHEMA,
    certifications: STRING_LIST_SCHEMA,
  },
  required: [
    "name",
    "email",
    "phone",
    "education",
    "skills",
    "experience",
    "projects",
    "certifications",
  ],
};

const ATS_SECTION_BREAKDOWN_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    score: { type: "number" },
    weight: { type: "string" },
    insight: { type: "string" },
  },
  required: ["label", "score", "weight", "insight"],
};

const ATS_BREAKDOWN_SCHEMA = {
  type: "object",
  properties: {
    finalScore: { type: "number" },
    label: { type: "string" },
    keywordScore: { type: "number" },
    semanticScore: { type: "number" },
    resumeQualityScore: { type: "number" },
    sectionBreakdown: {
      type: "array",
      items: ATS_SECTION_BREAKDOWN_SCHEMA,
    },
    matchedKeywords: STRING_LIST_SCHEMA,
    missingKeywords: STRING_LIST_SCHEMA,
    issuesFound: STRING_LIST_SCHEMA,
    suggestions: STRING_LIST_SCHEMA,
  },
  required: [
    "finalScore",
    "label",
    "keywordScore",
    "semanticScore",
    "resumeQualityScore",
    "sectionBreakdown",
    "matchedKeywords",
    "missingKeywords",
    "issuesFound",
    "suggestions",
  ],
};

const SKILL_GAP_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    matchedSkills: STRING_LIST_SCHEMA,
    missingSkills: STRING_LIST_SCHEMA,
    prioritySkills: STRING_LIST_SCHEMA,
  },
  required: ["matchedSkills", "missingSkills", "prioritySkills"],
};

const PERFORMANCE_INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    riskLevel: { type: "string" },
    summary: { type: "string" },
    signals: STRING_LIST_SCHEMA,
    missingData: STRING_LIST_SCHEMA,
    suggestions: STRING_LIST_SCHEMA,
  },
  required: ["riskLevel", "summary", "signals", "missingData", "suggestions"],
};

const GENERAL_ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    summary: { type: "string" },
    confidence: { type: "string" },
    suggestedQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["answer", "summary", "confidence", "suggestedQuestions"],
};

const CAREER_GUIDANCE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    summary: { type: "string" },
    confidence: { type: "string" },
    disclaimer: { type: "string" },
    targetRole: { type: "string" },
    focusAreas: {
      type: "array",
      items: { type: "string" },
    },
    recommendedRoles: {
      type: "array",
      items: RECOMMENDED_ROLE_SCHEMA,
    },
    roadmap: ROADMAP_SCHEMA,
    profileSummary: PROFILE_SUMMARY_SCHEMA,
    parsedResumeData: PARSED_RESUME_DATA_SCHEMA,
    atsBreakdown: ATS_BREAKDOWN_SCHEMA,
    skillGapAnalysis: SKILL_GAP_ANALYSIS_SCHEMA,
    performanceInsights: PERFORMANCE_INSIGHTS_SCHEMA,
    finalSuggestions: STRING_LIST_SCHEMA,
    suggestedQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "answer",
    "summary",
    "confidence",
    "disclaimer",
    "targetRole",
    "focusAreas",
    "recommendedRoles",
    "roadmap",
    "profileSummary",
    "parsedResumeData",
    "atsBreakdown",
    "skillGapAnalysis",
    "performanceInsights",
    "finalSuggestions",
    "suggestedQuestions",
  ],
};

export function getCareerGuidanceEngineStatus() {
  const engine = getGeminiRuntime();
  return {
    aiEnabled: engine.aiEnabled,
    provider: engine.provider,
    model: engine.model,
  };
}

export async function runCareerGuidanceChat({
  uid,
  profile,
  message,
  requestedChatId = "",
  createNewChat = false,
}) {
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) {
    throw new Error("A guidance question is required.");
  }

  const guidanceRoot = profile?.careerGuidance || {};
  const chats = guidanceRoot.chats || {};
  const shouldReuseRequestedChat =
    !createNewChat && requestedChatId && typeof chats[requestedChatId] === "object";
  const fallbackActiveChatId =
    !createNewChat && typeof chats[guidanceRoot.activeChatId] === "object"
      ? guidanceRoot.activeChatId
      : "";
  const resolvedChatId =
    shouldReuseRequestedChat || fallbackActiveChatId
      ? requestedChatId || fallbackActiveChatId
      : admin.database().ref().push().key || `chat_${Date.now()}`;
  const currentChat = chats[resolvedChatId] || null;
  const history = getRecentMessages(currentChat?.messages);
  const context = buildCareerContext(profile);
  const engine = getGeminiRuntime();

  let guidance = null;
  let warning = "";

  if (engine.aiEnabled) {
    try {
      guidance = await generateGeminiGuidance({
        client: engine.client,
        model: engine.model,
        context,
        history,
        message: trimmedMessage,
      });
    } catch (error) {
      warning =
        error?.message ||
        "AI guidance could not complete this request. Built-in guidance was used instead.";
    }
  }

  if (!guidance) {
    guidance = buildFallbackGuidance({
      context,
      history,
      message: trimmedMessage,
    });
  }

  const provider = guidance.provider || engine.provider;
  const model = guidance.model || engine.model;
  const normalizedGuidance = normalizeGuidancePayload(guidance, context, trimmedMessage);

  await saveCareerGuidanceConversation({
    uid,
    trimmedMessage,
    guidance: normalizedGuidance,
    guidanceRoot,
    currentChat,
    resolvedChatId,
    provider,
    model,
    warning,
    context,
  });

  return {
    chatId: resolvedChatId,
    createdNewChat: !currentChat,
    provider,
    model,
    warning,
    ...normalizedGuidance,
  };
}

function getGeminiRuntime() {
  const apiKey = String(
    process.env.CAREER_GUIDANCE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
  ).trim();
  const model =
    !process.env.CAREER_GUIDANCE_GEMINI_MODEL &&
    (!process.env.GEMINI_MODEL || process.env.GEMINI_MODEL === "gemini-2.0-flash")
      ? "gemini-2.5-flash"
      : process.env.CAREER_GUIDANCE_GEMINI_MODEL || process.env.GEMINI_MODEL;

  if (!apiKey) {
    cachedGeminiKey = "";
    cachedGeminiClient = null;
    return {
      aiEnabled: false,
      client: null,
      provider: "Built-in guidance",
      model: "fallback",
    };
  }

  if (!cachedGeminiClient || cachedGeminiKey !== apiKey) {
    cachedGeminiKey = apiKey;
    cachedGeminiClient = new GoogleGenAI({ apiKey });
  }

  return {
    aiEnabled: true,
    client: cachedGeminiClient,
    provider: "AI",
    model,
  };
}

function buildCareerContext(profile = {}) {
  const account = profile.account || {};
  const resumeOverview = profile.resumeOverview || {};
  const guidance = profile.careerGuidance || {};
  const latestAnalysis = profile.resumeWorkspace?.latestAnalysis?.report || null;
  const latestContext = profile.resumeWorkspace?.latestAnalysis?.context || null;
  const rawResumeText = profile.resumeWorkspace?.latestAnalysis?.rawResumeText || "";
  const parsedSections = extractResumeSections(rawResumeText);
  const jobMatches = Array.isArray(latestAnalysis?.jobMatches) ? latestAnalysis.jobMatches : [];
  const latestAnalyzedResumeRole = getLatestAnalyzedResumeRole(latestAnalysis);
  const latestAnalyzedResumeRoleMatch = getLatestAnalyzedResumeRoleMatch(latestAnalysis);
  const missingSkills = uniqueStrings([
    ...(resumeOverview.missingSkills || []),
    ...(latestAnalysis?.missingSkills || []),
  ]).slice(0, 8);
  const extractedSkills = uniqueStrings([
    ...(resumeOverview.extractedSkills || []),
    ...(latestAnalysis?.extractedSkills || []),
  ]).slice(0, 12);
  const topKeywords = uniqueStrings([
    ...(resumeOverview.topKeywords || []),
    ...(latestAnalysis?.topKeywords || []),
  ]).slice(0, 10);
  const strengths = uniqueStrings([
    ...(resumeOverview.strengths || []),
    ...(latestAnalysis?.strengths || []),
  ]).slice(0, 8);
  const profileSkills = uniqueStrings([
    ...toArray(profile.skills),
    ...toArray(profile.profile?.skills),
    ...toArray(profile.userProfile?.skills),
  ]).slice(0, 12);
  const interests = uniqueStrings([
    ...toArray(profile.interests),
    ...toArray(profile.profile?.interests),
    ...toArray(profile.userProfile?.interests),
  ]).slice(0, 8);
  const academicPerformance = buildAcademicPerformanceContext(profile);
  const adaptiveLearning = buildAdaptiveLearningContext(profile);
  const breakdown = latestAnalysis?.breakdown || {};
  const sectionScores = latestAnalysis?.sectionScores || {};
  const diagnostics = latestAnalysis?.diagnostics || {};
  const jdComparison = latestAnalysis?.jdComparison || null;

  return {
    student: {
      name: profile.name || account.name || "Student",
      email: profile.email || account.email || "",
      emailVerified: Boolean(profile.emailVerified ?? account.emailVerified),
      role: profile.role || account.role || "Student",
      createdAtIso: profile.createdAtIso || account.createdAtIso || "",
      lastLoginAtIso: profile.lastLoginAtIso || account.lastLoginAtIso || "",
    },
    resume: {
      available: Boolean(resumeOverview.latestResumeFileName || latestAnalysis),
      status: resumeOverview.status || "idle",
      latestResumeFileName:
        resumeOverview.latestResumeFileName ||
        latestContext?.fileName ||
        profile.resumeWorkspace?.selectedFile?.name ||
        "",
      analyzedAtIso: latestContext?.analyzedAt || resumeOverview.updatedAtIso || "",
      identityMatch:
        typeof resumeOverview.identityMatch === "boolean"
          ? resumeOverview.identityMatch
          : null,
      parsedName:
        resumeOverview.parsedName || latestAnalysis?.extractedUser?.name || "",
      parsedEmail:
        resumeOverview.parsedEmail || latestAnalysis?.extractedUser?.email || "",
      phone: resumeOverview.phone || latestAnalysis?.extractedUser?.phone || "",
      atsScore: toNumberOrNull(resumeOverview.atsScore ?? latestAnalysis?.atsScore),
      scoreLabel: resumeOverview.scoreLabel || latestAnalysis?.scoreLabel || "",
      topRole: latestAnalyzedResumeRole || resumeOverview.topRole || "",
      topRoleMatch: toNumberOrNull(
        latestAnalyzedResumeRoleMatch ?? resumeOverview.topRoleMatch,
      ),
      educationLevel:
        resumeOverview.educationLevel ||
        latestAnalysis?.extractedUser?.educationLevel ||
        "",
      experienceLevel:
        resumeOverview.experienceLevel ||
        latestAnalysis?.extractedUser?.experienceLevel ||
        "",
      yearsExperienceDisplay:
        resumeOverview.yearsExperienceDisplay ||
        latestAnalysis?.extractedUser?.yearsExperienceDisplay ||
        "",
      missingSkills,
      extractedSkills,
      topKeywords,
      strengths,
      jdScore: toNumberOrNull(resumeOverview.jdScore ?? jdComparison?.score),
      matchedKeywords: uniqueStrings(jdComparison?.matchedKeywords || []).slice(0, 8),
      missingKeywords: uniqueStrings(jdComparison?.missingKeywords || []).slice(0, 8),
      suggestions: uniqueStrings(latestAnalysis?.suggestions || []).slice(0, 8),
      whyScoreIsLow: uniqueStrings(latestAnalysis?.whyScoreIsLow || []).slice(0, 6),
      howToReachNinety: uniqueStrings(latestAnalysis?.howToReachNinety || []).slice(0, 6),
      careerRecommendations: uniqueStrings(latestAnalysis?.careerRecommendations || []).slice(0, 6),
      roleSpecificPlan: uniqueStrings(latestAnalysis?.roleSpecificPlan || []).slice(0, 6),
      resumeWordCount: toNumberOrNull(resumeOverview.resumeWordCount ?? latestAnalysis?.resumeWordCount),
      jobDescription: truncateText(latestContext?.jobDescription || "", 1800),
      rawResumePreview: truncateText(rawResumeText, 1800),
      sectionHighlights: parsedSections,
      breakdown: {
        keywordMatch: toNumberOrNull(breakdown.keywordMatch),
        skillsMatch: toNumberOrNull(breakdown.skillsMatch),
        experience: toNumberOrNull(breakdown.experience),
        projectsImpact: toNumberOrNull(breakdown.projectsImpact),
        education: toNumberOrNull(breakdown.education),
        formatting: toNumberOrNull(breakdown.formatting),
        readability: toNumberOrNull(breakdown.readability),
      },
      sectionScores: {
        skills: toNumberOrNull(sectionScores.skills),
        projects: toNumberOrNull(sectionScores.projects),
        experience: toNumberOrNull(sectionScores.experience),
        education: toNumberOrNull(sectionScores.education),
        formatting: toNumberOrNull(sectionScores.formatting),
      },
      diagnostics: {
        atsParsing: toNumberOrNull(diagnostics.atsParsing),
        actionImpact: toNumberOrNull(diagnostics.actionImpact),
        roleAlignment: toNumberOrNull(diagnostics.roleAlignment),
      },
      recommendedRoles: jobMatches.slice(0, 3).map((item) => ({
        role: item.role || "",
        match: toNumberOrNull(item.match),
      })),
    },
    profileSignals: {
      skills: profileSkills,
      interests,
      education: uniqueStrings(toArray(profile.education)).slice(0, 5),
    },
    academicPerformance,
    adaptiveLearning,
    guidanceMemory: {
      latestSummary: truncateText(guidance.latestSummary || "", 240),
      latestTargetRole: truncateText(guidance.latestTargetRole || "", 80),
      latestFocusAreas: uniqueStrings(guidance.latestFocusAreas || []).slice(0, 6),
      latestRecommendedRoles: (guidance.latestRecommendedRoles || [])
        .map((item) => ({
          role: truncateText(item?.role || "", 80),
          fitScore: toNumberOrNull(item?.fitScore ?? item?.match),
        }))
        .filter((item) => item.role),
      latestSkillGapAnalysis: {
        matchedSkills: uniqueStrings(guidance.latestSkillGapAnalysis?.matchedSkills || []).slice(0, 8),
        missingSkills: uniqueStrings(guidance.latestSkillGapAnalysis?.missingSkills || []).slice(0, 8),
        prioritySkills: uniqueStrings(guidance.latestSkillGapAnalysis?.prioritySkills || []).slice(0, 5),
      },
    },
  };
}

function buildAcademicPerformanceContext(profile = {}) {
  const source =
    profile.academicPerformance ||
    profile.performance ||
    profile.studentPerformance ||
    profile.performanceData ||
    {};

  const attendance = normalizeMetricValue(source.attendance);
  const assignments = normalizeMetricValue(
    source.assignments ?? source.assignmentScores ?? source.assignmentAverage,
  );
  const exams = normalizeMetricValue(source.exams ?? source.examScores ?? source.examAverage);
  const hasData = [attendance, assignments, exams].some((value) => value != null);

  return {
    available: hasData,
    attendance,
    assignments,
    exams,
    notes: uniqueStrings(
      toArray(source.notes).length
        ? toArray(source.notes)
        : toArray(source.flags).length
          ? toArray(source.flags)
          : toArray(source.recommendations),
    ).slice(0, 5),
  };
}

function getLatestAnalyzedResumeRole(latestAnalysis) {
  return truncateText(
    latestAnalysis?.jobMatches?.[0]?.role || latestAnalysis?.topRole || "",
    80,
  );
}

function getLatestAnalyzedResumeRoleMatch(latestAnalysis) {
  if (!latestAnalysis || typeof latestAnalysis !== "object") {
    return null;
  }

  return toNumberOrNull(
    latestAnalysis?.jobMatches?.[0]?.match ?? latestAnalysis?.topRoleMatch,
  );
}

function buildAdaptiveLearningContext(profile = {}) {
  const source =
    profile.adaptiveLearning ||
    profile.learningProgress ||
    profile.progressSnapshot ||
    profile.learningProfile ||
    {};

  const quizPerformance = normalizeMetricValue(
    source.quizPerformance ?? source.quizScore ?? source.quizScores,
  );
  const completionRate = normalizeMetricValue(
    source.completionRate ?? source.progress ?? source.progressRate,
  );
  const learningSpeed = truncateText(
    source.learningSpeed || source.pace || source.speed || "",
    60,
  );
  const hasData = [quizPerformance, completionRate].some((value) => value != null) || Boolean(learningSpeed);

  return {
    available: hasData,
    quizPerformance,
    completionRate,
    learningSpeed,
    weakAreas: uniqueStrings(
      toArray(source.weakAreas).length ? toArray(source.weakAreas) : toArray(source.focusAreas),
    ).slice(0, 5),
  };
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null || value === "") {
    return [];
  }

  if (typeof value === "object") {
    return Object.values(value);
  }

  return [value];
}

function normalizeMetricValue(value) {
  if (Array.isArray(value)) {
    const numericValues = value
      .map((item) => normalizeMetricValue(item))
      .filter((item) => item != null);
    if (!numericValues.length) {
      return null;
    }
    return Math.round(
      numericValues.reduce((sum, item) => sum + item, 0) / numericValues.length,
    );
  }

  if (value && typeof value === "object") {
    const numericValues = Object.values(value)
      .map((item) => normalizeMetricValue(item))
      .filter((item) => item != null);
    if (!numericValues.length) {
      return null;
    }
    return Math.round(
      numericValues.reduce((sum, item) => sum + item, 0) / numericValues.length,
    );
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return clampNumber(numericValue, 0, 100);
}

function extractResumeSections(rawText = "") {
  const sectionDefinitions = [
    {
      key: "education",
      patterns: [/^education$/i, /^academic(?: background| qualifications?)?$/i],
    },
    {
      key: "experience",
      patterns: [/^(experience|work experience|employment|internships?)$/i],
    },
    {
      key: "projects",
      patterns: [/^(projects?|academic projects?)$/i],
    },
    {
      key: "certifications",
      patterns: [/^(certifications?|licenses?|courses?)$/i],
    },
  ];

  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => cleanResumeLine(line))
    .filter(Boolean);
  const sections = {
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  };
  let activeSection = "";

  lines.forEach((line) => {
    const normalizedLine = line
      .toLowerCase()
      .replace(/[:\-]+$/g, "")
      .trim();
    const nextSection = sectionDefinitions.find((section) =>
      section.patterns.some((pattern) => pattern.test(normalizedLine)),
    );

    if (nextSection) {
      activeSection = nextSection.key;
      return;
    }

    if (!activeSection) {
      return;
    }

    sections[activeSection].push(line);
  });

  return {
    education: pickResumeSectionItems(sections.education, 4),
    experience: pickResumeSectionItems(sections.experience, 4),
    projects: pickResumeSectionItems(sections.projects, 4),
    certifications: pickResumeSectionItems(sections.certifications, 4),
  };
}

function cleanResumeLine(line) {
  return String(line || "")
    .replace(/\u2022/g, "-")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-*]\s*/, "")
    .trim();
}

function pickResumeSectionItems(lines = [], limit = 4) {
  return uniqueStrings(lines)
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 160 &&
        !/^(email|phone|linkedin|github|portfolio|address)\b/i.test(line),
    )
    .slice(0, limit);
}

function getRecentMessages(messages) {
  return Object.values(messages || {})
    .filter((item) => item?.text && item?.role)
    .sort((left, right) => getMessageTime(left) - getMessageTime(right))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      text: String(item.text || "").trim(),
    }))
    .filter((item) => item.text);
}

function getMessageTime(message) {
  if (typeof message?.createdAt === "number") {
    return message.createdAt;
  }

  if (message?.createdAtIso) {
    const parsed = new Date(message.createdAtIso).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function uniqueStrings(values = []) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function toNumberOrNull(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function getPromptType(message) {
  const normalized = String(message || "").toLowerCase();

  if (/^(hi|hii|hello|hey|heyy|hola|yo|good morning|good afternoon|good evening)\b/.test(normalized.trim())) {
    return "greeting";
  }
  if (/\b(thanks|thank you|thx)\b/.test(normalized)) {
    return "thanks";
  }
  if (/\b(help|what can you do|how can you help|capabilities)\b/.test(normalized)) {
    return "help";
  }
  if (/roadmap|plan|week|month|schedule/.test(normalized)) {
    return "roadmap";
  }
  if (/resume|ats|cv|improve/.test(normalized)) {
    return "resume";
  }
  if (/role|career|job|fit|which/.test(normalized)) {
    return "roles";
  }
  if (/interview|placement|questions/.test(normalized)) {
    return "interview";
  }
  if (/project|portfolio/.test(normalized)) {
    return "projects";
  }
  if (/learn|skill|study/.test(normalized)) {
    return "skills";
  }
  return "general";
}

function createRoadmap(context, message) {
  const targetRole = context.resume.topRole || "software role";
  const skillTargets = context.resume.missingSkills.length
    ? context.resume.missingSkills.slice(0, 4)
    : ["projects", "problem solving", "interview communication", "role-specific depth"];
  const extractedStrength = context.resume.strengths[0] || context.resume.extractedSkills[0] || "your existing strengths";
  const wantsRoadmap = getPromptType(message) === "roadmap";
  const durationWeeks = wantsRoadmap ? 6 : 4;

  return {
    title: `${durationWeeks}-week roadmap for ${targetRole}`,
    durationWeeks,
    weeks: Array.from({ length: durationWeeks }, (_, index) => {
      const skill = skillTargets[index % skillTargets.length];
      return {
        label: `Week ${index + 1}`,
        goal:
          index === 0
            ? `Stabilize your baseline and align your profile to ${targetRole}.`
            : `Strengthen ${skill} with practical output.`,
        tasks:
          index === 0
            ? [
                "Review your current resume and mark missing proof points.",
                `Define one realistic target role: ${targetRole}.`,
                `List the top 3 strengths you already have, starting with ${extractedStrength}.`,
              ]
            : [
                `Study ${skill} for 60 to 90 minutes each day.`,
                `Build or refine one mini deliverable that demonstrates ${skill}.`,
                "Write down what improved, what is still weak, and what to fix next.",
              ],
        resources:
          index === 0
            ? [
                "Review the latest resume analysis and ATS suggestions.",
                "Use one role description as the benchmark for your next edits.",
              ]
            : [
                `Collect one learning resource and one practice task for ${skill}.`,
                "Track progress in a short weekly notes document.",
              ],
      };
    }),
  };
}

function buildFallbackGuidance({ context, message }) {
  const promptType = getPromptType(message);
  const structuredReport = buildStructuredIntelligenceReport(context, promptType);
  const topRole = context.resume.topRole || "software engineer";
  const atsScore =
    context.resume.atsScore != null ? `${context.resume.atsScore}/100` : "not available";
  const missingSkills = context.resume.missingSkills;
  const suggestedFocusAreas = missingSkills.length
    ? missingSkills.slice(0, 4)
    : context.resume.extractedSkills.slice(0, 4);
  const recommendedRoles = context.resume.recommendedRoles.length
    ? context.resume.recommendedRoles.map((item) => ({
        role: item.role,
        fitScore: item.match ?? 0,
        reason: `This role already appears in your resume analysis with a ${item.match ?? 0}% match.`,
      }))
    : inferRolesFromProfile(context);
  const roadmap = createRoadmap(context, message);
  const emptyRoadmap = {
    title: "",
    durationWeeks: 0,
    weeks: [],
  };
  const defaultQuestions = [
    "What career path fits me best?",
    "How do I improve my ATS score?",
    `Can you create a roadmap for ${topRole}?`,
    "What project should I build next?",
  ];
  let targetRole = context.guidanceMemory?.latestTargetRole || "";

  let answer = `Based on your current profile, ${topRole} looks like the strongest direction.`;
  let summary = `Best current direction: ${recommendedRoles[0]?.role || topRole}. Main focus: ${suggestedFocusAreas.slice(0, 2).join(", ") || "profile completion"}.`;
  let confidence =
    context.resume.atsScore != null || context.resume.extractedSkills.length
      ? "medium"
      : "low";
  let disclaimer =
    context.resume.available
      ? "This answer is personalized from your saved profile and resume data."
      : "Resume analysis is missing, so this guidance is based on limited account data.";
  let focusAreas = structuredReport.focusAreas.length
    ? structuredReport.focusAreas
    : suggestedFocusAreas.length
      ? suggestedFocusAreas
      : ["Upload your resume", "Run analysis", "Choose a target role"];
  let responseRoadmap = roadmap;
  let responseRoles = recommendedRoles;
  let suggestedQuestions = defaultQuestions;
  let profileSummary = structuredReport.profileSummary;
  let parsedResumeData = structuredReport.parsedResumeData;
  let atsBreakdown = structuredReport.atsBreakdown;
  let skillGapAnalysis = structuredReport.skillGapAnalysis;
  let performanceInsights = structuredReport.performanceInsights;
  let finalSuggestions = structuredReport.finalSuggestions;

  if (promptType === "greeting") {
    answer = `Hi ${context.student.name || "there"}! I can help with career planning, ATS improvement, interviews, project ideas, learning plans, and general questions too. Ask directly, and I’ll answer while using your saved context when it helps.`;
    summary = "Ready to answer career and general questions with optional profile context.";
    confidence = "high";
    focusAreas = [];
    responseRoadmap = emptyRoadmap;
    responseRoles = [];
    profileSummary = emptyProfileSummary();
    parsedResumeData = emptyParsedResumeData();
    atsBreakdown = emptyAtsBreakdown();
    skillGapAnalysis = emptySkillGapAnalysis();
    performanceInsights = emptyPerformanceInsights();
    finalSuggestions = [];
  } else if (promptType === "thanks") {
    answer = `You're welcome. If you want, I can continue with career planning, ATS fixes, project selection, interview prep, or any other question you want to ask next.`;
    summary = "Conversation can continue with career or general follow-up questions.";
    confidence = "high";
    focusAreas = [];
    responseRoadmap = emptyRoadmap;
    responseRoles = [];
    profileSummary = emptyProfileSummary();
    parsedResumeData = emptyParsedResumeData();
    atsBreakdown = emptyAtsBreakdown();
    skillGapAnalysis = emptySkillGapAnalysis();
    performanceInsights = emptyPerformanceInsights();
    finalSuggestions = [];
  } else if (promptType === "help") {
    answer = `I can help you choose roles, improve ATS, find missing skills, create roadmaps, suggest projects, prepare for interviews, explain concepts, brainstorm options, and answer general questions. Ask naturally and I’ll respond directly.`;
    summary = "Available for career guidance, learning support, and general question answering.";
    confidence = "high";
    responseRoadmap = emptyRoadmap;
    responseRoles = [];
    finalSuggestions = [
      "Ask for a full resume and ATS analysis.",
      "Ask which roles fit your current profile.",
      "Ask for a 4-week or 8-week learning roadmap.",
      "Ask how to close your highest-priority skill gaps.",
    ];
  }

  if (promptType === "resume") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `Your current ATS snapshot is ${atsScore}. Improve the resume first by strengthening proof around ${suggestedFocusAreas.join(", ") || "impact, projects, and role-specific keywords"}.`;
  } else if (promptType === "roadmap") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `I built a ${roadmap.durationWeeks}-week roadmap focused on ${topRole}. The first priority is ${suggestedFocusAreas[0] || "role alignment"}, then you should turn each missing area into a visible project or interview-ready example.`;
  } else if (promptType === "roles") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `Your profile fits ${recommendedRoles[0]?.role || topRole} best right now. That fit comes from your current strengths, while ${suggestedFocusAreas.slice(0, 2).join(" and ") || "role depth"} are the main gaps keeping you from stronger placement readiness.`;
  } else if (promptType === "interview") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `For interview readiness, keep your answers anchored to one target role: ${topRole}. Build concise stories around your projects, practice problem solving, and prepare explanations for the gaps around ${suggestedFocusAreas.join(", ") || "system design and implementation depth"}.`;
  } else if (promptType === "projects") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `Your next project should directly support ${topRole}. Use it to demonstrate ${suggestedFocusAreas.join(", ") || "backend depth, deployment, and measurable impact"} with one deployed end-to-end build.`;
  } else if (promptType === "skills") {
    targetRole = targetRole || recommendedRoles[0]?.role || topRole;
    answer = `The next skills to learn are ${suggestedFocusAreas.join(", ") || "role-specific fundamentals"}. Learn them in project context, not as isolated theory, so your resume and interviews both improve at the same time.`;
  } else if (promptType === "general") {
    answer = context.resume.available
      ? `I can answer general questions too. Ask directly, and if your saved profile or resume context helps, I’ll use it to make the answer more relevant.`
      : `I can answer general questions directly, and I can personalize career guidance more deeply once a resume analysis is available.`;
    summary = "General answering is available, with career context used when relevant.";
    responseRoadmap = emptyRoadmap;
  }

  return {
    provider: "Built-in guidance",
    model: "fallback",
    answer,
    summary,
    confidence,
    disclaimer,
    targetRole,
    focusAreas,
    recommendedRoles: responseRoles,
    roadmap: responseRoadmap,
    profileSummary,
    parsedResumeData,
    atsBreakdown,
    skillGapAnalysis,
    performanceInsights,
    finalSuggestions,
    suggestedQuestions,
  };
}

function buildStructuredIntelligenceReport(context, promptType) {
  const profileSummary = buildProfileSummary(context);
  const parsedResumeData = buildParsedResumeData(context);
  const atsBreakdown = buildAtsBreakdown(context);
  const skillGapAnalysis = buildSkillGapAnalysis(context, atsBreakdown);
  const performanceInsights = buildPerformanceInsights(context, atsBreakdown);
  const finalSuggestions = buildFinalSuggestions(context, promptType, atsBreakdown, skillGapAnalysis);

  return {
    focusAreas: uniqueStrings([
      ...skillGapAnalysis.prioritySkills,
      ...atsBreakdown.issuesFound,
      ...context.resume.strengths.slice(0, 2),
    ]).slice(0, 6),
    profileSummary,
    parsedResumeData,
    atsBreakdown,
    skillGapAnalysis,
    performanceInsights,
    finalSuggestions,
  };
}

function buildProfileSummary(context) {
  if (!context.resume.available) {
    return {
      headline: `${context.student.name} needs a resume analysis before the system can rank roles with confidence.`,
      overview:
        "Upload a resume and optionally a job description to unlock ATS scoring, structured parsing, skill gaps, and role-fit recommendations.",
      strengths: [],
      concerns: ["Resume data is missing, so current guidance is based on account-level information only."],
    };
  }

  const topRole = context.resume.topRole || "software role";
  const topRoleMatch = context.resume.topRoleMatch != null ? `${context.resume.topRoleMatch}%` : "an estimated";
  const atsScore = context.resume.atsScore != null ? `${context.resume.atsScore}/100` : "not available";
  const strengths = context.resume.strengths.length
    ? context.resume.strengths
    : context.resume.extractedSkills.slice(0, 4);
  const concerns = uniqueStrings([
    ...(context.resume.identityMatch === false
      ? ["Resume identity mismatch detected. Verify that the uploaded resume belongs to the logged-in user."]
      : []),
    ...context.resume.missingSkills.slice(0, 3).map(
      (skill) => `${skill} is still a visible gap for stronger role alignment.`,
    ),
    ...context.resume.whyScoreIsLow.slice(0, 2),
  ]).slice(0, 4);

  return {
    headline: `${context.student.name} currently shows the strongest fit for ${topRole}.`,
    overview: `Current ATS score: ${atsScore}. Role-fit alignment is ${topRoleMatch} match for ${topRole}, based on saved resume signals and extracted profile evidence.`,
    strengths,
    concerns,
  };
}

function buildParsedResumeData(context) {
  if (!context.resume.available) {
    return emptyParsedResumeData();
  }

  return {
    name: sanitizeUnavailableValue(context.resume.parsedName),
    email: sanitizeUnavailableValue(context.resume.parsedEmail),
    phone: sanitizeUnavailableValue(context.resume.phone),
    education: context.resume.sectionHighlights.education.length
      ? context.resume.sectionHighlights.education
      : sanitizeUnavailableValue(context.resume.educationLevel)
        ? [context.resume.educationLevel]
        : [],
    skills: context.resume.extractedSkills,
    experience: context.resume.sectionHighlights.experience,
    projects: context.resume.sectionHighlights.projects,
    certifications: context.resume.sectionHighlights.certifications,
  };
}

function buildAtsBreakdown(context) {
  const finalScore =
    context.resume.atsScore != null
      ? context.resume.atsScore
      : clampNumber(
          (context.resume.sectionScores.skills || 0) +
            (context.resume.sectionScores.projects || 0) +
            (context.resume.sectionScores.experience || 0) +
            (context.resume.sectionScores.education || 0) +
            (context.resume.sectionScores.formatting || 0),
          0,
          100,
        );
  const keywordScore =
    context.resume.jdScore != null
      ? context.resume.jdScore
      : clampNumber(((context.resume.breakdown.keywordMatch || 0) / 30) * 100, 0, 100);
  const semanticScore =
    context.resume.topRoleMatch != null
      ? clampNumber(context.resume.topRoleMatch, 0, 100)
      : clampNumber(
          keywordScore * 0.55 + ((context.resume.sectionScores.skills || 0) / 40) * 45,
          0,
          100,
        );
  const formattingScore = ((context.resume.breakdown.formatting || 0) / 10) * 100;
  const contentStrengthScore =
    (((context.resume.breakdown.projectsImpact || 0) / 10) * 55) +
    (((context.resume.diagnostics.actionImpact || 0) / 10) * 45);
  const keywordDensityScore =
    context.resume.jdScore != null
      ? context.resume.jdScore
      : clampNumber(
          (((context.resume.breakdown.keywordMatch || 0) / 30) * 70) +
            (((context.resume.breakdown.skillsMatch || 0) / 20) * 30),
          0,
          100,
        );
  const resumeQualityScore = clampNumber(
    formattingScore * 0.3 + contentStrengthScore * 0.4 + keywordDensityScore * 0.3,
    0,
    100,
  );

  return {
    finalScore,
    label: context.resume.scoreLabel || buildScoreLabelFromScore(finalScore),
    keywordScore,
    semanticScore,
    resumeQualityScore,
    sectionBreakdown: [
      {
        label: "Skills Match",
        score: clampNumber(context.resume.sectionScores.skills, 0, 40),
        weight: "40%",
        insight: context.resume.missingSkills.length
          ? `Main skill gaps: ${context.resume.missingSkills.slice(0, 3).join(", ")}.`
          : "Core skills are reasonably aligned with the current target role.",
      },
      {
        label: "Projects",
        score: clampNumber(context.resume.sectionScores.projects, 0, 20),
        weight: "20%",
        insight:
          context.resume.roleSpecificPlan[0] ||
          "Use stronger project bullets with measurable outcomes and role-specific tools.",
      },
      {
        label: "Experience",
        score: clampNumber(context.resume.sectionScores.experience, 0, 15),
        weight: "15%",
        insight:
          context.resume.experienceLevel
            ? `Current inferred level: ${context.resume.experienceLevel}.`
            : "Experience evidence is limited or not clearly expressed.",
      },
      {
        label: "Education",
        score: clampNumber(context.resume.sectionScores.education, 0, 10),
        weight: "10%",
        insight:
          sanitizeUnavailableValue(context.resume.educationLevel) ||
          "Education details are not clearly structured in the saved resume analysis.",
      },
      {
        label: "Resume Format",
        score: clampNumber(context.resume.sectionScores.formatting, 0, 15),
        weight: "15%",
        insight:
          context.resume.resumeWordCount != null
            ? `Current resume length is about ${context.resume.resumeWordCount} words.`
            : "Formatting quality depends on section clarity, bullets, and readable structure.",
      },
    ],
    matchedKeywords: context.resume.matchedKeywords.length
      ? context.resume.matchedKeywords
      : context.resume.topKeywords.slice(0, 8),
    missingKeywords: context.resume.missingKeywords.length
      ? context.resume.missingKeywords
      : context.resume.missingSkills.slice(0, 8),
    issuesFound: uniqueStrings([
      ...(context.resume.identityMatch === false
        ? ["Resume identity does not match the logged-in user."]
        : []),
      ...context.resume.whyScoreIsLow,
      ...(context.resume.missingSkills.length
        ? [`Important missing skills: ${context.resume.missingSkills.slice(0, 3).join(", ")}.`]
        : []),
    ]).slice(0, 6),
    suggestions: uniqueStrings([
      ...context.resume.howToReachNinety,
      ...context.resume.suggestions,
      ...context.resume.roleSpecificPlan,
      ...(context.resume.missingSkills.length
        ? [`Add direct evidence for ${context.resume.missingSkills.slice(0, 2).join(" and ")}.`]
        : []),
    ]).slice(0, 6),
  };
}

function buildSkillGapAnalysis(context, atsBreakdown) {
  const matchedSkills = uniqueStrings([
    ...context.resume.extractedSkills.filter((skill) =>
      context.resume.matchedKeywords.some((keyword) => keyword.toLowerCase() === skill.toLowerCase()),
    ),
    ...context.resume.strengths.filter((item) => !/resume|fit|alignment/i.test(item)),
  ]).slice(0, 6);

  return {
    matchedSkills,
    missingSkills: context.resume.missingSkills.slice(0, 8),
    prioritySkills: uniqueStrings([
      ...context.resume.missingSkills.slice(0, 4),
      ...atsBreakdown.missingKeywords.slice(0, 2),
    ]).slice(0, 5),
  };
}

function buildPerformanceInsights(context, atsBreakdown) {
  const academic = context.academicPerformance;
  if (academic.available) {
    const metrics = [academic.attendance, academic.assignments, academic.exams].filter(
      (value) => value != null,
    );
    const average = metrics.length
      ? Math.round(metrics.reduce((sum, value) => sum + value, 0) / metrics.length)
      : 0;
    const riskLevel = average >= 75 ? "Low" : average >= 55 ? "Medium" : "High";

    return {
      riskLevel,
      summary: `Academic risk estimate is ${riskLevel} based on the saved attendance, assignment, and exam metrics.`,
      signals: uniqueStrings([
        academic.attendance != null ? `Attendance: ${academic.attendance}%` : "",
        academic.assignments != null ? `Assignments: ${academic.assignments}%` : "",
        academic.exams != null ? `Exams: ${academic.exams}%` : "",
        ...academic.notes,
      ]).slice(0, 5),
      missingData: [],
      suggestions: uniqueStrings([
        riskLevel !== "Low" ? "Increase consistency in attendance, assignments, and revision cadence." : "",
        "Tie weak academic areas to a focused weekly study routine.",
        "Review progress every week and adjust learning difficulty if scores stay flat.",
      ]).slice(0, 4),
    };
  }

  const readinessRisk =
    atsBreakdown.finalScore >= 80 ? "Low" : atsBreakdown.finalScore >= 60 ? "Medium" : "High";

  return {
    riskLevel: readinessRisk,
    summary: `Academic performance data is not available, so this is a career-readiness risk estimate based on ATS score, role alignment, and visible skill gaps.`,
    signals: uniqueStrings([
      context.resume.atsScore != null ? `ATS score: ${context.resume.atsScore}/100` : "",
      context.resume.topRole ? `Best-fit role: ${context.resume.topRole}` : "",
      context.resume.missingSkills.length
        ? `Critical gaps: ${context.resume.missingSkills.slice(0, 3).join(", ")}`
        : "No major skill gaps were detected from the saved analysis.",
      context.adaptiveLearning.learningSpeed
        ? `Learning pace signal: ${context.adaptiveLearning.learningSpeed}`
        : "",
    ]).slice(0, 5),
    missingData: ["Attendance", "Assignments", "Exam scores"],
    suggestions: uniqueStrings([
      "Add academic metrics if you want true at-risk prediction instead of readiness estimation.",
      "Use the roadmap to close skill gaps that are limiting placement readiness.",
      "Practice timed interview preparation and one role-specific project each week.",
    ]).slice(0, 4),
  };
}

function buildFinalSuggestions(context, promptType, atsBreakdown, skillGapAnalysis) {
  const suggestions = [
    context.resume.available
      ? `Prioritize the first gap: ${skillGapAnalysis.prioritySkills[0] || "role-specific depth"}.`
      : "Upload and analyze your resume to unlock personalized role-fit and ATS guidance.",
    atsBreakdown.suggestions[0] || "",
    promptType === "projects"
      ? "Build one project that directly proves the role you want next."
      : "Turn weak resume areas into visible project proof, not just study notes.",
    context.resume.jobDescription
      ? "Keep tailoring the resume against the target job description before each application."
      : "Add a target job description next time to improve keyword and skill-gap accuracy.",
    "Use mentor support, mock interviews, or collaborative learning sessions for weak areas that are hard to fix alone.",
  ];

  return uniqueStrings(suggestions).slice(0, 5);
}

function emptyProfileSummary() {
  return {
    headline: "",
    overview: "",
    strengths: [],
    concerns: [],
  };
}

function emptyParsedResumeData() {
  return {
    name: "",
    email: "",
    phone: "",
    education: [],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
  };
}

function emptyAtsBreakdown() {
  return {
    finalScore: 0,
    label: "",
    keywordScore: 0,
    semanticScore: 0,
    resumeQualityScore: 0,
    sectionBreakdown: [],
    matchedKeywords: [],
    missingKeywords: [],
    issuesFound: [],
    suggestions: [],
  };
}

function emptySkillGapAnalysis() {
  return {
    matchedSkills: [],
    missingSkills: [],
    prioritySkills: [],
  };
}

function emptyPerformanceInsights() {
  return {
    riskLevel: "",
    summary: "",
    signals: [],
    missingData: [],
    suggestions: [],
  };
}

function sanitizeUnavailableValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toLowerCase() === "not found") {
    return "";
  }
  return normalized;
}

function buildScoreLabelFromScore(score) {
  if (score < 50) {
    return "Poor Resume";
  }
  if (score < 75) {
    return "Average Resume";
  }
  if (score < 90) {
    return "Good Resume";
  }
  return "Strong Resume";
}

function inferRolesFromProfile(context) {
  const skills = context.resume.extractedSkills.join(" ").toLowerCase();
  const roles = [];

  if (/react|frontend|tailwind|javascript|typescript/.test(skills)) {
    roles.push({
      role: "Frontend Engineer",
      fitScore: 82,
      reason: "Your current signals show UI and modern web development strength.",
    });
  }

  if (/node|api|mongodb|sql|backend|express/.test(skills)) {
    roles.push({
      role: "Full Stack Developer",
      fitScore: 79,
      reason: "You show enough backend exposure to move toward full-stack work.",
    });
  }

  if (/python|data|analysis|pandas|machine learning|ai/.test(skills)) {
    roles.push({
      role: "Data Analyst",
      fitScore: 73,
      reason: "Your skills suggest some analytical and Python-oriented capability.",
    });
  }

  if (!roles.length) {
    roles.push({
      role: "Software Engineer",
      fitScore: 68,
      reason: "Your account exists, but the profile needs stronger resume evidence for a tighter role fit.",
    });
  }

  return roles.slice(0, 3);
}

async function generateGeminiGuidance({ client, model, context, history, message }) {
  const promptType = getPromptType(message);
  const primaryMode = promptType === "general" ? "general" : "career";

  if (primaryMode === "general") {
    return generateGeminiGeneralGuidance({ client, model, context, history, message });
  }

  const response = await client.models.generateContent({
    model,
    contents: buildGeminiContents({ context, history, message, assistantMode: primaryMode }),
    config: {
      responseMimeType: "application/json",
      responseSchema: CAREER_GUIDANCE_SCHEMA,
      temperature: 0.55,
    },
  });

  let parsed = parseGeminiResponse(response?.text);

  if (looksLikeDomainRefusal(parsed?.answer)) {
    return generateGeminiGeneralGuidance({ client, model, context, history, message });
  }

  return {
    provider: "AI",
    model,
    ...parsed,
  };
}

async function generateGeminiGeneralGuidance({ client, model, context, history, message }) {
  const response = await client.models.generateContent({
    model,
    contents: buildGeminiContents({
      context,
      history,
      message,
      assistantMode: "general",
    }),
    config: {
      responseMimeType: "application/json",
      responseSchema: GENERAL_ANSWER_SCHEMA,
      temperature: 0.55,
    },
  });

  const parsed = parseGeminiResponse(response?.text);
  return {
    provider: "AI",
    model,
    answer: String(parsed?.answer || "").trim(),
    summary: String(parsed?.summary || "").trim(),
    confidence: String(parsed?.confidence || "").trim(),
    suggestedQuestions: Array.isArray(parsed?.suggestedQuestions)
      ? parsed.suggestedQuestions
      : [],
  };
}

function buildGeminiContents({ context, history, message, assistantMode = "career" }) {
  const contents = [
    {
      role: "user",
      parts: [
        {
          text:
            assistantMode === "general"
              ? buildGeneralSystemInstruction(context)
              : buildSystemInstruction(context),
        },
      ],
    },
  ];

  history.forEach((item) => {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }],
    });
  });

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  return contents;
}

function buildSystemInstruction(context) {
  return [
    "You are LevelUp AI Assistant.",
    "Behave like a high-quality AI assistant that can answer both career questions and general questions.",
    "Use the student context below as the source of truth for personalization when it is relevant, but do not block or refuse non-career questions just because they are outside the career domain.",
    "Do not say that your primary function is limited to career growth, resume help, or learning support.",
    "Never tell the user to use a search engine instead of answering a question that you can answer yourself.",
    "If the user asks a general knowledge question, answer it directly with the same quality as a normal assistant.",
    "Your internal modules are: Resume Parser, ATS Scoring Engine, Resume Quality Analysis, Skill Gap Analyzer, Career Recommendation Engine, Learning Roadmap Generator, Student Performance Prediction, Adaptive Learning System, Document Summarizer, and Collaborative Learning + Tutor System.",
    "For casual messages like hi, hello, thanks, or help, reply naturally first and keep the structured sections mostly empty instead of forcing a full report.",
    "For any user question, answer directly and helpfully.",
    "For substantive career, resume, ATS, role, roadmap, project, interview, or learning questions, return a strong structured career-intelligence response using the schema.",
    "For non-career questions, still answer clearly and naturally, and keep career-specific structured fields empty or minimal unless they genuinely help.",
    "Always personalize. Do not give generic filler.",
    "If the user is wrong, politely correct them and explain what is right.",
    "Do not invent resume fields, academic metrics, or user history. Use empty strings or empty arrays when data is missing.",
    "If resume identityMatch is false, clearly mention that resume-derived data may belong to another person.",
    "When a job description is available, use it for keyword matching and skill-gap reasoning.",
    "When a job description is missing, make it clear that keyword and semantic ATS estimates are based on saved resume analysis rather than a live JD comparison.",
    "Set targetRole to the role the user is explicitly aiming for when it can be inferred from the chat. Otherwise set it to the strongest recommended role from the current context.",
    "skillGapAnalysis must describe the gap for targetRole, not a generic software role.",
    "Use this ATS logic in your reasoning: keyword score from JD-vs-resume keyword overlap, semantic score from resume-vs-role alignment, and resume quality from formatting, content strength, and keyword density.",
    "Use this role ranking logic in your reasoning: skills match, projects relevance, education match, and market demand.",
    "Roadmap tasks should be practical and staged across short-term, mid-term, and long-term improvement, but still fit the roadmap.weeks schema.",
    "Performance insights must use attendance, assignments, and exams only when they exist. If they do not exist, explicitly say that academic prediction is unavailable and provide a career-readiness risk estimate instead.",
    "Adaptive learning, tutor support, summarization, and whiteboard collaboration should be mentioned only when they materially help the user, usually inside finalSuggestions or roadmap resources.",
    "recommendedRoles can be empty when not relevant.",
    "focusAreas can be empty when not relevant.",
    "roadmap can have an empty weeks array when not relevant.",
    "suggestedQuestions must be useful next prompts and should not repeat the user's message.",
    "Return valid JSON matching the schema exactly.",
    "",
    "Student context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function buildGeneralSystemInstruction(context) {
  return [
    "You are LevelUp AI Assistant.",
    "Answer the user's question directly, fully, and naturally.",
    "You can answer general knowledge, factual, historical, conceptual, technical, and explanatory questions.",
    "Do not claim that you are limited to career topics.",
    "Do not tell the user to use a search engine or another assistant for general questions.",
    "Use the student context below only when it materially improves the answer. Otherwise answer like a normal high-quality assistant.",
    "For non-career questions, keep career-specific structured fields empty or minimal unless they genuinely help.",
    "Return valid JSON matching the schema exactly.",
    "",
    "Student context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function looksLikeDomainRefusal(answer) {
  const normalized = String(answer || "").toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    "my primary function is",
    "i am not equipped to answer",
    "outside of career",
    "outside the career domain",
    "recommend using a search engine",
    "general-purpose ai assistant",
    "cannot answer general knowledge",
  ].some((pattern) => normalized.includes(pattern));
}

function parseGeminiResponse(rawText) {
  const normalized = String(rawText || "").trim();
  if (!normalized) {
    throw new Error("The AI service returned an empty response.");
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const fenced = normalized.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
    throw new Error("The AI service returned a non-JSON response.");
  }
}

function normalizeGuidancePayload(payload, context, message) {
  const fallback = buildFallbackGuidance({ context, message });
  const answer = truncateText(payload?.answer || fallback.answer, 4000);
  const summary = truncateText(payload?.summary || fallback.summary, 240);
  const confidence = normalizeConfidence(payload?.confidence || fallback.confidence);
  const disclaimer = truncateText(payload?.disclaimer || fallback.disclaimer, 240);
  const focusAreas = uniqueStrings(
    Array.isArray(payload?.focusAreas) ? payload.focusAreas : fallback.focusAreas,
  ).slice(0, 6);
  const recommendedRoles = normalizeRecommendedRoles(
    Array.isArray(payload?.recommendedRoles)
      ? payload.recommendedRoles
      : fallback.recommendedRoles,
  );
  const targetRole = truncateText(
    payload?.targetRole ||
      recommendedRoles[0]?.role ||
      fallback.targetRole ||
      context.guidanceMemory?.latestTargetRole ||
      "",
    80,
  );
  const roadmap = normalizeRoadmap(
    Object.prototype.hasOwnProperty.call(payload || {}, "roadmap")
      ? payload.roadmap
      : fallback.roadmap,
    fallback.roadmap,
  );
  const profileSummary = normalizeProfileSummary(payload?.profileSummary, fallback.profileSummary);
  const parsedResumeData = normalizeParsedResumeData(
    payload?.parsedResumeData,
    fallback.parsedResumeData,
  );
  const atsBreakdown = normalizeAtsBreakdown(payload?.atsBreakdown, fallback.atsBreakdown);
  const skillGapAnalysis = normalizeSkillGapAnalysis(
    payload?.skillGapAnalysis,
    fallback.skillGapAnalysis,
  );
  const performanceInsights = normalizePerformanceInsights(
    payload?.performanceInsights,
    fallback.performanceInsights,
  );
  const finalSuggestions = normalizeStringArray(
    Object.prototype.hasOwnProperty.call(payload || {}, "finalSuggestions")
      ? payload.finalSuggestions
      : fallback.finalSuggestions,
    5,
    180,
  );
  const suggestedQuestions = uniqueStrings(
    Array.isArray(payload?.suggestedQuestions)
      ? payload.suggestedQuestions
      : fallback.suggestedQuestions,
  ).slice(0, 4);

  return {
    answer,
    summary,
    confidence,
    disclaimer,
    targetRole,
    focusAreas,
    recommendedRoles,
    roadmap,
    profileSummary,
    parsedResumeData,
    atsBreakdown,
    skillGapAnalysis,
    performanceInsights,
    finalSuggestions,
    suggestedQuestions,
  };
}

function normalizeConfidence(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high"].includes(normalized)) {
    return normalized;
  }
  return "medium";
}

function normalizeRecommendedRoles(items) {
  return (items || [])
    .map((item) => ({
      role: truncateText(item?.role || "", 80),
      fitScore: clampNumber(item?.fitScore, 0, 100),
      reason: truncateText(item?.reason || "", 220),
    }))
    .filter((item) => item.role && item.reason)
    .slice(0, 3);
}

function normalizeRoadmap(candidate, fallback) {
  const source =
    candidate && Array.isArray(candidate.weeks)
      ? candidate
      : fallback && Array.isArray(fallback.weeks)
        ? fallback
        : null;

  if (!source) {
    return {
      title: "",
      durationWeeks: 0,
      weeks: [],
    };
  }

  const weeks = (source?.weeks || [])
    .map((week, index) => ({
      label: truncateText(week?.label || `Week ${index + 1}`, 40),
      goal: truncateText(week?.goal || "", 180),
      tasks: uniqueStrings(week?.tasks || []).slice(0, 5),
      resources: normalizeStringArray(week?.resources || [], 4, 120),
    }))
    .filter((week) => week.goal && (week.tasks.length || week.resources.length))
    .slice(0, 8);

  const durationWeeks = weeks.length
    ? clampNumber(source?.durationWeeks, 1, 12) || weeks.length
    : 0;

  return {
    title: truncateText(source?.title || fallback?.title || "", 120),
    durationWeeks,
    weeks,
  };
}

function normalizeProfileSummary(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    headline: truncateText(
      hasOwnValue(source, "headline") ? source.headline : fallback?.headline || "",
      180,
    ),
    overview: truncateText(
      hasOwnValue(source, "overview") ? source.overview : fallback?.overview || "",
      320,
    ),
    strengths: normalizeStringArray(
      hasOwnValue(source, "strengths") ? source.strengths : fallback?.strengths || [],
      5,
      120,
    ),
    concerns: normalizeStringArray(
      hasOwnValue(source, "concerns") ? source.concerns : fallback?.concerns || [],
      5,
      140,
    ),
  };
}

function normalizeParsedResumeData(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    name: truncateText(
      sanitizeUnavailableValue(
        hasOwnValue(source, "name") ? source.name : fallback?.name || "",
      ),
      100,
    ),
    email: truncateText(
      sanitizeUnavailableValue(
        hasOwnValue(source, "email") ? source.email : fallback?.email || "",
      ),
      120,
    ),
    phone: truncateText(
      sanitizeUnavailableValue(
        hasOwnValue(source, "phone") ? source.phone : fallback?.phone || "",
      ),
      60,
    ),
    education: normalizeStringArray(
      hasOwnValue(source, "education") ? source.education : fallback?.education || [],
      5,
      140,
    ),
    skills: normalizeStringArray(
      hasOwnValue(source, "skills") ? source.skills : fallback?.skills || [],
      12,
      60,
    ),
    experience: normalizeStringArray(
      hasOwnValue(source, "experience") ? source.experience : fallback?.experience || [],
      5,
      160,
    ),
    projects: normalizeStringArray(
      hasOwnValue(source, "projects") ? source.projects : fallback?.projects || [],
      5,
      160,
    ),
    certifications: normalizeStringArray(
      hasOwnValue(source, "certifications")
        ? source.certifications
        : fallback?.certifications || [],
      5,
      120,
    ),
  };
}

function normalizeAtsBreakdown(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    finalScore: normalizeNumber(
      hasOwnValue(source, "finalScore") ? source.finalScore : fallback?.finalScore,
      0,
      100,
    ),
    label: truncateText(
      hasOwnValue(source, "label") ? source.label : fallback?.label || "",
      80,
    ),
    keywordScore: normalizeNumber(
      hasOwnValue(source, "keywordScore") ? source.keywordScore : fallback?.keywordScore,
      0,
      100,
    ),
    semanticScore: normalizeNumber(
      hasOwnValue(source, "semanticScore") ? source.semanticScore : fallback?.semanticScore,
      0,
      100,
    ),
    resumeQualityScore: normalizeNumber(
      hasOwnValue(source, "resumeQualityScore")
        ? source.resumeQualityScore
        : fallback?.resumeQualityScore,
      0,
      100,
    ),
    sectionBreakdown: normalizeAtsSectionBreakdown(
      hasOwnValue(source, "sectionBreakdown")
        ? source.sectionBreakdown
        : fallback?.sectionBreakdown || [],
    ),
    matchedKeywords: normalizeStringArray(
      hasOwnValue(source, "matchedKeywords")
        ? source.matchedKeywords
        : fallback?.matchedKeywords || [],
      8,
      60,
    ),
    missingKeywords: normalizeStringArray(
      hasOwnValue(source, "missingKeywords")
        ? source.missingKeywords
        : fallback?.missingKeywords || [],
      8,
      60,
    ),
    issuesFound: normalizeStringArray(
      hasOwnValue(source, "issuesFound") ? source.issuesFound : fallback?.issuesFound || [],
      6,
      180,
    ),
    suggestions: normalizeStringArray(
      hasOwnValue(source, "suggestions") ? source.suggestions : fallback?.suggestions || [],
      6,
      180,
    ),
  };
}

function normalizeAtsSectionBreakdown(items) {
  return (items || [])
    .map((item) => ({
      label: truncateText(item?.label || "", 60),
      score: normalizeNumber(item?.score, 0, 100),
      weight: truncateText(item?.weight || "", 20),
      insight: truncateText(item?.insight || "", 180),
    }))
    .filter((item) => item.label && item.weight)
    .slice(0, 5);
}

function normalizeSkillGapAnalysis(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    matchedSkills: normalizeStringArray(
      hasOwnValue(source, "matchedSkills")
        ? source.matchedSkills
        : fallback?.matchedSkills || [],
      8,
      60,
    ),
    missingSkills: normalizeStringArray(
      hasOwnValue(source, "missingSkills")
        ? source.missingSkills
        : fallback?.missingSkills || [],
      8,
      60,
    ),
    prioritySkills: normalizeStringArray(
      hasOwnValue(source, "prioritySkills")
        ? source.prioritySkills
        : fallback?.prioritySkills || [],
      5,
      60,
    ),
  };
}

function normalizePerformanceInsights(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    riskLevel: truncateText(
      hasOwnValue(source, "riskLevel") ? source.riskLevel : fallback?.riskLevel || "",
      20,
    ),
    summary: truncateText(
      hasOwnValue(source, "summary") ? source.summary : fallback?.summary || "",
      260,
    ),
    signals: normalizeStringArray(
      hasOwnValue(source, "signals") ? source.signals : fallback?.signals || [],
      5,
      140,
    ),
    missingData: normalizeStringArray(
      hasOwnValue(source, "missingData") ? source.missingData : fallback?.missingData || [],
      4,
      80,
    ),
    suggestions: normalizeStringArray(
      hasOwnValue(source, "suggestions") ? source.suggestions : fallback?.suggestions || [],
      4,
      180,
    ),
  };
}

function normalizeStringArray(values, maxItems, maxLength = 120) {
  return uniqueStrings(Array.isArray(values) ? values : [])
    .map((value) => truncateText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return clampNumber(numericValue, min, max);
}

function hasOwnValue(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

async function saveCareerGuidanceConversation({
  uid,
  trimmedMessage,
  guidance,
  guidanceRoot,
  currentChat,
  resolvedChatId,
  provider,
  model,
  warning,
  context,
}) {
  const nowIso = new Date().toISOString();
  const rootRef = admin.database().ref(`users/${uid}/careerGuidance`);
  const chatRef = rootRef.child(`chats/${resolvedChatId}`);
  const messagesRef = chatRef.child("messages");
  const userMessageRef = messagesRef.push();
  const assistantMessageRef = messagesRef.push();
  const existingMessageCount = Object.keys(currentChat?.messages || {}).length;
  const persistedTargetRole =
    truncateText(
      guidance.targetRole ||
        guidance.recommendedRoles?.[0]?.role ||
        currentChat?.latestTargetRole ||
        guidanceRoot?.latestTargetRole ||
        context.guidanceMemory?.latestTargetRole ||
        "",
      80,
    ) || "";
  const persistedRecommendedRoles = guidance.recommendedRoles.length
    ? guidance.recommendedRoles
    : Array.isArray(currentChat?.latestRecommendedRoles) && currentChat.latestRecommendedRoles.length
      ? currentChat.latestRecommendedRoles
      : Array.isArray(guidanceRoot?.latestRecommendedRoles)
        ? guidanceRoot.latestRecommendedRoles
        : [];
  const persistedFocusAreas = guidance.focusAreas.length
    ? guidance.focusAreas
    : Array.isArray(currentChat?.latestFocusAreas) && currentChat.latestFocusAreas.length
      ? currentChat.latestFocusAreas
      : Array.isArray(guidanceRoot?.latestFocusAreas)
        ? guidanceRoot.latestFocusAreas
        : [];
  const persistedSuggestedQuestions = guidance.suggestedQuestions.length
    ? guidance.suggestedQuestions
    : Array.isArray(currentChat?.latestSuggestedQuestions) && currentChat.latestSuggestedQuestions.length
      ? currentChat.latestSuggestedQuestions
      : Array.isArray(guidanceRoot?.latestSuggestedQuestions)
        ? guidanceRoot.latestSuggestedQuestions
        : [];
  const persistedSkillGapAnalysis = hasMeaningfulSkillGapAnalysis(guidance.skillGapAnalysis)
    ? guidance.skillGapAnalysis
    : hasMeaningfulSkillGapAnalysis(currentChat?.latestSkillGapAnalysis)
      ? currentChat.latestSkillGapAnalysis
      : hasMeaningfulSkillGapAnalysis(guidanceRoot?.latestSkillGapAnalysis)
        ? guidanceRoot.latestSkillGapAnalysis
        : emptySkillGapAnalysis();
  const chatTitle =
    currentChat?.title ||
    truncateText(
      persistedRecommendedRoles[0]?.role
        ? `${persistedRecommendedRoles[0].role} guidance`
        : trimmedMessage,
      MAX_CHAT_TITLE_LENGTH,
    );
  const latestRoadmap =
    guidance.roadmap?.weeks?.length
      ? {
          ...guidance.roadmap,
          updatedAt: dbTimestamp,
          updatedAtIso: nowIso,
        }
      : currentChat?.latestRoadmap || guidanceRoot?.latestRoadmap || null;

  await Promise.all([
    userMessageRef.set({
      role: "user",
      text: trimmedMessage,
      createdAt: dbTimestamp,
      createdAtIso: nowIso,
    }),
    assistantMessageRef.set({
      role: "assistant",
      text: guidance.answer,
      summary: guidance.summary,
      confidence: guidance.confidence,
      disclaimer: guidance.disclaimer,
      targetRole: persistedTargetRole,
      focusAreas: guidance.focusAreas,
      recommendedRoles: guidance.recommendedRoles,
      roadmap: guidance.roadmap,
      profileSummary: guidance.profileSummary,
      parsedResumeData: guidance.parsedResumeData,
      atsBreakdown: guidance.atsBreakdown,
      skillGapAnalysis: guidance.skillGapAnalysis,
      performanceInsights: guidance.performanceInsights,
      finalSuggestions: guidance.finalSuggestions,
      suggestedQuestions: guidance.suggestedQuestions,
      provider,
      model,
      warning,
      contextSnapshot: {
        studentName: context.student.name,
        topRole: context.resume.topRole || "",
        targetRole: persistedTargetRole,
        atsScore: context.resume.atsScore,
        identityMatch: context.resume.identityMatch,
        missingSkills: context.resume.missingSkills,
      },
      createdAt: dbTimestamp,
      createdAtIso: nowIso,
    }),
    chatRef.update({
      title: chatTitle,
      summary: guidance.summary,
      latestRoadmap,
      latestTargetRole: persistedTargetRole,
      latestFocusAreas: persistedFocusAreas,
      latestRecommendedRoles: persistedRecommendedRoles,
      latestSuggestedQuestions: persistedSuggestedQuestions,
      latestSkillGapAnalysis: persistedSkillGapAnalysis,
      provider,
      model,
      warning,
      messageCount: existingMessageCount + 2,
      updatedAt: dbTimestamp,
      updatedAtIso: nowIso,
      ...(currentChat
        ? {}
        : {
            createdAt: dbTimestamp,
            createdAtIso: nowIso,
          }),
    }),
    rootRef.update({
      activeChatId: resolvedChatId,
      status: "ready",
      lastProvider: provider,
      lastModel: model,
      lastWarning: warning,
      latestSummary: guidance.summary,
      latestTargetRole: persistedTargetRole,
      latestFocusAreas: persistedFocusAreas,
      latestRecommendedRoles: persistedRecommendedRoles,
      latestSuggestedQuestions: persistedSuggestedQuestions,
      latestSkillGapAnalysis: persistedSkillGapAnalysis,
      updatedAt: dbTimestamp,
      updatedAtIso: nowIso,
      ...(latestRoadmap ? { latestRoadmap } : {}),
      ...(guidanceRoot?.createdAt
        ? {}
        : {
            createdAt: dbTimestamp,
            createdAtIso: nowIso,
          }),
    }),
  ]);
}

function hasMeaningfulSkillGapAnalysis(candidate) {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      (candidate.matchedSkills?.length ||
        candidate.missingSkills?.length ||
        candidate.prioritySkills?.length),
  );
}
