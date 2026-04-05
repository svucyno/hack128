const mlServiceBaseUrl =
  (process.env.ML_SERVICE_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

async function requestMl(path, { method = "POST", body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${mlServiceBaseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.detail || payload?.error || `ML request failed with status ${response.status}.`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("ML service request timed out.");
      timeoutError.status = 504;
      throw timeoutError;
    }

    if (error instanceof Error && error.status) {
      throw error;
    }

    const requestError = new Error(
      error?.message || "Could not reach the ML service.",
    );
    requestError.status = 503;
    throw requestError;
  } finally {
    clearTimeout(timeout);
  }
}

export function getMlServiceBaseUrl() {
  return mlServiceBaseUrl;
}

export function getMlServiceStatus() {
  return requestMl("/health", { method: "GET" });
}

export function parseResumeMl(body) {
  return requestMl("/resume/parse", { body });
}

export function scoreAtsMl(body) {
  return requestMl("/ats/score", { body });
}

export function predictRolesMl(body) {
  return requestMl("/roles/predict", { body });
}

export function analyzeSkillGapMl(body) {
  return requestMl("/skills/gap", { body });
}

export function matchJobsMl(body) {
  return requestMl("/jobs/match", { body });
}

export function predictPerformanceMl(body) {
  return requestMl("/performance/predict", { body });
}

export function recommendCoursesMl(body) {
  return requestMl("/recommendations/courses", { body });
}
