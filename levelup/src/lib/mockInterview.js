const DEFAULT_EVALUATION_CRITERIA = [
  "Clarity",
  "Depth",
  "Structure",
  "Real-world connection",
  "Communication",
];

const QUESTION_TYPE_LABELS = [
  "Concept Explanation",
  "Problem Solving",
  "Scenario-Based",
  "Teaching Simulation",
  "Behavioral",
];

export function createEmptyMockInterviewState() {
  return {
    status: "idle",
    activeSessionId: "",
    targetRole: "",
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    bestScore: 0,
    improvementRate: 0,
    weakAreasTrend: [],
    lastPracticedAtIso: "",
    sessions: [],
  };
}

export function normalizeMockInterviewState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const sessions = normalizeSessions(source.sessions);
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const totalSessions = sessions.length;
  const averageScore = completedSessions.length
    ? clampNumber(
        Math.round(
          completedSessions.reduce(
            (sum, session) => sum + getSessionAverageScore(session.summary),
            0,
          ) / completedSessions.length,
        ),
        0,
        100,
      )
    : 0;
  const bestScore = completedSessions.reduce((best, session) => {
    const score = getSessionAverageScore(session.summary);
    return score > best ? score : best;
  }, 0);
  const activeSessionId = truncateText(source.activeSessionId || "", 120);
  const resolvedActiveSessionId =
    sessions.find((session) => session.id === activeSessionId)?.id ||
    sessions.find((session) => session.status === "active")?.id ||
    sessions[0]?.id ||
    "";

  return {
    ...createEmptyMockInterviewState(),
    status: sessions.length ? "active" : truncateText(source.status || "idle", 20) || "idle",
    activeSessionId: resolvedActiveSessionId,
    targetRole: truncateText(
      source.targetRole || sessions[0]?.role || sessions[0]?.sessionContext?.targetRole || "",
      120,
    ),
    totalSessions,
    completedSessions: completedSessions.length,
    averageScore,
    bestScore,
    improvementRate: calculateImprovementRate(completedSessions),
    weakAreasTrend: buildWeakAreasTrend(completedSessions),
    lastPracticedAtIso: sessions[0]?.updatedAtIso || sessions[0]?.startedAtIso || "",
    sessions,
  };
}

export function startMockInterviewSession(state, sessionPayload) {
  const currentState = normalizeMockInterviewState(state);
  const incomingSession = normalizeSession(sessionPayload);
  const nextSessions = [
    incomingSession,
    ...currentState.sessions.filter((session) => session.id !== incomingSession.id),
  ];

  return normalizeMockInterviewState({
    ...currentState,
    status: "active",
    activeSessionId: incomingSession.id,
    targetRole:
      incomingSession.role ||
      incomingSession.sessionContext.targetRole ||
      currentState.targetRole,
    sessions: nextSessions,
  });
}

