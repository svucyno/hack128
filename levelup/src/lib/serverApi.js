export const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

export async function postServerJson(path, { body, token }) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
