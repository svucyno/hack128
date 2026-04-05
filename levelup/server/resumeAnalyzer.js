import { GoogleGenAI } from "@google/genai";
import { analyzeResume } from "../src/resumeAI/utils/atsEngine.js";

let cachedGeminiKey = "";
let cachedGeminiClient = null;

const AI_INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    executiveSummary: { type: "string" },
    semanticFitScore: { type: "number" },
    atsNarrative: { type: "string" },
    roleFitNarrative: { type: "string" },
    priorityActions: {
      type: "array",
      items: { type: "string" },
    },
    rewrittenBullets: {
      type: "array",
      items: { type: "string" },
    },
    suggestedQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "executiveSummary",
    "semanticFitScore",
    "atsNarrative",
    "roleFitNarrative",
    "priorityActions",
    "rewrittenBullets",
    "suggestedQuestions",
  ],
};

const GEMINI_RESUME_REPORT_SCHEMA = {
  type: "object",
  properties: {
    fileName: { type: "string" },
    atsScore: { type: "number" },
    scoreLabel: { type: "string" },
    breakdown: {
      type: "object",
      properties: {
        keywordMatch: { type: "number" },
        skillsMatch: { type: "number" },
        experience: { type: "number" },
        projectsImpact: { type: "number" },
        education: { type: "number" },
        formatting: { type: "number" },
        readability: { type: "number" },
      },
      required: [
        "keywordMatch",
        "skillsMatch",
        "experience",
        "projectsImpact",
        "education",
        "formatting",
        "readability",
      ],
    },
    sectionScores: {
      type: "object",
      properties: {
        skills: { type: "number" },
        projects: { type: "number" },
        experience: { type: "number" },
        education: { type: "number" },
        formatting: { type: "number" },
      },
      required: ["skills", "projects", "experience", "education", "formatting"],
    },
    extractedUser: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        experienceLevel: { type: "string" },
        yearsExperience: { type: "number" },
        yearsExperienceDisplay: { type: "string" },
        experienceNote: { type: "string" },
        educationLevel: { type: "string" },
      },
      required: [
        "name",
        "email",
        "phone",
        "experienceLevel",
        "yearsExperience",
        "yearsExperienceDisplay",
        "experienceNote",
        "educationLevel",
      ],
    },
    extractedSkills: {
      type: "array",
      items: { type: "string" },
    },
    missingSkills: {
      type: "array",
      items: { type: "string" },
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
    },
    whyScoreIsLow: {
      type: "array",
      items: { type: "string" },
    },
    howToReachNinety: {
      type: "array",
      items: { type: "string" },
    },
    topKeywords: {
      type: "array",
      items: { type: "string" },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    careerRecommendations: {
      type: "array",
      items: { type: "string" },
    },
    roleSpecificPlan: {
      type: "array",
      items: { type: "string" },
    },
    jobMatches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          summary: { type: "string" },
          match: { type: "number" },
          focusAreas: {
            type: "array",
            items: { type: "string" },
          },
          improvementPlan: {
            type: "array",
            items: { type: "string" },
          },
          careerRecommendations: {
            type: "array",
            items: { type: "string" },
          },
          missingSkills: {
            type: "array",
            items: { type: "string" },
          },
          matchedSkills: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "role",
          "summary",
          "match",
          "focusAreas",
          "improvementPlan",
          "careerRecommendations",
          "missingSkills",
          "matchedSkills",
        ],
      },
    },
    jdComparison: {
      type: "object",
      properties: {
        score: { type: "number" },
        matchedKeywords: {
          type: "array",
          items: { type: "string" },
        },
        missingKeywords: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["score", "matchedKeywords", "missingKeywords"],
    },
    radarData: {
      type: "array",
      items: {
        type: "object",
        properties: {
          metric: { type: "string" },
          value: { type: "number" },
        },
        required: ["metric", "value"],
      },
    },
    resumeWordCount: { type: "number" },
    aiInsights: AI_INSIGHTS_SCHEMA,
  },
  required: [
    "fileName",
    "atsScore",
    "scoreLabel",
    "breakdown",
    "sectionScores",
    "extractedUser",
    "extractedSkills",
    "missingSkills",
    "suggestions",
    "whyScoreIsLow",
    "howToReachNinety",
    "topKeywords",
    "strengths",
    "careerRecommendations",
    "roleSpecificPlan",
    "jobMatches",
    "jdComparison",
    "radarData",
    "resumeWordCount",
    "aiInsights",
  ],
};

