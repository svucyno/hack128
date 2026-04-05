const RAW_JOB_FEED = [
  {
    id: "zoho-frontend-engineer",
    company: "Zoho",
    role: "Frontend Engineer",
    department: "Product Engineering",
    location: "Chennai",
    workMode: "hybrid",
    salary: "Rs 6L - Rs 11L",
    source: "careers",
    experienceRequired: "0-2 years",
    eligibility: "B.Tech / B.E. in CS, IT, or related field",
    deadlineOffsetDays: 10,
    requiredSkills: [
      "React",
      "JavaScript",
      "TypeScript",
      "HTML",
      "CSS",
      "Responsive Design",
      "REST APIs",
    ],
    keywords: ["frontend", "web apps", "ui performance", "component systems"],
    summary:
      "Build user-facing product surfaces, improve UI performance, and ship reusable components for high-traffic workflows.",
    applicationUrl: "https://careers.zohocorp.com/",
  },
  {
    id: "freshworks-product-engineer",
    company: "Freshworks",
    role: "Product Engineer",
    department: "Platform",
    location: "Chennai",
    workMode: "hybrid",
    salary: "Rs 8L - Rs 15L",
    source: "linkedin",
    experienceRequired: "1-3 years",
    eligibility: "Strong JavaScript fundamentals and shipped product work",
    deadlineOffsetDays: 14,
    requiredSkills: [
      "JavaScript",
      "React",
      "Node.js",
      "APIs",
      "Testing",
      "Debugging",
    ],
    keywords: ["product thinking", "ownership", "customer workflows", "clean ui"],
    summary:
      "Own end-to-end product workflows, collaborate with design, and improve feature quality from UI to API handoff.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "razorpay-full-stack",
    company: "Razorpay",
    role: "Full Stack Developer",
    department: "Engineering",
    location: "Bengaluru",
    workMode: "hybrid",
    salary: "Rs 10L - Rs 18L",
    source: "linkedin",
    experienceRequired: "1-3 years",
    eligibility: "Strong DSA plus modern JS stack exposure",
    deadlineOffsetDays: 9,
    requiredSkills: [
      "React",
      "Node.js",
      "SQL",
      "REST APIs",
      "Authentication",
      "System Design",
    ],
    keywords: ["payments", "scalability", "backend ownership", "full stack"],
    summary:
      "Ship user-facing product flows backed by scalable services, auth patterns, and data-heavy dashboards.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "tcs-web-developer",
    company: "TCS",
    role: "Web Developer",
    department: "Digital Delivery",
    location: "Hyderabad",
    workMode: "on-site",
    salary: "Rs 4L - Rs 7L",
    source: "college",
    experienceRequired: "0-1 years",
    eligibility: "Campus hiring for 2026 graduates",
    deadlineOffsetDays: 6,
    requiredSkills: [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "Git",
      "Responsive Design",
    ],
    keywords: ["campus drive", "web development", "frontend delivery"],
    summary:
      "Support enterprise web delivery, build responsive UI modules, and work within structured delivery teams.",
    applicationUrl: "https://www.tcs.com/careers",
  },
  {
    id: "paytm-software-engineer",
    company: "Paytm",
    role: "Software Engineer",
    department: "Merchant Experience",
    location: "Noida",
    workMode: "hybrid",
    salary: "Rs 8L - Rs 14L",
    source: "linkedin",
    experienceRequired: "0-2 years",
    eligibility: "Strong coding fundamentals plus web development projects",
    deadlineOffsetDays: 18,
    requiredSkills: [
      "JavaScript",
      "React",
      "Node.js",
      "Data Structures",
      "APIs",
      "Debugging",
    ],
    keywords: ["product engineering", "merchant tools", "scalable systems"],
    summary:
      "Build merchant product experiences, debug production issues, and contribute to fast-moving commerce flows.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "deloitte-data-analyst",
    company: "Deloitte",
    role: "Data Analyst",
    department: "Analytics",
    location: "Hyderabad",
    workMode: "hybrid",
    salary: "Rs 5L - Rs 9L",
    source: "linkedin",
    experienceRequired: "0-2 years",
    eligibility: "Degree in analytics, CS, statistics, or related field",
    deadlineOffsetDays: 16,
    requiredSkills: [
      "SQL",
      "Excel",
      "Python",
      "Data Visualization",
      "Statistics",
      "Communication",
    ],
    keywords: ["dashboards", "insights", "reporting", "stakeholder communication"],
    summary:
      "Translate business questions into dashboards, insights, and stakeholder-ready analysis packs.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "accenture-analyst",
    company: "Accenture",
    role: "Analyst",
    department: "Technology Consulting",
    location: "Bengaluru",
    workMode: "on-site",
    salary: "Rs 4.5L - Rs 8L",
    source: "college",
    experienceRequired: "0-1 years",
    eligibility: "Campus hiring for final-year students",
    deadlineOffsetDays: 8,
    requiredSkills: [
      "Communication",
      "Problem Solving",
      "SQL",
      "JavaScript",
      "Excel",
    ],
    keywords: ["client delivery", "analysis", "presentation", "structured thinking"],
    summary:
      "Work on consulting delivery, analyze workflows, and support structured problem solving across teams.",
    applicationUrl: "https://www.accenture.com/in-en/careers",
  },
  {
    id: "vedantu-math-teacher",
    company: "Vedantu",
    role: "Math Teacher",
    department: "Academic Delivery",
    location: "Remote",
    workMode: "remote",
    salary: "Rs 4L - Rs 8L",
    source: "careers",
    experienceRequired: "0-2 years",
    eligibility: "Strong subject depth and teaching demonstration",
    deadlineOffsetDays: 13,
    requiredSkills: [
      "Teaching",
      "Lesson Planning",
      "Classroom Management",
      "Communication",
      "Assessment Design",
    ],
    keywords: ["student engagement", "live classes", "subject mastery"],
    summary:
      "Deliver live classes, simplify concepts for beginners, and maintain strong student engagement and assessment quality.",
    applicationUrl: "https://www.vedantu.com/careers",
  },
  {
    id: "physics-wallah-subject-teacher",
    company: "Physics Wallah",
    role: "Science Teacher",
    department: "Academic Programs",
    location: "Noida",
    workMode: "hybrid",
    salary: "Rs 5L - Rs 9L",
    source: "linkedin",
    experienceRequired: "1-3 years",
    eligibility: "Teaching proof plus demo-round readiness",
    deadlineOffsetDays: 11,
    requiredSkills: [
      "Teaching",
      "Lesson Planning",
      "Curriculum Design",
      "Student Engagement",
      "Communication",
    ],
    keywords: ["demo class", "subject clarity", "board exam readiness"],
    summary:
      "Teach high-volume learner batches, run demo sessions, and create effective teaching plans for exam-oriented programs.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "teachmint-academic-coordinator",
    company: "Teachmint",
    role: "Academic Coordinator",
    department: "Learning Operations",
    location: "Bengaluru",
    workMode: "hybrid",
    salary: "Rs 5L - Rs 9L",
    source: "careers",
    experienceRequired: "0-2 years",
    eligibility: "Education or instructional delivery background preferred",
    deadlineOffsetDays: 19,
    requiredSkills: [
      "Teaching",
      "Curriculum Design",
      "Planning",
      "Stakeholder Communication",
      "Documentation",
    ],
    keywords: ["academic operations", "coordination", "planning"],
    summary:
      "Coordinate faculty operations, align delivery plans, and improve learning quality through structured execution.",
    applicationUrl: "https://www.teachmint.com/careers",
  },
  {
    id: "unacademy-teaching-fellow",
    company: "Unacademy",
    role: "Teaching Fellow",
    department: "Academic Delivery",
    location: "Remote",
    workMode: "remote",
    salary: "Rs 3.6L - Rs 6L",
    source: "unstop",
    experienceRequired: "0-1 years",
    eligibility: "Freshers with strong communication and teaching demos welcome",
    deadlineOffsetDays: 5,
    requiredSkills: [
      "Teaching",
      "Communication",
      "Lesson Planning",
      "Presentation",
      "Student Support",
    ],
    keywords: ["fellowship", "online teaching", "beginner-friendly explanation"],
    summary:
      "Support online teaching programs, explain concepts simply, and build confidence through structured live delivery.",
    applicationUrl: "https://unstop.com/jobs",
  },
  {
    id: "chegg-subject-expert",
    company: "Chegg",
    role: "Subject Expert",
    department: "Learning Support",
    location: "Remote",
    workMode: "remote",
    salary: "Rs 3L - Rs 5.5L",
    source: "unstop",
    experienceRequired: "0-1 years",
    eligibility: "Strong written communication and subject fundamentals",
    deadlineOffsetDays: 12,
    requiredSkills: [
      "Subject Expertise",
      "Communication",
      "Problem Solving",
      "Teaching",
      "Documentation",
    ],
    keywords: ["student support", "doubt resolution", "clarity"],
    summary:
      "Resolve learner doubts, explain concepts clearly, and provide reliable written academic support.",
    applicationUrl: "https://unstop.com/jobs",
  },
  {
    id: "infosys-systems-engineer",
    company: "Infosys",
    role: "Systems Engineer",
    department: "Technology",
    location: "Mysuru",
    workMode: "on-site",
    salary: "Rs 4L - Rs 6.5L",
    source: "college",
    experienceRequired: "0-1 years",
    eligibility: "Campus hiring for engineering graduates",
    deadlineOffsetDays: 7,
    requiredSkills: [
      "JavaScript",
      "Problem Solving",
      "SQL",
      "Programming Fundamentals",
      "Communication",
    ],
    keywords: ["campus", "delivery", "engineering basics"],
    summary:
      "Join structured technology teams, work on enterprise engineering tasks, and grow into role-specific delivery tracks.",
    applicationUrl: "https://www.infosys.com/careers",
  },
  {
    id: "cognizant-programmer-analyst",
    company: "Cognizant",
    role: "Programmer Analyst",
    department: "Digital Engineering",
    location: "Pune",
    workMode: "hybrid",
    salary: "Rs 4.2L - Rs 7L",
    source: "linkedin",
    experienceRequired: "0-2 years",
    eligibility: "Engineering degree with project-based coding proof",
    deadlineOffsetDays: 15,
    requiredSkills: [
      "JavaScript",
      "React",
      "SQL",
      "Testing",
      "Problem Solving",
    ],
    keywords: ["delivery", "digital engineering", "quality"],
    summary:
      "Work on modern delivery teams, contribute to UI and data flows, and support testing and release quality.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "tata-elxsi-ui-developer",
    company: "Tata Elxsi",
    role: "UI Developer",
    department: "Design Engineering",
    location: "Bengaluru",
    workMode: "hybrid",
    salary: "Rs 6L - Rs 10L",
    source: "careers",
    experienceRequired: "1-3 years",
    eligibility: "Strong UI craft and production-ready frontend projects",
    deadlineOffsetDays: 17,
    requiredSkills: [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "Design Systems",
      "Accessibility",
    ],
    keywords: ["ui engineering", "design handoff", "interaction quality"],
    summary:
      "Turn design systems into production interfaces, improve accessibility, and refine interaction quality across products.",
    applicationUrl: "https://careers.tataelxsi.com/",
  },
  {
    id: "hcl-cloud-support",
    company: "HCLTech",
    role: "Cloud Support Associate",
    department: "Infrastructure",
    location: "Noida",
    workMode: "on-site",
    salary: "Rs 4.5L - Rs 8L",
    source: "linkedin",
    experienceRequired: "0-2 years",
    eligibility: "Cloud fundamentals or deployment exposure preferred",
    deadlineOffsetDays: 20,
    requiredSkills: [
      "AWS",
      "Linux",
      "Networking",
      "Troubleshooting",
      "Documentation",
    ],
    keywords: ["cloud support", "infra operations", "incident handling"],
    summary:
      "Support cloud workloads, troubleshoot infra issues, and manage basic service reliability and documentation flows.",
    applicationUrl: "https://www.linkedin.com/jobs/",
  },
  {
    id: "publicis-content-strategist",
    company: "Publicis Sapient",
    role: "Content Strategist",
    department: "Learning Experience",
    location: "Gurugram",
    workMode: "hybrid",
    salary: "Rs 5L - Rs 8L",
    source: "other",
    experienceRequired: "0-2 years",
    eligibility: "Strong written communication and structured storytelling",
    deadlineOffsetDays: 21,
    requiredSkills: [
      "Communication",
      "Content Writing",
      "Curriculum Design",
      "Research",
      "Presentation",
    ],
    keywords: ["storytelling", "learning content", "structured communication"],
    summary:
      "Create structured learning content, simplify complex ideas, and support engagement through strong narrative design.",
    applicationUrl: "https://careers.publicissapient.com/",
  },
  {
    id: "mu-sigma-decision-scientist",
    company: "Mu Sigma",
    role: "Decision Scientist",
    department: "Analytics",
    location: "Bengaluru",
    workMode: "on-site",
    salary: "Rs 6L - Rs 10L",
    source: "unstop",
    experienceRequired: "0-2 years",
    eligibility: "Analytical reasoning and data problem solving",
    deadlineOffsetDays: 18,
    requiredSkills: [
      "SQL",
      "Python",
      "Statistics",
      "Problem Solving",
      "Communication",
    ],
    keywords: ["analytics", "decision science", "business impact"],
    summary:
      "Solve business problems with data, communicate recommendations clearly, and turn analysis into decisions.",
    applicationUrl: "https://unstop.com/jobs",
  },
];

