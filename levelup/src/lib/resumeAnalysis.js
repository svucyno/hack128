import { serverTimestamp } from "firebase/database";
import { toFileMetadata } from "./userData";

export const SECTION_LIMITS = {
  skills: 40,
  projects: 20,
  experience: 15,
  education: 10,
  formatting: 15,
};

export const ATS_WORKFLOW_STEPS = [
  {
    title: "Resume Parsing",
    description:
      "Convert the resume into structured data by extracting name, skills, education, experience, projects, and keywords.",
  },
  {
    title: "Job Description Analysis",
    description:
      "Read the job description to identify required skills, preferred skills, experience level, and high-priority keywords.",
  },
  {
    title: "Keyword Matching",
    description:
      "Compare resume skills and keywords against the job description to calculate the core ATS keyword-match score.",
  },
  {
    title: "Section-wise Scoring",
    description:
      "Score the resume using Skills Match 40%, Projects 20%, Experience 15%, Education 10%, and Resume Format 15%.",
  },
  {
    title: "Resume Quality Check",
    description:
      "Check whether the resume is readable, well structured, uses bullets and action verbs, and stays ATS-friendly.",
  },
  {
    title: "Final ATS Result",
    description:
      "Generate the final ATS score, suitable job roles, matched and missing skills, issues found, and improvement suggestions.",
  },
];

export const RESUME_PROCESSING_STEPS = [
  "Parsing resume...",
  "Extracting skills...",
  "Calculating ATS score...",
  "Matching job roles...",
  "Generating AI improvements...",
];

export const FOLLOW_UP_PROMPTS = [
  "Explain my ATS score",
  "What should I improve first?",
  "Which role suits me best?",
  "What skills am I missing?",
];

export function hydrateAnalysisWithAiInsights(analysis, context) {
  if (!analysis || typeof analysis !== "object") {
    return normalizeAnalysisReport(null);
  }

  const normalizedAnalysis = normalizeAnalysisReport(analysis);

  return {
    ...normalizedAnalysis,
    aiInsights: normalizeLocalAiInsights(
      normalizedAnalysis.aiInsights,
      buildLocalAiInsights(normalizedAnalysis, context),
    ),
  };
}