const RESUME_CHAT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    bullets: {
      type: "array",
      items: { type: "string" },
    },
    suggestedQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["answer", "bullets", "suggestedQuestions"],
};

export function getResumeAnalyzerEngineStatus() {
  const engine = getGeminiRuntime();
  return {
    aiEnabled: engine.aiEnabled,
    provider: engine.provider,
    model: engine.model,
  };
}

export async function runResumeAnalyzer({
  resumeText,
  jobDescription = "",
  fileName = "Resume",
}) {
  const cleanedResume = String(resumeText || "").trim();
  const cleanedJobDescription = String(jobDescription || "").trim();
  const cleanedFileName = String(fileName || "Resume").trim() || "Resume";

  if (!cleanedResume) {
    throw new Error("Resume text is required.");
  }

  const baseReport = analyzeResume({
    resumeText: cleanedResume,
    jobDescription: cleanedJobDescription,
    fileName: cleanedFileName,
  });
  const engine = getGeminiRuntime();
  let warning = "";
  let report = {
    ...baseReport,
    aiInsights: normalizeResumeAnalysisEnhancement(
      null,
      buildFallbackResumeEnhancement({
        report: baseReport,
        jobDescription: cleanedJobDescription,
        fileName: cleanedFileName,
        provider: engine.provider,
        model: engine.model,
      }),
    ),
  };

  if (engine.aiEnabled) {
    try {
      const geminiReport = await generateGeminiResumeReport({
        client: engine.client,
        model: engine.model,
        resumeText: cleanedResume,
        jobDescription: cleanedJobDescription,
        fileName: cleanedFileName,
        fallbackReport: baseReport,
      });
      report = normalizeGeminiResumeReport(geminiReport, {
        fallback: baseReport,
        fileName: cleanedFileName,
        jobDescription: cleanedJobDescription,
        provider: "Gemini",
        model: engine.model,
      });
    } catch (error) {
      warning =
        error?.message ||
        "Gemini analysis was unavailable, so the analyzer used its built-in ATS logic only.";
    }
  }

  return {
    warning,
    provider: report.aiInsights?.provider || engine.provider,
    model: report.aiInsights?.model || engine.model,
    report,
  };
}

export async function runResumeAnalyzerChat({
  analysis,
  question,
  context = {},
  history = [],
}) {
  const trimmedQuestion = String(question || "").trim();
  if (!trimmedQuestion) {
    throw new Error("A resume question is required.");
  }

  const fallback = buildFallbackResumeChat({
    analysis,
    question: trimmedQuestion,
    context,
  });
  const engine = getGeminiRuntime();

  if (!engine.aiEnabled) {
    return fallback;
  }

  try {
    const response = await engine.client.models.generateContent({
      model: engine.model,
      contents: buildResumeChatContents({
        analysis,
        context,
        history,
        question: trimmedQuestion,
      }),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESUME_CHAT_SCHEMA,
        temperature: 0.45,
      },
    });

    const parsed = parseJsonResponse(response?.text);
    const normalized = normalizeResumeChatReply(parsed, fallback);

    return {
      provider: "Gemini",
      model: engine.model,
      ...normalized,
    };
  } catch (error) {
    return {
      warning:
        error?.message ||
        "Gemini follow-up was unavailable, so the analyzer answered using local resume logic.",
      ...fallback,
    };
  }
}

function getGeminiRuntime() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const model =
    !process.env.GEMINI_MODEL || process.env.GEMINI_MODEL === "gemini-2.0-flash"
      ? "gemini-2.5-flash"
      : process.env.GEMINI_MODEL;

  if (!apiKey) {
    cachedGeminiKey = "";
    cachedGeminiClient = null;
    return {
      aiEnabled: false,
      client: null,
      provider: "ATS engine only",
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
    provider: "Gemini",
    model,
  };
}

