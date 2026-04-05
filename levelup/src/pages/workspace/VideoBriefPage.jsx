import { useMemo, useState } from "react";
import {
  ExternalLink,
  Lightbulb,
  Link2,
  LoaderCircle,
  PlayCircle,
  Sparkles,
  Video,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { auth } from "../../firebase";
import { postServerJson } from "../../lib/serverApi";

function ResultMetric({ label, value }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border px-4 py-3">
      <div className="theme-text-muted text-xs uppercase tracking-[0.24em]">
        {label}
      </div>
      <div className="theme-text-strong mt-2 text-sm font-semibold sm:text-base">
        {value}
      </div>
    </div>
  );
}

export default function VideoBriefPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState(null);

  const normalizedUrl = useMemo(() => normalizeHttpUrl(videoUrl), [videoUrl]);
  const hasReadyInput = Boolean(normalizedUrl);

  const handleSummarize = async () => {
    if (!normalizedUrl) {
      setError("Enter a valid public video link.");
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Sign in to generate a video brief with Gemini.");
      }

      try {
        const token = await currentUser.getIdToken();
        const response = await postServerJson("/video-brief/summarize", {
          token,
          body: {
            videoUrl: normalizedUrl,
          },
        });

        const summary = normalizeVideoBriefResponse(
          response?.summary,
          buildLocalVideoBrief(normalizedUrl),
        );

        setResult({
          ...summary,
          videoUrl: normalizedUrl,
          sourceName: String(
            response?.summary?.sourceName || response?.metadata?.sourceName || "Video source",
          ).trim(),
          provider: String(response?.provider || "Gemini").trim(),
          model: String(response?.model || "gemini").trim(),
        });

        if (response?.warning) {
          setWarning(response.warning);
        }
      } catch (serverError) {
        const fallback = buildLocalVideoBrief(normalizedUrl);
        setResult({
          ...fallback,
          videoUrl: normalizedUrl,
          sourceName: fallback.sourceName,
          provider: "Local fallback",
          model: "browser",
        });

        if (serverError?.status === 404) {
          setWarning(
            "The Video Brief API route returned 404. Restart the backend in levelup/server to enable Gemini. A local fallback brief is shown for now.",
          );
        } else {
          setWarning(
            serverError instanceof Error
              ? `${serverError.message} Showing a local fallback brief for now.`
              : "Gemini video summarization was unavailable. Showing a local fallback brief for now.",
          );
        }
      }
    } catch (summarizeError) {
      setError(
        summarizeError instanceof Error
          ? summarizeError.message
          : "Video brief generation failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gemini Video Brief"
        title="Paste a video link and instantly generate a summary with key points."
        description="Video Brief reads a public video URL, asks Gemini to summarize it, and returns revision-ready key points plus watch notes you can use before or after viewing."
      />

      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="theme-shell-panel rounded-[28px] border p-5">
              <label
                htmlFor="video-brief-url"
                className="theme-text-muted text-xs uppercase tracking-[0.24em]"
              >
                Public Video URL
              </label>
              <div className="mt-4 flex items-center gap-3 rounded-[24px] border px-4 py-4">
                <Link2 className="h-5 w-5 shrink-0 theme-text-muted" />
                <input
                  id="video-brief-url"
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--theme-text-strong)" }}
                />
              </div>
              <div className="theme-text-muted mt-3 text-xs">
                Best with public YouTube, Vimeo, Loom, course, or public lesson links.
              </div>
            </div>

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
                  Generating Video Brief
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Generate Video Brief
                </>
              )}
            </button>
          </div>

          <div className="theme-shell-panel rounded-[28px] border p-6">
            <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
              Video Summary
            </div>
            <div className="theme-text-strong mt-4 text-2xl font-black">
              {result?.title || "No video brief yet"}
            </div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              {result
                ? "Gemini has analyzed the linked video page and generated a summary, key points, and study notes."
                : "Paste a public video link and generate a structured brief before watching or while revising."}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ResultMetric
                label="Source"
                value={result ? result.sourceName : "Waiting"}
              />
              <ResultMetric
                label="Topics"
                value={result ? `${result.topics.length} topics` : "Waiting"}
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

            {result?.videoUrl ? (
              <a
                href={result.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                Open Video Source
              </a>
            ) : null}

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
                Generating video brief with Gemini...
              </div>
              <div className="theme-text-muted mt-2 text-sm">
                Reading the linked video page, extracting context, and turning it into a concise learning brief.
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
                    High-level explanation of what the linked video covers
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
                  <PlayCircle className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Key Points</div>
                  <div className="theme-text-muted text-sm">
                    Fast revision bullets from the video brief
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {result.keyPoints.map((point) => (
                  <div
                    key={point}
                    className="theme-shell-panel rounded-[22px] border px-4 py-4 text-sm leading-7 theme-text-strong"
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
                <Lightbulb className="h-5 w-5 theme-text-strong" />
              </div>
              <div>
                <div className="theme-text-strong text-lg font-semibold">Study Notes</div>
                <div className="theme-text-muted text-sm">
                  What to focus on while watching or revising this source
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {result.studyNotes.map((note) => (
                <div
                  key={note}
                  className="theme-shell-panel rounded-[24px] border px-4 py-4 text-sm leading-7 theme-text-strong"
                >
                  {note}
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}

function normalizeVideoBriefResponse(candidate, fallback) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};

  return {
    title: truncateText(source.title || safeFallback.title || "Video Brief", 120),
    summary: truncateText(source.summary || safeFallback.summary || "", 560),
    keyPoints: normalizeStringArray(source.keyPoints || safeFallback.keyPoints, 8, 220),
    studyNotes: normalizeStringArray(
      source.studyNotes || safeFallback.studyNotes,
      8,
      220,
    ),
    topics: normalizeStringArray(source.topics || safeFallback.topics, 8, 80),
    sourceName: truncateText(
      source.sourceName || safeFallback.sourceName || "Video source",
      60,
    ),
  };
}

function buildLocalVideoBrief(videoUrl) {
  const url = new URL(videoUrl);
  const sourceName = detectSourceName(url.hostname);
  const title = inferTitleFromUrl(url) || "Video Brief";
  const topics = normalizeStringArray(
    [title, sourceName, url.hostname.replace(/^www\./i, "")],
    4,
    80,
  );

  return {
    title,
    summary: truncateText(
      `This fallback brief is based on the link structure for ${title} from ${sourceName}. Restart the backend to enable Gemini-powered URL summarization for richer results.`,
      560,
    ),
    keyPoints: [
      `Source platform: ${sourceName}`,
      `Linked topic hint: ${title}`,
      "Use the source page directly if you need the complete context before Gemini is available.",
    ],
    studyNotes: [
      `Write the main concept covered in ${title}.`,
      "Note 3 ideas or steps that the video explains clearly.",
      "Connect the video back to your roadmap, role target, or current study goal.",
    ],
    topics,
    sourceName,
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
  const normalized = String(host || "").replace(/^www\./i, "").toLowerCase();
  if (normalized.includes("youtube") || normalized === "youtu.be") {
    return "YouTube";
  }
  if (normalized.includes("vimeo")) {
    return "Vimeo";
  }
  if (normalized.includes("loom")) {
    return "Loom";
  }
  if (normalized.includes("coursera")) {
    return "Coursera";
  }
  if (normalized.includes("udemy")) {
    return "Udemy";
  }

  return normalized || "Video source";
}

function inferTitleFromUrl(url) {
  const segments = String(url.pathname || "")
    .split("/")
    .map((part) => decodeURIComponentSafe(part))
    .filter(Boolean);
  const seed = segments[segments.length - 1] || url.searchParams.get("v") || "video brief";
  return truncateText(
    seed
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 8)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    120,
  );
}

function normalizeStringArray(values, maxItems, maxLength) {
  const seen = new Set();

  return (Array.isArray(values) ? values : [])
    .map((value) => truncateText(value, maxLength))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}