export function normalizeAnalysisReport(analysis) {
  const source = analysis && typeof analysis === "object" ? analysis : {};
  const extractedUserSource =
    source.extractedUser && typeof source.extractedUser === "object" ? source.extractedUser : {};
  const jdComparisonSource =
    source.jdComparison && typeof source.jdComparison === "object" ? source.jdComparison : null;
  const sectionScoresSource =
    source.sectionScores && typeof source.sectionScores === "object" ? source.sectionScores : {};
  const breakdownSource =
    source.breakdown && typeof source.breakdown === "object" ? source.breakdown : {};

  return {
    ...source,
    fileName: String(source.fileName || "Resume").trim(),
    atsScore: normalizeScore(source.atsScore),
    scoreLabel: String(source.scoreLabel || "Not analyzed").trim(),
    resumeWordCount: Number.isFinite(Number(source.resumeWordCount))
      ? Math.max(0, Math.round(Number(source.resumeWordCount)))
      : 0,
    extractedUser: {
      name: String(extractedUserSource.name || "Candidate").trim(),
      email: String(extractedUserSource.email || "Not found").trim(),
      phone: String(extractedUserSource.phone || "Not found").trim(),
      experienceLevel: String(extractedUserSource.experienceLevel || "Not specified").trim(),
      yearsExperience: Number.isFinite(Number(extractedUserSource.yearsExperience))
        ? Number(extractedUserSource.yearsExperience)
        : 0,
      yearsExperienceDisplay: String(
        extractedUserSource.yearsExperienceDisplay || "0",
      ).trim(),
      experienceNote: String(extractedUserSource.experienceNote || "").trim(),
      educationLevel: String(extractedUserSource.educationLevel || "Not specified").trim(),
    },
    extractedSkills: uniqueStrings(
      Array.isArray(source.extractedSkills) ? source.extractedSkills : [],
    ),
    missingSkills: uniqueStrings(
      Array.isArray(source.missingSkills) ? source.missingSkills : [],
    ),
    suggestions: uniqueStrings(Array.isArray(source.suggestions) ? source.suggestions : []),
    whyScoreIsLow: uniqueStrings(
      Array.isArray(source.whyScoreIsLow) ? source.whyScoreIsLow : [],
    ),
    howToReachNinety: uniqueStrings(
      Array.isArray(source.howToReachNinety) ? source.howToReachNinety : [],
    ),
    topKeywords: uniqueStrings(Array.isArray(source.topKeywords) ? source.topKeywords : []),
    strengths: uniqueStrings(Array.isArray(source.strengths) ? source.strengths : []),
    careerRecommendations: uniqueStrings(
      Array.isArray(source.careerRecommendations) ? source.careerRecommendations : [],
    ),
    roleSpecificPlan: uniqueStrings(
      Array.isArray(source.roleSpecificPlan) ? source.roleSpecificPlan : [],
    ),
    radarData: (Array.isArray(source.radarData) ? source.radarData : [])
      .map((item) => ({
        metric: String(item?.metric || "").trim(),
        value: normalizeScore(item?.value),
      }))
      .filter((item) => item.metric),
    jobMatches: (Array.isArray(source.jobMatches) ? source.jobMatches : [])
      .map((item) => ({
        role: String(item?.role || "Unknown role").trim(),
        summary: String(item?.summary || "").trim(),
        match: normalizeScore(item?.match),
        focusAreas: uniqueStrings(Array.isArray(item?.focusAreas) ? item.focusAreas : []),
        improvementPlan: uniqueStrings(
          Array.isArray(item?.improvementPlan) ? item.improvementPlan : [],
        ),
        careerRecommendations: uniqueStrings(
          Array.isArray(item?.careerRecommendations) ? item.careerRecommendations : [],
        ),
        missingSkills: uniqueStrings(
          Array.isArray(item?.missingSkills) ? item.missingSkills : [],
        ),
        matchedSkills: uniqueStrings(
          Array.isArray(item?.matchedSkills) ? item.matchedSkills : [],
        ),
      }))
      .filter((item) => item.role),
    jdComparison: jdComparisonSource
      ? {
          score: normalizeScore(jdComparisonSource.score),
          matchedKeywords: uniqueStrings(
            Array.isArray(jdComparisonSource.matchedKeywords)
              ? jdComparisonSource.matchedKeywords
              : [],
          ),
          missingKeywords: uniqueStrings(
            Array.isArray(jdComparisonSource.missingKeywords)
              ? jdComparisonSource.missingKeywords
              : [],
          ),
        }
      : null,
    sectionScores: {
      skills: normalizeScore(sectionScoresSource.skills),
      projects: normalizeScore(sectionScoresSource.projects),
      experience: normalizeScore(sectionScoresSource.experience),
      education: normalizeScore(sectionScoresSource.education),
      formatting: normalizeScore(sectionScoresSource.formatting),
    },
    breakdown: {
      keywordMatch: normalizeScore(breakdownSource.keywordMatch),
      skillsMatch: normalizeScore(breakdownSource.skillsMatch),
      experience: normalizeScore(breakdownSource.experience),
      projectsImpact: normalizeScore(breakdownSource.projectsImpact),
      education: normalizeScore(breakdownSource.education),
      formatting: normalizeScore(breakdownSource.formatting),
      readability: normalizeScore(breakdownSource.readability),
    },
  };
}

