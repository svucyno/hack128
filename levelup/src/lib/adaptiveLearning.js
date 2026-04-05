const MAX_LEVELS = 42;

export function createEmptyAdaptiveLearningState() {
  return {
    status: "idle",
    roadmapAccepted: false,
    targetRole: "",
    sourceChatId: "",
    sourceRoadmapTitle: "",
    sourceRoadmapDurationWeeks: 0,
    sourceRoadmapUpdatedAtIso: "",
    acceptedAtIso: "",
    currentLevel: 0,
    completedLevels: 0,
    totalLevels: 0,
    completionRate: 0,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastCompletedOn: "",
    levels: [],
  };
}

export function isRoadmapApprovalMessage(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(yes|yeah|yep|ok|okay|sure|sounds good|looks good|go ahead|let's do it|lets do it|i am okay|i'm okay|accepted|approve|works for me)\b/.test(
    normalized,
  );
}

export function buildAdaptiveLearningJourney({
  roadmap,
  targetRole = "",
  skillGapAnalysis = {},
  sourceChatId = "",
  sourceRoadmapUpdatedAtIso = "",
  existingState = null,
}) {
  const safeRoadmap = normalizeRoadmapShape(roadmap);
  const currentState = normalizeAdaptiveLearningState(existingState);

  if (!safeRoadmap.weeks.length) {
    return currentState;
  }

  if (
    currentState.sourceChatId === String(sourceChatId || "").trim() &&
    currentState.sourceRoadmapTitle === safeRoadmap.title &&
    currentState.levels.length
  ) {
    return currentState;
  }

  const nowIso = new Date().toISOString();
  const focusPool = uniqueStrings([
    ...(skillGapAnalysis?.prioritySkills || []),
    ...(skillGapAnalysis?.missingSkills || []),
    ...(skillGapAnalysis?.matchedSkills || []),
    targetRole,
  ]);

  let dayNumber = 1;
  const levels = [];

  safeRoadmap.weeks.forEach((week, weekIndex) => {
    const tasks = uniqueStrings(week.tasks).slice(0, 3);
    const resources = uniqueStrings(week.resources).slice(0, 3);
    const weekFocus =
      focusPool[weekIndex % Math.max(focusPool.length, 1)] ||
      extractTopic(week.goal) ||
      targetRole ||
      `Week ${weekIndex + 1} focus`;

    tasks.forEach((task, taskIndex) => {
      if (levels.length >= MAX_LEVELS) {
        return;
      }

      const topic =
        focusPool[(weekIndex + taskIndex) % Math.max(focusPool.length, 1)] ||
        extractTopic(task) ||
        weekFocus;
      const reviewResource = resources[taskIndex % Math.max(resources.length, 1)] || "";

      levels.push({
        id: `level_${weekIndex + 1}_${taskIndex + 1}_${dayNumber}`,
        dayNumber,
        label: `Day ${dayNumber}`,
        weekLabel: week.label,
        title: truncateText(task, 54) || `Practice ${topic}`,
        topic: truncateText(topic, 70) || "Skill practice",
        objective: truncateText(week.goal || task, 180),
        resources,
        xpReward: 40 + ((dayNumber - 1) % 4) * 5,
        checklist: [
          {
            id: `focus_${dayNumber}`,
            text: truncateText(task || `Practice ${topic}.`, 140),
            done: false,
          },
          {
            id: `review_${dayNumber}`,
            text: truncateText(
              reviewResource
                ? `Review resource: ${reviewResource}`
                : `Take notes on ${topic}.`,
              140,
            ),
            done: false,
          },
          {
            id: `proof_${dayNumber}`,
            text: truncateText(
              `Write one proof point, mini output, or reflection for ${targetRole || topic}.`,
              140,
            ),
            done: false,
          },
        ],
        questions: generateLevelQuestions({
          title: task,
          topic,
          objective: week.goal || task,
          checklist: [
            task || `Practice ${topic}.`,
            reviewResource
              ? `Review resource: ${reviewResource}`
              : `Take notes on ${topic}.`,
            `Write one proof point, mini output, or reflection for ${targetRole || topic}.`,
          ],
          targetRole,
        }),
        completed: false,
        completedAtIso: "",
      });

      dayNumber += 1;
    });

    if (levels.length < MAX_LEVELS) {
      levels.push({
        id: `checkpoint_${weekIndex + 1}_${dayNumber}`,
        dayNumber,
        label: `Day ${dayNumber}`,
        weekLabel: week.label,
        title: truncateText(`${week.label} checkpoint`, 54),
        topic: truncateText(weekFocus, 70),
        objective: truncateText(
          week.goal || `Consolidate this week for ${targetRole || "your target role"}.`,
          180,
        ),
        resources,
        xpReward: 80,
        checklist: [
          {
            id: `checkpoint_review_${dayNumber}`,
            text: truncateText(
              `Review this week's progress around ${weekFocus}.`,
              140,
            ),
            done: false,
          },
          {
            id: `checkpoint_gap_${dayNumber}`,
            text: truncateText(
              `Close one weak point before moving to the next week.`,
              140,
            ),
            done: false,
          },
          {
            id: `checkpoint_prepare_${dayNumber}`,
            text: truncateText(
              `Prepare the next level for ${targetRole || "your target role"}.`,
              140,
            ),
            done: false,
          },
        ],
        questions: generateLevelQuestions({
          title: `${week.label} checkpoint`,
          topic: weekFocus,
          objective:
            week.goal || `Consolidate this week for ${targetRole || "your target role"}.`,
          checklist: [
            `Review this week's progress around ${weekFocus}.`,
            "Close one weak point before moving to the next week.",
            `Prepare the next level for ${targetRole || "your target role"}.`,
          ],
          targetRole,
          checkpoint: true,
        }),
        completed: false,
        completedAtIso: "",
      });

      dayNumber += 1;
    }
  });

  return normalizeAdaptiveLearningState({
    status: "active",
    roadmapAccepted: true,
    targetRole: truncateText(targetRole, 80),
    sourceChatId: String(sourceChatId || "").trim(),
    sourceRoadmapTitle: safeRoadmap.title,
    sourceRoadmapDurationWeeks: safeRoadmap.durationWeeks,
    sourceRoadmapUpdatedAtIso: String(sourceRoadmapUpdatedAtIso || "").trim(),
    acceptedAtIso: nowIso,
    levels,
  });
}