async function generateGeminiResumeReport({
  client,
  model,
  resumeText,
  jobDescription,
  fileName,
  fallbackReport,
}) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are LevelUp Resume Analyzer AI.",
              "You are the primary resume scoring engine. Calculate the ATS score, role match, missing skills, and recommendations yourself.",
              "The resume may belong to any domain, such as software, medical, nursing, pharmacy, law, civil, mechanical, accounting, commerce, BBA, HR, marketing, education, design, or other professional tracks.",
              "Do not assume the candidate is from computer science or software unless the resume clearly shows that.",
              "Infer the candidate's primary field from education, experience, internships, terminology, certifications, and the job description if one is provided.",
              "Recommend only roles that belong to the candidate's actual field or the provided job description. For example, do not suggest software roles for a medical or mechanical resume unless the resume genuinely supports that switch.",
              "If no job description is present, score the resume against the most likely field-specific role path for that candidate.",
              "Use domain-neutral ATS logic: skills fit, practical evidence or project/case/clinical exposure, experience, education relevance, and formatting/readability.",
              "For non-project fields, treat 'projectsImpact' as practical evidence such as internships, case handling, rotations, lab work, shop-floor work, patient exposure, teaching outcomes, campaigns, audits, site work, or portfolio evidence.",
              "Keep the ATS score realistic and field-specific.",
              "Return JSON matching the schema exactly.",
              "Use jdComparison.score as 0 with empty keyword arrays when no job description is provided.",
              "Keep guidance specific and practical for students, freshers, and early-career candidates.",
              "Return valid JSON matching the schema exactly.",
              "",
              `File name: ${fileName}`,
              `Job description available: ${jobDescription ? "yes" : "no"}`,
              "",
              "Resume text:",
              truncateText(resumeText, 14000),
              "",
              jobDescription
                ? `Target job description:\n${truncateText(jobDescription, 5000)}`
                : "No job description was provided.",
              "",
              "Fallback shape reference only. Use this only as a structure aid if needed, and override any role suggestion that conflicts with the resume's actual field:",
              JSON.stringify(
                {
                  ...fallbackReport,
                  jobMatches: fallbackReport?.jobMatches?.slice(0, 2) || [],
                  careerRecommendations: fallbackReport?.careerRecommendations?.slice(0, 2) || [],
                },
                null,
                2,
              ),
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESUME_REPORT_SCHEMA,
      temperature: 0.35,
    },
  });

  return parseJsonResponse(response?.text);
}

function buildResumeChatContents({ analysis, context, history, question }) {
  const items = [
    {
      role: "user",
      parts: [
        {
          text: [
            "You are LevelUp Resume Analyzer Chat.",
            "Answer like an intelligent resume coach using the analysis context below.",
            "Do not change ATS numbers or invent missing structured data.",
            "If the user asks about ATS score, roles, missing skills, job description fit, or improvements, answer directly and practically.",
            "If job description data is missing, say that clearly.",
            "Return valid JSON matching the schema exactly.",
            "",
            "Analysis context:",
            JSON.stringify(
              {
                context,
                atsScore: analysis?.atsScore,
                scoreLabel: analysis?.scoreLabel,
                extractedUser: analysis?.extractedUser,
                extractedSkills: analysis?.extractedSkills,
                missingSkills: analysis?.missingSkills,
                jobMatches: analysis?.jobMatches?.slice(0, 3),
                jdComparison: analysis?.jdComparison,
                whyScoreIsLow: analysis?.whyScoreIsLow,
                howToReachNinety: analysis?.howToReachNinety,
                suggestions: analysis?.suggestions,
                aiInsights: analysis?.aiInsights,
                sectionScores: analysis?.sectionScores,
                breakdown: analysis?.breakdown,
              },
              null,
              2,
            ),
          ].join("\n"),
        },
      ],
    },
  ];

  history
    .filter((item) => item?.role && item?.text)
    .slice(-6)
    .forEach((item) => {
      items.push({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.text || "").trim() }],
      });
    });

  items.push({
    role: "user",
    parts: [{ text: question }],
  });

  return items;
}