export function buildResumeDraftPayload({
  manualText,
  jobDescription,
  resumeFile,
  savedDraftFileMeta,
  latestAnalysis = undefined,
  inputMode,
}) {
  const resolvedInputMode =
    inputMode === "manual"
      ? "manual"
      : inputMode === "file"
        ? "file"
        : resumeFile
          ? "file"
          : manualText.trim()
            ? "manual"
            : "file";

  return {
    inputMode: resolvedInputMode,
    sourceMode:
      resolvedInputMode === "manual"
        ? manualText.trim()
          ? "manual"
          : ""
        : resumeFile || savedDraftFileMeta
          ? "upload"
          : "",
    manualText,
    manualWordCount: countWords(manualText),
    jobDescription,
    jobDescriptionWordCount: countWords(jobDescription),
    selectedFile: toFileMetadata(resumeFile) || savedDraftFileMeta || null,
    latestAnalysis,
  };
}

export function buildOverviewPayload({ report, parsed, source, identityMatched }) {
  return {
    latestResumeFileName: parsed.fileName || "Manual input",
    source,
    status: "analyzed",
    analyzedAt: serverTimestamp(),
    atsScore: report.atsScore,
    scoreLabel: report.scoreLabel,
    parsedName: report.extractedUser.name,
    parsedEmail: report.extractedUser.email,
    phone: report.extractedUser.phone,
    educationLevel: report.extractedUser.educationLevel,
    experienceLevel: report.extractedUser.experienceLevel,
    yearsExperience: report.extractedUser.yearsExperience,
    yearsExperienceDisplay: report.extractedUser.yearsExperienceDisplay,
    topRole: report.jobMatches[0]?.role || "",
    topRoleMatch: report.jobMatches[0]?.match || 0,
    resumeWordCount: report.resumeWordCount,
    missingSkills: report.missingSkills || [],
    topKeywords: report.topKeywords || [],
    extractedSkills: report.extractedSkills || [],
    strengths: report.strengths || [],
    jdScore: report.jdComparison?.score || 0,
    identityMatch: identityMatched,
  };
}

export function buildHistorySnapshot({
  report,
  parsed,
  source,
  selectedFile,
  identityMatched,
  jobDescription,
}) {
  return {
    fileName: parsed.fileName || "Manual input",
    source,
    selectedFile: source === "upload" ? selectedFile || null : null,
    rawResumeText: parsed.text,
    previewText: parsed.previewText,
    jobDescription: jobDescription.trim(),
    jobDescriptionWordCount: countWords(jobDescription),
    identityMatch: identityMatched,
    analyzedAt: serverTimestamp(),
    analyzedAtClient: new Date().toISOString(),
    atsScore: report.atsScore,
    scoreLabel: report.scoreLabel,
    topRole: report.jobMatches[0]?.role || "",
    topRoleMatch: report.jobMatches[0]?.match || 0,
    missingSkillsCount: report.missingSkills?.length || 0,
    analysis: report,
  };
}

export function getSectionScores(analysis) {
  if (analysis?.sectionScores) {
    return analysis.sectionScores;
  }

  if (!analysis?.breakdown) {
    return {
      skills: 0,
      projects: 0,
      experience: 0,
      education: 0,
      formatting: 0,
    };
  }

  return {
    skills: Math.round(
      (analysis.breakdown.keywordMatch / 30) * 24 +
        (analysis.breakdown.skillsMatch / 20) * 16,
    ),
    projects: Math.round((analysis.breakdown.projectsImpact / 10) * 20),
    experience: analysis.breakdown.experience,
    education: analysis.breakdown.education,
    formatting: Math.round(
      (analysis.breakdown.formatting / 10) * 11 +
        (analysis.breakdown.readability / 5) * 4,
    ),
  };
}

export function formatSectionLabel(key) {
  if (key === "skills") {
    return "Skills Match";
  }

  if (key === "projects") {
    return "Projects";
  }

  if (key === "experience") {
    return "Experience";
  }

  if (key === "education") {
    return "Education";
  }

  if (key === "formatting") {
    return "Resume Format";
  }

  return key;
}

export function formatSourceLabel(source) {
  if (source === "upload") {
    return "Uploaded File";
  }

  if (source === "manual") {
    return "Manual Text";
  }

  return "No source";
}

