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

export function normalizeCompanyPrepPacks(packs = []) {
  return (Array.isArray(packs) ? packs : [])
    .map((pack) =>
      pruneUndefined({
        id: String(pack?.id || "").trim(),
        company: String(pack?.company || "").trim(),
        role: String(pack?.role || "").trim(),
        applicationId: String(pack?.applicationId || "").trim(),
        applicationStatus: String(pack?.applicationStatus || "").trim(),
        linkedResumeVersion: String(pack?.linkedResumeVersion || "").trim(),
        linkedResumeScore: normalizeScore(pack?.linkedResumeScore),
        targetRole: String(pack?.targetRole || "").trim(),
        jobDescription: String(pack?.jobDescription || "").trim(),
        expectedDifficulty: normalizeDifficulty(pack?.expectedDifficulty),
        difficultyReason: String(pack?.difficultyReason || "").trim(),
        likelyRounds: normalizeRounds(pack?.likelyRounds),
        commonTopics: normalizeStringArray(pack?.commonTopics, 12),
        prepChecklist: normalizeChecklist(pack?.prepChecklist),
        matchedStrengths: normalizeStringArray(pack?.matchedStrengths, 10),
        riskAreas: normalizeStringArray(pack?.riskAreas, 10),
        redFlags: normalizeStringArray(pack?.redFlags, 8),
        mockInterviewProfile: {
          interviewType: normalizeInterviewType(pack?.mockInterviewProfile?.interviewType),
          difficulty: normalizeDifficulty(pack?.mockInterviewProfile?.difficulty || pack?.expectedDifficulty),
          focusAreas: normalizeStringArray(pack?.mockInterviewProfile?.focusAreas, 8),
          roundTypes: normalizeStringArray(pack?.mockInterviewProfile?.roundTypes, 6),
          maxQuestions: normalizeQuestionCount(pack?.mockInterviewProfile?.maxQuestions),
        },
        generatedAtIso: String(pack?.generatedAtIso || "").trim(),
        updatedAtIso: String(pack?.updatedAtIso || "").trim(),
      }),
    )
    .filter((pack) => pack.id && pack.company && pack.role)
    .slice(0, 80);
}

export function buildCompanyPrepPack({
  id,
  company,
  role,
  applicationId = "",
  applicationStatus = "",
  linkedResumeVersion = "",
  linkedResumeScore = null,
  targetRole = "",
  jobDescription = "",
  matchedSkills = [],
  skillGaps = [],
  recommendedRoles = [],
  resumeTailored = false,
}) {
  const safeCompany = String(company || "").trim();
  const safeRole = String(role || "").trim();
  const safeJobDescription = String(jobDescription || "").trim();
  const normalizedMatchedSkills = normalizeStringArray(matchedSkills, 12);
  const normalizedSkillGaps = normalizeStringArray(skillGaps, 12);
  const jdKeywords = extractKeywords(safeJobDescription);
  const roleProfile = getRoleProfile(safeRole, safeJobDescription);
  const likelyRounds = buildLikelyRounds({
    company: safeCompany,
    role: safeRole,
    roleProfile,
    jobDescription: safeJobDescription,
  });
  const expectedDifficulty = estimateDifficulty({
    company: safeCompany,
    linkedResumeScore,
    skillGaps: normalizedSkillGaps,
    recommendedRoles,
    role: safeRole,
  });
  const focusAreas = uniqueStrings([
    ...jdKeywords,
    ...roleProfile.topics,
    ...normalizedSkillGaps,
  ]).slice(0, 8);
  const nowIso = new Date().toISOString();

  return normalizeCompanyPrepPacks([
    {
      id: String(id || "").trim() || createCompanyPrepId(),
      company: safeCompany,
      role: safeRole,
      applicationId,
      applicationStatus,
      linkedResumeVersion,
      linkedResumeScore,
      targetRole: String(targetRole || "").trim(),
      jobDescription: safeJobDescription,
      expectedDifficulty: expectedDifficulty.level,
      difficultyReason: expectedDifficulty.reason,
      likelyRounds,
      commonTopics: uniqueStrings([
        ...roleProfile.topics,
        ...jdKeywords,
        ...normalizedSkillGaps,
      ]).slice(0, 12),
      prepChecklist: buildPrepChecklist({
        role: safeRole,
        company: safeCompany,
        roleProfile,
        focusAreas,
        resumeTailored,
      }),
      matchedStrengths: buildStrengths({
        linkedResumeScore,
        linkedResumeVersion,
        matchedSkills: normalizedMatchedSkills,
        role: safeRole,
        targetRole,
      }),
      riskAreas: buildRiskAreas({
        jdKeywords,
        matchedSkills: normalizedMatchedSkills,
        skillGaps: normalizedSkillGaps,
        roleProfile,
      }),
      redFlags: buildRedFlags({
        linkedResumeScore,
        linkedResumeVersion,
        skillGaps: normalizedSkillGaps,
        jobDescription: safeJobDescription,
        resumeTailored,
      }),
      mockInterviewProfile: {
        interviewType: roleProfile.interviewType,
        difficulty: expectedDifficulty.level.toLowerCase(),
        focusAreas,
        roundTypes: uniqueStrings(likelyRounds.map((round) => round.type)).slice(0, 6),
        maxQuestions: roleProfile.maxQuestions,
      },
      generatedAtIso: nowIso,
      updatedAtIso: nowIso,
    },
  ])[0];
}

