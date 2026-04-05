import { GoogleGenAI } from "@google/genai";

const VIDEO_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
    },
    studyNotes: {
      type: "array",
      items: { type: "string" },
    },
    topics: {
      type: "array",
      items: { type: "string" },
    },
    sourceName: { type: "string" },
  },
  required: ["title", "summary", "keyPoints", "studyNotes", "topics", "sourceName"],
};

let cachedGeminiKey = "";
let cachedGeminiClient = null;

export function getVideoSummarizerEngineStatus() {
  const runtime = getGeminiRuntime();

  return {
    aiEnabled: runtime.aiEnabled,
    provider: runtime.provider,
    model: runtime.model,
  };
}

export async function runVideoSummarizer({ videoUrl }) {
  const normalizedUrl = normalizeHttpUrl(videoUrl);
  if (!normalizedUrl) {
    throw new Error("A valid public video URL is required.");
  }

  const metadata = await fetchVideoMetadata(normalizedUrl);
  const runtime = getGeminiRuntime();
  let warning = "";
  let summary = buildFallbackVideoSummary({
    videoUrl: normalizedUrl,
    metadata,
  });
  let provider = "Built-in video brief";
  let model = "fallback";

  if (runtime.aiEnabled) {
    try {
      const geminiSummary = await generateGeminiVideoSummary({
        client: runtime.client,
        model: runtime.model,
        videoUrl: normalizedUrl,
        metadata,
      });

      summary = normalizeVideoSummary(geminiSummary, summary);
      provider = "Gemini";
      model = runtime.model;
    } catch (error) {
      warning =
        error?.message ||
        "Gemini could not summarize the video link, so a metadata-based fallback summary was used.";
    }
  } else {
    warning =
      "GEMINI_API_KEY is missing, so a metadata-based fallback summary was used for this video link.";
  }

  return {
    warning,
    provider,
    model,
    metadata,
    summary,
  };
}

function getGeminiRuntime() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const model =
    !process.env.GEMINI_MODEL || process.env.GEMINI_MODEL === "gemini-2.0-flash"
      ? "gemini-2.5-flash"
      : process.env.GEMINI_MODEL;

  if (!apiKey) {
    cachedGeminiKey = "";
    cachedGeminiClient = null;
    return {
      aiEnabled: false,
      client: null,
      provider: "Built-in video brief",
      model: "fallback",
    };
  }

  if (!cachedGeminiClient || cachedGeminiKey !== apiKey) {
    cachedGeminiKey = apiKey;
    cachedGeminiClient = new GoogleGenAI({ apiKey });
  }

  return {
    aiEnabled: true,
    client: cachedGeminiClient,
    provider: "Gemini",
    model,
  };
}

async function generateGeminiVideoSummary({
  client,
  model,
  videoUrl,
  metadata,
}) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are the LevelUp Video Brief assistant.",
              "Summarize the video behind the provided public URL.",
              "Use the URL context retrieval tool to inspect the page before summarizing.",
              "If the page does not expose full video content, rely on explicit metadata only and do not invent specifics.",
              "The summary must stay grounded in the linked source.",
              "Study notes should tell the learner what to focus on while watching.",
              "Topics must be short labels, not sentences.",
              "Return only valid JSON with this shape:",
              JSON.stringify(
                {
                  title: "string",
                  summary: "string",
                  keyPoints: ["string"],
                  studyNotes: ["string"],
                  topics: ["string"],
                  sourceName: "string",
                },
                null,
                2,
              ),
              "",
              `Video URL: ${videoUrl}`,
              `Detected source: ${metadata.sourceName || "Unknown source"}`,
              `Detected title: ${metadata.title || "Unknown title"}`,
              `Detected description: ${metadata.description || "No description available"}`,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      tools: [{ urlContext: {} }],
      temperature: 0.2,
    },
  });

  return parseJsonResponse(response?.text);
}

async function fetchVideoMetadata(videoUrl) {
  const url = new URL(videoUrl);
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const base = {
    url: videoUrl,
    host,
    sourceName: detectSourceName(host),
    title: "",
    description: "",
    author: "",
  };

  const oEmbedMetadata = await fetchOEmbedMetadata(videoUrl, host);
  if (oEmbedMetadata) {
    return {
      ...base,
      ...oEmbedMetadata,
      sourceName: oEmbedMetadata.sourceName || base.sourceName,
    };
  }

  const pageMetadata = await fetchHtmlMetadata(videoUrl);
  if (pageMetadata) {
    return {
      ...base,
      ...pageMetadata,
      sourceName: pageMetadata.sourceName || base.sourceName,
    };
  }

  return {
    ...base,
    title: inferTitleFromUrl(url),
    description: "",
  };
}

