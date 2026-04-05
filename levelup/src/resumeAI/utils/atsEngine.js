import { jobProfiles, skillLibrary } from "../data/jobProfiles.js";

const STOP_WORDS = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "almost",
  "also",
  "among",
  "another",
  "because",
  "before",
  "being",
  "below",
  "between",
  "could",
  "during",
  "every",
  "first",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "other",
  "over",
  "some",
  "such",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "very",
  "with",
  "years",
  "year",
  "using",
  "used",
  "build",
  "built",
  "resume",
  "work",
  "team",
  "teams",
  "including",
  "responsible",
  "experience",
  "education",
  "skills",
  "project",
  "projects",
]);

const SECTION_HEADERS = [
  "summary",
  "experience",
  "work experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "achievements",
  "contact",
  "profile",
];

const ROLE_TOKENS = new Set([
  "engineer",
  "developer",
  "analyst",
  "scientist",
  "designer",
  "manager",
  "consultant",
  "architect",
  "specialist",
  "lead",
  "intern",
  "student",
  "fresher",
  "fullstack",
  "frontend",
  "backend",
  "software",
  "web",
  "data",
  "machine",
  "learning",
  "product",
  "qa",
  "tester",
]);

const NAME_BLOCKLIST = new Set([
  ...SECTION_HEADERS,
  "resume",
  "cv",
  "curriculum",
  "vitae",
  "email",
  "phone",
  "mobile",
  "contact",
  "linkedin",
  "github",
  "portfolio",
  "address",
  "objective",
  "profile",
  "summary",
]);

const LOCATION_SUFFIX_TOKENS = new Set([
  "india",
  "hyderabad",
  "bengaluru",
  "bangalore",
  "chennai",
  "mumbai",
  "pune",
  "delhi",
  "noida",
  "gurgaon",
  "gurugram",
  "kolkata",
  "remote",
  "usa",
  "us",
  "uk",
  "canada",
  "australia",
  "singapore",
  "dubai",
  "uae",
  "germany",
  "london",
]);

const ACTION_VERBS = [
  "built",
  "led",
  "launched",
  "improved",
  "optimized",
  "designed",
  "delivered",
  "developed",
  "implemented",
  "automated",
  "increased",
  "reduced",
  "scaled",
  "created",
  "owned",
  "drove",
  "accelerated",
];

const SOFT_SKILLS = [
  "Communication",
  "Leadership",
  "Problem Solving",
  "Agile",
  "Collaboration",
  "Teamwork",
  "Stakeholder Management",
  "Ownership",
];

const ROLE_EDUCATION_PATTERNS = {
  technical: [
    /\bcomputer science\b/i,
    /\binformation technology\b/i,
    /\bsoftware\b/i,
    /\binformation systems\b/i,
    /\bengineering\b/i,
    /\belectronics\b/i,
    /\bdata science\b/i,
    /\bartificial intelligence\b/i,
    /\bmachine learning\b/i,
  ],
  analytics: [
    /\bdata science\b/i,
    /\bstatistics\b/i,
    /\bmathematics\b/i,
    /\banalytics\b/i,
    /\bbusiness analytics\b/i,
    /\beconomics\b/i,
    /\bcomputer science\b/i,
  ],
};