const ROLE_ALIASES = {
  teacher: [
    "teacher",
    "teaching fellow",
    "faculty",
    "subject expert",
    "science teacher",
    "math teacher",
    "academic coordinator",
    "trainer",
    "educator",
  ],
  "web developer": [
    "web developer",
    "frontend engineer",
    "frontend developer",
    "ui developer",
    "product engineer",
    "software engineer",
    "full stack developer",
  ],
  "frontend engineer": [
    "frontend engineer",
    "frontend developer",
    "ui developer",
    "web developer",
    "react developer",
    "product engineer",
  ],
  "full stack developer": [
    "full stack developer",
    "software engineer",
    "product engineer",
    "web developer",
    "frontend engineer",
  ],
  "data analyst": [
    "data analyst",
    "analyst",
    "decision scientist",
    "business analyst",
  ],
};

const SOURCE_LABELS = {
  linkedin: "LinkedIn",
  careers: "Careers Page",
  referral: "Referral",
  college: "College",
  unstop: "Unstop",
  other: "Other",
};

export function buildRecommendedJobs({
  targetRole = "",
  suggestedRoles = [],
  resumeSkills = [],
  missingSkills = [],
  atsScore = null,
  locationQuery = "",
  workMode = "",
  source = "",
} = {}) {
  const normalizedResumeSkills = normalizeStringArray(resumeSkills, 40);
  const normalizedMissingSkills = normalizeStringArray(missingSkills, 24);
  const recommendedRoleList = normalizeRoleSignals(targetRole, suggestedRoles);
  const activeTargetRole = recommendedRoleList[0] || "";
  const locationText = String(locationQuery || "").trim().toLowerCase();
  const sourceFilter = String(source || "").trim().toLowerCase();
  const workModeFilter = String(workMode || "").trim().toLowerCase();

  const rankedJobs = RAW_JOB_FEED
    .map((job) =>
      scoreRecommendedJob(job, {
        activeTargetRole,
        recommendedRoleList,
        resumeSkills: normalizedResumeSkills,
        missingSkills: normalizedMissingSkills,
        atsScore,
      }),
    )
    .filter((job) => {
      if (locationText && !job.location.toLowerCase().includes(locationText)) {
        return false;
      }
      if (workModeFilter && job.workMode !== workModeFilter) {
        return false;
      }
      if (sourceFilter && job.source !== sourceFilter) {
        return false;
      }
      return true;
    })
    .sort((left, right) => right.matchScore - left.matchScore);

  const targetRoleMatches = rankedJobs
    .filter((job) => job.track === "target" || job.directRoleMatch)
    .slice(0, 8);
  const profileMatches = rankedJobs
    .filter((job) => !targetRoleMatches.some((item) => item.id === job.id))
    .slice(0, 8);

  return {
    targetRole: activeTargetRole,
    roleSignals: recommendedRoleList,
    targetRoleMatches,
    profileMatches,
    allJobs: rankedJobs,
  };
}