export function normalizeAdaptiveLearningState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const levels = normalizeLevels(source.levels);
  const stats = computeJourneyStats(levels);

  return {
    ...createEmptyAdaptiveLearningState(),
    status: levels.length
      ? "active"
      : truncateText(source.status || "idle", 20) || "idle",
    roadmapAccepted:
      typeof source.roadmapAccepted === "boolean"
        ? source.roadmapAccepted
        : Boolean(levels.length),
    targetRole: truncateText(source.targetRole || "", 80),
    sourceChatId: truncateText(source.sourceChatId || "", 120),
    sourceRoadmapTitle: truncateText(source.sourceRoadmapTitle || "", 120),
    sourceRoadmapDurationWeeks: clampNumber(source.sourceRoadmapDurationWeeks, 0, 52),
    sourceRoadmapUpdatedAtIso: truncateText(source.sourceRoadmapUpdatedAtIso || "", 40),
    acceptedAtIso: truncateText(source.acceptedAtIso || "", 40),
    levels,
    ...stats,
  };
}

export function isLevelUnlocked(levels = [], index = 0) {
  if (index <= 0) {
    return true;
  }

  return levels.slice(0, index).every((level) => level.completed);
}

export function getNextUnlockedLevel(levels = []) {
  const nextLevel = levels.find((level, index) => isLevelUnlocked(levels, index) && !level.completed);
  return nextLevel || levels[levels.length - 1] || null;
}