export function recordMockInterviewAnswer(state, sessionId, resultPayload) {
  const currentState = normalizeMockInterviewState(state);
  const nextSessions = currentState.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    const currentPrompt = normalizePrompt(session.currentPrompt);
    const turn = normalizeTurn({
      questionId: resultPayload?.questionId || currentPrompt.questionId,
      questionType: resultPayload?.questionType || currentPrompt.questionType,
      question: resultPayload?.question || currentPrompt.question,
      evaluationCriteria:
        resultPayload?.evaluationCriteria || currentPrompt.evaluationCriteria,
      answer: resultPayload?.answer || "",
      timeTakenSeconds: resultPayload?.timeTakenSeconds,
      confidenceLevel: resultPayload?.confidenceLevel,
      score: resultPayload?.score,
      clarityScore: resultPayload?.clarityScore,
      conceptUnderstandingScore: resultPayload?.conceptUnderstandingScore,
      structureScore: resultPayload?.structureScore,
      practicalExamplesScore: resultPayload?.practicalExamplesScore,
      communicationScore: resultPayload?.communicationScore,
      feedback: resultPayload?.feedback,
      didWell: resultPayload?.didWell,
      missingAreas: resultPayload?.missingAreas,
      idealAnswer: resultPayload?.idealAnswer,
      followUpQuestions: resultPayload?.followUpQuestions,
      interviewerNote: resultPayload?.interviewerNote,
      answeredAtIso: resultPayload?.answeredAtIso,
    });

    const nextTurns = [...session.turns, turn];
    const shouldEnd =
      Boolean(resultPayload?.shouldEnd) ||
      nextTurns.length >= Math.max(1, session.maxQuestions);
    const nextPrompt = shouldEnd
      ? createEmptyPrompt()
      : normalizePrompt({
          questionId:
            resultPayload?.nextQuestionId ||
            `question_${nextTurns.length + 1}_${session.id.slice(-4)}`,
          questionType: resultPayload?.nextQuestionType,
          question: resultPayload?.nextQuestion || resultPayload?.followUpQuestion || "",
          evaluationCriteria:
            resultPayload?.nextEvaluationCriteria || resultPayload?.followUpExpectedFocus,
          expectedFocus:
            resultPayload?.nextExpectedFocus || resultPayload?.followUpExpectedFocus,
          hints: resultPayload?.nextQuestionHints || [],
        });
    const nextSummary = shouldEnd
      ? normalizeSummary(
          {
            ...(resultPayload?.summary || {}),
            averageScore:
              resultPayload?.summary?.averageScore ??
              resultPayload?.summary?.overallScore ??
              averageTurnScore(nextTurns),
            overallScore:
              resultPayload?.summary?.overallScore ??
              resultPayload?.summary?.averageScore ??
              averageTurnScore(nextTurns),
            totalScore:
              resultPayload?.summary?.totalScore ??
              totalTurnScore(nextTurns),
          },
          nextTurns,
        )
      : session.summary;

    return normalizeSession({
      ...session,
      status: shouldEnd ? "completed" : "active",
      currentQuestionIndex: nextTurns.length,
      turns: nextTurns,
      currentPrompt: nextPrompt,
      summary: nextSummary,
      completedAtIso: shouldEnd ? resultPayload?.completedAtIso || new Date().toISOString() : "",
      updatedAtIso: resultPayload?.answeredAtIso || new Date().toISOString(),
    });
  });

  return normalizeMockInterviewState({
    ...currentState,
    sessions: nextSessions,
  });
}

function normalizeSessions(sessions = []) {
  return (Array.isArray(sessions) ? sessions : [])
    .map((session) => normalizeSession(session))
    .filter((session) => session.id)
    .sort(
      (left, right) =>
        new Date(right.updatedAtIso || right.startedAtIso || 0).getTime() -
        new Date(left.updatedAtIso || left.startedAtIso || 0).getTime(),
    );
}

function normalizeSession(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const turns = normalizeTurns(source.turns);
  const maxQuestions = clampNumber(source.maxQuestions, 1, 8) || 4;
  const currentPrompt = normalizePrompt(source.currentPrompt);
  const summary = normalizeSummary(source.summary, turns);
  const completed =
    truncateText(source.status || "", 20) === "completed" ||
    (turns.length >= maxQuestions && getSessionAverageScore(summary) > 0);

  return {
    id: truncateText(source.id || "", 120),
    role: truncateText(source.role || source?.sessionContext?.targetRole || "", 120),
    interviewType: truncateText(source.interviewType || "technical", 30) || "technical",
    difficulty: truncateText(source.difficulty || "medium", 20) || "medium",
    company: truncateText(source.company || "", 120),
    focusAreas: normalizeStringArray(source.focusAreas, 10, 80),
    jobDescription: truncateText(source.jobDescription || "", 6000),
    intro: truncateText(source.intro || "", 260),
    guidance: truncateText(source.guidance || "", 320),
    questionPlan: normalizeStringArray(source.questionPlan, 8, 120),
    sessionContext: normalizeSessionContext(source.sessionContext),
    currentQuestionIndex: clampNumber(source.currentQuestionIndex, 0, maxQuestions),
    maxQuestions,
    status: completed ? "completed" : "active",
    currentPrompt,
    turns,
    summary,
    startedAtIso: truncateText(source.startedAtIso || "", 40),
    completedAtIso: completed ? truncateText(source.completedAtIso || "", 40) : "",
    updatedAtIso: truncateText(source.updatedAtIso || source.startedAtIso || "", 40),
  };
}