function normalizeRounds(rounds = []) {
  return (Array.isArray(rounds) ? rounds : [])
    .map((round) =>
      pruneUndefined({
        title: String(round?.title || round?.name || "").trim(),
        type: String(round?.type || "").trim(),
        focus: String(round?.focus || "").trim(),
        signal: String(round?.signal || "").trim(),
      }),
    )
    .filter((round) => round.title && round.focus)
    .slice(0, 6);
}

function normalizeChecklist(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      pruneUndefined({
        phase: normalizeChecklistPhase(item?.phase),
        title: String(item?.title || "").trim(),
        note: String(item?.note || "").trim(),
      }),
    )
    .filter((item) => item.title)
    .slice(0, 12);
}

function normalizeStringArray(value, limit = 12) {
  return uniqueStrings(
    Array.isArray(value)
      ? value
      : String(value || "")
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean),
  ).slice(0, limit);
}

function uniqueStrings(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
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

function normalizeScore(value) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Math.round(Number(value))))
    : null;
}

function normalizeDifficulty(value) {
  const normalized = String(value || "Medium").trim().toLowerCase();
  if (normalized === "easy") {
    return "Easy";
  }
  if (normalized === "hard") {
    return "Hard";
  }
  return "Medium";
}

function normalizeInterviewType(value) {
  const normalized = String(value || "technical").trim().toLowerCase();
  if (normalized === "hr") {
    return "hr";
  }
  if (normalized === "domain") {
    return "domain";
  }
  return "technical";
}

function normalizeQuestionCount(value) {
  const numericValue = Number(value || 4);
  if ([3, 4, 5, 6].includes(numericValue)) {
    return numericValue;
  }
  return 4;
}

function normalizeChecklistPhase(value) {
  const normalized = String(value || "3-day").trim().toLowerCase();
  if (["7-day", "3-day", "1-day", "day-of"].includes(normalized)) {
    return normalized;
  }
  return "3-day";
}