export function toggleAdaptiveChecklistItem(state, levelId, checklistId) {
  const normalizedState = normalizeAdaptiveLearningState(state);
  const levelIndex = normalizedState.levels.findIndex((level) => level.id === levelId);

  if (levelIndex === -1 || !isLevelUnlocked(normalizedState.levels, levelIndex)) {
    return normalizedState;
  }

  const nextLevels = normalizedState.levels.map((level, index) => {
    if (index !== levelIndex) {
      return level;
    }

    const nextChecklist = level.checklist.map((item) =>
      item.id === checklistId ? { ...item, done: !item.done } : item,
    );
    const completed = nextChecklist.length
      ? nextChecklist.every((item) => item.done)
      : level.completed;

    return {
      ...level,
      checklist: nextChecklist,
      completed,
      completedAtIso: completed ? level.completedAtIso || new Date().toISOString() : "",
    };
  });

  return normalizeAdaptiveLearningState({
    ...normalizedState,
    levels: nextLevels,
  });
}

export function answerAdaptiveQuestion(state, levelId, questionId, optionIndex) {
  const normalizedState = normalizeAdaptiveLearningState(state);
  const levelIndex = normalizedState.levels.findIndex((level) => level.id === levelId);

  if (levelIndex === -1 || !isLevelUnlocked(normalizedState.levels, levelIndex)) {
    return normalizedState;
  }

  const nextLevels = normalizedState.levels.map((level, index) => {
    if (index !== levelIndex) {
      return level;
    }

    const question = level.questions.find((item) => item.id === questionId);
    if (!question) {
      return level;
    }

    return {
      ...level,
      assessment: {
        ...level.assessment,
        answers: {
          ...level.assessment.answers,
          [questionId]: clampNumber(optionIndex, 0, question.options.length - 1),
        },
      },
    };
  });

  return normalizeAdaptiveLearningState({
    ...normalizedState,
    levels: nextLevels,
  });
}

export function recordAdaptiveCodeRun(state, levelId, payload = {}) {
  const normalizedState = normalizeAdaptiveLearningState(state);
  const levelIndex = normalizedState.levels.findIndex((level) => level.id === levelId);

  if (levelIndex === -1 || !isLevelUnlocked(normalizedState.levels, levelIndex)) {
    return normalizedState;
  }

  const nextLevels = normalizedState.levels.map((level, index) => {
    if (index !== levelIndex) {
      return level;
    }

    const totalTests = level.codingChallenge.tests.length;
    return {
      ...level,
      assessment: {
        ...level.assessment,
        code: sanitizeCodeText(
          payload.code || level.assessment.code || level.codingChallenge.starterCode,
        ),
        codeOutput: sanitizeOutputText(payload.codeOutput || ""),
        codeError: sanitizeOutputText(payload.codeError || ""),
        codePassed: Boolean(payload.codePassed && totalTests),
        passedTests: clampNumber(payload.passedTests, 0, totalTests),
        totalTests,
        lastRunAtIso:
          payload.codeOutput || payload.codeError || payload.code
            ? new Date().toISOString()
            : level.assessment.lastRunAtIso || "",
      },
    };
  });

  return normalizeAdaptiveLearningState({
    ...normalizedState,
    levels: nextLevels,
  });
}

function normalizeRoadmapShape(roadmap) {
  const source = roadmap && typeof roadmap === "object" ? roadmap : {};
  const weeks = (Array.isArray(source.weeks) ? source.weeks : [])
    .map((week, index) => ({
      label: truncateText(week?.label || `Week ${index + 1}`, 40),
      goal: truncateText(week?.goal || "", 180),
      tasks: normalizeStringArray(week?.tasks, 6, 180),
      resources: normalizeStringArray(week?.resources, 6, 120),
    }))
    .filter((week) => week.goal || week.tasks.length || week.resources.length)
    .slice(0, 12);

  return {
    title: truncateText(source.title || "Adaptive Roadmap", 120),
    durationWeeks: clampNumber(source.durationWeeks || weeks.length, 0, 52),
    weeks,
  };
}