function buildFallbackResumeEnhancement({
  report,
  jobDescription,
  fileName,
  provider = "ATS engine only",
  model = "fallback",
}) {
  const bestRole = report?.jobMatches?.[0] || null;
  const estimatedSemantic = report?.jdComparison?.score ?? bestRole?.match ?? report?.atsScore ?? 0;

  return {
    provider,
    model,
    executiveSummary: `I analyzed ${fileName}. The resume scores ${report?.atsScore ?? 0}/100 for ATS and looks strongest for ${bestRole?.role || "the current target role"}.`,
    semanticFitScore: clampNumber(estimatedSemantic, 0, 100),
    atsNarrative: jobDescription
      ? `Against the target job description, the resume currently matches about ${report?.jdComparison?.score ?? 0}% of the detected high-signal terms.`
      : "No job description was added, so semantic fit is estimated from the strongest matching roles and the extracted resume evidence.",
    roleFitNarrative: bestRole
      ? `${bestRole.role} is the strongest fit right now at ${bestRole.match}% because the current skills and resume signals align best there.`
      : "A stronger role recommendation needs clearer skills, project evidence, and target-role context.",
    priorityActions: uniqueStrings([
      ...(report?.howToReachNinety || []).slice(0, 3),
      ...(report?.suggestions || []).slice(0, 3),
    ]).slice(0, 5),
    rewrittenBullets: buildFallbackRewriteBullets(report),
    suggestedQuestions: [
      "Explain my ATS score in simple terms.",
      "Which role fits me best and why?",
      "What should I fix first in my resume?",
      "How well does my resume match the job description?",
    ],
  };
}

function buildFallbackRewriteBullets(report) {
  const bestRole = report?.jobMatches?.[0] || null;
  const firstMissingSkills = report?.missingSkills?.slice(0, 2).join(" and ") || "role-specific tools";
  const firstRole = bestRole?.role || "software role";

  return [
    `Developed and shipped projects aligned to ${firstRole}, strengthening practical experience in ${firstMissingSkills}.`,
    "Improved resume impact by rewriting project bullets with action verbs, measurable outcomes, and role-specific keywords.",
    "Built end-to-end features and documented results with clear ownership, implementation details, and outcomes.",
  ];
}

function normalizeResumeAnalysisEnhancement(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};

  return {
    provider: truncateText(source.provider || fallback.provider || "ATS engine only", 40),
    model: truncateText(source.model || fallback.model || "fallback", 60),
    executiveSummary: truncateText(
      source.executiveSummary || fallback.executiveSummary || "",
      420,
    ),
    semanticFitScore: normalizeNumber(
      hasOwn(source, "semanticFitScore") ? source.semanticFitScore : fallback.semanticFitScore,
      0,
      100,
    ),
    atsNarrative: truncateText(source.atsNarrative || fallback.atsNarrative || "", 320),
    roleFitNarrative: truncateText(
      source.roleFitNarrative || fallback.roleFitNarrative || "",
      320,
    ),
    priorityActions: normalizeStringArray(
      hasOwn(source, "priorityActions") ? source.priorityActions : fallback.priorityActions,
      5,
      180,
    ),
    rewrittenBullets: normalizeStringArray(
      hasOwn(source, "rewrittenBullets") ? source.rewrittenBullets : fallback.rewrittenBullets,
      4,
      220,
    ),
    suggestedQuestions: normalizeStringArray(
      hasOwn(source, "suggestedQuestions")
        ? source.suggestedQuestions
        : fallback.suggestedQuestions,
      4,
      120,
    ),
  };
}