export function buildTrackerApplicationFromJob({
  job,
  linkedResumeVersion = "",
  linkedResumeScore = null,
  targetRole = "",
  resumeSkillGaps = [],
}) {
  const nowIso = new Date().toISOString();
  return {
    id: createApplicationId(),
    company: job.company,
    role: job.role,
    department: job.department,
    jobLocation: job.location,
    workMode: job.workMode,
    salary: job.salary,
    source: job.source,
    jobLink: job.applicationUrl,
    applicationLink: "",
    jobDescription: job.jobDescription,
    requiredSkills: job.requiredSkills,
    mustHaveKeywords: job.keywords,
    importantKeywords: job.keywords,
    experienceRequired: job.experienceRequired,
    eligibility: job.eligibility,
    linkedResumeVersion: String(linkedResumeVersion || "").trim(),
    linkedResumeScore: normalizeScore(linkedResumeScore),
    resumeTailored: false,
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    status: "wishlist",
    priority: job.matchScore >= 82 ? "high" : job.matchScore >= 68 ? "medium" : "low",
    savedDate: getTodayInput(),
    appliedDate: "",
    deadline: job.deadline,
    recruiterName: "",
    recruiterContact: "",
    referralUsed: false,
    interviewRounds: [],
    followUpDate: "",
    followUpStatus: "",
    responseReceived: false,
    nextAction: `Review the JD, tailor the resume, and move this to Ready To Apply once ${job.nextStep.toLowerCase()}.`,
    whyFit: job.whyItMatches.join(" "),
    resumeChangesNeeded: job.missingSkills.length
      ? `Add proof for: ${job.missingSkills.join(", ")}.`
      : "Tighten role-specific bullets and measurable outcomes.",
    talkingPoints: job.matchedSkills.length
      ? `Use proof around ${job.matchedSkills.join(", ")}.`
      : "",
    risksGaps: uniqueStrings([...job.missingSkills, ...normalizeStringArray(resumeSkillGaps, 8)]).join(
      ", ",
    ),
    compensationNotes: job.salary,
    customizationsMade: "",
    strategyNotes: `Recommended as a ${job.track === "target" ? "target-role" : "profile-fit"} opportunity. ${job.riskSummary}`,
    finalOutcome: "",
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    taskSync: {
      deadline: true,
      followUp: true,
      interview: true,
    },
    recommendationMeta: {
      targetRole: String(targetRole || "").trim(),
      matchScore: job.matchScore,
      recommendedTrack: job.track,
    },
  };
}

