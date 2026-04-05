import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  Sparkles,
  Target,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";

function MetricCard({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : tone === "emerald"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/5 theme-text-strong";

  return (
    <div className="theme-shell-panel rounded-[24px] border p-4">
      <div className="theme-text-muted text-[11px] uppercase tracking-[0.18em]">{label}</div>
      <div className={`mt-3 inline-flex rounded-full border px-3 py-2 text-sm font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function SkillListCard({ icon: Icon, title, items, emptyText, tone = "neutral" }) {
  const chipClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : tone === "emerald"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/5 theme-text-strong";

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon className="h-5 w-5 theme-text-strong" />
        </div>
        <div>
          <div className="theme-text-strong text-lg font-semibold">{title}</div>
          <div className="theme-text-muted text-sm">
            {items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : emptyText}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className={`rounded-full border px-3 py-2 text-sm font-medium ${chipClass}`}
            >
              {item}
            </div>
          ))
        ) : (
          <div className="theme-shell-panel rounded-[22px] border px-4 py-3 text-sm theme-text-muted">
            {emptyText}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function GapPriorityCard({ rows }) {
  return (
    <GlassCard className="p-6">
      <div className="theme-text-strong text-lg font-semibold">Priority Map</div>
      <div className="theme-text-muted mt-2 text-sm leading-7">
        The Skill Gap section follows the latest target role selected in Career Guidance.
      </div>

      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.skill}-${row.priority}`}
              className="theme-shell-panel flex flex-wrap items-center justify-between gap-3 rounded-[22px] border px-4 py-4"
            >
              <div>
                <div className="theme-text-strong text-sm font-semibold">{row.skill}</div>
                <div className="theme-text-muted mt-1 text-sm">{row.reason}</div>
              </div>
              <div
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                  row.priority === "High"
                    ? "border-red-400/20 bg-red-500/10 text-red-100"
                    : row.priority === "Medium"
                      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {row.priority}
              </div>
            </div>
          ))
        ) : (
          <div className="theme-shell-panel rounded-[22px] border px-4 py-4 text-sm theme-text-muted">
            No live skill-gap priorities yet. Ask Career Guidance about your target role and missing skills to generate them here.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function SkillGapPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};

  const liveSkillGapAnalysis =
    normalizeSkillGapAnalysis(guidance.latestSkillGapAnalysis) ||
    normalizeSkillGapAnalysis({
      matchedSkills: resumeOverview.extractedSkills || [],
      missingSkills: resumeOverview.missingSkills || [],
      prioritySkills: resumeOverview.missingSkills || [],
    }) || {
      matchedSkills: [],
      missingSkills: [],
      prioritySkills: [],
    };

  const targetRole =
    String(
      guidance.latestTargetRole ||
        guidance.latestRecommendedRoles?.[0]?.role ||
        resumeOverview.topRole ||
        "",
    ).trim() || "No target role selected yet";
  const targetRoleMatch = guidance.latestRecommendedRoles?.find(
    (item) => item?.role === guidance.latestTargetRole,
  ) || guidance.latestRecommendedRoles?.[0] || null;
  const hasGuidanceSkillGap = Boolean(
    guidance.latestTargetRole ||
      guidance.latestSkillGapAnalysis?.matchedSkills?.length ||
      guidance.latestSkillGapAnalysis?.missingSkills?.length ||
      guidance.latestSkillGapAnalysis?.prioritySkills?.length,
  );
  const sourceLabel =
    hasGuidanceSkillGap
      ? "Career Guidance AI"
      : resumeOverview.missingSkills?.length
        ? "Resume Analyzer"
        : "No live source";

  const summary = buildSummary({
    targetRole,
    sourceLabel,
    latestSummary: guidance.latestSummary,
    matchedSkills: liveSkillGapAnalysis.matchedSkills,
    missingSkills: liveSkillGapAnalysis.missingSkills,
    prioritySkills: liveSkillGapAnalysis.prioritySkills,
  });

  const priorityRows = buildPriorityRows(liveSkillGapAnalysis);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Skill Gap Analysis"
        title="See skill gaps for the target role chosen in Career Guidance."
        description="This page now follows the latest target role and skill-gap analysis produced by the Career Guidance AI, so role targeting and gap tracking stay in sync."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <Target className="h-5 w-5 theme-text-strong" />
            </div>
            <div>
              <div className="theme-text-strong text-lg font-semibold">Resume vs Target Role</div>
              <div className="theme-text-muted text-sm">Shared live context across Career Guidance and Skill Gap Analysis.</div>
            </div>
          </div>

          <div className="theme-shell-panel mt-5 rounded-[24px] border p-5 text-sm leading-7 theme-text-strong">
            {summary}
          </div>

          {guidance.latestFocusAreas?.length ? (
            <div className="mt-5">
              <div className="theme-text-muted text-xs uppercase tracking-[0.18em]">Current Focus Areas</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {guidance.latestFocusAreas.slice(0, 6).map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-strong"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <BriefcaseBusiness className="h-5 w-5 theme-text-strong" />
            </div>
            <div>
              <div className="theme-text-strong text-lg font-semibold">Target Snapshot</div>
              <div className="theme-text-muted text-sm">Latest role and skill-gap source.</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <MetricCard label="Target Role" value={targetRole} tone="red" />
            <MetricCard label="Data Source" value={sourceLabel} />
            <MetricCard
              label="Target Fit"
              value={
                targetRoleMatch?.fitScore != null
                  ? `${targetRoleMatch.fitScore}%`
                  : resumeOverview.topRoleMatch != null
                    ? `${resumeOverview.topRoleMatch}%`
                    : "Not available"
              }
              tone="amber"
            />
            <MetricCard
              label="ATS Score"
              value={
                resumeOverview.atsScore != null ? `${resumeOverview.atsScore}/100` : "Not analyzed"
              }
              tone="emerald"
            />
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SkillListCard
          icon={CircleAlert}
          title="Priority Skills To Learn"
          items={liveSkillGapAnalysis.prioritySkills}
          emptyText="No priority skills have been pinned yet."
          tone="red"
        />
        <SkillListCard
          icon={Sparkles}
          title="Missing Skills"
          items={liveSkillGapAnalysis.missingSkills}
          emptyText="No missing skills are currently listed."
          tone="amber"
        />
        <SkillListCard
          icon={BadgeCheck}
          title="Matched Skills"
          items={liveSkillGapAnalysis.matchedSkills}
          emptyText="No matched skills are available yet."
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <GapPriorityCard rows={priorityRows} />

        <GlassCard className="p-6">
          <div className="theme-text-strong text-lg font-semibold">Recommended Roles</div>
          <div className="theme-text-muted mt-2 text-sm leading-7">
            Latest role suggestions returned by Career Guidance for this profile.
          </div>

          <div className="mt-5 space-y-3">
            {guidance.latestRecommendedRoles?.length ? (
              guidance.latestRecommendedRoles.slice(0, 3).map((role) => (
                <div
                  key={role.role}
                  className="theme-shell-panel rounded-[22px] border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="theme-text-strong text-sm font-semibold">{role.role}</div>
                      <div className="theme-text-muted mt-1 text-sm leading-6">
                        {role.reason || "Latest role recommendation from the career guidance system."}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] theme-text-strong">
                      {role.fitScore != null ? `${role.fitScore}%` : "Fit"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="theme-shell-panel rounded-[22px] border px-4 py-4 text-sm theme-text-muted">
                No role recommendations are synced yet. Ask Career Guidance which role fits you best, and the result will appear here.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function normalizeSkillGapAnalysis(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return {
    matchedSkills: uniqueStrings(Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills : []).slice(0, 8),
    missingSkills: uniqueStrings(Array.isArray(candidate.missingSkills) ? candidate.missingSkills : []).slice(0, 8),
    prioritySkills: uniqueStrings(Array.isArray(candidate.prioritySkills) ? candidate.prioritySkills : []).slice(0, 5),
  };
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

function buildSummary({
  targetRole,
  sourceLabel,
  latestSummary,
  matchedSkills,
  missingSkills,
  prioritySkills,
}) {
  const normalizedSummary = String(latestSummary || "").trim().toLowerCase();
  const shouldUseLatestSummary =
    normalizedSummary &&
    !/ready to help|available for role advice|conversation can continue|waiting for a more specific question/.test(
      normalizedSummary,
    );

  if (shouldUseLatestSummary) {
    return latestSummary;
  }

  if (prioritySkills.length || missingSkills.length) {
    const topPriority = prioritySkills.slice(0, 2).join(", ") || "role-specific depth";
    const topMissing = missingSkills.slice(0, 3).join(", ") || "more role-specific evidence";
    return `${sourceLabel} is currently tracking ${targetRole} as the active target. The biggest gaps right now are ${topMissing}, and the next skills to prioritize are ${topPriority}.`;
  }

  if (matchedSkills.length) {
    return `You already show some usable alignment for ${targetRole}, especially around ${matchedSkills.slice(0, 3).join(", ")}. Ask Career Guidance what is still missing to generate a tighter live gap analysis.`;
  }

  return "No synced target role or skill-gap analysis is available yet. Open Career Guidance, discuss the role you want, and this page will update from that shared AI context.";
}

function buildPriorityRows(skillGapAnalysis) {
  const rows = [
    ...skillGapAnalysis.prioritySkills.map((skill) => ({
      skill,
      priority: "High",
      reason: "Marked as a current priority by Career Guidance for the active target role.",
    })),
    ...skillGapAnalysis.missingSkills
      .filter((skill) => !skillGapAnalysis.prioritySkills.includes(skill))
      .map((skill) => ({
        skill,
        priority: "Medium",
        reason: "Missing for the active target role, but not yet marked as the highest-priority next skill.",
      })),
    ...skillGapAnalysis.matchedSkills
      .filter(
        (skill) =>
          !skillGapAnalysis.prioritySkills.includes(skill) &&
          !skillGapAnalysis.missingSkills.includes(skill),
      )
      .slice(0, 3)
      .map((skill) => ({
        skill,
        priority: "Low",
        reason: "Already present in your profile and can be reinforced through stronger project proof.",
      })),
  ];

  return rows.slice(0, 8);
}