function normalizeGeminiResumeReport(
  candidate,
  { fallback, fileName, jobDescription, provider = "Gemini", model = "gemini" },
) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const fallbackReport = fallback && typeof fallback === "object" ? fallback : {};
  const sourceUser =
    source.extractedUser && typeof source.extractedUser === "object" ? source.extractedUser : {};
  const fallbackUser =
    fallbackReport.extractedUser && typeof fallbackReport.extractedUser === "object"
      ? fallbackReport.extractedUser
      : {};
  const sourceBreakdown =
    source.breakdown && typeof source.breakdown === "object" ? source.breakdown : {};
  const fallbackBreakdown =
    fallbackReport.breakdown && typeof fallbackReport.breakdown === "object"
      ? fallbackReport.breakdown
      : {};
  const sourceSectionScores =
    source.sectionScores && typeof source.sectionScores === "object"
      ? source.sectionScores
      : {};
  const fallbackSectionScores =
    fallbackReport.sectionScores && typeof fallbackReport.sectionScores === "object"
      ? fallbackReport.sectionScores
      : {};
  const fallbackJdComparison =
    fallbackReport.jdComparison && typeof fallbackReport.jdComparison === "object"
      ? fallbackReport.jdComparison
      : null;
  const sourceJdComparison =
    source.jdComparison && typeof source.jdComparison === "object" ? source.jdComparison : null;

  const normalizedReport = {
    ...fallbackReport,
    fileName: truncateText(source.fileName || fallbackReport.fileName || fileName || "Resume", 160),
    atsScore: normalizeNumber(
      hasOwn(source, "atsScore") ? source.atsScore : fallbackReport.atsScore,
      0,
      100,
    ),
    scoreLabel: truncateText(
      source.scoreLabel || fallbackReport.scoreLabel || "ATS Reviewed",
      80,
    ),
    breakdown: {
      keywordMatch: normalizeNumber(
        sourceBreakdown.keywordMatch ?? fallbackBreakdown.keywordMatch,
        0,
        30,
      ),
      skillsMatch: normalizeNumber(
        sourceBreakdown.skillsMatch ?? fallbackBreakdown.skillsMatch,
        0,
        20,
      ),
      experience: normalizeNumber(
        sourceBreakdown.experience ?? fallbackBreakdown.experience,
        0,
        15,
      ),
      projectsImpact: normalizeNumber(
        sourceBreakdown.projectsImpact ?? fallbackBreakdown.projectsImpact,
        0,
        10,
      ),
      education: normalizeNumber(
        sourceBreakdown.education ?? fallbackBreakdown.education,
        0,
        10,
      ),
      formatting: normalizeNumber(
        sourceBreakdown.formatting ?? fallbackBreakdown.formatting,
        0,
        10,
      ),
      readability: normalizeNumber(
        sourceBreakdown.readability ?? fallbackBreakdown.readability,
        0,
        5,
      ),
    },
    sectionScores: {
      skills: normalizeNumber(
        sourceSectionScores.skills ?? fallbackSectionScores.skills,
        0,
        40,
      ),
      projects: normalizeNumber(
        sourceSectionScores.projects ?? fallbackSectionScores.projects,
        0,
        20,
      ),
      experience: normalizeNumber(
        sourceSectionScores.experience ?? fallbackSectionScores.experience,
        0,
        15,
      ),
      education: normalizeNumber(
        sourceSectionScores.education ?? fallbackSectionScores.education,
        0,
        10,
      ),
      formatting: normalizeNumber(
        sourceSectionScores.formatting ?? fallbackSectionScores.formatting,
        0,
        15,
      ),
    },
    extractedUser: {
      name: truncateText(sourceUser.name || fallbackUser.name || "Candidate", 120),
      email: truncateText(sourceUser.email || fallbackUser.email || "Not found", 120),
      phone: truncateText(sourceUser.phone || fallbackUser.phone || "Not found", 60),
      experienceLevel: truncateText(
        sourceUser.experienceLevel || fallbackUser.experienceLevel || "Not specified",
        80,
      ),
      yearsExperience: normalizeNumber(
        hasOwn(sourceUser, "yearsExperience")
          ? sourceUser.yearsExperience
          : fallbackUser.yearsExperience,
        0,
        60,
      ),
      yearsExperienceDisplay: truncateText(
        sourceUser.yearsExperienceDisplay || fallbackUser.yearsExperienceDisplay || "0",
        40,
      ),
      experienceNote: truncateText(
        sourceUser.experienceNote || fallbackUser.experienceNote || "",
        160,
      ),
      educationLevel: truncateText(
        sourceUser.educationLevel || fallbackUser.educationLevel || "Not specified",
        120,
      ),
    },
    extractedSkills: normalizeStringArray(
      hasOwn(source, "extractedSkills") ? source.extractedSkills : fallbackReport.extractedSkills,
      24,
      80,
    ),
    missingSkills: normalizeStringArray(
      hasOwn(source, "missingSkills") ? source.missingSkills : fallbackReport.missingSkills,
      12,
      80,
    ),
    suggestions: normalizeStringArray(
      hasOwn(source, "suggestions") ? source.suggestions : fallbackReport.suggestions,
      6,
      220,
    ),
    whyScoreIsLow: normalizeStringArray(
      hasOwn(source, "whyScoreIsLow") ? source.whyScoreIsLow : fallbackReport.whyScoreIsLow,
      6,
      220,
    ),
    howToReachNinety: normalizeStringArray(
      hasOwn(source, "howToReachNinety")
        ? source.howToReachNinety
        : fallbackReport.howToReachNinety,
      6,
      220,
    ),
    topKeywords: normalizeStringArray(
      hasOwn(source, "topKeywords") ? source.topKeywords : fallbackReport.topKeywords,
      12,
      80,
    ),
    strengths: normalizeStringArray(
      hasOwn(source, "strengths") ? source.strengths : fallbackReport.strengths,
      6,
      160,
    ),
    careerRecommendations: normalizeStringArray(
      hasOwn(source, "careerRecommendations")
        ? source.careerRecommendations
        : fallbackReport.careerRecommendations,
      5,
      240,
    ),
    roleSpecificPlan: normalizeStringArray(
      hasOwn(source, "roleSpecificPlan")
        ? source.roleSpecificPlan
        : fallbackReport.roleSpecificPlan,
      5,
      240,
    ),
    jobMatches: normalizeResumeJobMatches(
      hasOwn(source, "jobMatches") ? source.jobMatches : fallbackReport.jobMatches,
      fallbackReport.jobMatches || [],
    ),
    jdComparison: jobDescription
      ? normalizeResumeJdComparison(sourceJdComparison, fallbackJdComparison)
      : null,
    radarData: normalizeResumeRadarData(
      hasOwn(source, "radarData") ? source.radarData : fallbackReport.radarData,
      fallbackReport.radarData || [],
    ),
    resumeWordCount: normalizeNumber(
      hasOwn(source, "resumeWordCount")
        ? source.resumeWordCount
        : fallbackReport.resumeWordCount,
      0,
      50000,
    ),
  };

  const fallbackInsights = buildFallbackResumeEnhancement({
    report: normalizedReport,
    jobDescription,
    fileName: normalizedReport.fileName,
    provider,
    model,
  });

  return {
    ...normalizedReport,
    aiInsights: normalizeResumeAnalysisEnhancement(source.aiInsights, fallbackInsights),
  };
}