const EDUCATION_RULES = [
  {
    label: "Doctorate",
    score: 10,
    inProgressScore: 8,
    patterns: [/\bph\.?\s*d\b/i, /\bdoctorate\b/i, /\bdoctoral\b/i],
  },
  {
    label: "Master's",
    score: 9,
    inProgressScore: 6,
    patterns: [
      /\bmaster(?:'s)?\b/i,
      /\bmaster of science\b/i,
      /\bm\.?\s?s\b(?!\s+(excel|office|word|powerpoint|project|sql)\b)/i,
      /\bm\.?\s?tech\b/i,
      /\bmba\b/i,
      /\bmca\b/i,
      /\bmsc\b/i,
    ],
  },
  {
    label: "Bachelor's",
    score: 8,
    inProgressScore: 6,
    patterns: [
      /\bbachelor(?:'s)?\b/i,
      /\bb\.?\s?tech\b/i,
      /\bb\.?\s?e\b/i,
      /\bbs\b/i,
      /\bbsc\b/i,
      /\bbca\b/i,
      /\bundergraduate\b/i,
    ],
  },
  {
    label: "Diploma / Certification",
    score: 6,
    inProgressScore: 5,
    patterns: [/\bdiploma\b/i, /\bcertification\b/i, /\bcertificate\b/i],
  },
];

const INCOMPLETE_EDUCATION_PATTERNS = [
  /\bpursuing\b/i,
  /\bongoing\b/i,
  /\bcurrent(?:ly)?\b/i,
  /\bexpected\b/i,
  /\bin progress\b/i,
  /\bnot completed\b/i,
  /\bincomplete\b/i,
  /\bdiscontinued\b/i,
  /\bdrop(?:ped)? out\b/i,
];

const COMPLETED_EDUCATION_PATTERNS = [/\bcompleted\b/i, /\bgraduated\b/i, /\bawarded\b/i];

const EDUCATION_SECTION_PATTERNS = [/\beducation\b/i, /\bacademic\b/i, /\bqualification(?:s)?\b/i];

const EXPERIENCE_SECTION_PATTERNS = [
  /\bwork experience\b/i,
  /\bprofessional experience\b/i,
  /\bemployment(?: history)?\b/i,
  /\bexperience\b/i,
  /\binternships?\b/i,
  /\bwork history\b/i,
];

const WORK_EVIDENCE_PATTERNS = [
  /\bintern(?:ship)?\b/i,
  /\bconsultant\b/i,
  /\btrainee\b/i,
  /\bfull[- ]?time\b/i,
  /\bpart[- ]?time\b/i,
  /\bfreelance\b/i,
  /\bcontract\b/i,
  /\bapprentice(?:ship)?\b/i,
  /\bemploy(?:ed|ment)\b/i,
];

const EDUCATION_CONTEXT_PATTERNS = [
  /\beducation\b/i,
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\bschool\b/i,
  /\bbachelor(?:'s)?\b/i,
  /\bb\.?\s?tech\b/i,
  /\bb\.?\s?e\b/i,
  /\bmaster(?:'s)?\b/i,
  /\bm\.?\s?tech\b/i,
  /\bmba\b/i,
  /\bmsc\b/i,
  /\bdegree\b/i,
  /\bcgpa\b/i,
  /\bgpa\b/i,
  /\bcoursework\b/i,
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeText(text = "") {
  return text.toLowerCase().replace(/[^\w+#./ -]/g, " ");
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countPhraseOccurrences(text = "", phrase = "") {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase).trim();

  if (!normalizedPhrase) {
    return 0;
  }

  const regex = new RegExp(`\\b${escapeRegExp(normalizedPhrase)}\\b`, "gi");
  return [...normalizedText.matchAll(regex)].length;
}

function titleCase(value = "") {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function hasPhrase(text, phrase) {
  const safePhrase = phrase.toLowerCase();
  return text.includes(safePhrase);
}

function normalizeSectionHeader(line = "") {
  const normalized = normalizeText(line).trim();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("work experience") || normalized.includes("professional experience")) {
    return "experience";
  }

  if (normalized === "profile" || normalized === "summary") {
    return "summary";
  }

  if (normalized.includes("project")) {
    return "projects";
  }

  if (normalized.includes("skill")) {
    return "skills";
  }

  if (normalized.includes("education") || normalized.includes("academic")) {
    return "education";
  }

  if (normalized.includes("contact")) {
    return "contact";
  }

  return SECTION_HEADERS.includes(normalized) ? normalized : "";
}

function splitIntoSections(text = "") {
  const sections = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    contact: [],
    other: [],
  };
  let currentSection = "other";

  text
    .split("\n")
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line) {
        return;
      }

      const normalizedSection = normalizeSectionHeader(line);
      if (normalizedSection) {
        currentSection = normalizedSection;
        return;
      }

      sections[currentSection].push(line);
    });

  return Object.fromEntries(
    Object.entries(sections).map(([key, lines]) => [key, lines.join("\n")]),
  );
}

function uniqueCaseInsensitive(values = []) {
  const seen = new Set();

  return values.filter((value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanSectionLine(line = "") {
  return String(line || "")
    .replace(/^[•*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSectionLines(sectionText = "", limit = 8) {
  return uniqueCaseInsensitive(
    sectionText
      .split("\n")
      .map(cleanSectionLine)
      .filter((line) => line.length >= 3),
  ).slice(0, limit);
}

function formatStructuredToken(value = "") {
  const normalized = cleanSectionLine(value)
    .replace(/^skills?\s*:\s*/i, "")
    .replace(/^technical skills?\s*:\s*/i, "")
    .trim();

  if (!normalized) {
    return "";
  }

  if (/^[A-Z0-9+#./-]{2,}$/.test(normalized)) {
    return normalized;
  }

  return normalized
    .split(/\s+/)
    .map((token) => {
      if (/^[A-Z0-9+#./-]{2,}$/.test(token)) {
        return token;
      }

      if (/^[a-z]{1,3}$/i.test(token) && token === token.toLowerCase()) {
        return token.toUpperCase();
      }

      return token[0]?.toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractStructuredSkills(sections, resumeText = "") {
  const sectionSkills = getSectionLines(sections.skills, 18)
    .flatMap((line) => {
      const normalizedLine = line.includes(":") ? line.split(":").slice(1).join(":") : line;
      return normalizedLine.split(/[|,;•]/g);
    })
    .flatMap((item) => item.split(/\s\/\s/g))
    .map((item) => item.replace(/\s*\/\s*/g, "/"))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 40)
    .filter((item) => item.split(/\s+/).length <= 4)
    .map(formatStructuredToken)
    .filter(Boolean);

  return uniqueCaseInsensitive([
    ...sectionSkills,
    ...extractSkills(resumeText),
    ...extractSoftSkills(resumeText),
  ]).slice(0, 24);
}

function collectLinesMatchingPatterns(text = "", patterns = [], limit = 8) {
  return uniqueCaseInsensitive(
    text
      .split("\n")
      .map(cleanSectionLine)
      .filter(Boolean)
      .filter((line) => patterns.some((pattern) => pattern.test(line))),
  ).slice(0, limit);
}

function extractEducationEntries(text = "", sections) {
  const educationSectionLines = getSectionLines(sections.education, 8);
  if (educationSectionLines.length) {
    return educationSectionLines;
  }

  const fallbackLines = collectLinesMatchingPatterns(text, EDUCATION_CONTEXT_PATTERNS, 8);
  if (fallbackLines.length) {
    return fallbackLines;
  }

  const fallbackEducation = extractEducation(text);
  return fallbackEducation.label !== "Not specified" ? [fallbackEducation.label] : [];
}

function extractExperienceEntries(text = "", sections) {
  const experienceSectionLines = getSectionLines(sections.experience, 8);
  if (experienceSectionLines.length) {
    return experienceSectionLines;
  }

  return uniqueCaseInsensitive(
    collectExperienceEvidenceLines(text).map(cleanSectionLine).filter(Boolean),
  ).slice(0, 8);
}

function extractProjectEntries(text = "", sections) {
  const projectSectionLines = getSectionLines(sections.projects, 8);
  if (projectSectionLines.length) {
    return projectSectionLines;
  }

  return uniqueCaseInsensitive(
    text
      .split("\n")
      .map(cleanSectionLine)
      .filter(Boolean)
      .filter((line) => /\b(project|capstone|thesis|research)\b/i.test(line)),
  ).slice(0, 8);
}

function extractTopKeywords(text, limit = 12) {
  const tokens = normalizeText(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function extractSkills(text = "") {
  const normalized = normalizeText(text);
  return skillLibrary.filter((skill) => hasPhrase(normalized, skill.toLowerCase()));
}

function extractSoftSkills(text = "") {
  const normalized = normalizeText(text);
  return SOFT_SKILLS.filter((skill) => hasPhrase(normalized, skill.toLowerCase()));
}

function cleanNameSource(value = "") {
  return value
    .replace(/^(name|candidate)\s*:\s*/i, "")
    .replace(/[|•]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/linkedin\.com\/\S+|github\.com\/\S+/gi, " ")
    .replace(
      /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?/g,
      " ",
    )
    .replace(/[,_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripRoleSuffix(candidate = "") {
  const tokens = candidate.split(/\s+/);
  const cutIndex = tokens.findIndex(
    (token, index) => index >= 2 && ROLE_TOKENS.has(token.toLowerCase()),
  );

  if (cutIndex === -1) {
    return candidate;
  }

  return tokens.slice(0, cutIndex).join(" ");
}

function stripLocationSuffix(candidate = "", fallbackCandidates = []) {
  const alignedFallback = fallbackCandidates.find((fallback) => {
    const safeFallback = fallback.toLowerCase();
    return safeFallback && candidate.toLowerCase().startsWith(`${safeFallback} `);
  });

  if (alignedFallback) {
    return alignedFallback;
  }

  const tokens = candidate.split(/\s+/);
  if (tokens.length <= 2) {
    return candidate;
  }

  while (
    tokens.length > 2 &&
    LOCATION_SUFFIX_TOKENS.has(tokens[tokens.length - 1].toLowerCase())
  ) {
    tokens.pop();
  }

  return tokens.join(" ");
}

function normalizeNameCandidate(value = "", fallbackCandidates = []) {
  const cleaned = stripLocationSuffix(
    stripRoleSuffix(cleanNameSource(value)),
    fallbackCandidates,
  )
    .replace(/[^a-zA-Z.' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
}

function looksLikeName(candidate = "") {
  if (!candidate) {
    return false;
  }

  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) {
    return false;
  }

  if (candidate.length < 5 || candidate.length > 40) {
    return false;
  }

  if (!tokens.every((token) => /^[A-Za-z][A-Za-z.'-]*$/.test(token))) {
    return false;
  }

  return !tokens.some((token) => NAME_BLOCKLIST.has(token.toLowerCase()) || ROLE_TOKENS.has(token.toLowerCase()));
}

function scoreNameCandidate(candidate = "", sourceWeight = 0) {
  if (!looksLikeName(candidate)) {
    return -1;
  }

  const tokens = candidate.split(/\s+/);
  let score = sourceWeight;

  if (tokens.length === 2 || tokens.length === 3) {
    score += 4;
  } else if (tokens.length === 4) {
    score += 2;
  }

  if (tokens.every((token) => token.length >= 2)) {
    score += 2;
  }

  if (!tokens.some((token) => /^[A-Z]+$/.test(token))) {
    score += 1;
  }

  return score;
}

function extractNameFromEmail(email = "") {
  const localPart = email.split("@")[0] || "";
  const candidate = normalizeNameCandidate(
    localPart
      .replace(/[._-]+/g, " ")
      .replace(/\d+/g, " ")
      .trim(),
  );

  return looksLikeName(candidate) ? titleCase(candidate) : "";
}

function extractNameFromFileName(fileName = "") {
  const candidate = normalizeNameCandidate(
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/\b(resume|cv|final|latest|updated|update|version|draft|copy)\b/gi, " ")
      .replace(/\d+/g, " ")
      .replace(/[_-]+/g, " ")
      .trim(),
  );

  return looksLikeName(candidate) ? titleCase(candidate) : "";
}

function inferName(text = "", email = "", fileName = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  const candidates = [];
  const emailCandidate = extractNameFromEmail(email);
  const fileNameCandidate = extractNameFromFileName(fileName);
  const fallbackCandidates = [emailCandidate, fileNameCandidate].filter(Boolean);

  lines.forEach((line, index) => {
    const segments = [line, ...line.split(/[|•]/g).map((segment) => segment.trim())].filter(Boolean);

    segments.forEach((segment) => {
      const normalizedCandidate = normalizeNameCandidate(segment, fallbackCandidates);
      candidates.push({
        value: normalizedCandidate,
        score: scoreNameCandidate(normalizedCandidate, 14 - index),
      });
    });
  });

  if (emailCandidate) {
    candidates.push({
      value: emailCandidate,
      score: scoreNameCandidate(emailCandidate, 8),
    });
  }

  if (fileNameCandidate) {
    candidates.push({
      value: fileNameCandidate,
      score: scoreNameCandidate(fileNameCandidate, 6),
    });
  }

  const bestCandidate = candidates
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)[0];

  return bestCandidate ? titleCase(bestCandidate.value) : "Candidate";
}

function extractPhone(text = "") {
  const match = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4,}/,
  );
  return match?.[0] || "Not found";
}

function extractEducation(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let educationWindow = 0;
  const matches = [];

  lines.forEach((line) => {
    if (EDUCATION_SECTION_PATTERNS.some((pattern) => pattern.test(line))) {
      educationWindow = 5;
    }

    const sectionBoost = educationWindow > 0 ? 3 : 0;
    if (educationWindow > 0) {
      educationWindow -= 1;
    }

    EDUCATION_RULES.forEach((rule) => {
      if (!rule.patterns.some((pattern) => pattern.test(line))) {
        return;
      }

      const isIncomplete = INCOMPLETE_EDUCATION_PATTERNS.some((pattern) => pattern.test(line));
      const isCompleted = COMPLETED_EDUCATION_PATTERNS.some((pattern) => pattern.test(line));

      matches.push({
        label: isIncomplete ? `${rule.label} (In Progress)` : rule.label,
        score: (isIncomplete ? rule.inProgressScore : rule.score) + sectionBoost + (isCompleted ? 1 : 0),
        baseScore: isIncomplete ? rule.inProgressScore : rule.score,
        completed: !isIncomplete,
      });
    });
  });

  if (!matches.length) {
    return { label: "Not specified", score: 4, hasCgpa: false };
  }

  const completedMatch = matches
    .filter((match) => match.completed)
    .sort((left, right) => right.baseScore - left.baseScore || right.score - left.score)[0];

  if (completedMatch) {
    return {
      label: completedMatch.label,
      score: completedMatch.baseScore,
      hasCgpa: /\b(?:cgpa|gpa|percentage)\b/i.test(text),
    };
  }

  const bestMatch = matches.sort(
    (left, right) => right.baseScore - left.baseScore || right.score - left.score,
  )[0];

  return {
    label: bestMatch.label,
    score: bestMatch.baseScore,
    hasCgpa: /\b(?:cgpa|gpa|percentage)\b/i.test(text),
  };
}

function isSectionBoundary(line = "") {
  const normalized = line.trim().toLowerCase();
  return SECTION_HEADERS.includes(normalized);
}

function lineHasWorkEvidence(line = "") {
  return WORK_EVIDENCE_PATTERNS.some((pattern) => pattern.test(line));
}

function lineIsEducationContext(line = "") {
  return EDUCATION_CONTEXT_PATTERNS.some((pattern) => pattern.test(line));
}

function collectExperienceEvidenceLines(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const evidenceLines = [];
  let insideExperienceSection = false;
  let nearbyWorkContext = 0;

  lines.forEach((line) => {
    if (EXPERIENCE_SECTION_PATTERNS.some((pattern) => pattern.test(line))) {
      insideExperienceSection = true;
      nearbyWorkContext = 1;
      return;
    }

    if (insideExperienceSection && isSectionBoundary(line)) {
      insideExperienceSection = false;
      nearbyWorkContext = 0;
      return;
    }

    const hasWorkEvidence = lineHasWorkEvidence(line);
    const isEducationContext = lineIsEducationContext(line);

    if (hasWorkEvidence && !isEducationContext) {
      nearbyWorkContext = 2;
    }

    if ((insideExperienceSection || nearbyWorkContext > 0 || hasWorkEvidence) && !isEducationContext) {
      evidenceLines.push(line);
    }

    if (nearbyWorkContext > 0) {
      nearbyWorkContext -= 1;
    }
  });

  return evidenceLines;
}

function inferYearsExperience(text = "") {
  const experienceLines = collectExperienceEvidenceLines(text);
  const experienceText = experienceLines.join("\n");

  const explicitMatches = [
    ...experienceText.matchAll(
      /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|work|internship)/gi,
    ),
    ...experienceText.matchAll(
      /(?:experience|work|internship)\s+(?:of\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi,
    ),
  ];
  const explicitYears = explicitMatches.length
    ? Math.max(...explicitMatches.map((match) => Number(match[1] || match[2])))
    : 0;

  const rangeMatches = [
    ...experienceText.matchAll(
      /\b(19\d{2}|20\d{2})\s*(?:-|–|to)\s*(present|current|19\d{2}|20\d{2})/gi,
    ),
  ];

  const currentYear = new Date().getFullYear();
  let totalRangeYears = 0;

  if (rangeMatches.length) {
    totalRangeYears = rangeMatches.reduce((sum, match) => {
      const start = Number(match[1]);
      const end = /present|current/i.test(match[2]) ? currentYear : Number(match[2]);
      const span = clamp(end - start, 0, 10);
      return sum + span;
    }, 0);
  }

  let years = clamp(Math.max(explicitYears, totalRangeYears), 0, 20);

  // Treat internship-only evidence conservatively so freshers are not overstated.
  const internshipOnly =
    experienceLines.length > 0 &&
    experienceLines.every((line) => /\bintern(?:ship)?\b/i.test(line) || /\b(19\d{2}|20\d{2})\b/.test(line));

  if (!experienceLines.length) {
    years = 0;
  } else if (internshipOnly && years < 2) {
    years = Math.min(years, 1);
  }

  if (years >= 6) {
    return {
      years,
      level: "Senior",
      note: "Inferred from work-history date ranges and role evidence. Education dates are ignored.",
    };
  }

  if (years >= 2) {
    return {
      years,
      level: "Mid",
      note: "Inferred from work-history date ranges and role evidence. Education dates are ignored.",
    };
  }

  return {
    years,
    level: years > 0 ? "Fresher / Early Career" : "Fresher",
    note: experienceLines.length
      ? "Only limited internship or early-career work evidence was found. Education dates are ignored."
      : "No clear work-history section was detected, so the profile is treated as fresher. Education dates are ignored.",
  };
}

function formatYearsExperience(years = 0) {
  if (Number.isInteger(years)) {
    return `${years}`;
  }

  return years.toFixed(1).replace(/\.0$/, "");
}

function scoreFormatting(text = "", hasContact) {
  const normalized = normalizeText(text);
  const sectionCount = SECTION_HEADERS.filter((header) => normalized.includes(header)).length;
  const bulletCount = (text.match(/^[•\-*]/gm) || []).length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const longLines = text.split("\n").filter((line) => line.length > 140).length;
  const tableLikeLines = text.split("\n").filter((line) => (line.match(/\|/g) || []).length >= 2).length;
  const denseSymbolLines = text
    .split("\n")
    .filter((line) => /[_=]{4,}|[•■▪]{4,}/.test(line)).length;

  let score = 0;
  score += hasContact ? 2 : 0;
  score += sectionCount >= 4 ? 2.5 : sectionCount >= 2 ? 1.5 : 0;
  score += bulletCount >= 5 ? 1.5 : bulletCount >= 2 ? 1 : 0;
  score += words >= 220 && words <= 900 ? 1.5 : words >= 120 ? 1 : 0;
  score += /\n\n/.test(text) ? 1 : 0;
  score += longLines <= 3 ? 1 : longLines <= 6 ? 0.5 : 0;
  score += tableLikeLines === 0 ? 0.5 : 0;
  score += denseSymbolLines === 0 ? 0.5 : 0;

  return Math.round(clamp(score, 0, 10));
}

function scoreReadability(text = "") {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const averageLineLength = lines.length
    ? lines.reduce((sum, line) => sum + line.length, 0) / lines.length
    : 0;
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length;
  const noisyLines = lines.filter((line) => line.length > 160).length;

  let score = 0;
  score += words >= 250 && words <= 700 ? 2 : words >= 150 && words <= 950 ? 1 : 0;
  score += averageLineLength >= 35 && averageLineLength <= 110 ? 1.5 : 0.5;
  score += paragraphBreaks >= 2 ? 1 : 0.5;
  score += noisyLines <= 2 ? 0.5 : 0;

  return Math.round(clamp(score, 0, 5));
}

function scoreProjectImpact(text = "", profile = null) {
  const normalized = normalizeText(text);
  const sections = splitIntoSections(text);
  const projectText = `${sections.projects}\n${sections.experience}`;
  const quantifiedHits = (
    projectText.match(
      /\b\d+%|\$\d+|\b\d+(?:\.\d+)?x\b|\b\d+\+?\s*(?:users|clients|customers|projects|features|queries|requests|hours|days|weeks|months)\b/gi,
    ) || []
  ).length;
  const actionHits = ACTION_VERBS.filter((verb) => normalized.includes(verb)).length;
  const technicalHits = profile
    ? profile.requiredSkills.filter((skill) => hasPhrase(normalized, skill.toLowerCase())).length
    : extractSkills(text).length;
  const hasProjects = normalized.includes("project") || Boolean(sections.projects.trim());

  let score = 0;
  score += quantifiedHits >= 4 ? 4 : quantifiedHits >= 2 ? 3 : quantifiedHits >= 1 ? 2 : 0;
  score += actionHits >= 5 ? 2.5 : actionHits >= 2 ? 1.5 : actionHits >= 1 ? 1 : 0;
  score += technicalHits >= 5 ? 2 : technicalHits >= 3 ? 1.5 : technicalHits >= 1 ? 1 : 0;
  score += hasProjects ? 1.5 : 0;

  return Math.round(clamp(score, 0, 10));
}

function scoreActionImpact(text = "") {
  const normalized = normalizeText(text);
  const actionHits = ACTION_VERBS.filter((verb) => normalized.includes(verb)).length;
  const quantifiedHits = (
    text.match(/\b\d+%|\$\d+|\b\d+(?:\.\d+)?x\b|\b\d+\+?\s*(?:users|clients|customers|features|requests|hours|days|weeks|months)\b/gi) || []
  ).length;

  let score = 0;
  score += actionHits >= 6 ? 5 : actionHits >= 4 ? 4 : actionHits >= 2 ? 2 : actionHits >= 1 ? 1 : 0;
  score += quantifiedHits >= 4 ? 5 : quantifiedHits >= 2 ? 3 : quantifiedHits >= 1 ? 2 : 0;

  return Math.round(clamp(score, 0, 10));
}

function scoreParsingQuality(text = "", formattingScore, readabilityScore) {
  const sectionCount = SECTION_HEADERS.filter((header) =>
    normalizeText(text).includes(header),
  ).length;
  const brokenTokens = (text.match(/\b[a-z]-\s+[a-z]\b/gi) || []).length;
  const tableLikeLines = text.split("\n").filter((line) => (line.match(/\|/g) || []).length >= 2).length;

  let score = 0;
  score += sectionCount >= 4 ? 4 : sectionCount >= 2 ? 2 : 0;
  score += formattingScore >= 7 ? 2 : formattingScore >= 5 ? 1 : 0;
  score += readabilityScore >= 4 ? 2 : readabilityScore >= 3 ? 1 : 0;
  score += brokenTokens === 0 ? 1 : 0;
  score += tableLikeLines === 0 ? 1 : 0;

  return Math.round(clamp(score, 0, 10));
}

function buildKeywordTarget(profile, jobDescription) {
  const targetMap = new Map();
  const addTargets = (values, weight) => {
    values.forEach((value) => {
      const keyword = String(value || "").trim();
      if (!keyword) {
        return;
      }
      targetMap.set(keyword, Math.max(weight, targetMap.get(keyword) || 0));
    });
  };

  const jdKeywords = jobDescription ? extractTopKeywords(jobDescription, 12) : [];
  const jdSkills = extractSkills(jobDescription);

  addTargets(profile.requiredSkills || [], 1.35);
  addTargets(profile.keywords || [], 1);
  addTargets(jdKeywords, 1.25);
  addTargets(jdSkills, 1.5);

  return [...targetMap.entries()].map(([keyword, weight]) => ({ keyword, weight }));
}

function scoreKeywordMatch(resumeText, profile, jobDescription = "") {
  const normalizedResume = normalizeText(resumeText);
  const sections = splitIntoSections(resumeText);
  const sectionText = [
    sections.summary,
    sections.skills,
    sections.experience,
    sections.projects,
  ]
    .join("\n")
    .toLowerCase();
  const targetKeywords = buildKeywordTarget(profile, jobDescription);
  const totalWeight = targetKeywords.reduce((sum, item) => sum + item.weight, 0) || 1;
  const matchedKeywords = [];
  const missingKeywords = [];
  let exactWeight = 0;
  let frequencyWeight = 0;
  let contextWeight = 0;

  targetKeywords.forEach(({ keyword, weight }) => {
    const occurrences = countPhraseOccurrences(normalizedResume, keyword);
    if (!occurrences) {
      missingKeywords.push(keyword);
      return;
    }

    matchedKeywords.push(keyword);
    exactWeight += weight;
    frequencyWeight += Math.min(occurrences, 2) / 2 * weight;
    if (hasPhrase(sectionText, keyword.toLowerCase())) {
      contextWeight += weight;
    }
  });

  const exactRatio = exactWeight / totalWeight;
  const frequencyRatio = frequencyWeight / totalWeight;
  const contextRatio = contextWeight / totalWeight;

  return {
    score: Math.round(
      clamp((exactRatio * 0.6 + frequencyRatio * 0.25 + contextRatio * 0.15) * 30, 0, 30),
    ),
    matchedKeywords: matchedKeywords.slice(0, 10),
    missingKeywords: missingKeywords.slice(0, 10),
  };
}

function scoreSkillsMatch(extractedSkills, profile, jobDescription = "", resumeText = "") {
  const jdSkills = extractSkills(jobDescription);
  const softSkills = unique([...extractSoftSkills(resumeText), ...extractSoftSkills(jobDescription)]);
  const requiredSkills = unique([...profile.requiredSkills, ...jdSkills]);
  const optionalSkills = unique([
    ...(profile.focusAreas || []),
    ...softSkills,
  ]).filter((skill) => !requiredSkills.includes(skill));
  const matchedRequired = requiredSkills.filter((skill) => extractedSkills.includes(skill));
  const matchedOptional = optionalSkills.filter(
    (skill) => extractedSkills.includes(skill) || softSkills.includes(skill),
  );
  const requiredRatio = requiredSkills.length
    ? matchedRequired.length / requiredSkills.length
    : 1;
  const optionalRatio = optionalSkills.length
    ? matchedOptional.length / optionalSkills.length
    : 1;
  const softSkillScore =
    softSkills.length >= 3 ? 2 : softSkills.length >= 1 ? 1 : 0;

  return {
    score: Math.round(
      clamp(requiredRatio * 14 + optionalRatio * 4 + softSkillScore + Math.min(matchedRequired.length, 2), 0, 20),
    ),
    matchedSkills: unique([...matchedRequired, ...matchedOptional]),
    missingSkills: requiredSkills.filter((skill) => !matchedRequired.includes(skill)),
  };
}

function scoreExperience(experience, profile, resumeText = "") {
  const sections = splitIntoSections(resumeText);
  const experienceText = `${sections.experience}\n${sections.projects}`;
  const normalizedExperience = normalizeText(experienceText);
  const fullTimeEvidence =
    /\bfull[- ]?time\b|\bemploy(?:ed|ment)\b|\bassociate\b|\bexecutive\b|\bofficer\b|\bconsultant\b|\bspecialist\b|\bcoordinator\b|\bteacher\b|\bnurse\b|\bdoctor\b|\blawyer\b|\badvocate\b|\bengineer\b|\bdeveloper\b/i.test(
      experienceText,
    );
  const internshipEvidence = /\bintern(?:ship)?\b|\btrainee\b/i.test(experienceText);
  const roleEvidenceCount = profile.requiredSkills.filter((skill) =>
    hasPhrase(normalizedExperience, skill.toLowerCase()),
  ).length;
  const keywordEvidenceCount = profile.keywords.filter((keyword) =>
    hasPhrase(normalizedExperience, keyword.toLowerCase()),
  ).length;

  let yearsScore = 0;
  if (experience.years >= profile.minYears + 2) {
    yearsScore = 8;
  } else if (experience.years >= profile.minYears) {
    yearsScore = 7;
  } else if (experience.years > 0) {
    yearsScore = 5;
  } else if (experienceText.trim()) {
    yearsScore = 3;
  }

  const typeScore = fullTimeEvidence ? 3 : internshipEvidence ? 2 : experienceText.trim() ? 1 : 0;
  const relevanceScore =
    roleEvidenceCount >= 4 || keywordEvidenceCount >= 2
      ? 4
      : roleEvidenceCount >= 2 || keywordEvidenceCount >= 1
        ? 3
        : experienceText.trim()
          ? 1
          : 0;

  return Math.round(clamp(yearsScore + typeScore + relevanceScore, 0, 15));
}

function scoreEducationMatch(education, profile, resumeText = "") {
  const relevantPatterns =
    Array.isArray(profile.educationPatterns) && profile.educationPatterns.length
      ? profile.educationPatterns
      : profile.role === "Data Analyst"
        ? ROLE_EDUCATION_PATTERNS.analytics
        : ROLE_EDUCATION_PATTERNS.technical;
  const relevantField = relevantPatterns.some((pattern) => pattern.test(resumeText));

  let score = clamp(education.score, 0, 8);
  score += relevantField ? 1.5 : 0;
  score += education.hasCgpa ? 0.5 : 0;

  return Math.round(clamp(score, 0, 10));
}

function scoreRoleMatch({
  extractedSkills,
  profile,
  resumeText,
  experience,
  education,
  jobDescription,
  formattingScore,
  readabilityScore,
}) {
  const keywordMatch = scoreKeywordMatch(resumeText, profile, jobDescription);
  const skillsMatch = scoreSkillsMatch(
    extractedSkills,
    profile,
    jobDescription,
    resumeText,
  );
  const experienceScore = scoreExperience(experience, profile, resumeText);
  const educationFit = scoreEducationMatch(education, profile, resumeText);
  const projectQuality = scoreProjectImpact(resumeText, profile);
  const overall = clamp(
    keywordMatch.score +
      skillsMatch.score +
      experienceScore +
      projectQuality +
      educationFit +
      formattingScore +
      readabilityScore,
    0,
    100,
  );

  return {
    role: profile.role,
    summary: profile.summary,
    match: Math.round(overall),
    focusAreas: profile.focusAreas,
    improvementPlan: profile.improvementPlan,
    careerRecommendations: profile.careerRecommendations,
    missingSkills: skillsMatch.missingSkills.slice(0, 4),
    matchedSkills: skillsMatch.matchedSkills,
    keywordHits: keywordMatch.matchedKeywords,
    roleAlignmentScore: Math.round(overall),
  };
}

function buildSuggestions({
  breakdown,
  missingSkills,
  resumeText,
  extractedUser,
  jdComparison,
  diagnostics,
}) {
  const suggestions = [];

  if (breakdown.keywordMatch < 18) {
    suggestions.push(
      "Mirror the strongest job-description keywords in your summary, skills, and project bullets.",
    );
  }

  if (breakdown.skillsMatch < 16 && missingSkills.length) {
    suggestions.push(
      `Close the biggest skill gaps first: ${missingSkills.slice(0, 3).join(", ")}.`,
    );
  }

  if (breakdown.projectsImpact < 7) {
    suggestions.push("Add quantified achievements with metrics, scale, or business impact.");
  }

   if ((diagnostics?.actionImpact || 0) < 6) {
    suggestions.push("Use stronger action verbs like developed, implemented, optimized, and reduced.");
  }

  if (breakdown.formatting < 7) {
    suggestions.push(
      "Use clearer section headers, tighter bullets, and a cleaner one-page structure for ATS readability.",
    );
  }

  if (breakdown.readability < 4) {
    suggestions.push("Trim dense text, improve spacing, and keep the resume concise enough for a quick ATS parse.");
  }

  if ((diagnostics?.atsParsing || 0) < 7) {
    suggestions.push("Avoid table-like layouts, broken text blocks, and inconsistent headers so ATS parsing stays accurate.");
  }

  if (extractedUser.phone === "Not found") {
    suggestions.push("Include a phone number in the header to improve recruiter reach-out readiness.");
  }

  if (!/summary|profile/i.test(resumeText)) {
    suggestions.push("Add a crisp 2-3 line summary aligned to your strongest target role.");
  }

  if (jdComparison && jdComparison.score < 70) {
    suggestions.push(
      `Tailor your resume more closely to the job description. Missing high-signal terms include ${jdComparison.missingKeywords
        .slice(0, 4)
        .join(", ")}.`,
    );
  }

  return unique(suggestions).slice(0, 6);
}

function buildCareerRecommendations(bestRole, missingSkills, experienceLevel) {
  const recommendations = [...bestRole.careerRecommendations];
  const entryLevelLabel =
    bestRole.entryLevelLabel || `junior ${bestRole.role.toLowerCase()} opening`;

  if (missingSkills.length) {
    recommendations.push(
      `Prioritize ${missingSkills.slice(0, 2).join(" + ")} to improve fit for ${bestRole.role} roles.`,
    );
  }

  recommendations.push(
    experienceLevel === "Fresher"
      ? `Target internships, trainee roles, or ${entryLevelLabel} opportunities with evidence-led applications.`
      : `Target ${bestRole.role.toLowerCase()} opportunities where your strongest evidence already aligns with role expectations.`,
  );

  return unique(recommendations).slice(0, 4);
}

function compareWithJobDescription(resumeText, jobDescription) {
  const jdKeywords = unique([...extractTopKeywords(jobDescription, 12), ...extractSkills(jobDescription)]);
  const normalizedResume = normalizeText(resumeText);
  const matchedKeywords = jdKeywords.filter((keyword) =>
    hasPhrase(normalizedResume, keyword.toLowerCase()),
  );

  const ratio = jdKeywords.length ? matchedKeywords.length / jdKeywords.length : 0;

  return {
    score: Math.round(clamp(ratio * 100, 0, 100)),
    matchedKeywords: matchedKeywords.slice(0, 8),
    missingKeywords: jdKeywords.filter((keyword) => !matchedKeywords.includes(keyword)).slice(0, 8),
  };
}

function deriveStrengths(breakdown, jobMatches) {
  const strengths = [];

  if (breakdown.keywordMatch >= 24) {
    strengths.push("Strong keyword alignment");
  }
  if (breakdown.skillsMatch >= 16) {
    strengths.push("Strong core skill alignment");
  }
  if (breakdown.projectsImpact >= 7) {
    strengths.push("Good quantified impact");
  }
  if (breakdown.formatting >= 8) {
    strengths.push("ATS-friendly structure");
  }
  if (breakdown.readability >= 4) {
    strengths.push("Readable and concise resume flow");
  }
  if (jobMatches[0]?.match >= 75) {
    strengths.push(`Clear fit for ${jobMatches[0].role}`);
  }

  return strengths.length ? strengths : ["Solid baseline resume structure"];
}

function buildScoreLabel(score) {
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

function buildSectionScores(breakdown) {
  const skills = clamp(
    Math.round((breakdown.keywordMatch / 30) * 24 + (breakdown.skillsMatch / 20) * 16),
    0,
    40,
  );
  const projects = clamp(Math.round((breakdown.projectsImpact / 10) * 20), 0, 20);
  const experience = clamp(Math.round((breakdown.experience / 15) * 15), 0, 15);
  const education = clamp(Math.round((breakdown.education / 10) * 10), 0, 10);
  const formatting = clamp(
    Math.round((breakdown.formatting / 10) * 11 + (breakdown.readability / 5) * 4),
    0,
    15,
  );

  return {
    skills,
    projects,
    experience,
    education,
    formatting,
  };
}

function buildWhyScoreIsLow({
  breakdown,
  missingSkills,
  jdComparison,
  extractedUser,
  diagnostics,
}) {
  const reasons = [];

  if (breakdown.keywordMatch < 20) {
    reasons.push("Keyword match is weak, so ATS is not seeing enough target-role terms.");
  }

  if (breakdown.skillsMatch < 17) {
    reasons.push(
      missingSkills.length
        ? `Important skills are missing or not explicit, including ${missingSkills.slice(0, 3).join(", ")}.`
        : "Core skills are not stated clearly enough for ATS parsing.",
    );
  }

  if (breakdown.projectsImpact < 7) {
    reasons.push("Project and experience bullets do not show enough measurable achievements.");
  }

  if ((diagnostics?.actionImpact || 0) < 6) {
    reasons.push("Action verbs and quantified impact are too weak, so achievements look less convincing.");
  }

  if (breakdown.formatting < 7) {
    reasons.push("Formatting and section structure are reducing ATS readability.");
  }

  if (breakdown.readability < 4) {
    reasons.push("Resume length, spacing, or line density is making the document harder to scan quickly.");
  }

  if (breakdown.experience < 10) {
    reasons.push("Work or internship evidence is limited or not clearly presented in an experience section.");
  }

  if (breakdown.education < 7) {
    reasons.push("Education details are incomplete, unclear, or still in progress.");
  }

  if (jdComparison && jdComparison.score < 70) {
    reasons.push("The resume is not tailored closely enough to the pasted job description.");
  }

  if ((diagnostics?.atsParsing || 0) < 7) {
    reasons.push("The resume structure is not being parsed cleanly enough by ATS-friendly rules.");
  }

  if (extractedUser.phone === "Not found" || extractedUser.email === "Not found") {
    reasons.push("Header contact details are incomplete, which weakens resume completeness.");
  }

  return reasons.slice(0, 4);
}

function buildHowToReachNinety({
  breakdown,
  missingSkills,
  jdComparison,
  resumeText,
  extractedUser,
  diagnostics,
}) {
  const actions = [];

  if (missingSkills.length) {
    actions.push(`Add more keywords like ${missingSkills.slice(0, 3).join(", ")}.`);
  }

  if (breakdown.projectsImpact < 8) {
    actions.push("Include measurable achievements with numbers, percentages, scale, or business impact.");
  }

  if ((diagnostics?.actionImpact || 0) < 7) {
    actions.push("Rewrite weaker bullets with action-first language such as developed, delivered, optimized, and improved.");
  }

  if (breakdown.keywordMatch < 24) {
    actions.push("Mirror target job keywords across the summary, skills, experience, and project sections.");
  }

  if (breakdown.formatting < 8) {
    actions.push("Use clearer section headers and tighter bullet formatting for better ATS parsing.");
  }

  if (breakdown.readability < 4) {
    actions.push("Keep the resume to a tighter one-page fresher format or a clean one-to-two page experienced format.");
  }

  if (breakdown.experience < 12) {
    actions.push("Group internships, freelance work, and major projects under a clear experience section with dates and outcomes.");
  }

  if (!/summary|profile/i.test(resumeText)) {
    actions.push("Add a short summary aligned to your target role and strongest skills.");
  }

  if (jdComparison && jdComparison.missingKeywords.length) {
    actions.push(
      `Tailor the resume to the job description by adding terms like ${jdComparison.missingKeywords
        .slice(0, 3)
        .join(", ")}.`,
    );
  }

  if ((diagnostics?.atsParsing || 0) < 7) {
    actions.push("Remove table-style layouts or broken formatting patterns that confuse ATS parsers.");
  }

  if (extractedUser.phone === "Not found") {
    actions.push("Add a phone number to the resume header.");
  }

  return unique(actions).slice(0, 5);
}

export function parseStructuredResume({ resumeText, fileName = "Resume" }) {
  const sections = splitIntoSections(resumeText);
  const emailMatch = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.[0];
  const phone = extractPhone(resumeText);
  const experience = inferYearsExperience(resumeText);
  const education = extractEducation(resumeText);
  const extractedSkills = extractStructuredSkills(sections, resumeText);
  const detectedSections = Object.entries(sections)
    .filter(([key, value]) => key !== "other" && value.trim())
    .map(([key]) => key);

  return {
    fileName,
    resumeWordCount: resumeText.trim().split(/\s+/).filter(Boolean).length,
    previewText: resumeText.trim().slice(0, 600),
    extractedUser: {
      name: inferName(resumeText, emailMatch || "", fileName),
      email: emailMatch || "Not found",
      phone,
      experienceLevel: experience.level,
      yearsExperience: experience.years,
      yearsExperienceDisplay: formatYearsExperience(experience.years),
      experienceNote: experience.note,
      educationLevel: education.label,
    },
    extractedSkills,
    topKeywords: uniqueCaseInsensitive([
      ...extractedSkills,
      ...extractTopKeywords(
        [sections.skills, sections.summary, sections.projects, sections.experience, resumeText]
          .filter(Boolean)
          .join("\n"),
        12,
      ).map(formatStructuredToken),
    ]).slice(0, 16),
    sections: {
      summary: getSectionLines(sections.summary, 4),
      education: extractEducationEntries(resumeText, sections),
      experience: extractExperienceEntries(resumeText, sections),
      projects: extractProjectEntries(resumeText, sections),
    },
    metadata: {
      detectedSections,
    },
  };
}

export function analyzeResume({ resumeText, jobDescription = "", fileName = "Resume" }) {
  const normalizedText = normalizeText(resumeText);
  const emailMatch = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.[0];
  const phone = extractPhone(resumeText);
  const experience = inferYearsExperience(resumeText);
  const education = extractEducation(resumeText);
  const extractedSkills = extractSkills(resumeText);
  const formatting = scoreFormatting(resumeText, Boolean(emailMatch || phone !== "Not found"));
  const readability = scoreReadability(resumeText);
  const actionImpact = scoreActionImpact(resumeText);
  const atsParsing = scoreParsingQuality(resumeText, formatting, readability);

  const extractedUser = {
    name: inferName(resumeText, emailMatch || "", fileName),
    email: emailMatch || "Not found",
    phone,
    experienceLevel: experience.level,
    yearsExperience: experience.years,
    yearsExperienceDisplay: formatYearsExperience(experience.years),
    experienceNote: experience.note,
    educationLevel: education.label,
  };

  const roleMatches = jobProfiles
    .map((profile) =>
      scoreRoleMatch({
        extractedSkills,
        profile,
        resumeText,
        experience,
        education,
        jobDescription,
        formattingScore: formatting,
        readabilityScore: readability,
      }),
    )
    .sort((left, right) => right.match - left.match);

  const bestRole = roleMatches[0];
  const bestProfile = jobProfiles.find((profile) => profile.role === bestRole.role);
  const keywordMatch = scoreKeywordMatch(resumeText, bestProfile, jobDescription);
  const skillsMatch = scoreSkillsMatch(extractedSkills, bestProfile, jobDescription, resumeText);
  const projectsImpact = scoreProjectImpact(resumeText, bestProfile);
  const experienceScore = scoreExperience(experience, bestProfile, resumeText);
  const educationScore = scoreEducationMatch(education, bestProfile, resumeText);
  const jdComparison = jobDescription.trim()
    ? compareWithJobDescription(resumeText, jobDescription)
    : null;

  const breakdown = {
    keywordMatch: keywordMatch.score,
    skillsMatch: skillsMatch.score,
    experience: experienceScore,
    projectsImpact,
    education: educationScore,
    formatting,
    readability,
  };
  const sectionScores = buildSectionScores(breakdown);

  const atsScore = clamp(
    sectionScores.skills +
      sectionScores.projects +
      sectionScores.experience +
      sectionScores.education +
      sectionScores.formatting,
    0,
    100,
  );

  const diagnostics = {
    atsParsing,
    actionImpact,
    roleAlignment: bestRole.match,
  };

  const suggestions = buildSuggestions({
    breakdown,
    missingSkills: bestRole.missingSkills,
    resumeText: normalizedText,
    extractedUser,
    jdComparison,
    diagnostics,
  });

  return {
    fileName,
    atsScore,
    scoreLabel: buildScoreLabel(atsScore),
    breakdown,
    sectionScores,
    extractedUser,
    extractedSkills,
    missingSkills: bestRole.missingSkills,
    suggestions,
    whyScoreIsLow: buildWhyScoreIsLow({
      breakdown,
      missingSkills: bestRole.missingSkills,
      jdComparison,
      extractedUser,
      diagnostics,
    }),
    howToReachNinety: buildHowToReachNinety({
      breakdown,
      missingSkills: bestRole.missingSkills,
      jdComparison,
      resumeText: normalizedText,
      extractedUser,
      diagnostics,
    }),
    careerRecommendations: buildCareerRecommendations(
      bestRole,
      bestRole.missingSkills,
      extractedUser.experienceLevel,
    ),
    roleSpecificPlan: bestRole.improvementPlan,
    jobMatches: roleMatches.slice(0, 5),
    jdComparison,
    diagnostics,
    strengths: deriveStrengths(breakdown, roleMatches),
    topKeywords: unique([
      ...keywordMatch.matchedKeywords,
      ...extractTopKeywords(resumeText, 8),
    ]).slice(0, 10),
    radarData: [
      { metric: "Keywords", value: breakdown.keywordMatch },
      { metric: "Skills", value: breakdown.skillsMatch },
      { metric: "Experience", value: breakdown.experience },
      { metric: "Projects", value: breakdown.projectsImpact },
      { metric: "Education", value: breakdown.education },
      { metric: "Format", value: breakdown.formatting },
      { metric: "Readability", value: breakdown.readability },
    ],
    resumeWordCount: resumeText.trim().split(/\s+/).filter(Boolean).length,
  };
}