function normalizeLevels(levels = []) {
  return (Array.isArray(levels) ? levels : [])
    .map((level, index) => normalizeLevel(level, index))
    .filter((level) => level.id && level.label && level.title)
    .slice(0, MAX_LEVELS);
}

function normalizeLevel(level, index) {
  const checklist = normalizeChecklist(level?.checklist, level?.title, index);
  const completed = Boolean(level?.completed);
  const title = truncateText(level?.title || `Level ${index + 1}`, 80);
  const topic = truncateText(level?.topic || "Core focus", 80);
  const objective = truncateText(level?.objective || "", 200);
  const questions = normalizeQuestions(
    level?.questions,
    title,
    topic,
    objective,
    checklist,
  );
  const codingChallenge = normalizeCodingChallenge(
    level?.codingChallenge,
    title,
    topic,
    objective,
    checklist,
  );

  return {
    id: truncateText(level?.id || `level_${index + 1}`, 80),
    dayNumber: clampNumber(level?.dayNumber || index + 1, 1, MAX_LEVELS),
    label: truncateText(level?.label || `Day ${index + 1}`, 40),
    weekLabel: truncateText(level?.weekLabel || "Week 1", 40),
    title,
    topic,
    objective,
    resources: normalizeStringArray(level?.resources, 4, 120),
    xpReward: clampNumber(level?.xpReward || 40, 10, 200),
    checklist,
    questions,
    codingChallenge,
    assessment: normalizeAssessment(level?.assessment, questions, codingChallenge),
    completed,
    completedAtIso: completed ? truncateText(level?.completedAtIso || "", 40) : "",
  };
}

function normalizeChecklist(checklist, fallbackText, index) {
  const items = (Array.isArray(checklist) ? checklist : [])
    .map((item, itemIndex) => ({
      id: truncateText(item?.id || `item_${index + 1}_${itemIndex + 1}`, 80),
      text: truncateText(item?.text || "", 160),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.id && item.text)
    .slice(0, 6);

  if (items.length) {
    return items;
  }

  return [
    {
      id: `item_${index + 1}_1`,
      text: truncateText(fallbackText || "Complete the day objective.", 160),
      done: false,
    },
  ];
}

function normalizeQuestions(questions, title, topic, objective, checklist) {
  const items = (Array.isArray(questions) ? questions : [])
    .map((question, index) => normalizeQuestion(question, index))
    .filter(Boolean)
    .slice(0, 4);

  if (items.length) {
    return items;
  }

  return generateLevelQuestions({
    title,
    topic,
    objective,
    checklist: (Array.isArray(checklist) ? checklist : []).map((item) => item?.text || item),
  });
}

function normalizeQuestion(question, index) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return null;
  }

  const prompt = truncateText(
    question?.prompt || question?.question || question?.text || "",
    180,
  );
  const options = normalizeQuestionOptions(question?.options);

  if (!prompt || options.length < 2) {
    return null;
  }

  return {
    id: truncateText(question?.id || `mcq_${index + 1}`, 40),
    prompt,
    options,
    correctOptionIndex: clampNumber(question?.correctOptionIndex, 0, options.length - 1),
    explanation: truncateText(question?.explanation || "", 200),
  };
}

function normalizeQuestionOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === "string") {
        return truncateText(option, 120);
      }

      return truncateText(option?.text || option?.label || "", 120);
    })
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeCodingChallenge(challenge, title, topic, objective, checklist) {
  const generated = generateCodingChallenge({
    title,
    topic,
    objective,
    checklist: (Array.isArray(checklist) ? checklist : []).map((item) => item?.text || item),
    checkpoint: /checkpoint/i.test(String(title || "")),
  });

  const source = challenge && typeof challenge === "object" ? challenge : {};
  const tests = normalizeCodingTests(source?.tests, generated.tests);

  return {
    id: truncateText(source?.id || generated.id, 40),
    language: truncateText(source?.language || generated.language, 20) || "javascript",
    title: truncateText(source?.title || generated.title, 80),
    prompt: truncateText(source?.prompt || generated.prompt, 260),
    functionName:
      sanitizeIdentifier(source?.functionName || generated.functionName) ||
      generated.functionName,
    starterCode: sanitizeCodeText(source?.starterCode || generated.starterCode),
    hints: normalizeStringArray(source?.hints?.length ? source.hints : generated.hints, 4, 140),
    tests,
  };
}