function extractKeywords(jobDescription) {
  const tokens = String(jobDescription || "")
    .toLowerCase()
    .match(/[a-z][a-z0-9+.#/-]{2,}/g);

  const stopWords = new Set([
    "with",
    "from",
    "that",
    "this",
    "have",
    "will",
    "your",
    "their",
    "them",
    "into",
    "using",
    "build",
    "years",
    "year",
    "role",
    "team",
    "work",
    "must",
    "good",
    "strong",
    "ability",
    "skills",
    "experience",
  ]);

  return uniqueStrings(
    (tokens || []).filter(
      (token) =>
        token.length > 3 &&
        !stopWords.has(token) &&
        !/^\d/.test(token),
    ),
  ).slice(0, 10);
}

function getRoleProfile(role, jobDescription) {
  const combined = `${role} ${jobDescription}`.toLowerCase();

  if (/\b(teacher|faculty|lecturer|tutor|trainer|professor|educator)\b/.test(combined)) {
    return {
      interviewType: "domain",
      maxQuestions: 4,
      topics: [
        "Lesson planning",
        "Classroom management",
        "Teaching style",
        "Student engagement",
        "Assessment design",
        "Subject depth",
      ],
      rounds: [
        ["HR Round", "hr", "Motivation, communication, and institutional fit."],
        ["Teaching Demo", "teaching-demo", "How you explain concepts and manage a class."],
        ["Subject Round", "domain", "Depth in the core subject and pedagogy choices."],
        ["Managerial Round", "managerial", "Parent communication, ownership, and outcomes."],
      ],
    };
  }

  if (/\b(frontend|react|ui|web developer|javascript)\b/.test(combined)) {
    return {
      interviewType: "technical",
      maxQuestions: 5,
      topics: [
        "JavaScript fundamentals",
        "React patterns",
        "State management",
        "Responsive design",
        "API integration",
        "Debugging tradeoffs",
      ],
      rounds: [
        ["Recruiter Screen", "hr", "Role fit, motivation, and communication."],
        ["Frontend Technical", "technical", "JavaScript, React, and browser fundamentals."],
        ["Live Build or Assignment", "assignment", "Feature implementation and code quality."],
        ["Hiring Manager", "managerial", "Project decisions, ownership, and delivery."],
      ],
    };
  }

  if (/\b(data|analyst|sql|python|machine learning|ml)\b/.test(combined)) {
    return {
      interviewType: "technical",
      maxQuestions: 5,
      topics: [
        "SQL",
        "Python",
        "Data cleaning",
        "Statistics",
        "Case interpretation",
        "Business communication",
      ],
      rounds: [
        ["Recruiter Screen", "hr", "Role fit and communication."],
        ["Analytics Round", "technical", "SQL, Python, metrics, and interpretation."],
        ["Case Study", "assignment", "Problem solving using data."],
        ["Manager Round", "managerial", "Decision-making and stakeholder communication."],
      ],
    };
  }

  return {
    interviewType: "technical",
    maxQuestions: 4,
    topics: [
      "Core role fundamentals",
      "Problem solving",
      "Project discussion",
      "Communication clarity",
      "Role-specific scenarios",
    ],
    rounds: [
      ["Recruiter Screen", "hr", "Motivation, communication, and general fit."],
      ["Technical Round", "technical", "Role-specific fundamentals and applied reasoning."],
      ["Assignment or Case", "assignment", "Practical execution under constraints."],
      ["Final Discussion", "managerial", "Ownership, tradeoffs, and fit with the team."],
    ],
  };
}

function buildLikelyRounds({ company, role, roleProfile, jobDescription }) {
  const companyName = String(company || "").toLowerCase();
  const description = String(jobDescription || "").toLowerCase();
  const rounds = [...roleProfile.rounds];

  if (
    /\b(zoho|tcs|infosys|wipro|accenture|cognizant|hcl|capgemini)\b/.test(companyName) ||
    /\b(aptitude|online test|coding test|assessment)\b/.test(description)
  ) {
    rounds.unshift([
      "Screening Assessment",
      "assessment",
      "Online screening, aptitude, or basic qualification filter.",
    ]);
  }

  return rounds.slice(0, 5).map(([title, type, focus]) => ({
    title,
    type,
    focus,
    signal: buildRoundSignal(title, role),
  }));
}

function buildRoundSignal(title, role) {
  if (/demo/i.test(title)) {
    return `Expect to teach or present as if you are already doing the ${role} role.`;
  }
  if (/assessment|assignment/i.test(title)) {
    return "Speed, structure, and execution quality usually matter more than perfect breadth.";
  }
  if (/technical|subject|analytics/i.test(title)) {
    return "The interviewer will likely probe depth, not just definitions.";
  }
  if (/manager|final/i.test(title)) {
    return "Expect ownership, decision-making, and communication under pressure.";
  }
  return "This round usually tests fit, clarity, and baseline readiness.";
}

function estimateDifficulty({ company, linkedResumeScore, skillGaps, recommendedRoles, role }) {
  const companyName = String(company || "").toLowerCase();
  const score = normalizeScore(linkedResumeScore) ?? 0;
  const gaps = (Array.isArray(skillGaps) ? skillGaps : []).length;
  const roleAlignment = (Array.isArray(recommendedRoles) ? recommendedRoles : []).find(
    (item) => String(item?.role || "").trim().toLowerCase() === String(role || "").trim().toLowerCase(),
  );
  const fitScore = normalizeScore(roleAlignment?.fitScore ?? roleAlignment?.match) ?? 0;

  if (
    /\b(google|microsoft|amazon|meta|adobe|atlassian|salesforce)\b/.test(companyName) ||
    score < 65 ||
    gaps >= 5
  ) {
    return {
      level: "Hard",
      reason: "The company signal, ATS baseline, or visible skill gaps suggest deeper filtering and stronger competition.",
    };
  }

  if (score >= 82 && gaps <= 2 && fitScore >= 75) {
    return {
      level: "Easy",
      reason: "Your current profile already looks reasonably aligned, so the main work is structured preparation instead of closing major gaps.",
    };
  }

  return {
    level: "Medium",
    reason: "The role looks reachable, but you still need targeted preparation across likely rounds and role-specific topics.",
  };
}

function buildPrepChecklist({ role, company, roleProfile, focusAreas, resumeTailored }) {
  const firstFocus = focusAreas[0] || roleProfile.topics[0] || "core role fundamentals";
  return [
    {
      phase: "7-day",
      title: `Map the ${company || role} interview flow`,
      note: "Confirm likely rounds, timelines, and what each round is expected to test.",
    },
    {
      phase: "7-day",
      title: "Tighten resume stories and achievements",
      note: resumeTailored
        ? "Your resume is already tailored, so focus on evidence-backed talking points."
        : "Align the resume bullets and examples more directly to the role before the process starts.",
    },
    {
      phase: "3-day",
      title: `Practice ${firstFocus}`,
      note: "Prepare concise explanations, examples, and deeper follow-up answers.",
    },
    {
      phase: "3-day",
      title: `Prepare project stories for the ${role} role`,
      note: "Be ready to explain decisions, tradeoffs, outcomes, and what you would improve.",
    },
    {
      phase: "1-day",
      title: "Run one company-tuned mock interview",
      note: `Use a mock session with ${company || "company"} context and the expected round types.`,
    },
    {
      phase: "day-of",
      title: "Carry a short round-by-round checklist",
      note: "Review top talking points, opening intro, questions to ask, and role-specific proof points.",
    },
  ];
}

function buildStrengths({ linkedResumeScore, linkedResumeVersion, matchedSkills, role, targetRole }) {
  const strengths = [];
  const score = normalizeScore(linkedResumeScore);

  if (score != null) {
    if (score >= 80) {
      strengths.push(`Strong ATS baseline at ${score}/100 for this preparation cycle.`);
    } else if (score >= 70) {
      strengths.push(`Solid ATS foundation at ${score}/100 with room to sharpen role-specific keywords.`);
    }
  }

  if (linkedResumeVersion) {
    strengths.push(`Resume version ${linkedResumeVersion} is already linked to this pack.`);
  }

  if (targetRole && role && targetRole.toLowerCase() === role.toLowerCase()) {
    strengths.push("This prep pack aligns directly with your current target role.");
  }

  if (matchedSkills.length) {
    strengths.push(`Clear matching signals already exist in ${matchedSkills.slice(0, 4).join(", ")}.`);
  }

  return uniqueStrings(strengths).slice(0, 6);
}

function buildRiskAreas({ jdKeywords, matchedSkills, skillGaps, roleProfile }) {
  const matched = new Set((Array.isArray(matchedSkills) ? matchedSkills : []).map((item) => item.toLowerCase()));
  const keywordGaps = jdKeywords.filter((keyword) => !matched.has(keyword.toLowerCase()));

  return uniqueStrings([
    ...skillGaps,
    ...keywordGaps.slice(0, 4),
    ...roleProfile.topics.slice(0, 2),
  ]).slice(0, 8);
}

function buildRedFlags({ linkedResumeScore, linkedResumeVersion, skillGaps, jobDescription, resumeTailored }) {
  const flags = [];
  const score = normalizeScore(linkedResumeScore);

  if (score == null) {
    flags.push("No ATS score is linked, so resume fit is still partly unverified.");
  } else if (score < 65) {
    flags.push(`ATS score is only ${score}/100, which may cause early filtering before interviews start.`);
  }

  if (!linkedResumeVersion) {
    flags.push("No linked resume version is saved for this prep pack.");
  }

  if (!resumeTailored) {
    flags.push("Resume does not appear tailored yet, which can weaken role-specific alignment.");
  }

  if (!String(jobDescription || "").trim()) {
    flags.push("No JD was provided, so the prep pack uses role heuristics instead of exact hiring signals.");
  }

  if ((Array.isArray(skillGaps) ? skillGaps : []).length >= 4) {
    flags.push("Several visible skill gaps could trigger deeper probing in technical or domain rounds.");
  }

  return uniqueStrings(flags).slice(0, 6);
}

function createCompanyPrepId() {
  return `prep-${Math.random().toString(36).slice(2, 10)}`;
}