function normalizeSessionContext(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    targetRole: truncateText(source.targetRole || "", 120),
    linkedResumeVersion: truncateText(
      source.linkedResumeVersion || source.resumeVersion || "",
      180,
    ),
    atsScore: clampNumber(source.atsScore, 0, 100),
    skillGaps: normalizeStringArray(source.skillGaps, 10, 100),
    focusAreas: normalizeStringArray(source.focusAreas, 10, 100),
  };
}

function normalizeTurns(turns = []) {
  return (Array.isArray(turns) ? turns : [])
    .map((turn) => normalizeTurn(turn))
    .filter((turn) => turn.questionId && turn.question)
    .slice(0, 12);
}

function normalizeTurn(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const usesNewBreakdown =
    hasOwn(source, "clarityScore") ||
    hasOwn(source, "conceptUnderstandingScore") ||
    hasOwn(source, "structureScore") ||
    hasOwn(source, "practicalExamplesScore") ||
    hasOwn(source, "didWell") ||
    hasOwn(source, "missingAreas") ||
    hasOwn(source, "idealAnswer");
  const legacyCommunicationScore = clampNumber(source.communicationScore, 0, 100);
  const legacyKnowledgeScore = clampNumber(source.knowledgeScore, 0, 100);
  const legacyConfidenceScore = clampNumber(source.confidenceScore, 0, 100);
  const clarityScore = usesNewBreakdown
    ? clampNumber(source.clarityScore, 0, 20)
    : scaleLegacyComponent(legacyCommunicationScore, 20);
  const conceptUnderstandingScore = usesNewBreakdown
    ? clampNumber(source.conceptUnderstandingScore, 0, 25)
    : scaleLegacyComponent(legacyKnowledgeScore, 25);
  const structureScore = usesNewBreakdown
    ? clampNumber(source.structureScore, 0, 15)
    : clampNumber(
        Math.round(
          (scaleLegacyComponent(legacyCommunicationScore, 15) +
            scaleLegacyComponent(legacyConfidenceScore, 15)) /
            2,
        ),
        0,
        15,
      );
  const practicalExamplesScore = usesNewBreakdown
    ? clampNumber(source.practicalExamplesScore, 0, 20)
    : clampNumber(
        Math.round(
          (scaleLegacyComponent(legacyKnowledgeScore, 20) +
            scaleLegacyComponent(legacyConfidenceScore, 20)) /
            2,
        ),
        0,
        20,
      );
  const communicationScore = usesNewBreakdown
    ? clampNumber(source.communicationScore, 0, 20)
    : clampNumber(
        Math.round(
          scaleLegacyComponent(legacyCommunicationScore, 20) * 0.6 +
            scaleLegacyComponent(legacyConfidenceScore, 20) * 0.4,
        ),
        0,
        20,
      );
  const didWell = normalizeStringArray(
    hasOwn(source, "didWell") ? source.didWell : source.strengths,
    6,
    180,
  );
  const missingAreas = normalizeStringArray(
    hasOwn(source, "missingAreas") ? source.missingAreas : source.improvements,
    6,
    180,
  );
  const score =
    clampNumber(source.score, 0, 100) ||
    clampNumber(
      clarityScore +
        conceptUnderstandingScore +
        structureScore +
        practicalExamplesScore +
        communicationScore,
      0,
      100,
    );

  return {
    questionId: truncateText(source.questionId || "", 120),
    questionType: normalizeQuestionType(source.questionType),
    question: truncateText(source.question || "", 420),
    evaluationCriteria: normalizeStringArray(
      source.evaluationCriteria,
      5,
      80,
    ).length
      ? normalizeStringArray(source.evaluationCriteria, 5, 80)
      : [...DEFAULT_EVALUATION_CRITERIA],
    answer: truncateText(source.answer || "", 3000),
    timeTakenSeconds: clampNumber(source.timeTakenSeconds, 0, 7200),
    confidenceLevel: normalizeConfidenceLevel(source.confidenceLevel),
    score,
    clarityScore,
    conceptUnderstandingScore,
    structureScore,
    practicalExamplesScore,
    communicationScore,
    feedback: truncateText(
      source.feedback ||
        buildFallbackFeedback({ didWell, missingAreas, score }),
      720,
    ),
    didWell,
    missingAreas,
    idealAnswer: truncateText(source.idealAnswer || "", 1200),
    followUpQuestions: normalizeStringArray(
      hasOwn(source, "followUpQuestions")
        ? source.followUpQuestions
        : source.followUpQuestion
          ? [source.followUpQuestion]
          : [],
      4,
      240,
    ),
    interviewerNote: truncateText(source.interviewerNote || "", 260),
    answeredAtIso: truncateText(source.answeredAtIso || "", 40),
  };
}

