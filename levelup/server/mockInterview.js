import { GoogleGenAI } from "@google/genai";

const MAX_JOB_DESCRIPTION_LENGTH = 6000;
const MAX_TURNS_TO_SEND = 6;
const MAX_TOTAL_SESSION_SCORE = 800;

const DEFAULT_EVALUATION_CRITERIA = [
  "Clarity",
  "Depth",
  "Structure",
  "Real-world connection",
  "Communication",
];

const QUESTION_TYPES = [
  "Concept Explanation",
  "Problem Solving",
  "Scenario-Based",
  "Teaching Simulation",
  "Behavioral",
];

const START_SESSION_SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    guidance: { type: "string" },
    questionPlan: {
      type: "array",
      items: { type: "string" },
    },
    currentPrompt: {
      type: "object",
      properties: {
        questionId: { type: "string" },
        questionType: { type: "string" },
        question: { type: "string" },
        evaluationCriteria: {
          type: "array",
          items: { type: "string" },
        },
        expectedFocus: {
          type: "array",
          items: { type: "string" },
        },
        hints: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "questionId",
        "questionType",
        "question",
        "evaluationCriteria",
        "expectedFocus",
        "hints",
      ],
    },
  },
  required: ["intro", "guidance", "questionPlan", "currentPrompt"],
};

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    clarityScore: { type: "number" },
    conceptUnderstandingScore: { type: "number" },
    structureScore: { type: "number" },
    practicalExamplesScore: { type: "number" },
    communicationScore: { type: "number" },
    feedback: { type: "string" },
    didWell: {
      type: "array",
      items: { type: "string" },
    },
    missingAreas: {
      type: "array",
      items: { type: "string" },
    },
    idealAnswer: { type: "string" },
    followUpQuestions: {
      type: "array",
      items: { type: "string" },
    },
    interviewerNote: { type: "string" },
    nextQuestionType: { type: "string" },
    nextQuestion: { type: "string" },
    nextEvaluationCriteria: {
      type: "array",
      items: { type: "string" },
    },
    nextExpectedFocus: {
      type: "array",
      items: { type: "string" },
    },
    nextQuestionHints: {
      type: "array",
      items: { type: "string" },
    },
    shouldEnd: { type: "boolean" },
    summary: {
      type: "object",
      properties: {
        totalScore: { type: "number" },
        averageScore: { type: "number" },
        overallScore: { type: "number" },
        hireSignal: { type: "string" },
        summary: { type: "string" },
        strengths: {
          type: "array",
          items: { type: "string" },
        },
        weaknesses: {
          type: "array",
          items: { type: "string" },
        },
        topImprovementAreas: {
          type: "array",
          items: { type: "string" },
        },
        recommendedPracticeTopics: {
          type: "array",
          items: { type: "string" },
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "totalScore",
        "averageScore",
        "overallScore",
        "hireSignal",
        "summary",
        "strengths",
        "weaknesses",
        "topImprovementAreas",
        "recommendedPracticeTopics",
        "nextSteps",
      ],
    },
  },
  required: [
    "score",
    "clarityScore",
    "conceptUnderstandingScore",
    "structureScore",
    "practicalExamplesScore",
    "communicationScore",
    "feedback",
    "didWell",
    "missingAreas",
    "idealAnswer",
    "followUpQuestions",
    "interviewerNote",
    "nextQuestionType",
    "nextQuestion",
    "nextEvaluationCriteria",
    "nextExpectedFocus",
    "nextQuestionHints",
    "shouldEnd",
    "summary",
  ],
};

let cachedGeminiKey = "";
let cachedGeminiClient = null;

export function getMockInterviewEngineStatus() {
  const runtime = getGeminiRuntime();
  return {
    aiEnabled: runtime.aiEnabled,
    provider: runtime.provider,
    model: runtime.model,
  };
}

export async function runMockInterviewStart({
  profile = {},
  role = "",
  interviewType = "technical",
  difficulty = "medium",
  company = "",
  focusAreas = [],
  jobDescription = "",
  maxQuestions = 4,
}) {
  const context = buildInterviewContext({
    profile,
    role,
    interviewType,
    difficulty,
    company,
    focusAreas,
    jobDescription,
    maxQuestions,
  });
  const runtime = getGeminiRuntime();
  let warning = "";

  let generated = buildFallbackSessionStart(context);
  let provider = "Built-in mock interview";
  let model = "fallback";

  if (runtime.aiEnabled) {
    try {
      const aiSession = await generateGeminiSessionStart({
        client: runtime.client,
        model: runtime.model,
        context,
      });
      generated = normalizeStartPayload(aiSession, generated);
      provider = "Gemini";
      model = runtime.model;
    } catch (error) {
      warning =
        error?.message ||
        "Gemini could not start the mock interview, so a built-in interview flow was used.";
    }
  } else {
    warning =
      "GEMINI_API_KEY is missing, so a built-in mock interview flow was used.";
  }

  const nowIso = new Date().toISOString();
  const sessionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    warning,
    provider,
    model,
    session: {
      id: sessionId,
      role: context.role,
      interviewType: context.interviewType,
      difficulty: context.difficulty,
      company: context.company,
      focusAreas: context.focusAreas,
      jobDescription: context.jobDescription,
      sessionContext: {
        targetRole: context.role,
        linkedResumeVersion: context.resumeVersion,
        atsScore: context.atsScore,
        skillGaps: context.skillGaps,
        focusAreas: context.focusAreas,
      },
      intro: generated.intro,
      guidance: generated.guidance,
      questionPlan: generated.questionPlan,
      currentPrompt: {
        questionId:
          generated.currentPrompt.questionId || `question_1_${sessionId.slice(-4)}`,
        questionType: normalizeQuestionType(generated.currentPrompt.questionType),
        question: generated.currentPrompt.question,
        evaluationCriteria: generated.currentPrompt.evaluationCriteria,
        expectedFocus: generated.currentPrompt.expectedFocus,
        hints: generated.currentPrompt.hints,
      },
      currentQuestionIndex: 0,
      maxQuestions: context.maxQuestions,
      status: "active",
      turns: [],
      summary: emptySummary(),
      startedAtIso: nowIso,
      updatedAtIso: nowIso,
      completedAtIso: "",
    },
  };
}

