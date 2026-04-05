import { GoogleGenAI } from "@google/genai";

const DOCUMENT_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
    },
    topics: {
      type: "array",
      items: { type: "string" },
    },
    readingTimeMinutes: { type: "number" },
  },
  required: ["title", "summary", "keyPoints", "topics", "readingTimeMinutes"],
};

let cachedGeminiKey = "";
let cachedGeminiClient = null;

export function getDocumentSummarizerEngineStatus() {
  const engine = getGeminiRuntime();
  return {
    aiEnabled: engine.aiEnabled,
    provider: engine.provider,
    model: engine.model,
  };
}

export async function runDocumentSummarizer({
  documentText,
  fileName = "Document",
}) {
  const cleanedText = normalizeWhitespace(documentText);
  const cleanedFileName = String(fileName || "Document").trim() || "Document";

  if (!cleanedText) {
    throw new Error("Document text is required.");
  }

  const engine = getGeminiRuntime();
  let warning = "";
  let summary = buildFallbackDocumentSummary({
    documentText: cleanedText,
    fileName: cleanedFileName,
  });
  let provider = "Built-in summarizer";
  let model = "fallback";

  if (engine.aiEnabled) {
    try {
      const geminiSummary = await generateGeminiDocumentSummary({
        client: engine.client,
        model: engine.model,
        documentText: cleanedText,
        fileName: cleanedFileName,
      });

      summary = normalizeDocumentSummary(geminiSummary, summary);
      provider = "Gemini";
      model = engine.model;
    } catch (error) {
      warning =
        error?.message ||
        "Gemini summarization was unavailable, so the built-in summarizer was used.";
    }
  } else {
    warning =
      "GEMINI_API_KEY is missing, so the built-in summarizer was used for this document.";
  }

  return {
    warning,
    provider,
    model,
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
      provider: "Built-in summarizer",
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

async function generateGeminiDocumentSummary({
  client,
  model,
  documentText,
  fileName,
}) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are the LevelUp Document Summarizer.",
              "Summarize documents from any field, including engineering, medicine, management, law, commerce, arts, and general study material.",
              "Return a short, accurate summary and concise key points.",
              "Do not assume the document is from computer science unless the text clearly indicates that.",
              "Key points should be concrete, non-duplicative, and useful for revision.",
              "Topics should be short topic labels, not full sentences.",
              "Use readingTimeMinutes as an estimate for reading the original extracted text.",
              "Return valid JSON matching the schema exactly.",
              "",
              `File name: ${fileName}`,
              "",
              "Document text:",
              truncateText(documentText, 18000),
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: DOCUMENT_SUMMARY_SCHEMA,
      temperature: 0.3,
    },
  });

  return parseJsonResponse(response?.text);
}

function buildFallbackDocumentSummary({ documentText, fileName }) {
  const normalizedText = normalizeWhitespace(documentText);
  const sentences = splitIntoSentences(normalizedText);
  const candidateLines = getCandidateLines(normalizedText);
  const title =
    truncateText(candidateLines[0] || stripFileExtension(fileName) || "Document Summary", 100) ||
    "Document Summary";
  const summary =
    truncateText(
      sentences.slice(0, 3).join(" ") || candidateLines.slice(0, 2).join(" "),
      560,
    ) || truncateText(normalizedText, 560);
  const keyPoints = uniqueStrings([
    ...candidateLines.slice(0, 3),
    ...sentences.slice(0, 4).map(stripTrailingPunctuation),
  ]).slice(0, 6);
  const topics = extractTopics(normalizedText).slice(0, 6);

  return {
    title,
    summary,
    keyPoints: keyPoints.length ? keyPoints : [truncateText(summary, 180)],
    topics: topics.length ? topics : ["Main ideas", "Important details"],
    readingTimeMinutes: estimateReadingTime(normalizedText),
  };
}

function normalizeDocumentSummary(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};

  return {
    title: truncateText(source.title || safeFallback.title || "Document Summary", 100),
    summary: truncateText(source.summary || safeFallback.summary || "", 560),
    keyPoints: normalizeStringArray(
      hasOwn(source, "keyPoints") ? source.keyPoints : safeFallback.keyPoints,
      8,
      220,
    ),
    topics: normalizeStringArray(
      hasOwn(source, "topics") ? source.topics : safeFallback.topics,
      8,
      80,
    ),
    readingTimeMinutes: normalizeNumber(
      hasOwn(source, "readingTimeMinutes")
        ? source.readingTimeMinutes
        : safeFallback.readingTimeMinutes,
      1,
      240,
    ),
  };
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
    throw new Error("Gemini returned a non-JSON response.");
  }
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

function normalizeNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function normalizeWhitespace(value = "") {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoSentences(text = "") {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 6);
}

function getCandidateLines(text = "") {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.split(/\s+/).length >= 4)
    .slice(0, 12);
}

function estimateReadingTime(text = "") {
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function stripFileExtension(fileName = "") {
  return String(fileName || "").replace(/\.[^/.]+$/, "").trim();
}

function stripTrailingPunctuation(value = "") {
  return String(value || "").replace(/[.:;,\s]+$/, "").trim();
}

function extractTopics(text = "") {
  const stopWords = new Set([
    "about",
    "after",
    "also",
    "been",
    "being",
    "between",
    "could",
    "from",
    "into",
    "more",
    "most",
    "other",
    "over",
    "same",
    "such",
    "than",
    "that",
    "their",
    "there",
    "these",
    "they",
    "this",
    "through",
    "very",
    "with",
    "your",
    "will",
    "have",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "would",
  ]);

  const frequency = new Map();
  normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .forEach((word) => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

  return [...frequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([word]) => word);
}