function normalizePrompt(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const evaluationCriteria = normalizeStringArray(source.evaluationCriteria, 5, 80);
  return {
    questionId: truncateText(source.questionId || "", 120),
    questionType: normalizeQuestionType(source.questionType),
    question: truncateText(source.question || "", 420),
    evaluationCriteria: evaluationCriteria.length
      ? evaluationCriteria
      : [...DEFAULT_EVALUATION_CRITERIA],
    expectedFocus: normalizeStringArray(source.expectedFocus, 6, 120),
    hints: normalizeStringArray(source.hints, 6, 120),
  };
}

function createEmptyPrompt() {
  return {
    questionId: "",
    questionType: "Concept Explanation",
    question: "",
    evaluationCriteria: [...DEFAULT_EVALUATION_CRITERIA],
    expectedFocus: [],
    hints: [],
  };
}

function normalizeSummary(candidate, turns = []) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const strengths = normalizeStringArray(source.strengths, 8, 180);
  const weaknesses = normalizeStringArray(
    hasOwn(source, "weaknesses")
      ? source.weaknesses
      : hasOwn(source, "improvements")
        ? source.improvements
        : source.topImprovementAreas,
    8,
    180,
  );
  const topImprovementAreas = normalizeStringArray(
    hasOwn(source, "topImprovementAreas")
      ? source.topImprovementAreas
      : weaknesses,
    6,
    180,
  );
  const recommendedPracticeTopics = normalizeStringArray(
    hasOwn(source, "recommendedPracticeTopics")
      ? source.recommendedPracticeTopics
      : source.nextSteps,
    8,
    180,
  );
  const nextSteps = normalizeStringArray(source.nextSteps, 8, 180);
  const derivedAverageScore =
    clampNumber(source.averageScore, 0, 100) ||
    clampNumber(source.overallScore, 0, 100) ||
    averageTurnScore(turns);
  const derivedTotalScore =
    clampNumber(source.totalScore, 0, 800) || totalTurnScore(turns);

  return {
    totalScore: derivedTotalScore,
    averageScore: derivedAverageScore,
    overallScore:
      clampNumber(source.overallScore, 0, 100) || derivedAverageScore,
    hireSignal: truncateText(source.hireSignal || inferHireSignal(derivedAverageScore), 80),
    summary: truncateText(source.summary || "", 560),
    strengths: strengths.length ? strengths : collectTurnItems(turns, "didWell", 8),
    weaknesses: weaknesses.length ? weaknesses : collectTurnItems(turns, "missingAreas", 8),
    improvements:
      topImprovementAreas.length
        ? topImprovementAreas
        : weaknesses.length
          ? weaknesses
          : collectTurnItems(turns, "missingAreas", 8),
    topImprovementAreas:
      topImprovementAreas.length
        ? topImprovementAreas
        : weaknesses.length
          ? weaknesses.slice(0, 3)
          : collectTurnItems(turns, "missingAreas", 3),
    recommendedPracticeTopics:
      recommendedPracticeTopics.length
        ? recommendedPracticeTopics
        : nextSteps.length
          ? nextSteps
          : collectTurnItems(turns, "missingAreas", 5),
    nextSteps:
      nextSteps.length
        ? nextSteps
        : recommendedPracticeTopics.length
          ? recommendedPracticeTopics
          : collectTurnItems(turns, "missingAreas", 5),
  };
}