export async function runMockInterviewAnswer({
  profile = {},
  session = {},
  answer = "",
  confidenceLevel = "medium",
  timeTakenSeconds = 0,
}) {
  const context = buildAnswerContext({
    profile,
    session,
    answer,
    confidenceLevel,
    timeTakenSeconds,
  });
  const runtime = getGeminiRuntime();
  let warning = "";
  let result = buildFallbackAnswerReview(context);
  let provider = "Built-in mock interview";
  let model = "fallback";

  if (runtime.aiEnabled) {
    try {
      const aiResult = await generateGeminiAnswerReview({
        client: runtime.client,
        model: runtime.model,
        context,
      });
      result = normalizeAnswerPayload(aiResult, result);
      provider = "Gemini";
      model = runtime.model;
    } catch (error) {
      warning =
        error?.message ||
        "Gemini could not score the interview answer, so a built-in evaluator was used.";
    }
  } else {
    warning =
      "GEMINI_API_KEY is missing, so a built-in mock-interview evaluator was used.";
  }

  const answeredAtIso = new Date().toISOString();
  const questionId =
    context.currentPrompt.questionId ||
    `question_${context.nextQuestionNumber}_${context.sessionId.slice(-4)}`;
  const question = context.currentPrompt.question || "Interview question";
  const questionType = normalizeQuestionType(context.currentPrompt.questionType);
  const evaluationCriteria = normalizeEvaluationCriteria(
    context.currentPrompt.evaluationCriteria,
  );
  const turnCount = context.turns.length + 1;
  const shouldEnd = Boolean(result.shouldEnd) || turnCount >= context.maxQuestions;
  const completedAtIso = shouldEnd ? answeredAtIso : "";
  const reviewWithComputedScore = {
    ...result,
    score: sumBreakdown(result),
  };
  const fallbackSummary = buildSessionSummary(context, reviewWithComputedScore);

  return {
    warning,
    provider,
    model,
    result: {
      questionId,
      questionType,
      question,
      evaluationCriteria,
      answer: truncateText(context.answer, 3000),
      timeTakenSeconds: clampNumber(context.timeTakenSeconds, 0, 7200),
      confidenceLevel: normalizeConfidenceLevel(context.confidenceLevel),
      score: reviewWithComputedScore.score,
      clarityScore: clampNumber(reviewWithComputedScore.clarityScore, 0, 20),
      conceptUnderstandingScore: clampNumber(
        reviewWithComputedScore.conceptUnderstandingScore,
        0,
        25,
      ),
      structureScore: clampNumber(reviewWithComputedScore.structureScore, 0, 15),
      practicalExamplesScore: clampNumber(
        reviewWithComputedScore.practicalExamplesScore,
        0,
        20,
      ),
      communicationScore: clampNumber(reviewWithComputedScore.communicationScore, 0, 20),
      feedback: truncateText(
        reviewWithComputedScore.feedback ||
          buildFeedbackText(
            reviewWithComputedScore.didWell,
            reviewWithComputedScore.missingAreas,
          ),
        720,
      ),
      didWell: normalizeStringArray(reviewWithComputedScore.didWell, 6, 180),
      missingAreas: normalizeStringArray(reviewWithComputedScore.missingAreas, 6, 180),
      idealAnswer: truncateText(reviewWithComputedScore.idealAnswer, 1400),
      followUpQuestions: normalizeStringArray(
        reviewWithComputedScore.followUpQuestions,
        4,
        240,
      ),
      interviewerNote: truncateText(reviewWithComputedScore.interviewerNote, 220),
      nextQuestionId: shouldEnd
        ? ""
        : `question_${context.nextQuestionNumber}_${context.sessionId.slice(-4)}`,
      nextQuestionType: shouldEnd
        ? ""
        : normalizeQuestionType(reviewWithComputedScore.nextQuestionType),
      nextQuestion: shouldEnd
        ? ""
        : truncateText(reviewWithComputedScore.nextQuestion, 360),
      nextEvaluationCriteria: shouldEnd
        ? []
        : normalizeEvaluationCriteria(reviewWithComputedScore.nextEvaluationCriteria),
      nextExpectedFocus: shouldEnd
        ? []
        : normalizeStringArray(reviewWithComputedScore.nextExpectedFocus, 6, 120),
      nextQuestionHints: shouldEnd
        ? []
        : normalizeStringArray(reviewWithComputedScore.nextQuestionHints, 6, 120),
      shouldEnd,
      answeredAtIso,
      completedAtIso,
      summary: shouldEnd
        ? normalizeSummaryPayload(reviewWithComputedScore.summary, fallbackSummary)
        : emptySummary(),
    },
  };
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
      provider: "Built-in mock interview",
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

async function generateGeminiSessionStart({ client, model, context }) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are the LevelUp Mock Interview Lab.",
              "Create the first question for one complete mock interview session.",
              "The interview must stay aligned with the requested role and interview type.",
              "HR should focus on behavioral depth, ownership, motivation, and communication.",
              "Technical should test role-specific technical understanding or problem solving.",
              "Domain should test the real non-software domain if the target role is outside software.",
              "If the role is teacher, lecturer, trainer, faculty, or tutor, strongly prefer Teaching Simulation or Scenario-Based prompts.",
              "questionPlan should contain concise labels for the session arc, not full questions.",
              "evaluationCriteria should stay close to clarity, depth, structure, real-world connection, and communication.",
              "expectedFocus and hints should stay short and practical.",
              "Return valid JSON matching the schema exactly.",
              "",
              `Target role: ${context.role}`,
              `Interview type: ${context.interviewType}`,
              `Difficulty: ${context.difficulty}`,
              `Company context: ${context.company || "General company"}`,
              `Max questions: ${context.maxQuestions}`,
              `Resume version: ${context.resumeVersion || "Not linked"}`,
              `Latest ATS score: ${context.atsScore ? `${context.atsScore}/100` : "Not available"}`,
              `Skill gaps: ${context.skillGaps.join(", ") || "Not available"}`,
              `Focus areas: ${context.focusAreas.join(", ") || "General role fit"}`,
              `Candidate context: ${context.profileSummary}`,
              context.jobDescription
                ? `Job description:\n${truncateText(context.jobDescription, MAX_JOB_DESCRIPTION_LENGTH)}`
                : "Job description: Not provided.",
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: START_SESSION_SCHEMA,
      temperature: 0.55,
    },
  });

  return parseJsonResponse(response?.text);
}