export function mergeMlJobMatches(recommendations, mlMatches = []) {
  const baseRecommendations =
    recommendations && typeof recommendations === "object"
      ? recommendations
      : {
          targetRole: "",
          roleSignals: [],
          targetRoleMatches: [],
          profileMatches: [],
          allJobs: [],
        };

  const matchLookup = new Map(
    (Array.isArray(mlMatches) ? mlMatches : []).map((match) => [
      createMlMatchKey(match),
      match,
    ]),
  );

  const mergeJob = (job) => {
    const mlMatch =
      matchLookup.get(createMlMatchKey(job)) ||
      matchLookup.get(createMlMatchKey({ company: job.company, role: job.role }));

    if (!mlMatch) {
      return {
        ...job,
        mlBacked: false,
      };
    }

    const matchedSkills = normalizeStringArray(
      mlMatch.matchedSkills || mlMatch.matched_skills,
      6,
    );
    const missingSkills = normalizeStringArray(
      mlMatch.missingSkills || mlMatch.missing_skills,
      6,
    );
    const whyItMatches = uniqueStrings([
      ...normalizeStringArray(mlMatch.whyFit || mlMatch.why_fit, 4),
      ...(Array.isArray(job.whyItMatches) ? job.whyItMatches : []),
    ]).slice(0, 4);
    const matchScore = normalizeMlScore(mlMatch.matchScore ?? mlMatch.match_score) ?? job.matchScore;

    return {
      ...job,
      matchScore,
      location: String(mlMatch.location || job.location || "").trim() || job.location,
      workMode: normalizeWorkMode(mlMatch.workMode || mlMatch.work_mode || job.workMode) || job.workMode,
      matchedSkills: matchedSkills.length ? matchedSkills : job.matchedSkills,
      missingSkills: missingSkills.length ? missingSkills : job.missingSkills,
      whyItMatches: whyItMatches.length ? whyItMatches : job.whyItMatches,
      riskSummary: missingSkills.length
        ? `ML ranking still sees gaps in ${missingSkills.slice(0, 3).join(", ")}.`
        : job.riskSummary,
      mlBacked: true,
    };
  };

  const allJobs = (baseRecommendations.allJobs || [])
    .map(mergeJob)
    .sort((left, right) => right.matchScore - left.matchScore);

  const targetIds = new Set(
    (baseRecommendations.targetRoleMatches || []).map((job) => createJobIdentityKey(job)),
  );

  const targetRoleMatches = allJobs
    .filter((job) => targetIds.has(createJobIdentityKey(job)))
    .slice(0, 8);
  const profileMatches = allJobs
    .filter((job) => !targetIds.has(createJobIdentityKey(job)))
    .slice(0, 8);

  return {
    ...baseRecommendations,
    targetRoleMatches,
    profileMatches,
    allJobs,
  };
}