function collectTurnItems(turns, field, maxItems) {
  return normalizeStringArray(
    (Array.isArray(turns) ? turns : []).flatMap((turn) =>
      Array.isArray(turn?.[field]) ? turn[field] : [],
    ),
    maxItems,
    180,
  );
}

function buildWeakAreasTrend(sessions) {
  const counts = new Map();

  (Array.isArray(sessions) ? sessions : [])
    .slice(0, 6)
    .forEach((session) => {
      session.summary.topImprovementAreas
        .concat(session.summary.weaknesses)
        .slice(0, 6)
        .forEach((item) => {
          const key = String(item || "").trim();
          if (!key) {
            return;
          }
          counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([label, count]) => ({
      label,
      count,
    }));
}

function calculateImprovementRate(sessions) {
  const completed = Array.isArray(sessions) ? sessions.slice().reverse() : [];
  if (completed.length < 2) {
    return 0;
  }

  const firstScore = getSessionAverageScore(completed[0].summary);
  const latestScore = getSessionAverageScore(completed[completed.length - 1].summary);
  return clampNumber(latestScore - firstScore, -100, 100);
}

function getSessionAverageScore(summary) {
  const candidate = summary && typeof summary === "object" ? summary : {};
  return clampNumber(candidate.averageScore || candidate.overallScore, 0, 100);
}

function totalTurnScore(turns) {
  if (!Array.isArray(turns) || !turns.length) {
    return 0;
  }

  return clampNumber(
    turns.reduce((sum, turn) => sum + clampNumber(turn?.score, 0, 100), 0),
    0,
    800,
  );
}

function normalizeQuestionType(value) {
  const normalized = truncateText(value || "", 60);
  const matchedType = QUESTION_TYPE_LABELS.find(
    (label) => label.toLowerCase() === normalized.toLowerCase(),
  );
  return matchedType || "Concept Explanation";
}

function normalizeConfidenceLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return "medium";
}

function scaleLegacyComponent(score, maxValue) {
  return clampNumber(Math.round((Number(score || 0) / 100) * maxValue), 0, maxValue);
}

function buildFallbackFeedback({ didWell, missingAreas, score }) {
  if (didWell.length && missingAreas.length) {
    return `You handled ${didWell[0].toLowerCase()} well, but the next lift is ${missingAreas[0].toLowerCase()}.`;
  }
  if (didWell.length) {
    return `This answer has a workable base. Keep the same strength around ${didWell[0].toLowerCase()} and add one sharper example.`;
  }
  if (missingAreas.length) {
    return `The answer needs another pass. Start by improving ${missingAreas[0].toLowerCase()}.`;
  }
  return score >= 70
    ? "The answer is directionally solid but still needs sharper examples and cleaner structure."
    : "The answer needs more structure, more depth, and a clearer role-specific example.";
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

function averageTurnScore(turns) {
  if (!Array.isArray(turns) || !turns.length) {
    return 0;
  }

  return clampNumber(
    Math.round(
      turns.reduce((sum, turn) => sum + clampNumber(turn?.score, 0, 100), 0) / turns.length,
    ),
    0,
    100,
  );
}

function hasOwn(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}