async function generateGeminiAnswerReview({ client, model, context }) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are the LevelUp Mock Interview Lab interviewer.",
              "Score the student's answer realistically for practice, not for flattery.",
              "The interview must remain aligned with the requested role and interview type.",
              "Do not convert non-software roles into software interviews unless the role explicitly requires software.",
              "Use this exact weighted breakdown:",
              "clarityScore out of 20.",
              "conceptUnderstandingScore out of 25.",
              "structureScore out of 15.",
              "practicalExamplesScore out of 20.",
              "communicationScore out of 20.",
              "score must equal the sum of those five component scores.",
              "didWell should name what worked.",
              "missingAreas should name what was missing or weak.",
              "idealAnswer should be a concise model answer outline, not a full essay.",
              "followUpQuestions should contain deeper probing questions based on this answer.",
              "If there are more questions remaining, generate exactly one nextQuestion for the session.",
              "If this should be the final question, set shouldEnd true and keep nextQuestion fields empty.",
              "summary.averageScore must reflect the session average including this answer.",
              "summary.totalScore must reflect the total session score across answered questions.",
              "summary.overallScore must equal summary.averageScore for compatibility.",
              "Return valid JSON matching the schema exactly.",
              "",
              `Target role: ${context.role}`,
              `Interview type: ${context.interviewType}`,
              `Difficulty: ${context.difficulty}`,
              `Company context: ${context.company || "General company"}`,
              `Question number: ${context.questionNumber} of ${context.maxQuestions}`,
              `Questions remaining after this answer: ${context.remainingAfterCurrent}`,
              `Resume version: ${context.resumeVersion || "Not linked"}`,
              `Latest ATS score: ${context.atsScore ? `${context.atsScore}/100` : "Not available"}`,
              `Skill gaps: ${context.skillGaps.join(", ") || "Not available"}`,
              `Focus areas: ${context.focusAreas.join(", ") || "General role fit"}`,
              `Candidate context: ${context.profileSummary}`,
              `Current question type: ${context.currentPrompt.questionType}`,
              `Current question: ${context.currentPrompt.question}`,
              `Evaluation criteria: ${context.currentPrompt.evaluationCriteria.join(", ")}`,
              `Expected focus: ${context.currentPrompt.expectedFocus.join(", ") || "Answer the question directly"}`,
              `Confidence level selected by learner: ${context.confidenceLevel}`,
              `Time taken: ${context.timeTakenSeconds} seconds`,
              context.turnHistory
                ? `Previous turns:\n${context.turnHistory}`
                : "Previous turns: None.",
              `Candidate answer:\n${truncateText(context.answer, 3000)}`,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ANSWER_SCHEMA,
      temperature: 0.45,
    },
  });

  return parseJsonResponse(response?.text);
}

function buildInterviewContext({
  profile = {},
  role = "",
  interviewType = "technical",
  difficulty = "medium",
  company = "",
  focusAreas = [],
  jobDescription = "",
  maxQuestions = 4,
} = {}) {
  const resume = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestAnalysis = resumeWorkspace?.latestAnalysis?.report || null;
  const latestContext = resumeWorkspace?.latestAnalysis?.context || null;
  const guidance = profile?.careerGuidance || {};
  const adaptiveLearning = profile?.adaptiveLearning || {};
  const latestResumeRole = getLatestAnalyzedResumeRole(latestAnalysis);
  const resolvedRole = truncateText(
    role ||
      guidance.latestTargetRole ||
      adaptiveLearning.targetRole ||
      latestResumeRole ||
      resume.topRole ||
      "Target role",
    120,
  );
  const skillGaps = normalizeStringArray(
    [
      ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
      ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
      ...(latestAnalysis?.missingSkills || []),
      ...(resume.missingSkills || []),
    ],
    10,
    100,
  );
  const resolvedFocusAreas = normalizeStringArray(
    [
      ...(Array.isArray(focusAreas) ? focusAreas : []),
      ...(guidance.latestFocusAreas || []),
      ...skillGaps,
    ],
    10,
    100,
  );

  return {
    role: resolvedRole,
    interviewType: normalizeInterviewType(interviewType),
    difficulty: normalizeDifficulty(difficulty),
    company: truncateText(company || "", 120),
    focusAreas: resolvedFocusAreas.length ? resolvedFocusAreas : [resolvedRole],
    skillGaps,
    jobDescription: truncateText(jobDescription || "", MAX_JOB_DESCRIPTION_LENGTH),
    maxQuestions: clampNumber(maxQuestions, 3, 6) || 4,
    resumeVersion: truncateText(
      latestContext?.fileName ||
        latestAnalysis?.fileName ||
        resume.latestResumeFileName ||
        "",
      180,
    ),
    atsScore: clampNumber(latestAnalysis?.atsScore ?? resume.atsScore, 0, 100),
    profileSummary: buildProfileSummary(profile, resolvedRole),
  };
}