export function normalizeNotFound(value) {
  return value && value !== "Not found" ? value : "Not available";
}

export function countWords(value = "") {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function formatBytes(bytes = 0) {
  if (!bytes) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function getDropzoneErrorMessage(fileRejections = []) {
  const firstErrorCode = fileRejections[0]?.errors?.[0]?.code;

  if (firstErrorCode === "file-too-large") {
    return "File is too large. Use a PDF, DOC, or DOCX under 5 MB.";
  }

  if (firstErrorCode === "file-invalid-type") {
    return "Unsupported file format. Use PDF, DOC, or DOCX.";
  }

  return "That file could not be accepted. Use PDF, DOC, or DOCX under 5 MB.";
}

export function uniqueStrings(values = []) {
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

export function normalizeScore(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function buildLocalAiInsights(analysis, context) {
  const bestRole = analysis?.jobMatches?.[0] || null;
  const semanticFitScore = normalizeScore(
    analysis?.jdComparison?.score ?? bestRole?.match ?? analysis?.atsScore ?? 0,
  );

  return {
    provider: "ATS engine only",
    model: "fallback",
    executiveSummary: `I analyzed ${context?.fileName || analysis?.fileName || "the resume"}. The current ATS score is ${analysis?.atsScore ?? 0}/100, and the strongest role signal is ${bestRole?.role || "still emerging"}.`,
    semanticFitScore,
    atsNarrative: context?.jobDescription
      ? `The attached job description currently matches about ${analysis?.jdComparison?.score ?? 0}% of the strongest detected keywords and role signals.`
      : "No job description was attached, so semantic fit is estimated from the strongest role matches in the ATS engine.",
    roleFitNarrative: bestRole
      ? `${bestRole.role} is the strongest role fit at ${bestRole.match}% based on the extracted skills, projects, and experience signals.`
      : "A clearer role-fit recommendation needs stronger skill evidence and a better-targeted resume.",
    priorityActions: uniqueStrings([
      ...(analysis?.howToReachNinety || []).slice(0, 3),
      ...(analysis?.suggestions || []).slice(0, 3),
    ]).slice(0, 5),
    rewrittenBullets: [
      `Developed role-aligned project work that improved fit for ${bestRole?.role || "software roles"} by demonstrating practical ownership and relevant tools.`,
      "Rewrote project bullets with action verbs, measurable impact, and clearer technical depth for ATS readability.",
      "Added stronger evidence for missing skills through deployed features, technical scope, and quantified outcomes.",
    ],
    suggestedQuestions: [
      "Explain my ATS score",
      "What should I improve first?",
      "How does my resume match the job description?",
      "Rewrite one resume bullet for me",
    ],
  };
}

function normalizeLocalAiInsights(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};

  return {
    provider: String(source.provider || fallback.provider || "ATS engine only").trim(),
    model: String(source.model || fallback.model || "fallback").trim(),
    executiveSummary: String(
      source.executiveSummary || fallback.executiveSummary || "",
    ).trim(),
    semanticFitScore: normalizeScore(
      Object.prototype.hasOwnProperty.call(source, "semanticFitScore")
        ? source.semanticFitScore
        : fallback.semanticFitScore,
    ),
    atsNarrative: String(source.atsNarrative || fallback.atsNarrative || "").trim(),
    roleFitNarrative: String(
      source.roleFitNarrative || fallback.roleFitNarrative || "",
    ).trim(),
    priorityActions: uniqueStrings(
      Array.isArray(source.priorityActions) ? source.priorityActions : fallback.priorityActions,
    ).slice(0, 5),
    rewrittenBullets: uniqueStrings(
      Array.isArray(source.rewrittenBullets)
        ? source.rewrittenBullets
        : fallback.rewrittenBullets,
    ).slice(0, 4),
    suggestedQuestions: uniqueStrings(
      Array.isArray(source.suggestedQuestions)
        ? source.suggestedQuestions
        : fallback.suggestedQuestions,
    ).slice(0, 4),
  };
}
