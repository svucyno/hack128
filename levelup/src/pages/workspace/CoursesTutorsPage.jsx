import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  ExternalLink,
  PlayCircle,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { normalizeAdaptiveLearningState } from "../../lib/adaptiveLearning";
import { tutors } from "../../data/workspaceData";

export default function CoursesTutorsPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);

  const guidance = profile?.careerGuidance || {};
  const adaptiveLearning = useMemo(
    () => normalizeAdaptiveLearningState(profile?.adaptiveLearning),
    [profile?.adaptiveLearning],
  );
  const targetRole =
    adaptiveLearning.targetRole ||
    guidance.latestTargetRole ||
    profile?.resumeOverview?.topRole ||
    profile?.resumeOverview?.recommendedRoles?.[0]?.role ||
    "";
  const skillGapAnalysis = guidance.latestSkillGapAnalysis || {
    matchedSkills: [],
    missingSkills: [],
    prioritySkills: [],
  };

  const roadmap = useMemo(
    () => resolveRoadmapSource(guidance.latestRoadmap, adaptiveLearning),
    [guidance.latestRoadmap, adaptiveLearning],
  );
  const videoResources = useMemo(
    () =>
      buildRoadmapVideoResources({
        roadmap,
        targetRole,
        skillGapAnalysis,
      }),
    [roadmap, skillGapAnalysis, targetRole],
  );
  const matchedTutors = useMemo(
    () =>
      buildTutorMatches({
        tutors,
        videoResources,
        targetRole,
      }),
    [targetRole, videoResources],
  );

  if (!profileReady) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Roadmap Learning Hub"
          title="Courses & Tutors"
          description="Loading roadmap-based video resources and tutor matches."
        />
        <GlassCard className="p-6 text-sm text-white/72">
          Loading your roadmap learning hub...
        </GlassCard>
      </div>
    );
  }

  if (!roadmap?.weeks?.length) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Roadmap Learning Hub"
          title="Courses & Tutors"
          description="This section now shows only roadmap-related videos, source links, and tutor matches."
        />

        <GlassCard className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                <Video className="h-4 w-4" />
                Roadmap Videos Only
              </div>
              <div className="text-3xl font-black text-white">
                No roadmap found for personalized videos yet
              </div>
              <div className="max-w-2xl text-sm leading-7 text-white/62">
                Courses & Tutors now depends on your Career Guidance roadmap or
                Adaptive Learning plan. Once a roadmap exists, this page will show
                only the video resources related to that plan, direct source links,
                and short notes that summarize what to learn from each video.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/workspace/career-guidance"
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  Open Career Guidance
                </Link>
                <Link
                  to="/workspace/adaptive-learning"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <Target className="h-4 w-4" />
                  Open Adaptive Learning
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                What will appear here
              </div>
              <div className="mt-4 space-y-4">
                <MiniInsight
                  icon={PlayCircle}
                  title="Roadmap Video Links"
                  description="YouTube or source links generated from roadmap topics, week goals, and resource hints."
                />
                <MiniInsight
                  icon={BookOpenText}
                  title="Video Notes"
                  description="Quick summary notes for each source so the learner knows what to extract before watching."
                />
                <MiniInsight
                  icon={Users}
                  title="Tutor Matching"
                  description="Tutor cards filtered to the roadmap topics instead of generic tutor suggestions."
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Roadmap Learning Hub"
        title="Courses & Tutors"
        description={`Showing only roadmap-related video resources and tutor matches for ${targetRole || "your active learning goal"}. Each resource includes a watch link, a source link, and notes summary.`}
        aside={
          <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Active Plan
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {roadmap.title || "Roadmap"}
            </div>
          </div>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Video Resources"
          value={String(videoResources.length)}
          helper="Derived from your roadmap"
          icon={Video}
        />
        <StatCard
          label="Tutor Matches"
          value={String(matchedTutors.length)}
          helper="Filtered to roadmap topics"
          icon={Users}
        />
        <StatCard
          label="Priority Skills"
          value={String(skillGapAnalysis.prioritySkills?.length || 0)}
          helper="Used to refine resource topics"
          icon={Target}
        />
        <StatCard
          label="Target Role"
          value={targetRole || "Active"}
          helper="Current learning direction"
          icon={Sparkles}
        />
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">Roadmap Video Sources</div>
            <div className="mt-2 text-sm leading-7 text-white/58">
              These videos are generated only from the current roadmap tasks, goals,
              resource hints, and target skills. Clicking a source opens the related
              external video or topic search in a new tab.
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
            {roadmap.weeks.length} roadmap week{roadmap.weeks.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {videoResources.map((resource) => (
            <GlassCard key={resource.id} className="overflow-hidden border-white/10 p-0 shadow-none">
              <div className="h-36 bg-[linear-gradient(135deg,rgba(255,45,141,0.24),rgba(0,123,255,0.18),rgba(255,214,10,0.18))]" />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      <PlayCircle className="h-4 w-4" />
                      {resource.weekLabel}
                    </div>
                    <div className="mt-3 text-xl font-black text-white">
                      {resource.title}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/60">
                      {resource.description}
                    </div>
                  </div>
                  <div className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100">
                    {resource.topic}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    href={resource.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/25"
                  >
                    <Video className="h-4 w-4" />
                    Watch Video
                  </a>
                  <a
                    href={resource.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Source
                  </a>
                </div>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    <BookOpenText className="h-4 w-4" />
                    Video Notes
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/60">
                    {resource.summary}
                  </div>
                  <div className="mt-4 space-y-2">
                    {resource.notes.map((note) => (
                      <div
                        key={`${resource.id}-${note}`}
                        className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/75"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">Matched Tutors</div>
            <div className="mt-2 text-sm leading-7 text-white/58">
              Tutors are filtered against the roadmap topics and linked back to the
              most relevant video/resource direction.
            </div>
          </div>
          <Link
            to="/workspace/adaptive-learning"
            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-500/20"
          >
            Open Adaptive Learning
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {matchedTutors.map((tutor) => (
            <GlassCard key={`${tutor.name}-${tutor.topic}`} className="p-6 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-white">{tutor.name}</div>
                  <div className="mt-2 text-sm text-white/55">{tutor.subject}</div>
                </div>
                <div className="rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                  {tutor.matchLabel}
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
                Availability: {tutor.availability}
              </div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Roadmap Fit
                </div>
                <div className="mt-3 text-sm leading-7 text-white/72">
                  {tutor.reason}
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <a
                  href={tutor.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/25"
                >
                  <Video className="h-4 w-4" />
                  Watch Topic Videos
                </a>
                <a
                  href={tutor.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 transition hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  Source
                </a>
              </div>
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function resolveRoadmapSource(latestRoadmap, adaptiveLearning) {
  if (latestRoadmap?.weeks?.length) {
    return latestRoadmap;
  }

  const levels = Array.isArray(adaptiveLearning?.levels) ? adaptiveLearning.levels : [];
  if (!levels.length) {
    return null;
  }

  const weeks = [];
  levels.forEach((level) => {
    const weekLabel = String(level?.weekLabel || "Week 1").trim();
    let bucket = weeks.find((week) => week.label === weekLabel);

    if (!bucket) {
      bucket = {
        label: weekLabel,
        goal: String(level?.objective || "").trim(),
        tasks: [],
        resources: [],
      };
      weeks.push(bucket);
    }

    if (level?.title) {
      bucket.tasks.push(level.title);
    }

    if (Array.isArray(level?.resources)) {
      bucket.resources.push(...level.resources);
    }
  });

  return {
    title: adaptiveLearning?.sourceRoadmapTitle || "Adaptive Learning Roadmap",
    weeks: weeks.map((week) => ({
      ...week,
      tasks: uniqueStrings(week.tasks).slice(0, 4),
      resources: uniqueStrings(week.resources).slice(0, 4),
    })),
  };
}

function buildRoadmapVideoResources({ roadmap, targetRole, skillGapAnalysis }) {
  if (!roadmap?.weeks?.length) {
    return [];
  }

  const focusPool = uniqueStrings([
    ...(skillGapAnalysis?.prioritySkills || []),
    ...(skillGapAnalysis?.missingSkills || []),
    targetRole,
  ]);
  const cards = [];

  roadmap.weeks.forEach((week, weekIndex) => {
    const tasks = uniqueStrings(week.tasks).slice(0, 2);
    const resources = uniqueStrings(week.resources).slice(0, 2);
    const weekFocus =
      focusPool[weekIndex % Math.max(focusPool.length, 1)] ||
      extractShortTopic(week.goal) ||
      extractShortTopic(tasks[0]) ||
      "roadmap topic";

    tasks.forEach((task, taskIndex) => {
      const hintedResource = resources[taskIndex % Math.max(resources.length, 1)] || "";
      const topic = extractShortTopic(task) || weekFocus;
      const query = [task, hintedResource, targetRole].filter(Boolean).join(" ");
      const sourceText = hintedResource || week.goal || task;

      cards.push({
        id: `${week.label}-${taskIndex + 1}`,
        weekLabel: week.label,
        title: truncateText(task || `Learn ${topic}`, 72),
        topic: truncateText(topic, 42),
        description: truncateText(
          `Roadmap focus: ${week.goal || task}. This video slot is generated for the current plan and target role.`,
          180,
        ),
        videoUrl: buildVideoUrl(query || topic),
        sourceUrl: buildSourceUrl(sourceText || topic),
        summary: truncateText(
          `Use this source to understand ${topic} in the context of ${targetRole || week.goal || "your roadmap"}. Finish the video with one actionable takeaway and connect it back to the active roadmap task.`,
          220,
        ),
        notes: buildResourceNotes({
          weekGoal: week.goal,
          task,
          topic,
          targetRole,
          resource: sourceText,
        }),
      });
    });
  });

  return cards.slice(0, 8);
}

function buildTutorMatches({ tutors, videoResources, targetRole }) {
  const focusText = videoResources
    .map((resource) => `${resource.title} ${resource.topic} ${resource.summary}`)
    .join(" ")
    .toLowerCase();

  const matches = (Array.isArray(tutors) ? tutors : [])
    .map((tutor) => {
      const tokens = String(tutor.subject || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2);
      const score = tokens.reduce(
        (sum, token) => sum + (focusText.includes(token) ? 2 : 0),
        0,
      );
      const matchedResource =
        videoResources.find((resource) =>
          tokens.some((token) => resource.topic.toLowerCase().includes(token)),
        ) || videoResources[0];

      return {
        ...tutor,
        score,
        topic: matchedResource?.topic || targetRole || tutor.subject,
        matchLabel:
          score > 0 ? "Roadmap match" : targetRole ? "Target-role support" : "General support",
        reason:
          score > 0
            ? `${tutor.name} matches roadmap topics around ${matchedResource?.topic || tutor.subject} and can support the current learning path.`
            : `${tutor.name} can still support ${targetRole || "the current roadmap"} with guided practice and concept reinforcement.`,
        videoUrl: matchedResource?.videoUrl || buildVideoUrl(`${tutor.subject} ${targetRole}`),
        sourceUrl: matchedResource?.sourceUrl || buildSourceUrl(`${tutor.subject} ${targetRole}`),
      };
    })
    .sort((left, right) => right.score - left.score);

  return matches.slice(0, 3);
}

function buildResourceNotes({ weekGoal, task, topic, targetRole, resource }) {
  return [
    truncateText(
      `Watch this to understand ${topic} with respect to ${weekGoal || task || "the active roadmap goal"}.`,
      160,
    ),
    truncateText(
      `While watching, note one practical application of ${topic} for ${targetRole || "your current target"}.`,
      160,
    ),
    truncateText(
      `After the video, summarize ${resource || topic} in your own words and connect it to the current roadmap checklist.`,
      160,
    ),
  ].filter(Boolean);
}

function buildVideoUrl(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "https://www.youtube.com/";
  }

  if (isUrl(source)) {
    return source;
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(source)}`;
}

function buildSourceUrl(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "https://www.google.com/";
  }

  if (isUrl(source)) {
    return source;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(source)}`;
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function extractShortTopic(value) {
  const cleaned = String(value || "")
    .replace(/^[^a-z0-9]+/i, "")
    .replace(/[.:;,\s]+$/, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  return truncateText(cleaned.split(/\s+/).slice(0, 5).join(" "), 42);
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
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

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {label}
          </div>
          <div className="mt-3 text-3xl font-black text-white">{value}</div>
          <div className="mt-2 text-sm text-white/58">{helper}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-pink-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function MiniInsight({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white/80">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-7 text-white/58">{description}</div>
        </div>
      </div>
    </div>
  );
}