function normalizeCodingTests(tests, fallbackTests = []) {
  const source = Array.isArray(tests) && tests.length ? tests : fallbackTests;

  return source
    .map((test, index) => {
      if (!test || typeof test !== "object") {
        return null;
      }

      const args = Array.isArray(test.args) ? test.args.map((value) => sanitizeSerializable(value)) : [];
      const expected = sanitizeSerializable(test.expected);

      if (!args.length || expected === undefined) {
        return null;
      }

      return {
        id: truncateText(test.id || `test_${index + 1}`, 40),
        label: truncateText(test.label || `Test ${index + 1}`, 80),
        args,
        expected,
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeAssessment(assessment, questions, codingChallenge) {
  const source = assessment && typeof assessment === "object" ? assessment : {};
  const answers = Object.fromEntries(
    Object.entries(source.answers && typeof source.answers === "object" ? source.answers : {})
      .map(([questionId, value]) => [truncateText(questionId, 40), Number(value)])
      .filter(([questionId, value]) => {
        const question = questions.find((item) => item.id === questionId);
        return question && Number.isFinite(value) && value >= 0 && value < question.options.length;
      }),
  );
  const totalTests = codingChallenge.tests.length;

  return {
    answers,
    code: sanitizeCodeText(source.code || codingChallenge.starterCode || ""),
    codeOutput: sanitizeOutputText(source.codeOutput || ""),
    codeError: sanitizeOutputText(source.codeError || ""),
    codePassed: Boolean(source.codePassed && totalTests),
    passedTests: clampNumber(source.passedTests, 0, totalTests),
    totalTests,
    lastRunAtIso: truncateText(source.lastRunAtIso || "", 40),
  };
}

function computeJourneyStats(levels = []) {
  const totalLevels = levels.length;
  const completedLevels = levels.filter((level) => level.completed).length;
  const completionRate = totalLevels
    ? clampNumber((completedLevels / totalLevels) * 100, 0, 100)
    : 0;
  const xp = levels
    .filter((level) => level.completed)
    .reduce((sum, level) => sum + clampNumber(level.xpReward, 0, 500), 0);
  const dayKeys = uniqueStrings(
    levels
      .filter((level) => level.completed && level.completedAtIso)
      .map((level) => toLocalDayKey(level.completedAtIso)),
  ).sort();
  const streak = computeCurrentStreak(dayKeys);
  const longestStreak = computeLongestStreak(dayKeys);
  const nextLevel = getNextUnlockedLevel(levels);

  return {
    currentLevel: nextLevel ? nextLevel.dayNumber : totalLevels,
    completedLevels,
    totalLevels,
    completionRate,
    xp,
    streak,
    longestStreak,
    lastCompletedOn: dayKeys[dayKeys.length - 1] || "",
  };
}

function computeCurrentStreak(dayKeys = []) {
  if (!dayKeys.length) {
    return 0;
  }

  const todayKey = toLocalDayKey(new Date());
  const lastKey = dayKeys[dayKeys.length - 1];
  const diffFromToday = getDayKeyDiff(lastKey, todayKey);

  if (diffFromToday > 1) {
    return 0;
  }

  let streak = 1;
  for (let index = dayKeys.length - 1; index > 0; index -= 1) {
    const current = dayKeys[index];
    const previous = dayKeys[index - 1];
    if (getDayKeyDiff(previous, current) === 1) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function computeLongestStreak(dayKeys = []) {
  if (!dayKeys.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dayKeys.length; index += 1) {
    if (getDayKeyDiff(dayKeys[index - 1], dayKeys[index]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
}

function extractTopic(text = "") {
  const cleaned = String(text || "")
    .replace(/^[^a-z0-9]+/i, "")
    .replace(/[.:;,\s]+$/, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  const words = cleaned.split(/\s+/).slice(0, 4);
  return truncateText(words.join(" "), 60);
}

function generateLevelQuestions({
  title = "",
  topic = "",
  objective = "",
  checklist = [],
  targetRole = "",
  checkpoint = false,
}) {
  const focus = truncateText(topic || extractTopic(title) || "this level", 70);
  const mission = truncateText(title || objective || "this task", 90);
  const strongestChecklist = (Array.isArray(checklist) ? checklist : [])
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      return item?.text || "";
    })
    .map((item) => truncateText(item, 120))
    .filter(Boolean)
    .slice(0, 3);

  if (checkpoint) {
    return [
      {
        id: "mcq_focus",
        prompt: truncateText(`What is the main purpose of ${mission}?`, 180),
        options: [
          truncateText(`Review progress and close one weak point around ${focus}`, 120),
          "Skip reflection and jump straight to the next week",
          "Replace the roadmap without checking outcomes",
          "Ignore the target role and choose random topics",
        ],
        correctOptionIndex: 0,
        explanation: truncateText(
          `Checkpoint levels are for reviewing progress and tightening the weak areas around ${focus}.`,
          200,
        ),
      },
      {
        id: "mcq_execution",
        prompt: truncateText(`Which action best fits this checkpoint day?`, 180),
        options: [
          truncateText(
            strongestChecklist[0] || `Review this week's progress around ${focus}.`,
            120,
          ),
          "Skip the review and only watch new content",
          "Change the target role before checking skill gaps",
          "Mark everything complete without evidence",
        ],
        correctOptionIndex: 0,
        explanation: truncateText(
          "Checkpoint days should focus on review, correction, and readiness for the next stage.",
          200,
        ),
      },
      {
        id: "mcq_outcome",
        prompt: truncateText(`What proves that you are ready to leave this checkpoint?`, 180),
        options: [
          truncateText(
            `You can clearly explain what improved and what still needs work for ${targetRole || focus}.`,
            120,
          ),
          "You skipped the weak areas but changed the plan title",
          "You moved ahead without recording any proof",
          "You added more tasks without closing pending ones",
        ],
        correctOptionIndex: 0,
        explanation: truncateText(
          "A checkpoint is complete when you can show progress and identify the next weak point to close.",
          200,
        ),
      },
    ];
  }

  return [
    {
      id: "mcq_focus",
      prompt: truncateText(`What is the main focus of ${mission}?`, 180),
      options: [
        truncateText(focus, 120),
        "An unrelated topic outside the roadmap",
        "Skipping the current day and opening the next level",
        "Changing the target role without a plan",
      ],
      correctOptionIndex: 0,
      explanation: truncateText(
        `This level is built around ${focus}, so your actions should stay aligned with that topic.`,
        200,
      ),
    },
    {
      id: "mcq_execution",
      prompt: truncateText(`Which action most directly supports today's objective?`, 180),
      options: [
        truncateText(
          strongestChecklist[0] || `Start by practicing ${focus}.`,
          120,
        ),
        "Skip practice and only browse random resources",
        "Ignore the checklist and mark the day complete",
        "Move to a different role before finishing this level",
      ],
      correctOptionIndex: 0,
      explanation: truncateText(
        "The first checklist action is the clearest path to completing the day objective.",
        200,
      ),
    },
    {
      id: "mcq_outcome",
      prompt: truncateText(`What is the best proof that this level was completed well?`, 180),
      options: [
        truncateText(
          strongestChecklist[2] ||
            `A proof point, mini output, or reflection that shows progress toward ${targetRole || focus}.`,
          120,
        ),
        "No proof, just a mental note that it went well",
        "Switching to the next task without review",
        "Changing the roadmap and removing the weak areas",
      ],
      correctOptionIndex: 0,
      explanation: truncateText(
        "Each level should end with evidence that you made progress, not just that you spent time on it.",
        200,
      ),
    },
  ];
}

function generateCodingChallenge({
  title = "",
  topic = "",
  objective = "",
  checklist = [],
  checkpoint = false,
}) {
  const focus = truncateText(topic || extractTopic(title) || "core practice", 50);
  const tasks = (Array.isArray(checklist) ? checklist : [])
    .map((item) => truncateText(typeof item === "string" ? item : item?.text || "", 80))
    .filter(Boolean)
    .slice(0, 3);
  const fallbackTasks = tasks.length
    ? tasks
    : [
        `Practice ${focus}`,
        `Review ${focus}`,
        `Write one proof point for ${focus}`,
      ];

  if (checkpoint) {
    return {
      id: "coding_checkpoint",
      language: "javascript",
      title: "Checkpoint Coding Drill",
      prompt: truncateText(
        `Implement summarizeProgress(tasks) so it returns an object with total, completed, and pending counts for this ${focus} checkpoint.`,
        260,
      ),
      functionName: "summarizeProgress",
      starterCode: `function summarizeProgress(tasks) {\n  // tasks is an array of objects like: { text: string, done: boolean }\n  // Return: { total: number, completed: number, pending: number }\n}\n`,
      hints: [
        "Use tasks.length for the total count.",
        "Filter tasks where done is true to get completed.",
        "Pending is total minus completed.",
      ],
      tests: [
        {
          id: "test_1",
          label: "Counts a mixed checklist",
          args: [[
            { text: fallbackTasks[0], done: true },
            { text: fallbackTasks[1], done: false },
            { text: fallbackTasks[2], done: true },
          ]],
          expected: { total: 3, completed: 2, pending: 1 },
        },
        {
          id: "test_2",
          label: "Handles an empty checkpoint",
          args: [[]],
          expected: { total: 0, completed: 0, pending: 0 },
        },
      ],
    };
  }

  return {
    id: "coding_day_plan",
    language: "javascript",
    title: "Coding Drill",
    prompt: truncateText(
      `Implement buildDayPlan(tasks) so it returns a new array of numbered task strings like "1. Task". Ignore blank items. The task data comes from this level's ${focus} plan.`,
      260,
    ),
    functionName: "buildDayPlan",
    starterCode: `function buildDayPlan(tasks) {\n  // tasks is an array of strings.\n  // Return only non-empty tasks, trimmed, and prefixed with their 1-based position.\n}\n`,
    hints: [
      "Trim each task before using it.",
      "Skip items that become empty after trimming.",
      "Use the filtered array index to create the number prefix.",
    ],
    tests: [
      {
        id: "test_1",
        label: "Numbers each task in order",
        args: [fallbackTasks],
        expected: fallbackTasks.map((task, index) => `${index + 1}. ${task}`),
      },
      {
        id: "test_2",
        label: "Skips blank task entries",
        args: [[fallbackTasks[0], "   ", fallbackTasks[1]]],
        expected: [`1. ${fallbackTasks[0]}`, `2. ${fallbackTasks[1]}`],
      },
    ],
  };
}

function toLocalDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayKeyDiff(leftKey, rightKey) {
  const left = new Date(`${leftKey}T00:00:00`);
  const right = new Date(`${rightKey}T00:00:00`);

  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return 0;
  }

  return Math.round((right.getTime() - left.getTime()) / 86400000);
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

function sanitizeCodeText(value, maxLength = 6000) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength);
}

function sanitizeOutputText(value, maxLength = 2400) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function sanitizeIdentifier(value) {
  const text = String(value || "").trim();
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text) ? text : "";
}

function sanitizeSerializable(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSerializable(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, sanitizeSerializable(nestedValue)])
        .filter(([, nestedValue]) => nestedValue !== undefined),
    );
  }

  return undefined;
}