function buildAnswerContext({
  profile = {},
  session = {},
  answer = "",
  confidenceLevel = "medium",
  timeTakenSeconds = 0,
}) {
  const normalizedSession = session && typeof session === "object" ? session : {};
  const turns = Array.isArray(normalizedSession.turns) ? normalizedSession.turns : [];
  const currentPrompt =
    normalizedSession.currentPrompt && typeof normalizedSession.currentPrompt === "object"
      ? normalizedSession.currentPrompt
      : {};
  const maxQuestions = clampNumber(normalizedSession.maxQuestions, 3, 6) || 4;
  const questionNumber = clampNumber(
    (normalizedSession.currentQuestionIndex || 0) + 1,
    1,
    maxQuestions,
  );
  const defaultContext = buildInterviewContext({ profile });
  const sessionContext =
    normalizedSession.sessionContext && typeof normalizedSession.sessionContext === "object"
      ? normalizedSession.sessionContext
      : {};

  return {
    sessionId: truncateText(normalizedSession.id || "", 120) || "mock_session",
    role: truncateText(normalizedSession.role || sessionContext.targetRole || defaultContext.role, 120),
    interviewType: normalizeInterviewType(normalizedSession.interviewType),
    difficulty: normalizeDifficulty(normalizedSession.difficulty),
    company: truncateText(normalizedSession.company || "", 120),
    focusAreas: normalizeStringArray(
      normalizedSession.focusAreas?.length ? normalizedSession.focusAreas : sessionContext.focusAreas,
      10,
      100,
    ),
    skillGaps: normalizeStringArray(sessionContext.skillGaps, 10, 100),
    resumeVersion: truncateText(sessionContext.linkedResumeVersion || defaultContext.resumeVersion, 180),
    atsScore: clampNumber(sessionContext.atsScore || defaultContext.atsScore, 0, 100),
    profileSummary: buildProfileSummary(profile, normalizedSession.role || sessionContext.targetRole || ""),
    turns,
    currentPrompt: {
      questionId: truncateText(currentPrompt.questionId || "", 120),
      questionType: normalizeQuestionType(currentPrompt.questionType),
      question: truncateText(currentPrompt.question || "Interview question", 420),
      evaluationCriteria: normalizeEvaluationCriteria(currentPrompt.evaluationCriteria),
      expectedFocus: normalizeStringArray(currentPrompt.expectedFocus, 6, 120),
      hints: normalizeStringArray(currentPrompt.hints, 6, 120),
    },
    answer: String(answer || "").trim(),
    confidenceLevel: normalizeConfidenceLevel(confidenceLevel),
    timeTakenSeconds: clampNumber(timeTakenSeconds, 0, 7200),
    maxQuestions,
    questionNumber,
    nextQuestionNumber: Math.min(questionNumber + 1, maxQuestions),
    remainingAfterCurrent: Math.max(maxQuestions - questionNumber, 0),
    turnHistory: turns
      .slice(-MAX_TURNS_TO_SEND)
      .map(
        (turn, index) =>
          [
            `Turn ${index + 1}`,
            `Question type: ${normalizeQuestionType(turn.questionType)}`,
            `Question: ${truncateText(turn.question || "", 180)}`,
            `Answer: ${truncateText(turn.answer || "", 260)}`,
            `Score: ${clampNumber(turn.score, 0, 100)}/100`,
            Array.isArray(turn.didWell) && turn.didWell.length
              ? `Did well: ${turn.didWell.slice(0, 2).join(", ")}`
              : "",
            Array.isArray(turn.missingAreas) && turn.missingAreas.length
              ? `Missing: ${turn.missingAreas.slice(0, 2).join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
      )
      .join("\n\n"),
  };
}

function buildProfileSummary(profile, role) {
  const resume = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestAnalysis = resumeWorkspace?.latestAnalysis?.report || null;
  const latestContext = resumeWorkspace?.latestAnalysis?.context || null;
  const guidance = profile?.careerGuidance || {};
  const adaptiveLearning = profile?.adaptiveLearning || {};
  const latestRole = getLatestAnalyzedResumeRole(latestAnalysis);
  const latestAtsScore = clampNumber(latestAnalysis?.atsScore ?? resume.atsScore, 0, 100);
  const latestResumeVersion = truncateText(
    latestContext?.fileName || latestAnalysis?.fileName || resume.latestResumeFileName || "",
    180,
  );
  const skillGaps = normalizeStringArray(
    [
      ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
      ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
      ...(latestAnalysis?.missingSkills || []),
      ...(resume.missingSkills || []),
    ],
    8,
    100,
  );
  const strengths = normalizeStringArray(
    [
      ...(latestAnalysis?.extractedSkills || []),
      ...(resume.extractedSkills || []),
    ],
    8,
    100,
  );
  const parts = [
    role ? `Target role: ${role}.` : "",
    resume.parsedName ? `Candidate: ${resume.parsedName}.` : "",
    latestResumeVersion ? `Resume version: ${latestResumeVersion}.` : "",
    resume.educationLevel ? `Education: ${resume.educationLevel}.` : "",
    resume.experienceLevel || resume.yearsExperienceDisplay
      ? `Experience: ${resume.yearsExperienceDisplay || resume.experienceLevel}.`
      : "",
    latestAtsScore ? `Latest ATS score: ${latestAtsScore}/100.` : "",
    latestRole ? `Latest resume role signal: ${latestRole}.` : "",
    strengths.length ? `Visible strengths: ${strengths.join(", ")}.` : "",
    guidance.latestTargetRole ? `Guidance target role: ${guidance.latestTargetRole}.` : "",
    guidance.latestFocusAreas?.length
      ? `Guidance focus areas: ${guidance.latestFocusAreas.slice(0, 5).join(", ")}.`
      : "",
    skillGaps.length ? `Skill gaps: ${skillGaps.join(", ")}.` : "",
    adaptiveLearning.sourceRoadmapTitle
      ? `Adaptive learning roadmap: ${adaptiveLearning.sourceRoadmapTitle}.`
      : "",
  ];

  return truncateText(parts.filter(Boolean).join(" "), 1400);
}

function buildFallbackSessionStart(context) {
  const firstFocus = context.focusAreas[0] || context.role;
  const questionPlan = buildFallbackQuestionPlan(context);
  const firstQuestion = buildQuestionPacket({
    role: context.role,
    interviewType: context.interviewType,
    difficulty: context.difficulty,
    focus: firstFocus,
    company: context.company,
    questionNumber: 1,
  });

  return {
    intro: truncateText(
      `Welcome to the ${context.interviewType} mock interview for ${context.role}. I will ask ${context.maxQuestions} focused questions and score each answer with weighted feedback.`,
      260,
    ),
    guidance: truncateText(
      buildGuidanceText(context),
      320,
    ),
    questionPlan,
    currentPrompt: {
      questionId: "question_1",
      questionType: firstQuestion.questionType,
      question: firstQuestion.question,
      evaluationCriteria: firstQuestion.evaluationCriteria,
      expectedFocus: firstQuestion.expectedFocus,
      hints: firstQuestion.hints,
    },
  };
}

function buildFallbackAnswerReview(context) {
  const words = context.answer.split(/\s+/).filter(Boolean).length;
  const keywordHits = context.focusAreas.filter((item) =>
    new RegExp(`\\b${escapeRegExp(String(item || ""))}\\b`, "i").test(context.answer),
  ).length;
  const structureHits = [
    /\bfirst\b/i,
    /\bsecond\b/i,
    /\bthird\b/i,
    /\bfinally\b/i,
    /\bfor example\b/i,
    /\bfor instance\b/i,
    /\bin summary\b/i,
  ].filter((pattern) => pattern.test(context.answer)).length;
  const exampleHits = [
    /\bexample\b/i,
    /\bclassroom\b/i,
    /\bproject\b/i,
    /\bstudent\b/i,
    /\bresult\b/i,
    /\bimpact\b/i,
    /\buser\b/i,
    /\bteam\b/i,
  ].filter((pattern) => pattern.test(context.answer)).length;
  const questionPacket = buildQuestionPacket({
    role: context.role,
    interviewType: context.interviewType,
    difficulty: context.difficulty,
    focus:
      context.focusAreas[context.turns.length % Math.max(context.focusAreas.length, 1)] ||
      context.role,
    company: context.company,
    questionNumber: context.nextQuestionNumber,
  });
  const clarityScore = clampNumber(
    6 + (words >= 45 ? 5 : 0) + structureHits * 2 + confidenceBonus(context.confidenceLevel),
    0,
    20,
  );
  const conceptUnderstandingScore = clampNumber(
    8 + keywordHits * 4 + (words >= 80 ? 4 : 0),
    0,
    25,
  );
  const structureScore = clampNumber(
    4 + structureHits * 3 + (words >= 55 ? 2 : 0),
    0,
    15,
  );
  const practicalExamplesScore = clampNumber(
    4 + exampleHits * 3 + keywordHits * 2,
    0,
    20,
  );
  const communicationScore = clampNumber(
    7 + (words >= 50 ? 4 : 0) + structureHits + confidenceBonus(context.confidenceLevel),
    0,
    20,
  );
  const score =
    clarityScore +
    conceptUnderstandingScore +
    structureScore +
    practicalExamplesScore +
    communicationScore;
  const shouldEnd = context.remainingAfterCurrent <= 0;
  const didWell = normalizeStringArray(
    [
      clarityScore >= 13 ? "Clear opening and mostly understandable explanation." : "",
      conceptUnderstandingScore >= 16
        ? `You connected the answer to relevant ideas like ${context.focusAreas.slice(0, 2).join(", ")}.`
        : "",
      practicalExamplesScore >= 12 ? "You used at least one example to ground the answer." : "",
      isTeachingRole(context.role) && communicationScore >= 13
        ? "The answer sounded more like teaching than reciting."
        : "",
    ],
    4,
    180,
  );
  const missingAreas = normalizeStringArray(
    [
      structureScore <= 8 ? "Use a cleaner answer structure from intro to close." : "",
      practicalExamplesScore <= 10 ? "Add one real example, demo, or classroom situation." : "",
      conceptUnderstandingScore <= 14
        ? `Explain the core concept for ${context.role} with more depth.`
        : "",
      communicationScore <= 11 ? "Slow down and use simpler, more direct wording." : "",
    ],
    4,
    180,
  );

  return {
    score,
    clarityScore,
    conceptUnderstandingScore,
    structureScore,
    practicalExamplesScore,
    communicationScore,
    feedback: buildFeedbackText(didWell, missingAreas),
    didWell,
    missingAreas,
    idealAnswer: buildIdealAnswer(context),
    followUpQuestions: buildFollowUpQuestions(context),
    interviewerNote:
      score >= 75
        ? "Promising answer, but sharper proof would raise the level."
        : "Needs better structure, depth, and a stronger role-specific example.",
    nextQuestionType: shouldEnd ? "" : questionPacket.questionType,
    nextQuestion: shouldEnd ? "" : questionPacket.question,
    nextEvaluationCriteria: shouldEnd ? [] : questionPacket.evaluationCriteria,
    nextExpectedFocus: shouldEnd ? [] : questionPacket.expectedFocus,
    nextQuestionHints: shouldEnd ? [] : questionPacket.hints,
    shouldEnd,
    summary: shouldEnd ? buildSessionSummary(context, { score, didWell, missingAreas }) : emptySummary(),
  };
}

function buildFallbackQuestionPlan(context) {
  return normalizeStringArray(
    [
      context.interviewType === "hr"
        ? "Motivation and behavioral fit"
        : isTeachingRole(context.role)
          ? "Teaching fundamentals"
          : `${context.role} fundamentals`,
      context.focusAreas[0] ? `${context.focusAreas[0]} depth` : "",
      context.focusAreas[1]
        ? `${context.focusAreas[1]} scenario`
        : context.interviewType === "hr"
          ? "Ownership example"
          : "Applied problem solving",
      context.company ? `${context.company} alignment` : "Communication polish",
      "Final reflection and improvement",
      "Stretch follow-up",
    ],
    context.maxQuestions,
    120,
  );
}

function buildQuestionPacket({
  role,
  interviewType,
  difficulty,
  focus,
  company,
  questionNumber,
}) {
  const questionType = inferQuestionType({ role, interviewType, questionNumber });
  const resolvedFocus = focus || role;
  const companyPhrase = company ? ` for a company like ${company}` : "";

  if (questionType === "Behavioral") {
    return {
      questionType,
      question: truncateText(
        `Question ${questionNumber}: Tell me about a time you handled a difficult situation relevant to ${role}. What happened, what decision did you take, and what was the outcome${companyPhrase}?`,
        360,
      ),
      evaluationCriteria: normalizeEvaluationCriteria(),
      expectedFocus: normalizeStringArray(
        [
          "Use a specific situation",
          "Explain your action clearly",
          "End with the result or learning",
        ],
        4,
        120,
      ),
      hints: normalizeStringArray(
        [
          "Use situation, action, and result",
          "Avoid generic personality claims",
          company ? `Connect the decision to ${company}` : "Show ownership",
        ],
        4,
        120,
      ),
    };
  }

  if (questionType === "Teaching Simulation") {
    return {
      questionType,
      question: truncateText(
        `Question ${questionNumber}: Imagine you are teaching beginners about ${resolvedFocus}. How would you explain it step by step, give a simple example, and show why it matters in real classroom or practical use${companyPhrase}?`,
        360,
      ),
      evaluationCriteria: normalizeEvaluationCriteria(),
      expectedFocus: normalizeStringArray(
        [
          "Explain in simple language",
          "Use one concrete example or demo",
          "Show why the concept matters",
        ],
        4,
        120,
      ),
      hints: normalizeStringArray(
        [
          "Start with a basic definition",
          "Teach, do not just define",
          "End with impact or learner takeaway",
        ],
        4,
        120,
      ),
    };
  }

  if (questionType === "Scenario-Based") {
    return {
      questionType,
      question: truncateText(
        `Question ${questionNumber}: In a ${difficulty} ${role} interview, how would you handle a realistic scenario involving ${resolvedFocus}? Walk me through your reasoning, tradeoffs, and the result you would aim for${companyPhrase}.`,
        360,
      ),
      evaluationCriteria: normalizeEvaluationCriteria(),
      expectedFocus: normalizeStringArray(
        [
          "Break the scenario into steps",
          "Explain tradeoffs and judgment",
          "Show a realistic outcome",
        ],
        4,
        120,
      ),
      hints: normalizeStringArray(
        [
          "Think aloud in a clear order",
          "Mention one practical constraint",
          "Use a realistic example",
        ],
        4,
        120,
      ),
    };
  }

  if (questionType === "Problem Solving") {
    return {
      questionType,
      question: truncateText(
        `Question ${questionNumber}: Explain how you would solve a problem related to ${resolvedFocus} as a ${role}. Be specific about your approach, checks, and expected result${companyPhrase}.`,
        360,
      ),
      evaluationCriteria: normalizeEvaluationCriteria(),
      expectedFocus: normalizeStringArray(
        [
          "State the problem clearly",
          "Describe the approach step by step",
          "End with the expected outcome",
        ],
        4,
        120,
      ),
      hints: normalizeStringArray(
        [
          "Use a beginning, middle, and end",
          "Show one practical example",
          "Avoid vague statements",
        ],
        4,
        120,
      ),
    };
  }

  return {
    questionType: "Concept Explanation",
    question: truncateText(
      `Question ${questionNumber}: Explain ${resolvedFocus} for a ${role} interview. Define it clearly, cover the key principles, and connect it to a practical example${companyPhrase}.`,
      360,
    ),
    evaluationCriteria: normalizeEvaluationCriteria(),
    expectedFocus: normalizeStringArray(
      [
        "Define the concept simply",
        "Cover the key principles",
        "Use one real-world example",
      ],
      4,
      120,
    ),
    hints: normalizeStringArray(
      [
        "Start simple, then go deeper",
        "Use one clear example",
        "Explain why it matters",
      ],
      4,
      120,
    ),
  };
}

function inferQuestionType({ role, interviewType, questionNumber }) {
  if (interviewType === "hr") {
    return "Behavioral";
  }

  if (isTeachingRole(role)) {
    return questionNumber % 2 === 0 ? "Scenario-Based" : "Teaching Simulation";
  }

  if (interviewType === "domain") {
    return questionNumber % 2 === 0 ? "Scenario-Based" : "Concept Explanation";
  }

  if (questionNumber % 3 === 0) {
    return "Scenario-Based";
  }

  return questionNumber % 2 === 0 ? "Problem Solving" : "Concept Explanation";
}

function buildGuidanceText(context) {
  if (isTeachingRole(context.role)) {
    return "Answer like a teacher: start simple, define the core idea, explain the key points, use one classroom-friendly example, and close with why it matters.";
  }

  if (context.interviewType === "hr") {
    return "Answer with a situation, your action, the result, and what you learned. Keep it specific and role-aligned.";
  }

  return "Answer in a clear structure: simple introduction, core concept, key steps or tradeoffs, one practical example, and why it matters.";
}

function buildIdealAnswer(context) {
  const focus = context.currentPrompt.expectedFocus[0] || context.focusAreas[0] || context.role;
  const teacherTone = isTeachingRole(context.role)
    ? "Start with simple learner-friendly language, then teach the idea step by step."
    : "Start with a direct explanation of the concept or problem.";

  return truncateText(
    [
      teacherTone,
      `Define the main idea around ${focus}.`,
      "Cover the key principles or steps in a clear order.",
      "Add one concrete example or scenario from real work, classroom practice, or projects.",
      "Close with why the concept matters and what good execution looks like.",
    ].join(" "),
    1200,
  );
}

function buildFollowUpQuestions(context) {
  const focus = context.focusAreas[0] || context.role;
  return normalizeStringArray(
    [
      `Can you give one concrete example that shows your answer in action for ${focus}?`,
      `What common mistake do people make with ${focus}, and how would you avoid it?`,
      isTeachingRole(context.role)
        ? `How would you explain the same idea to a weaker student in simpler words?`
        : `How would your answer change under tighter constraints or real-world pressure?`,
    ],
    3,
    240,
  );
}

function buildSessionSummary(context, latestReview) {
  const priorScores = context.turns.map((turn) => clampNumber(turn?.score, 0, 100));
  const totalScore = clampNumber(
    priorScores.reduce((sum, score) => sum + score, 0) + clampNumber(latestReview.score, 0, 100),
    0,
    MAX_TOTAL_SESSION_SCORE,
  );
  const answeredCount = priorScores.length + 1;
  const averageScore = clampNumber(
    Math.round(totalScore / Math.max(answeredCount, 1)),
    0,
    100,
  );
  const strengths = aggregateFeedbackItems([
    ...context.turns.flatMap((turn) => turn?.didWell || turn?.strengths || []),
    ...(latestReview.didWell || []),
  ]);
  const weaknesses = aggregateFeedbackItems([
    ...context.turns.flatMap((turn) => turn?.missingAreas || turn?.improvements || []),
    ...(latestReview.missingAreas || []),
  ]);
  const topImprovementAreas = weaknesses.slice(0, 3);
  const recommendedPracticeTopics = normalizeStringArray(
    [
      ...topImprovementAreas,
      ...context.skillGaps,
      ...context.focusAreas,
    ],
    6,
    180,
  );

  return {
    totalScore,
    averageScore,
    overallScore: averageScore,
    hireSignal: inferHireSignal(averageScore),
    summary:
      averageScore >= 75
        ? `This mock interview for ${context.role} is moving in the right direction. The answers are mostly workable, but sharper proof and clearer structure would make the session interview-ready.`
        : `This mock interview shows clear improvement opportunities for ${context.role}, especially around structure, depth, and practical examples.`,
    strengths,
    weaknesses,
    topImprovementAreas,
    recommendedPracticeTopics,
    nextSteps: buildDefaultNextSteps(context, topImprovementAreas, recommendedPracticeTopics),
  };
}

function aggregateFeedbackItems(items) {
  const counts = new Map();

  normalizeStringArray(items, 20, 180).forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([label]) => label);
}

function buildDefaultNextSteps(context, topImprovementAreas = [], practiceTopics = []) {
  return normalizeStringArray(
    [
      topImprovementAreas[0]
        ? `Practice one answer focused on ${topImprovementAreas[0].toLowerCase()}.`
        : `Practice one more ${context.interviewType} answer for ${context.role}.`,
      practiceTopics[0]
        ? `Revise ${practiceTopics[0]} with one concrete example or teaching demo.`
        : "",
      isTeachingRole(context.role)
        ? "Explain one concept daily as if you are teaching a class."
        : "Answer with a cleaner opening, one practical example, and a sharper close.",
    ],
    5,
    180,
  );
}

function normalizeStartPayload(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    intro: truncateText(source.intro || fallback.intro || "", 260),
    guidance: truncateText(source.guidance || fallback.guidance || "", 320),
    questionPlan: normalizeStringArray(
      hasOwn(source, "questionPlan") ? source.questionPlan : fallback.questionPlan,
      8,
      120,
    ),
    currentPrompt: {
      questionId: truncateText(
        source?.currentPrompt?.questionId || fallback?.currentPrompt?.questionId || "",
        120,
      ),
      questionType: normalizeQuestionType(
        source?.currentPrompt?.questionType || fallback?.currentPrompt?.questionType,
      ),
      question: truncateText(
        source?.currentPrompt?.question || fallback?.currentPrompt?.question || "",
        360,
      ),
      evaluationCriteria: normalizeEvaluationCriteria(
        hasOwn(source?.currentPrompt, "evaluationCriteria")
          ? source.currentPrompt.evaluationCriteria
          : fallback?.currentPrompt?.evaluationCriteria,
      ),
      expectedFocus: normalizeStringArray(
        hasOwn(source?.currentPrompt, "expectedFocus")
          ? source.currentPrompt.expectedFocus
          : fallback?.currentPrompt?.expectedFocus,
        6,
        120,
      ),
      hints: normalizeStringArray(
        hasOwn(source?.currentPrompt, "hints")
          ? source.currentPrompt.hints
          : fallback?.currentPrompt?.hints,
        6,
        120,
      ),
    },
  };
}

function normalizeAnswerPayload(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const normalized = {
    clarityScore: clampNumber(
      hasOwn(source, "clarityScore") ? source.clarityScore : fallback.clarityScore,
      0,
      20,
    ),
    conceptUnderstandingScore: clampNumber(
      hasOwn(source, "conceptUnderstandingScore")
        ? source.conceptUnderstandingScore
        : fallback.conceptUnderstandingScore,
      0,
      25,
    ),
    structureScore: clampNumber(
      hasOwn(source, "structureScore") ? source.structureScore : fallback.structureScore,
      0,
      15,
    ),
    practicalExamplesScore: clampNumber(
      hasOwn(source, "practicalExamplesScore")
        ? source.practicalExamplesScore
        : fallback.practicalExamplesScore,
      0,
      20,
    ),
    communicationScore: clampNumber(
      hasOwn(source, "communicationScore")
        ? source.communicationScore
        : fallback.communicationScore,
      0,
      20,
    ),
    feedback: truncateText(source.feedback || fallback.feedback || "", 720),
    didWell: normalizeStringArray(
      hasOwn(source, "didWell") ? source.didWell : fallback.didWell,
      6,
      180,
    ),
    missingAreas: normalizeStringArray(
      hasOwn(source, "missingAreas") ? source.missingAreas : fallback.missingAreas,
      6,
      180,
    ),
    idealAnswer: truncateText(source.idealAnswer || fallback.idealAnswer || "", 1400),
    followUpQuestions: normalizeStringArray(
      hasOwn(source, "followUpQuestions")
        ? source.followUpQuestions
        : fallback.followUpQuestions,
      4,
      240,
    ),
    interviewerNote: truncateText(
      source.interviewerNote || fallback.interviewerNote || "",
      220,
    ),
    nextQuestionType: normalizeQuestionType(
      source.nextQuestionType || fallback.nextQuestionType,
    ),
    nextQuestion: truncateText(
      source.nextQuestion || fallback.nextQuestion || "",
      360,
    ),
    nextEvaluationCriteria: normalizeEvaluationCriteria(
      hasOwn(source, "nextEvaluationCriteria")
        ? source.nextEvaluationCriteria
        : fallback.nextEvaluationCriteria,
    ),
    nextExpectedFocus: normalizeStringArray(
      hasOwn(source, "nextExpectedFocus")
        ? source.nextExpectedFocus
        : fallback.nextExpectedFocus,
      6,
      120,
    ),
    nextQuestionHints: normalizeStringArray(
      hasOwn(source, "nextQuestionHints")
        ? source.nextQuestionHints
        : fallback.nextQuestionHints,
      6,
      120,
    ),
    shouldEnd:
      typeof source.shouldEnd === "boolean" ? source.shouldEnd : Boolean(fallback.shouldEnd),
    summary: normalizeSummaryPayload(source.summary, fallback.summary),
  };

  return {
    ...normalized,
    score: sumBreakdown(normalized),
  };
}

function normalizeSummaryPayload(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : emptySummary();
  const averageScore = clampNumber(
    hasOwn(source, "averageScore")
      ? source.averageScore
      : hasOwn(source, "overallScore")
        ? source.overallScore
        : safeFallback.averageScore,
    0,
    100,
  );

  return {
    totalScore: clampNumber(
      hasOwn(source, "totalScore") ? source.totalScore : safeFallback.totalScore,
      0,
      MAX_TOTAL_SESSION_SCORE,
    ),
    averageScore,
    overallScore: clampNumber(
      hasOwn(source, "overallScore") ? source.overallScore : averageScore,
      0,
      100,
    ),
    hireSignal: truncateText(
      source.hireSignal || safeFallback.hireSignal || inferHireSignal(averageScore),
      80,
    ),
    summary: truncateText(source.summary || safeFallback.summary || "", 560),
    strengths: normalizeStringArray(
      hasOwn(source, "strengths") ? source.strengths : safeFallback.strengths,
      8,
      180,
    ),
    weaknesses: normalizeStringArray(
      hasOwn(source, "weaknesses") ? source.weaknesses : safeFallback.weaknesses,
      8,
      180,
    ),
    topImprovementAreas: normalizeStringArray(
      hasOwn(source, "topImprovementAreas")
        ? source.topImprovementAreas
        : safeFallback.topImprovementAreas,
      6,
      180,
    ),
    recommendedPracticeTopics: normalizeStringArray(
      hasOwn(source, "recommendedPracticeTopics")
        ? source.recommendedPracticeTopics
        : safeFallback.recommendedPracticeTopics,
      8,
      180,
    ),
    nextSteps: normalizeStringArray(
      hasOwn(source, "nextSteps") ? source.nextSteps : safeFallback.nextSteps,
      8,
      180,
    ),
  };
}

function emptySummary() {
  return {
    totalScore: 0,
    averageScore: 0,
    overallScore: 0,
    hireSignal: "",
    summary: "",
    strengths: [],
    weaknesses: [],
    topImprovementAreas: [],
    recommendedPracticeTopics: [],
    nextSteps: [],
  };
}

function sumBreakdown(payload) {
  return clampNumber(
    clampNumber(payload?.clarityScore, 0, 20) +
      clampNumber(payload?.conceptUnderstandingScore, 0, 25) +
      clampNumber(payload?.structureScore, 0, 15) +
      clampNumber(payload?.practicalExamplesScore, 0, 20) +
      clampNumber(payload?.communicationScore, 0, 20),
    0,
    100,
  );
}

function buildFeedbackText(didWell, missingAreas) {
  if (didWell?.length && missingAreas?.length) {
    return `You handled ${didWell[0].toLowerCase()} well. The next lift is ${missingAreas[0].toLowerCase()}.`;
  }
  if (didWell?.length) {
    return `This answer has a solid base, especially around ${didWell[0].toLowerCase()}. Add one sharper example to make it stronger.`;
  }
  if (missingAreas?.length) {
    return `This answer needs another pass. Start by improving ${missingAreas[0].toLowerCase()}.`;
  }
  return "This answer needs more structure, deeper explanation, and a clearer practical example.";
}

function confidenceBonus(confidenceLevel) {
  if (confidenceLevel === "high") {
    return 2;
  }
  if (confidenceLevel === "low") {
    return 0;
  }
  return 1;
}

function inferHireSignal(score) {
  if (score >= 85) {
    return "Strong hire signal";
  }
  if (score >= 70) {
    return "Potential hire signal";
  }
  if (score >= 55) {
    return "Borderline signal";
  }
  return "Needs more practice";
}

function getLatestAnalyzedResumeRole(latestAnalysis) {
  return truncateText(
    latestAnalysis?.jobMatches?.[0]?.role || latestAnalysis?.topRole || "",
    120,
  );
}

function isTeachingRole(role) {
  return /\b(teacher|faculty|lecturer|trainer|tutor|professor|educator)\b/i.test(
    String(role || ""),
  );
}

function normalizeInterviewType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hr" || normalized === "technical" || normalized === "domain") {
    return normalized;
  }
  return "technical";
}

function normalizeDifficulty(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "medium";
}

function normalizeQuestionType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const matched = QUESTION_TYPES.find((type) => type.toLowerCase() === normalized);
  return matched || "Concept Explanation";
}

function normalizeConfidenceLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return "medium";
}

function normalizeEvaluationCriteria(values) {
  const normalized = normalizeStringArray(values, 5, 80);
  return normalized.length ? normalized : [...DEFAULT_EVALUATION_CRITERIA];
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
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("Gemini returned a non-JSON response.");
  }
}

function normalizeStringArray(values, maxItems, maxLength) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => truncateText(value, maxLength))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function hasOwn(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
