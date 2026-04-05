import { apiBaseUrl } from "../lib/serverApi";

async function requestMl(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function postMl(path, body) {
  return requestMl(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function getMlStatus() {
  return requestMl("/ml/status");
}

export function parseResumeMl({ resumeText, fileName = "Resume" }) {
  return postMl("/ml/resume/parse", {
    resumeText,
    fileName,
  });
}

export function scoreResumeAtsMl({ resumeText, jobDescription }) {
  return postMl("/ml/ats/score", {
    resumeText,
    jobDescription,
  });
}

export function predictRolesMl({ skills = [], education = "", interests = [] }) {
  return postMl("/ml/roles/predict", {
    skills,
    education,
    interests,
  });
}

export function analyzeSkillGapMl({ userSkills = [], targetRole }) {
  return postMl("/ml/skills/gap", {
    userSkills,
    targetRole,
  });
}

export function matchJobsMl({ resumeText, targetRoles = [], location = "" }) {
  return postMl("/ml/jobs/match", {
    resumeText,
    targetRoles,
    location,
  });
}

export function predictPerformanceMl(payload) {
  return postMl("/ml/performance/predict", payload);
}

export function recommendCoursesMl({
  targetRole = "",
  userSkills = [],
  missingSkills = [],
}) {
  return postMl("/ml/recommendations/courses", {
    targetRole,
    userSkills,
    missingSkills,
  });
}