function scoreRecommendedJob(job, context) {
  const expandedJob = buildJobRecord(job);
  const roleSignals = context.recommendedRoleList || [];
  const targetRole = String(context.activeTargetRole || "").trim();
  const resumeSkills = context.resumeSkills || [];
  const missingSkills = context.missingSkills || [];
  const matchedSkills = expandedJob.requiredSkills.filter((skill) =>
    includesToken(resumeSkills, skill),
  );
  const unresolvedSkills = expandedJob.requiredSkills.filter(
    (skill) => !includesToken(matchedSkills, skill),
  );
  const missingSkillConflicts = unresolvedSkills.filter((skill) =>
    includesToken(missingSkills, skill),
  );

  const directRoleMatch = roleSignals.some((role) => roleMatches(expandedJob.role, role));
  const adjacentRoleMatch = !directRoleMatch && roleSignals.some((role) => roleNearby(expandedJob.role, role));
  const roleScore = directRoleMatch ? 38 : adjacentRoleMatch ? 26 : 12;
  const skillScore = Math.round((matchedSkills.length / Math.max(expandedJob.requiredSkills.length, 1)) * 34);
  const atsScore = normalizeScore(context.atsScore) || 0;
  const atsBoost = Math.round((atsScore / 100) * 10);
  const freshnessBoost = getFreshnessBoost(expandedJob.deadline);
  const gapPenalty = Math.min(12, missingSkillConflicts.length * 4);
  const matchScore = clamp(roleScore + skillScore + atsBoost + freshnessBoost - gapPenalty, 42, 98);

  const whyItMatches = buildWhyItMatches({
    company: expandedJob.company,
    role: expandedJob.role,
    targetRole,
    directRoleMatch,
    adjacentRoleMatch,
    matchedSkills,
    atsScore,
  });
  const nextStep = directRoleMatch
    ? "the resume is tailored and keywords are covered"
    : "you confirm the role transition and capture missing proof";

  return {
    ...expandedJob,
    matchScore,
    directRoleMatch,
    adjacentRoleMatch,
    matchedSkills,
    missingSkills: unresolvedSkills.slice(0, 5),
    whyItMatches,
    riskSummary: unresolvedSkills.length
      ? `Main gaps to close: ${unresolvedSkills.slice(0, 3).join(", ")}.`
      : "No major skill gaps detected from the current profile snapshot.",
    track: directRoleMatch ? "target" : "profile",
    nextStep,
  };
}

