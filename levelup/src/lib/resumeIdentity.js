export function normalizeResumeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isResumeOwnedByLoggedInUser(accountName, resumeName) {
  const normalizedAccount = normalizeResumeName(accountName);
  const normalizedResume = normalizeResumeName(resumeName);

  if (!normalizedAccount || !normalizedResume || normalizedResume === "not found") {
    return false;
  }

  return normalizedAccount === normalizedResume;
}
