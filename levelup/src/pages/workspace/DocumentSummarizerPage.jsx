import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Lightbulb,
  LoaderCircle,
  ScanText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { auth } from "../../firebase";
import {
  countWords,
  formatBytes,
  getDropzoneErrorMessage,
} from "../../lib/resumeAnalysis";
import { postServerJson } from "../../lib/serverApi";
import { parseDocumentInput } from "../../resumeAI/utils/resumeParser";

function ResultMetric({ label, value }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border px-4 py-3">
      <div className="theme-text-muted text-xs uppercase tracking-[0.24em]">{label}</div>
      <div className="theme-text-strong mt-2 text-sm font-semibold sm:text-base">{value}</div>
    </div>
  );
}

export default function DocumentSummarizerPage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [documentFile, setDocumentFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState(null);

  const hasReadyInput =
    activeTab === "upload" ? Boolean(documentFile) : manualText.trim().length >= 40;

  const dropzone = useDropzone({
    multiple: false,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    onDropAccepted: (acceptedFiles) => {
      const nextFile = acceptedFiles?.[0];
      if (!nextFile) {
        return;
      }

      setActiveTab("upload");
      setDocumentFile(nextFile);
      setError("");
      setWarning("");
    },
    onDropRejected: (fileRejections) => {
      setError(getDropzoneErrorMessage(fileRejections));
    },
  });

  const handleSummarize = async () => {
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const parsedInput = await parseDocumentInput({
        file: activeTab === "upload" ? documentFile : null,
        manualText: activeTab === "paste" ? manualText : "",
      });

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Sign in to summarize documents with Gemini.");
      }

      try {
        const token = await currentUser.getIdToken();
        const response = await postServerJson("/document-summarizer/summarize", {
          token,
          body: {
            documentText: parsedInput.text,
            fileName: parsedInput.fileName,
          },
        });

        const summary = normalizeSummaryResponse(response?.summary, parsedInput.fileName);
        setResult({
          ...summary,
          fileName: parsedInput.fileName,
          previewText: parsedInput.previewText,
          wordCount: countWords(parsedInput.text),
          provider: String(response?.provider || "Gemini").trim(),
          model: String(response?.model || "gemini").trim(),
        });

        if (response?.warning) {
          setWarning(response.warning);
        }
      } catch (serverError) {
        const fallbackSummary = buildLocalDocumentSummary({
          text: parsedInput.text,
          fileName: parsedInput.fileName,
        });

        setResult({
          ...fallbackSummary,
          fileName: parsedInput.fileName,
          previewText: parsedInput.previewText,
          wordCount: countWords(parsedInput.text),
          provider: "Local fallback",
          model: "browser",
        });

        if (serverError?.status === 404) {
          setWarning(
            "The document summarizer API route returned 404. Restart the backend in levelup/server to enable Gemini. A local fallback summary is shown for now.",
          );
        } else {
          setWarning(
            serverError instanceof Error
              ? `${serverError.message} Showing a local fallback summary for now.`
              : "Gemini summarization was unavailable. Showing a local fallback summary for now.",
          );
        }
      }
    } catch (summarizeError) {
      setError(
        summarizeError instanceof Error
          ? summarizeError.message
          : "Document summarization failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gemini Document Summarizer"
        title="Upload a PDF and turn it into a short summary with key points."
        description="Extract text from PDF, DOC, or DOCX files and send it to Gemini for a concise summary, revision-ready key points, and topic highlights."
      />

      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "upload"
                    ? "theme-shell-panel theme-text-strong border"
                    : "theme-text-muted opacity-75 hover:opacity-100"
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "paste"
                    ? "theme-shell-panel theme-text-strong border"
                    : "theme-text-muted opacity-75 hover:opacity-100"
                }`}
              >
                Paste Text
              </button>
            </div>

            {activeTab === "upload" ? (
              <div
                {...dropzone.getRootProps()}
                className={`theme-shell-panel cursor-pointer rounded-[28px] border border-dashed p-8 text-center transition ${
                  dropzone.isDragActive
                    ? "border-pink-400/60 bg-pink-500/10"
                    : "hover:-translate-y-0.5 hover:border-pink-400/30 hover:bg-white/[0.07]"
                }`}
              >
                <input {...dropzone.getInputProps()} />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/10">
                  <UploadCloud className="h-8 w-8 theme-text-strong" />
                </div>
                <div className="mt-5 theme-text-strong text-xl font-semibold">
                  Drop your document here or click to browse
                </div>
                <div className="theme-text-muted mt-2 text-sm">
                  PDF, DOC, or DOCX up to 5 MB
                </div>
                {documentFile ? (
                  <div className="mt-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
                    {documentFile.name} • {formatBytes(documentFile.size)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="theme-shell-panel rounded-[28px] border p-5">
                <label
                  htmlFor="document-summarizer-manual"
                  className="theme-text-muted text-xs uppercase tracking-[0.24em]"
                >
                  Document Text
                </label>
                <textarea
                  id="document-summarizer-manual"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  placeholder="Paste the full document text here..."
                  className="mt-4 min-h-72 w-full resize-none rounded-[24px] border px-4 py-4 text-sm leading-7 outline-none transition focus:border-pink-400/35"
                  style={{
                    backgroundColor: "var(--theme-surface-dark)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-strong)",
                  }}
                />
                <div className="theme-text-muted mt-3 text-xs">
                  Paste enough text for Gemini to produce a meaningful summary and key points.
                </div>
              </div>
            )}

            {error ? (
              <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {warning ? (
              <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {warning}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSummarize}
              disabled={!hasReadyInput || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Summarizing with Gemini
                </>
              ) : (
                <>
                  <ScanText className="h-4 w-4" />
                  Summarize Document
                </>
              )}
            </button>
          </div>

          <div className="theme-shell-panel rounded-[28px] border p-6">
            <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
              Summary Output
            </div>
            <div className="theme-text-strong mt-4 text-2xl font-black">
              {result?.title || "No summary yet"}
            </div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              {result
                ? "Gemini has summarized the extracted text. Review the short summary, key points, and topics below."
                : "Upload a PDF or paste text, then run Gemini summarization to generate a concise summary and revision-ready key points."}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ResultMetric
                label="Words"
                value={result ? `${result.wordCount} words` : "Waiting"}
              />
              <ResultMetric
                label="Reading Time"
                value={result ? `${result.readingTimeMinutes} min` : "Waiting"}
              />
              <ResultMetric
                label="Provider"
                value={result ? result.provider : "Waiting"}
              />
              <ResultMetric
                label="Model"
                value={result ? result.model : "Waiting"}
              />
            </div>

            <div className="mt-6">
              <div className="theme-text-muted text-xs uppercase tracking-[0.24em]">
                Topics
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result?.topics?.length ? (
                  result.topics.map((topic) => (
                    <div
                      key={topic}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-strong"
                    >
                      {topic}
                    </div>
                  ))
                ) : (
                  <div className="theme-text-muted text-sm">No topics yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <LoaderCircle className="h-7 w-7 animate-spin theme-text-strong" />
            </div>
            <div>
              <div className="theme-text-strong text-xl font-semibold">
                Summarizing document with Gemini...
              </div>
              <div className="theme-text-muted mt-2 text-sm">
                Extracting the main ideas, compressing the content, and producing revision-ready key points.
              </div>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Sparkles className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Short Summary</div>
                  <div className="theme-text-muted text-sm">
                    Concise overview of the uploaded document
                  </div>
                </div>
              </div>
              <div className="theme-shell-panel mt-5 rounded-[24px] border p-5 text-sm leading-7 theme-text-strong">
                {result.summary}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Lightbulb className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Key Points</div>
                  <div className="theme-text-muted text-sm">
                    Main ideas extracted for quick revision
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {result.keyPoints.map((point) => (
                  <div
                    key={point}
                    className="theme-shell-panel rounded-[22px] border px-4 py-3 text-sm leading-7 theme-text-strong"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <FileText className="h-5 w-5 theme-text-strong" />
              </div>
              <div>
                <div className="theme-text-strong text-lg font-semibold">Extracted Preview</div>
                <div className="theme-text-muted text-sm">
                  First 600 characters of the text sent to Gemini
                </div>
              </div>
            </div>
            <div className="theme-shell-panel mt-5 rounded-[24px] border p-5 text-sm leading-7 theme-text-strong">
              {result.previewText || "No preview available."}
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}

function normalizeSummaryResponse(summary, fallbackFileName) {
  const source = summary && typeof summary === "object" ? summary : {};
  const normalizedSummary = String(source.summary || "No summary was returned.").trim();
  const normalizedKeyPoints = uniqueStrings(
    Array.isArray(source.keyPoints) ? source.keyPoints : [],
  ).slice(0, 8);

  return {
    title: String(source.title || stripFileExtension(fallbackFileName) || "Document Summary").trim(),
    summary: normalizedSummary,
    keyPoints: normalizedKeyPoints.length ? normalizedKeyPoints : [normalizedSummary],
    topics: uniqueStrings(Array.isArray(source.topics) ? source.topics : []).slice(0, 8),
    readingTimeMinutes: Number.isFinite(Number(source.readingTimeMinutes))
      ? Math.max(1, Math.round(Number(source.readingTimeMinutes)))
      : 1,
  };
}

function stripFileExtension(fileName = "") {
  return String(fileName || "").replace(/\.[^/.]+$/, "").trim();
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

function buildLocalDocumentSummary({ text, fileName }) {
  const normalizedText = normalizeWhitespace(text);
  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 6);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.split(/\s+/).length >= 4)
    .slice(0, 10);
  const summary =
    sentences.slice(0, 3).join(" ") ||
    lines.slice(0, 2).join(" ") ||
    normalizedText.slice(0, 560);
  const topics = extractTopics(normalizedText);
  const keyPoints = uniqueStrings([
    ...lines.slice(0, 3),
    ...sentences.slice(0, 4).map((sentence) => sentence.replace(/[.:;,\s]+$/, "")),
  ]).slice(0, 8);

  return {
    title: stripFileExtension(fileName) || "Document Summary",
    summary: summary || "No summary was generated.",
    keyPoints: keyPoints.length ? keyPoints : [summary || "No key points available."],
    topics: topics.length ? topics : ["Main ideas", "Important details"],
    readingTimeMinutes: Math.max(
      1,
      Math.ceil(normalizedText.split(/\s+/).filter(Boolean).length / 200),
    ),
  };
}

function normalizeWhitespace(value = "") {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