function buildJobRecord(job) {
  const deadline = buildDateFromOffset(job.deadlineOffsetDays);
  return {
    ...job,
    workMode: normalizeWorkMode(job.workMode),
    source: normalizeSource(job.source),
    sourceLabel: SOURCE_LABELS[normalizeSource(job.source)] || "Other",
    requiredSkills: normalizeStringArray(job.requiredSkills, 12),
    keywords: normalizeStringArray(job.keywords, 12),
    deadline,
    jobDescription: buildJobDescription(job),
  };
}

function buildJobDescription(job) {
  return [
    `${job.company} is hiring a ${job.role} in ${job.location}.`,
    String(job.summary || "").trim(),
    `Required skills: ${normalizeStringArray(job.requiredSkills, 12).join(", ")}.`,
    `Experience required: ${job.experienceRequired}.`,
    `Eligibility: ${job.eligibility}.`,
    `Preferred keywords: ${normalizeStringArray(job.keywords, 12).join(", ")}.`,
  ].join(" ");
}

function buildWhyItMatches({
  company,
  role,
  targetRole,
  directRoleMatch,
  adjacentRoleMatch,
  matchedSkills,
  atsScore,
}) {
  const reasons = [];
  if (directRoleMatch && targetRole) {
    reasons.push(`${role} aligns directly with your current target role: ${targetRole}.`);
  } else if (adjacentRoleMatch) {
    reasons.push(`${role} is adjacent to the role cluster your profile already supports.`);
  }
  if (matchedSkills.length) {
    reasons.push(`Your profile already shows proof around ${matchedSkills.slice(0, 4).join(", ")}.`);
  }
  if (normalizeScore(atsScore) != null) {
    reasons.push(`The latest ATS baseline of ${normalizeScore(atsScore)}/100 supports this application path.`);
  }
  reasons.push(`Company and JD signals suggest this is a realistic next move for ${company}.`);
  return reasons.slice(0, 4);
}

