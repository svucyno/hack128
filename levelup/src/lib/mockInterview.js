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

export function buildLocalMockInterviewSession({
  role = "",
  interviewType = "technical",
  difficulty = "medium",
  company = "",
  focusAreas = [],
  jobDescription = "",
  maxQuestions = 4,
  linkedResumeVersion = "",
  atsScore = null,
  skillGaps = [],
}) {
  const normalizedRole = truncateText(role || "Target role", 120);
  const normalizedInterviewType = normalizeInterviewTypeValue(interviewType);
  const normalizedDifficulty = normalizeDifficultyValue(difficulty);
  const normalizedFocusAreas = normalizeStringArray(
    Array.isArray(focusAreas) ? focusAreas : [],
    10,
    100,
  );
  const resolvedFocusAreas = normalizedFocusAreas.length
    ? normalizedFocusAreas
    : [normalizedRole];
  const normalizedMaxQuestions = clampNumber(maxQuestions, 3, 6) || 4;
  const sessionId = `mock_local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = new Date().toISOString();

  return normalizeSession({
    id: sessionId,
    role: normalizedRole,
    interviewType: normalizedInterviewType,
    difficulty: normalizedDifficulty,
    company: truncateText(company || "", 120),
    focusAreas: resolvedFocusAreas,
    jobDescription: truncateText(jobDescription || "", 6000),
    intro: buildLocalIntro({
      role: normalizedRole,
      interviewType: normalizedInterviewType,
      company,
    }),
    guidance: buildLocalGuidance({
      interviewType: normalizedInterviewType,
      focusAreas: resolvedFocusAreas,
    }),
    questionPlan: buildLocalQuestionPlan({
      interviewType: normalizedInterviewType,
      focusAreas: resolvedFocusAreas,
      maxQuestions: normalizedMaxQuestions,
    }),
    sessionContext: {
      targetRole: normalizedRole,
      linkedResumeVersion: truncateText(linkedResumeVersion || "", 180),
      atsScore: clampNumber(atsScore, 0, 100),
      skillGaps: normalizeStringArray(skillGaps, 10, 100),
      focusAreas: resolvedFocusAreas,
    },
    currentQuestionIndex: 0,
    maxQuestions: normalizedMaxQuestions,
    status: "active",
    currentPrompt: buildLocalPrompt({
      role: normalizedRole,
      interviewType: normalizedInterviewType,
      difficulty: normalizedDifficulty,
      company,
      focusAreas: resolvedFocusAreas,
      questionNumber: 1,
      maxQuestions: normalizedMaxQuestions,
    }),
    turns: [],
    summary: {},
    startedAtIso: nowIso,
    updatedAtIso: nowIso,
    completedAtIso: "",
  });
}

export function buildLocalMockInterviewAnswerResult({
  session = {},
  answer = "",
  confidenceLevel = "medium",
  timeTakenSeconds = 0,
}) {
  const normalizedSession = normalizeSession(session);
  const currentPrompt = normalizePrompt(normalizedSession.currentPrompt);
  const sanitizedAnswer = truncateText(answer || "", 3000);
  const sanitizedConfidence = normalizeConfidenceLevel(confidenceLevel);
  const normalizedTimeTakenSeconds = clampNumber(timeTakenSeconds, 0, 7200);
  const answerWords = sanitizedAnswer.split(/\s+/).filter(Boolean);
  const sentenceCount = sanitizedAnswer
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const answerLower = sanitizedAnswer.toLowerCase();
  const focusTerms = normalizeStringArray(
    [
      ...(currentPrompt.expectedFocus || []),
      ...(normalizedSession.focusAreas || []),
      normalizedSession.role,
    ],
    12,
    80,
  );
  const matchedFocusCount = focusTerms.filter((term) =>
    term
      .toLowerCase()
      .split(/\s+/)
      .some((token) => token.length > 2 && answerLower.includes(token)),
  ).length;
  const hasExample =
    /\b(example|for example|for instance|such as|imagine|when i|we built|in my project|in the classroom|students|users)\b/i.test(
      sanitizedAnswer,
    );
  const hasStructuredFlow =
    sentenceCount >= 3 ||
    /\b(first|second|finally|because|therefore|step|then)\b/i.test(sanitizedAnswer);
  const clarityScore = clampNumber(
    8 +
      Math.min(8, Math.round(answerWords.length / 18)) +
      (hasStructuredFlow ? 4 : 0),
    0,
    20,
  );
  const conceptUnderstandingScore = clampNumber(
    8 +
      Math.min(9, matchedFocusCount * 3) +
      Math.min(8, Math.round(answerWords.length / 28)),
    0,
    25,
  );
  const structureScore = clampNumber(
    (hasStructuredFlow ? 9 : 5) + Math.min(6, Math.max(0, sentenceCount - 1)),
    0,
    15,
  );
  const practicalExamplesScore = clampNumber(
    (hasExample ? 12 : 5) + Math.min(8, matchedFocusCount * 2),
    0,
    20,
  );
  const communicationScore = clampNumber(
    (sanitizedConfidence === "high" ? 16 : sanitizedConfidence === "medium" ? 13 : 10) +
      (answerWords.length >= 90 ? 3 : answerWords.length >= 45 ? 1 : 0) -
      (answerWords.length < 25 ? 2 : 0),
    0,
    20,
  );
  const score = clampNumber(
    clarityScore +
      conceptUnderstandingScore +
      structureScore +
      practicalExamplesScore +
      communicationScore,
    0,
    100,
  );

  const didWell = [];
  const missingAreas = [];

  if (clarityScore >= 14) {
    didWell.push("Clear explanation with understandable wording");
  } else {
    missingAreas.push("Make the answer easier to follow from the first sentence");
  }

  if (conceptUnderstandingScore >= 17) {
    didWell.push("Good coverage of the core concept and what the question was testing");
  } else {
    missingAreas.push("Connect the answer more directly to the main concept and expected focus");
  }

  if (structureScore >= 11) {
    didWell.push("Logical flow with a visible beginning, middle, and close");
  } else {
    missingAreas.push("Use a stronger structure: intro, core idea, example, impact");
  }

  if (practicalExamplesScore >= 12) {
    didWell.push("Used an applied example instead of only giving theory");
  } else {
    missingAreas.push("Add one concrete example, classroom scenario, or project-based proof point");
  }

  if (communicationScore < 13) {
    missingAreas.push("Sound more confident and concise when delivering the main point");
  }

  const nextQuestionNumber = normalizedSession.turns.length + 2;
  const shouldEnd = normalizedSession.turns.length + 1 >= normalizedSession.maxQuestions;
  const nextPrompt = shouldEnd
    ? createEmptyPrompt()
    : buildLocalPrompt({
        role: normalizedSession.role,
        interviewType: normalizedSession.interviewType,
        difficulty: normalizedSession.difficulty,
        company: normalizedSession.company,
        focusAreas: normalizedSession.focusAreas,
        questionNumber: nextQuestionNumber,
        maxQuestions: normalizedSession.maxQuestions,
      });

  const simulatedTurn = normalizeTurn({
    questionId: currentPrompt.questionId,
    questionType: currentPrompt.questionType,
    question: currentPrompt.question,
    evaluationCriteria: currentPrompt.evaluationCriteria,
    answer: sanitizedAnswer,
    timeTakenSeconds: normalizedTimeTakenSeconds,
    confidenceLevel: sanitizedConfidence,
    score,
    clarityScore,
    conceptUnderstandingScore,
    structureScore,
    practicalExamplesScore,
    communicationScore,
    didWell,
    missingAreas,
    idealAnswer: buildLocalIdealAnswer(currentPrompt, normalizedSession),
    followUpQuestions: buildLocalFollowUps(currentPrompt, normalizedSession),
    interviewerNote: buildLocalInterviewerNote(score, sanitizedConfidence, normalizedTimeTakenSeconds),
    answeredAtIso: new Date().toISOString(),
  });
  const nextTurns = [...normalizedSession.turns, simulatedTurn];
  const summary = shouldEnd
    ? normalizeSummary(
        {
          averageScore: averageTurnScore(nextTurns),
          overallScore: averageTurnScore(nextTurns),
          totalScore: totalTurnScore(nextTurns),
          hireSignal: inferHireSignal(averageTurnScore(nextTurns)),
          summary: buildLocalSummaryText(normalizedSession, nextTurns),
          strengths: collectTurnItems(nextTurns, "didWell", 8),
          weaknesses: collectTurnItems(nextTurns, "missingAreas", 8),
          topImprovementAreas: collectTurnItems(nextTurns, "missingAreas", 3),
          recommendedPracticeTopics: collectTurnItems(nextTurns, "missingAreas", 5),
          nextSteps: buildLocalNextSteps(nextTurns, normalizedSession),
        },
        nextTurns,
      )
    : {};

  return {
    questionId: currentPrompt.questionId,
    questionType: currentPrompt.questionType,
    question: currentPrompt.question,
    evaluationCriteria: currentPrompt.evaluationCriteria,
    answer: sanitizedAnswer,
    timeTakenSeconds: normalizedTimeTakenSeconds,
    confidenceLevel: sanitizedConfidence,
    score,
    clarityScore,
    conceptUnderstandingScore,
    structureScore,
    practicalExamplesScore,
    communicationScore,
    feedback: buildFallbackFeedback({ didWell, missingAreas, score }),
    didWell,
    missingAreas,
    idealAnswer: simulatedTurn.idealAnswer,
    followUpQuestions: simulatedTurn.followUpQuestions,
    interviewerNote: simulatedTurn.interviewerNote,
    nextQuestionId: nextPrompt.questionId,
    nextQuestionType: nextPrompt.questionType,
    nextQuestion: nextPrompt.question,
    nextEvaluationCriteria: nextPrompt.evaluationCriteria,
    nextExpectedFocus: nextPrompt.expectedFocus,
    nextQuestionHints: nextPrompt.hints,
    shouldEnd,
    answeredAtIso: simulatedTurn.answeredAtIso,
    completedAtIso: shouldEnd ? simulatedTurn.answeredAtIso : "",
    summary,
  };
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

function buildLocalQuestionPlan({ interviewType, focusAreas, maxQuestions }) {
  const focusList = normalizeStringArray(focusAreas, 6, 100);
  return Array.from({ length: maxQuestions }, (_, index) => {
    const focus = focusList[index % Math.max(1, focusList.length)] || "role fundamentals";
    if (interviewType === "hr") {
      return truncateText(`Behavioral depth: ${focus}`, 120);
    }
    if (interviewType === "domain") {
      return truncateText(`Teaching or domain drill: ${focus}`, 120);
    }
    return truncateText(`Technical applied reasoning: ${focus}`, 120);
  });
}

function buildLocalPrompt({
  role,
  interviewType,
  difficulty,
  company,
  focusAreas,
  questionNumber,
  maxQuestions,
}) {
  const focusList = normalizeStringArray(focusAreas, 8, 100);
  const focus = focusList[(questionNumber - 1) % Math.max(1, focusList.length)] || role;
  const questionType = selectLocalQuestionType({ role, interviewType, questionNumber });
  const basePrompt = buildLocalQuestionText({
    role,
    interviewType,
    questionType,
    company,
    focus,
    questionNumber,
    difficulty,
  });

  return normalizePrompt({
    questionId: `question_${questionNumber}_${String(role || "role").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6) || "prep"}`,
    questionType,
    question: basePrompt,
    evaluationCriteria: [...DEFAULT_EVALUATION_CRITERIA],
    expectedFocus: [focus, `${difficulty} depth`, `Question ${questionNumber} of ${maxQuestions}`],
    hints: buildLocalHints(questionType, focus, role),
  });
}

function selectLocalQuestionType({ role, interviewType, questionNumber }) {
  if (interviewType === "hr") {
    return questionNumber % 2 === 0 ? "Scenario-Based" : "Behavioral";
  }
  if (interviewType === "domain" || /\b(teacher|faculty|lecturer|trainer|tutor|educator)\b/i.test(role)) {
    return questionNumber % 2 === 0 ? "Scenario-Based" : "Teaching Simulation";
  }
  return questionNumber % 2 === 0 ? "Problem Solving" : "Concept Explanation";
}

function buildLocalQuestionText({
  role,
  interviewType,
  questionType,
  company,
  focus,
  questionNumber,
  difficulty,
}) {
  const companyText = company ? `${company} ` : "";

  if (questionType === "Behavioral") {
    return `For the ${companyText}${role} role, tell me about a time you showed ownership around ${focus}. What was the situation, what did you do, and what was the outcome?`;
  }

  if (questionType === "Teaching Simulation") {
    return `Imagine you are teaching beginners in a ${companyText}${role} interview. Explain ${focus} in simple language, give one example, and show why it matters for learners.`;
  }

  if (questionType === "Scenario-Based") {
    return `Scenario ${questionNumber}: in a ${companyText}${role} context, how would you handle a situation where ${focus} becomes the main challenge? Walk through your thinking and action plan.`;
  }

  if (questionType === "Problem Solving") {
    return `Problem-solving round: how would you approach ${focus} for a ${companyText}${role} task at ${difficulty} difficulty? Explain the steps, tradeoffs, and how you would validate the outcome.`;
  }

  return `Explain ${focus} for the ${companyText}${role} role. Define it clearly, break down the main principles, and connect it to real execution.`;
}

function buildLocalHints(questionType, focus, role) {
  if (questionType === "Behavioral") {
    return [
      "Use a situation, action, and result structure.",
      "Add evidence, not only intention.",
      `Connect the story back to ${role}.`,
    ];
  }

  if (questionType === "Teaching Simulation") {
    return [
      "Teach in beginner-friendly language.",
      "Use one simple example or analogy.",
      `Explain why ${focus} matters in practice.`,
    ];
  }

  return [
    "Start with a simple introduction.",
    `Cover the core idea behind ${focus}.`,
    "Close with one real-world example or impact statement.",
  ];
}

function buildLocalIntro({ role, interviewType, company }) {
  return truncateText(
    `${company ? `${company} ` : ""}${formatInterviewTypeLabel(interviewType)} practice for the ${role} role starts now. Answer with structure, examples, and role-specific judgment.`,
    260,
  );
}

function buildLocalGuidance({ interviewType, focusAreas }) {
  const focus = normalizeStringArray(focusAreas, 3, 60).join(", ");
  if (interviewType === "hr") {
    return truncateText(
      `Stay concrete. Use ownership, outcomes, and communication depth around ${focus || "your strongest examples"}.`,
      320,
    );
  }
  if (interviewType === "domain") {
    return truncateText(
      `Explain like you are already doing the role. Keep it simple, structured, and grounded in ${focus || "the learner's needs"}.`,
      320,
    );
  }
  return truncateText(
    `Be explicit about steps, tradeoffs, and examples. Keep the answer anchored in ${focus || "practical execution"}.`,
    320,
  );
}

function buildLocalIdealAnswer(prompt, session) {
  const focus = prompt.expectedFocus[0] || session.focusAreas[0] || session.role;
  if (prompt.questionType === "Behavioral") {
    return `Situation: frame the context around ${focus}. Action: explain the decision or ownership. Result: quantify the outcome. Learning: connect it back to the ${session.role} role.`;
  }
  if (prompt.questionType === "Teaching Simulation") {
    return `Intro: explain ${focus} in simple terms. Core concept: define it clearly. Example: use one learner-friendly example. Impact: explain why it matters in a real class or teaching flow.`;
  }
  return `Intro: define ${focus}. Core idea: explain the main principles. Example: add one practical role-specific example. Impact: show why the answer matters in execution.`;
}

function buildLocalFollowUps(prompt, session) {
  const focus = prompt.expectedFocus[0] || session.focusAreas[0] || session.role;
  return normalizeStringArray(
    [
      `What is the biggest mistake people make when handling ${focus}?`,
      `How would your answer change in a higher-pressure ${session.role} scenario?`,
      `What evidence would you use to prove your approach around ${focus} actually worked?`,
    ],
    3,
    240,
  );
}

function buildLocalInterviewerNote(score, confidenceLevel, timeTakenSeconds) {
  const paceSignal =
    timeTakenSeconds > 240
      ? "The answer took a long time to land."
      : timeTakenSeconds < 25
        ? "The answer was very fast and may have skipped depth."
        : "The pacing was workable.";
  return truncateText(
    `${paceSignal} Confidence was ${confidenceLevel}. Overall signal is ${inferHireSignal(score).toLowerCase()}.`,
    220,
  );
}

function buildLocalSummaryText(session, turns) {
  const average = averageTurnScore(turns);
  return truncateText(
    `This ${formatInterviewTypeLabel(session.interviewType).toLowerCase()} mock for ${session.role} finished at ${average}/100 average. The next lift is turning the same ideas into more structured, example-backed answers.`,
    560,
  );
}

function buildLocalNextSteps(turns, session) {
  const missingAreas = collectTurnItems(turns, "missingAreas", 5);
  const focusArea = session.focusAreas[0] || session.role;
  return normalizeStringArray(
    [
      missingAreas[0]
        ? `Practice one more answer focused on: ${missingAreas[0]}.`
        : `Repeat one more mock question on ${focusArea}.`,
      `Prepare one stronger example tied to the ${session.role} role.`,
      `Run another ${formatInterviewTypeLabel(session.interviewType).toLowerCase()} session after reviewing the feedback trail.`,
    ],
    5,
    180,
  );
}

function normalizeInterviewTypeValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hr") {
    return "hr";
  }
  if (normalized === "domain") {
    return "domain";
  }
  return "technical";
}

function normalizeDifficultyValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") {
    return "easy";
  }
  if (normalized === "hard") {
    return "hard";
  }
  return "medium";
}

function formatInterviewTypeLabel(value) {
  if (value === "hr") {
    return "HR";
  }
  if (value === "domain") {
    return "Domain";
  }
  return "Technical";
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