function normalizeResumeJobMatches(values, fallbackValues) {
  const source = Array.isArray(values) && values.length ? values : fallbackValues;
  return source
    .map((item) => ({
      role: truncateText(item?.role || "Unknown role", 120),
      summary: truncateText(item?.summary || "", 260),
      match: normalizeNumber(item?.match, 0, 100),
      focusAreas: normalizeStringArray(item?.focusAreas, 5, 100),
      improvementPlan: normalizeStringArray(item?.improvementPlan, 5, 200),
      careerRecommendations: normalizeStringArray(item?.careerRecommendations, 4, 220),
      missingSkills: normalizeStringArray(item?.missingSkills, 6, 80),
      matchedSkills: normalizeStringArray(item?.matchedSkills, 8, 80),
    }))
    .filter((item) => item.role)
    .sort((left, right) => right.match - left.match)
    .slice(0, 5);
}

function normalizeResumeJdComparison(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const fallbackSource = fallback && typeof fallback === "object" ? fallback : {};

  return {
    score: normalizeNumber(
      hasOwn(source, "score") ? source.score : fallbackSource.score,
      0,
      100,
    ),
    matchedKeywords: normalizeStringArray(
      hasOwn(source, "matchedKeywords")
        ? source.matchedKeywords
        : fallbackSource.matchedKeywords,
      8,
      80,
    ),
    missingKeywords: normalizeStringArray(
      hasOwn(source, "missingKeywords")
        ? source.missingKeywords
        : fallbackSource.missingKeywords,
      8,
      80,
    ),
  };
}

function normalizeResumeRadarData(values, fallbackValues) {
  const source = Array.isArray(values) && values.length ? values : fallbackValues;
  return source
    .map((item) => ({
      metric: truncateText(item?.metric || "", 60),
      value: normalizeNumber(item?.value, 0, 100),
    }))
    .filter((item) => item.metric)
    .slice(0, 8);
}