async function fetchOEmbedMetadata(videoUrl, host) {
  const endpoint =
    host.includes("youtube") || host === "youtu.be"
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
      : host.includes("vimeo")
        ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`
        : "";

  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return {
      title: truncateText(payload?.title || "", 140),
      description: truncateText(
        `${payload?.title || ""}${payload?.author_name ? ` by ${payload.author_name}` : ""}`,
        240,
      ),
      author: truncateText(payload?.author_name || "", 80),
      sourceName: truncateText(payload?.provider_name || "", 60),
    };
  } catch {
    return null;
  }
}

async function fetchHtmlMetadata(videoUrl) {
  try {
    const response = await fetch(videoUrl, {
      method: "GET",
      headers: {
        "User-Agent": "LevelUpVideoBrief/1.0 (+https://levelup.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    if (!html) {
      return null;
    }

    return {
      title: truncateText(
        extractMetaContent(html, "property", "og:title") ||
          extractTagText(html, "title"),
        140,
      ),
      description: truncateText(
        extractMetaContent(html, "property", "og:description") ||
          extractMetaContent(html, "name", "description"),
        300,
      ),
      sourceName: truncateText(
        extractMetaContent(html, "property", "og:site_name"),
        60,
      ),
    };
  } catch {
    return null;
  }
}

function buildFallbackVideoSummary({ videoUrl, metadata }) {
  const title = truncateText(
    metadata.title || inferTitleFromUrl(new URL(videoUrl)) || "Video Brief",
    120,
  );
  const summarySource = metadata.description || metadata.title || title;
  const sourceName = metadata.sourceName || detectSourceName(metadata.host || "");
  const topicSeed = extractTopics(`${metadata.title}\n${metadata.description}`).slice(0, 5);

  return {
    title,
    summary: truncateText(
      metadata.description
        ? `This video appears to focus on ${summarySource}. Use the link to review the source and confirm the main explanations, examples, and takeaways.`
        : `This public video link points to ${title}. The fallback summary is based on visible metadata only, so use the source page for the full context.`,
      520,
    ),
    keyPoints: uniqueStrings([
      metadata.title ? `Primary topic: ${metadata.title}` : "",
      metadata.author ? `Likely creator or channel: ${metadata.author}` : "",
      metadata.description
        ? truncateText(metadata.description, 180)
        : "Review the source page to identify the video's main concepts.",
      `Source platform: ${sourceName || "Public video page"}`,
    ]).slice(0, 6),
    studyNotes: uniqueStrings([
      `Watch the video and write the main idea in one sentence.`,
      `Capture 3 practical takeaways related to ${topicSeed[0] || "the video topic"}.`,
      `Note one example, workflow, or explanation you can reuse later.`,
      `Compare the video with your current roadmap or learning goal before moving on.`,
    ]).slice(0, 6),
    topics: topicSeed.length ? topicSeed : ["Video topic", "Key explanation"],
    sourceName: sourceName || "Public video source",
  };
}

function normalizeVideoSummary(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};

  return {
    title: truncateText(source.title || safeFallback.title || "Video Brief", 120),
    summary: truncateText(source.summary || safeFallback.summary || "", 560),
    keyPoints: normalizeStringArray(
      hasOwn(source, "keyPoints") ? source.keyPoints : safeFallback.keyPoints,
      8,
      220,
    ),
    studyNotes: normalizeStringArray(
      hasOwn(source, "studyNotes") ? source.studyNotes : safeFallback.studyNotes,
      8,
      220,
    ),
    topics: normalizeStringArray(
      hasOwn(source, "topics") ? source.topics : safeFallback.topics,
      8,
      80,
    ),
    sourceName: truncateText(
      source.sourceName || safeFallback.sourceName || "Public video source",
      60,
    ),
  };
}

function normalizeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function detectSourceName(host) {
  if (host.includes("youtube") || host === "youtu.be") {
    return "YouTube";
  }
  if (host.includes("vimeo")) {
    return "Vimeo";
  }
  if (host.includes("loom")) {
    return "Loom";
  }
  if (host.includes("drive.google")) {
    return "Google Drive";
  }
  if (host.includes("udemy")) {
    return "Udemy";
  }
  if (host.includes("coursera")) {
    return "Coursera";
  }

  return host ? host.replace(/\.[a-z]{2,}$/i, "") : "Public video source";
}

function inferTitleFromUrl(url) {
  const segments = uniqueStrings(url.pathname.split("/").map((part) => decodeURIComponentSafe(part)));
  const lastSegment = segments[segments.length - 1] || url.searchParams.get("v") || "";
  return formatSlug(lastSegment);
}

function extractMetaContent(html, attributeName, attributeValue) {
  const regex = new RegExp(
    `<meta[^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]*>`,
    "i",
  );

  return decodeHtmlEntities(html.match(regex)?.[1] || html.match(reverseRegex)?.[1] || "");
}

function extractTagText(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  return decodeHtmlEntities(html.match(regex)?.[1] || "").replace(/\s+/g, " ").trim();
}

function parseJsonResponse(rawText) {
  const normalized = String(rawText || "").trim();
  if (!normalized) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const fenced = normalized.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("Gemini returned a non-JSON response.");
  }
}

function normalizeStringArray(values, maxItems, maxLength) {
  return uniqueStrings(Array.isArray(values) ? values : [])
    .map((value) => truncateText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function extractTopics(value = "") {
  const cleaned = String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .toLowerCase();

  const stopWords = new Set([
    "about",
    "after",
    "again",
    "also",
    "and",
    "are",
    "but",
    "can",
    "for",
    "from",
    "how",
    "into",
    "just",
    "more",
    "that",
    "the",
    "this",
    "with",
    "your",
    "video",
  ]);

  const counts = new Map();
  cleaned
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([word]) => formatSlug(word));
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target || {}, key);
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

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function formatSlug(value) {
  const cleaned = String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