function normalizeRoleSignals(targetRole, suggestedRoles) {
  const seedRoles = uniqueStrings([targetRole, ...normalizeStringArray(suggestedRoles, 8)]);
  const expandedRoles = [];
  seedRoles.forEach((role) => {
    expandedRoles.push(role);
    const aliases = ROLE_ALIASES[getRoleAliasKey(role)] || [];
    expandedRoles.push(...aliases);
  });
  return uniqueStrings(expandedRoles).slice(0, 16);
}

function getRoleAliasKey(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return Object.keys(ROLE_ALIASES).find((key) => roleMatches(normalized, key)) || normalized;
}

function roleMatches(candidateRole, targetRole) {
  const candidate = simplifyText(candidateRole);
  const target = simplifyText(targetRole);
  if (!candidate || !target) {
    return false;
  }
  if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
    return true;
  }
  const targetAliases = ROLE_ALIASES[getRoleAliasKey(target)] || [];
  return targetAliases.some((alias) => {
    const normalizedAlias = simplifyText(alias);
    return (
      normalizedAlias &&
      (candidate === normalizedAlias ||
        candidate.includes(normalizedAlias) ||
        normalizedAlias.includes(candidate))
    );
  });
}

function roleNearby(candidateRole, targetRole) {
  const candidateTokens = simplifyText(candidateRole).split(" ");
  const targetTokens = simplifyText(targetRole).split(" ");
  const sharedTokens = candidateTokens.filter((token) => targetTokens.includes(token));
  if (sharedTokens.length >= 1 && (candidateTokens.length > 1 || targetTokens.length > 1)) {
    return true;
  }
  return includesToken(candidateTokens, "teacher") && includesToken(targetTokens, "academic");
}

function includesToken(values, token) {
  const normalizedToken = simplifyText(token);
  return (Array.isArray(values) ? values : []).some((value) => {
    const normalizedValue = simplifyText(value);
    return (
      normalizedValue === normalizedToken ||
      normalizedValue.includes(normalizedToken) ||
      normalizedToken.includes(normalizedValue)
    );
  });
}

function simplifyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeWorkMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "onsite" || normalized === "on site") {
    return "on-site";
  }
  return ["remote", "hybrid", "on-site"].includes(normalized) ? normalized : "";
}

function normalizeSource(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["linkedin", "careers", "referral", "college", "unstop", "other"].includes(normalized)
    ? normalized
    : "other";
}

function getFreshnessBoost(deadline) {
  const today = new Date();
  const target = new Date(deadline);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return 0;
  }
  if (diffDays <= 7) {
    return 10;
  }
  if (diffDays <= 14) {
    return 8;
  }
  return 5;
}

function buildDateFromOffset(offsetDays = 10) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(offsetDays || 0));
  return date.toISOString().slice(0, 10);
}

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function createApplicationId() {
  return `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMlScore(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return clamp(Math.round(numericValue <= 1 ? numericValue * 100 : numericValue), 0, 100);
}

function createMlMatchKey(item) {
  return [
    String(item?.company || "").trim().toLowerCase(),
    String(item?.role || "").trim().toLowerCase(),
    String(item?.location || "").trim().toLowerCase(),
  ].join("::");
}

function createJobIdentityKey(item) {
  return [
    String(item?.company || "").trim().toLowerCase(),
    String(item?.role || "").trim().toLowerCase(),
    String(item?.applicationUrl || item?.jobLink || "").trim().toLowerCase(),
  ].join("::");
}