function buildFallbackResumeChat({ analysis, question, context }) {
  const lowerPrompt = question.toLowerCase();
  const bestRole = analysis?.jobMatches?.[0] || null;
  const sectionScores = getSectionScores(analysis);
  const weakestSections = Object.entries(sectionScores)
    .sort((left, right) => left[1] - right[1])
    .slice(0, 2)
    .map(([key]) => formatSectionLabel(key).toLowerCase());

  let answer = context?.jobDescription
    ? `Your resume is strongest for ${bestRole?.role || "the current target role"} and should next improve ${weakestSections.join(" and ")}.`
    : `Your resume is strongest for ${bestRole?.role || "the current target role"}, but a job description would make the advice more precise.`;
  let bullets = [];

  if (lowerPrompt.includes("score") || lowerPrompt.includes("ats")) {
    answer = `Your ATS score is ${analysis?.atsScore ?? 0}/100. The weakest scoring areas are ${weakestSections.join(" and ") || "still emerging sections"}.`;
    bullets = (analysis?.howToReachNinety || analysis?.suggestions || []).slice(0, 3);
  } else if (lowerPrompt.includes("role") || lowerPrompt.includes("job")) {
    answer = bestRole
      ? `${bestRole.role} is the strongest fit at ${bestRole.match}% based on the current skill and resume evidence.`
      : "I do not have a reliable role match yet.";
    bullets = bestRole?.focusAreas?.slice(0, 3) || [];
  } else if (lowerPrompt.includes("skill") || lowerPrompt.includes("missing")) {
    answer = analysis?.missingSkills?.length
      ? `The biggest missing skills are ${analysis.missingSkills.slice(0, 5).join(", ")}.`
      : "No major missing skills were detected for the strongest role match.";
    bullets = analysis?.suggestions?.slice(0, 3) || [];
  } else if (lowerPrompt.includes("description") || lowerPrompt.includes("jd")) {
    answer = analysis?.jdComparison
      ? `Against the job description, your resume matches ${analysis.jdComparison.score}% of the strongest detected keywords.`
      : "No job description is currently attached to this analysis.";
    bullets = analysis?.jdComparison
      ? [
          `Matched keywords: ${analysis.jdComparison.matchedKeywords.join(", ") || "limited"}.`,
          `Missing keywords: ${analysis.jdComparison.missingKeywords.join(", ") || "none"}.`,
        ]
      : ["Paste a target job description to unlock JD-specific comparison."];
  } else if (lowerPrompt.includes("improve") || lowerPrompt.includes("fix")) {
    answer = analysis?.howToReachNinety?.[0]
      ? `Start with this: ${analysis.howToReachNinety[0]}`
      : "Start by improving role-specific keywords, measurable achievements, and project clarity.";
    bullets = (analysis?.suggestions || []).slice(0, 3);
  }

  return {
    provider: "ATS engine only",
    model: "fallback",
    answer: truncateText(answer, 1200),
    bullets: normalizeStringArray(bullets, 4, 180),
    suggestedQuestions: [
      "What should I improve first?",
      "How does my resume match the job description?",
      "Which role suits me best?",
      "Rewrite one weak resume bullet for me.",
    ],
  };
}

function normalizeResumeChatReply(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    answer: truncateText(source.answer || fallback.answer || "", 1400),
    bullets: normalizeStringArray(
      hasOwn(source, "bullets") ? source.bullets : fallback.bullets,
      4,
      180,
    ),
    suggestedQuestions: normalizeStringArray(
      hasOwn(source, "suggestedQuestions")
        ? source.suggestedQuestions
        : fallback.suggestedQuestions,
      4,
      120,
    ),
  };
}

function parseJsonResponse(rawText) {
  const normalized = String(rawText || "").trim();
  if (!normalized) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const fenced = normalized.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
    throw new Error("Gemini returned a non-JSON response.");
  }
}

function normalizeStringArray(values, maxItems, maxLength) {
  return uniqueStrings(Array.isArray(values) ? values : [])
    .map((value) => truncateText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
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

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function normalizeNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return clampNumber(min, min, max);
  }
  return clampNumber(numericValue, min, max);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function getSectionScores(analysis) {
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

function formatSectionLabel(key) {
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
  return "Resume Format";
}
