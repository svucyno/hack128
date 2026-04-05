import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  buildRecommendedJobs,
  buildTrackerApplicationFromJob,
} from "../../lib/jobRecommendations";
import { normalizeJobApplications } from "../../lib/userData";

const FIELD_CLASS =
  "w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:scale-[1.005]";

const FIELD_STYLE = {
  background: "var(--theme-surface-0)",
  borderColor: "var(--theme-border)",
  color: "var(--theme-text-strong)",
};

const WORK_MODE_OPTIONS = [
  { value: "", label: "All modes" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "unstop", label: "Unstop" },
  { value: "careers", label: "Careers Page" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

export default function RecommendedJobsPage() {
  const navigate = useNavigate();
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const jobApplications = useWorkspaceStore((state) => state.jobApplications);
  const setJobApplications = useWorkspaceStore((state) => state.setJobApplications);

  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestReport = resumeWorkspace?.latestAnalysis?.report || null;
  const latestTargetRole = String(
    guidance.latestTargetRole ||
      guidance.latestRecommendedRoles?.[0]?.role ||
      latestReport?.jobMatches?.[0]?.role ||
      latestReport?.topRole ||
      resumeOverview?.topRole ||
      "",
  ).trim();
  const suggestedRoles = useMemo(
    () =>
      uniqueStrings([
        latestTargetRole,
        ...(guidance.latestRecommendedRoles || []).map((item) => item?.role),
        ...(latestReport?.jobMatches || []).map((item) => item?.role),
      ]).slice(0, 10),
    [guidance.latestRecommendedRoles, latestReport?.jobMatches, latestTargetRole],
  );
  const latestResumeVersion = useMemo(
    () => buildLatestResumeVersion({ resumeOverview, resumeWorkspace }),
    [resumeOverview, resumeWorkspace],
  );
  const latestResumeScore = useMemo(
    () => normalizeScore(latestReport?.atsScore ?? resumeOverview?.atsScore),
    [latestReport?.atsScore, resumeOverview?.atsScore],
  );
  const resumeSkills = useMemo(
    () =>
      uniqueStrings([
        ...(latestReport?.extractedSkills || []),
        ...(latestReport?.jobMatches?.[0]?.matchedSkills || []),
      ]).slice(0, 24),
    [latestReport],
  );
  const skillGaps = useMemo(
    () =>
      uniqueStrings([
        ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
        ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
        ...(latestReport?.missingSkills || []),
        ...(resumeOverview?.missingSkills || []),
      ]).slice(0, 12),
    [guidance.latestSkillGapAnalysis, latestReport?.missingSkills, resumeOverview?.missingSkills],
  );
  const applications = useMemo(
    () =>
      normalizeJobApplications(jobApplications).sort(
        (left, right) =>
          new Date(right.updatedAtIso || right.createdAtIso || 0).getTime() -
          new Date(left.updatedAtIso || left.createdAtIso || 0).getTime(),
      ),
    [jobApplications],
  );
  const savedLookup = useMemo(() => {
    const lookup = new Map();
    applications.forEach((application) => {
      lookup.set(createSavedJobKey(application), application);
    });
    return lookup;
  }, [applications]);

  const [filters, setFilters] = useState({
    role: latestTargetRole,
    location: "",
    workMode: "",
    source: "",
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setFilters((current) => {
      if (current.role || !latestTargetRole) {
        return current;
      }
      return {
        ...current,
        role: latestTargetRole,
      };
    });
  }, [latestTargetRole]);

  const recommendations = useMemo(
    () =>
      buildRecommendedJobs({
        targetRole: filters.role || latestTargetRole,
        suggestedRoles,
        resumeSkills,
        missingSkills: skillGaps,
        atsScore: latestResumeScore,
        locationQuery: filters.location,
        workMode: filters.workMode,
        source: filters.source,
      }),
    [
      filters.location,
      filters.role,
      filters.source,
      filters.workMode,
      latestResumeScore,
      latestTargetRole,
      resumeSkills,
      skillGaps,
      suggestedRoles,
    ],
  );
  const allJobs = recommendations.allJobs;
  const targetRoleMatches = recommendations.targetRoleMatches;
  const profileMatches = recommendations.profileMatches;
  const totalOpenings = allJobs.length;
  const remoteCount = allJobs.filter((job) => job.workMode === "remote").length;
  const upcomingDeadlines = allJobs.filter((job) => daysUntil(job.deadline) <= 7).length;
  const strongestMatch = allJobs[0] || null;

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleUseSuggestedRole = (role) => {
    setFilters((current) => ({
      ...current,
      role,
    }));
  };

  const handleSaveToTracker = (job) => {
    const existing = savedLookup.get(createSavedJobKey(job));
    if (existing) {
      setNotice(`${job.company} · ${job.role} is already in the tracker.`);
      return;
    }

    const nextApplication = buildTrackerApplicationFromJob({
      job,
      linkedResumeVersion: latestResumeVersion,
      linkedResumeScore: latestResumeScore,
      targetRole: filters.role || latestTargetRole,
      resumeSkillGaps: skillGaps,
    });
    const nextApplications = normalizeJobApplications([
      nextApplication,
      ...applications,
    ]).sort(
      (left, right) =>
        new Date(right.updatedAtIso || right.createdAtIso || 0).getTime() -
        new Date(left.updatedAtIso || left.createdAtIso || 0).getTime(),
    );

    setJobApplications(nextApplications);
    setNotice(`${job.company} · ${job.role} added to Job Applications as Wishlist.`);
  };

  const handleGeneratePrepPack = (job) => {
    const existing = savedLookup.get(createSavedJobKey(job));
    navigate("/workspace/company-prep", {
      state: {
        seed: {
          applicationId: existing?.id || "",
          company: job.company,
          role: job.role,
          jobDescription: job.jobDescription,
          linkedResumeVersion: latestResumeVersion,
          linkedResumeScore: latestResumeScore,
        },
      },
    });
  };

  const handleStartMockInterview = (job) => {
    const existing = savedLookup.get(createSavedJobKey(job));
    navigate("/workspace/mock-interview", {
      state: {
        companyPrepPack: {
          packId: "",
          applicationId: existing?.id || "",
          role: job.role,
          company: job.company,
          difficulty: getMockDifficulty(job),
          interviewType: inferInterviewType(job.role),
          focusAreas: uniqueStrings([...job.requiredSkills, ...job.missingSkills]).slice(0, 6),
          jobDescription: job.jobDescription,
          maxQuestions: 4,
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Placement Discovery Engine"
        title="Recommended Jobs"
        description="Get feed-style job recommendations for the current target role and adjacent-fit roles from the latest resume, ATS score, and skill-gap context. Save strong matches straight into the tracker, then move into prep and mock interview without re-entering the JD."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/workspace/career-guidance"
              className="theme-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            >
              <Sparkles className="h-4 w-4" />
              Career Guidance
            </Link>
            <Link
              to="/workspace/job-applications"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
                color: "var(--theme-text-strong)",
              }}
            >
              <Briefcase className="h-4 w-4" />
              Job Applications
            </Link>
            <Link
              to="/workspace/company-prep"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
                color: "var(--theme-text-strong)",
              }}
            >
              <Building2 className="h-4 w-4" />
              Company Prep
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recommended Openings"
          value={String(totalOpenings)}
          hint="Current feed after role and filter ranking"
          icon={Briefcase}
        />
        <StatCard
          label="Target Role Matches"
          value={String(targetRoleMatches.length)}
          hint={
            recommendations.targetRole
              ? `Ranked for ${recommendations.targetRole}`
              : "Set a target role to tighten matches"
          }
          icon={Target}
        />
        <StatCard
          label="Remote Friendly"
          value={String(remoteCount)}
          hint="Openings marked remote in the current list"
          icon={MapPin}
        />
        <StatCard
          label="Deadlines In 7 Days"
          value={String(upcomingDeadlines)}
          hint={
            strongestMatch?.deadline
              ? `Top match deadline: ${formatDateLabel(strongestMatch.deadline)}`
              : "No urgent deadlines in the filtered list"
          }
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">Filter The Feed</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Control the recommendation mix by role, location, work mode, and source. The
                  ranking already uses ATS, skill overlap, and adjacent-role fit in the background.
                </div>
              </div>
              {strongestMatch ? (
                <div
                  className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{
                    borderColor: "rgba(34,197,94,0.25)",
                    background: "rgba(34,197,94,0.12)",
                    color: "var(--theme-text-strong)",
                  }}
                >
                  Top match {strongestMatch.matchScore}%
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <Field label="Role focus">
                <input
                  value={filters.role}
                  onChange={(event) => handleFilterChange("role", event.target.value)}
                  placeholder="Teacher, Web Developer, Data Analyst"
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                />
              </Field>
              <Field label="Preferred location">
                <input
                  value={filters.location}
                  onChange={(event) => handleFilterChange("location", event.target.value)}
                  placeholder="Chennai, Remote, Hyderabad"
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                />
              </Field>
              <Field label="Work mode">
                <select
                  value={filters.workMode}
                  onChange={(event) => handleFilterChange("workMode", event.target.value)}
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                >
                  {WORK_MODE_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Source">
                <select
                  value={filters.source}
                  onChange={(event) => handleFilterChange("source", event.target.value)}
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {suggestedRoles.length ? (
              <div className="mt-5">
                <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                  Quick role switches
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleUseSuggestedRole(role)}
                      className="rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                      style={{
                        borderColor:
                          filters.role.toLowerCase() === role.toLowerCase()
                            ? "rgba(239,68,68,0.28)"
                            : "var(--theme-border)",
                        background:
                          filters.role.toLowerCase() === role.toLowerCase()
                            ? "rgba(239,68,68,0.12)"
                            : "var(--theme-surface-0)",
                        color: "var(--theme-text-strong)",
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {notice ? (
              <div
                className="mt-5 rounded-[22px] border px-4 py-3 text-sm"
                style={{
                  borderColor: "rgba(56,189,248,0.22)",
                  background: "rgba(56,189,248,0.1)",
                  color: "var(--theme-text-strong)",
                }}
              >
                {notice}
              </div>
            ) : null}
          </GlassCard>

          <RecommendationSection
            title="Best For Your Target Role"
            description="These are the most direct opportunities for the role currently being targeted in Career Guidance or the filter above."
            jobs={targetRoleMatches}
            emptyCopy="No direct target-role matches for the current filters. Broaden location or source, or switch to a nearby role."
            savedLookup={savedLookup}
            onSave={handleSaveToTracker}
            onPrep={handleGeneratePrepPack}
            onMock={handleStartMockInterview}
          />

          <RecommendationSection
            title="Also Suits Your Profile"
            description="These roles are adjacent fits based on resume signals, ATS baseline, and overlapping skills. They are useful if you want more application volume."
            jobs={profileMatches}
            emptyCopy="No adjacent-fit roles cleared the current filters."
            savedLookup={savedLookup}
            onSave={handleSaveToTracker}
            onPrep={handleGeneratePrepPack}
            onMock={handleStartMockInterview}
          />
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">Live Context</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  These signals drive the ranking and the quick actions on every job card.
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-red-200" />
            </div>

            <div className="mt-5 grid gap-3">
              <ContextRow
                label="Current target role"
                value={profileReady ? latestTargetRole || filters.role || "Not set" : "Loading..."}
              />
              <ContextRow
                label="Latest resume"
                value={profileReady ? latestResumeVersion || "No analyzed resume yet" : "Loading..."}
              />
              <ContextRow
                label="Latest ATS score"
                value={
                  profileReady
                    ? latestResumeScore != null
                      ? `${latestResumeScore}/100`
                      : "Not available"
                    : "Loading..."
                }
              />
              <ContextRow
                label="Saved tracker entries"
                value={`${applications.length} applications`}
              />
            </div>

            {skillGaps.length ? (
              <div className="mt-5">
                <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                  Key skill gaps
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skillGaps.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border px-3 py-2 text-xs font-semibold"
                      style={{
                        borderColor: "rgba(250,204,21,0.24)",
                        background: "rgba(250,204,21,0.12)",
                        color: "var(--theme-text-strong)",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {recommendations.roleSignals.length ? (
              <div className="mt-5">
                <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                  Role cluster used for ranking
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendations.roleSignals.slice(0, 8).map((role) => (
                    <span
                      key={role}
                      className="rounded-full border px-3 py-2 text-xs font-semibold"
                      style={{
                        borderColor: "rgba(239,68,68,0.24)",
                        background: "rgba(239,68,68,0.1)",
                        color: "var(--theme-text-strong)",
                      }}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              className="mt-5 rounded-[24px] border p-4"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
              }}
            >
              <div className="theme-text-strong text-sm font-bold">Quick actions</div>
              <div className="mt-4 space-y-3">
                <ActionLink
                  to="/workspace/job-applications"
                  icon={Briefcase}
                  label="Open Job Tracker"
                  description="See every saved recommendation as a structured application record."
                />
                <ActionLink
                  to="/workspace/company-prep"
                  icon={Building2}
                  label="Generate Company Prep"
                  description="Turn a selected job into likely rounds, checklist, and risk view."
                />
                <ActionLink
                  to="/workspace/mock-interview"
                  icon={Bot}
                  label="Practice Mock Interview"
                  description="Launch role-specific mock interview practice from recommendation context."
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="theme-text-strong text-xl font-black">How Ranking Works</div>
            <div className="theme-text-muted mt-3 space-y-2 text-sm leading-7">
              <div>Direct role alignment gets the strongest weight.</div>
              <div>Skill overlap with the latest analyzed resume pushes jobs higher.</div>
              <div>Known gap skills reduce the score when the JD depends on them.</div>
              <div>Near deadlines get boosted so urgent openings are harder to miss.</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function RecommendationSection({
  title,
  description,
  jobs,
  emptyCopy,
  savedLookup,
  onSave,
  onPrep,
  onMock,
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="theme-text-strong text-xl font-black">{title}</div>
          <div className="theme-text-muted mt-2 text-sm leading-7">{description}</div>
        </div>
        <div
          className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-surface-0)",
            color: "var(--theme-text-muted)",
          }}
        >
          {jobs.length} jobs
        </div>
      </div>

      {jobs.length ? (
        <div className="mt-5 grid gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedLookup.has(createSavedJobKey(job))}
              onSave={() => onSave(job)}
              onPrep={() => onPrep(job)}
              onMock={() => onMock(job)}
            />
          ))}
        </div>
      ) : (
        <div
          className="mt-5 rounded-[26px] border px-5 py-5 text-sm leading-7"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-surface-0)",
            color: "var(--theme-text-muted)",
          }}
        >
          {emptyCopy}
        </div>
      )}
    </GlassCard>
  );
}

function JobCard({ job, isSaved, onSave, onPrep, onMock }) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="theme-text-strong text-xl font-black">{job.role}</div>
          <div className="theme-text-muted mt-2 inline-flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" />
            {job.company}
          </div>
        </div>
        <div
          className="rounded-full border px-4 py-2 text-sm font-bold"
          style={{
            borderColor: getMatchTone(job.matchScore).border,
            background: getMatchTone(job.matchScore).background,
            color: "var(--theme-text-strong)",
          }}
        >
          {job.matchScore}% match
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag icon={MapPin} label={job.location} />
        <Tag label={formatWorkMode(job.workMode)} />
        <Tag label={job.sourceLabel} />
        <Tag icon={Clock3} label={`Deadline ${formatDateLabel(job.deadline)}`} />
        <Tag label={job.salary} />
      </div>

      <div className="theme-text-muted mt-4 text-sm leading-7">{job.summary}</div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <div className="theme-text-strong text-xs font-semibold uppercase tracking-[0.22em]">
            Why It Matches
          </div>
          <div className="theme-text-muted mt-3 space-y-2 text-sm leading-7">
            {job.whyItMatches.map((reason) => (
              <div key={reason}>{reason}</div>
            ))}
          </div>
        </div>

        <div>
          <div className="theme-text-strong text-xs font-semibold uppercase tracking-[0.22em]">
            Skills Snapshot
          </div>
          {job.matchedSkills.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {job.matchedSkills.slice(0, 4).map((skill) => (
                <span
                  key={`matched-${job.id}-${skill}`}
                  className="rounded-full border px-3 py-2 text-xs font-semibold"
                  style={{
                    borderColor: "rgba(34,197,94,0.24)",
                    background: "rgba(34,197,94,0.12)",
                    color: "var(--theme-text-strong)",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <div className="theme-text-muted mt-3 text-sm">No strong skill overlap detected yet.</div>
          )}

          {job.missingSkills.length ? (
            <div className="mt-4">
              <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                Missing skills
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.missingSkills.map((skill) => (
                  <span
                    key={`missing-${job.id}-${skill}`}
                    className="rounded-full border px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: "rgba(250,204,21,0.24)",
                      background: "rgba(250,204,21,0.12)",
                      color: "var(--theme-text-strong)",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            borderColor: isSaved ? "rgba(34,197,94,0.24)" : "rgba(239,68,68,0.24)",
            background: isSaved ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
            color: "var(--theme-text-strong)",
          }}
          disabled={isSaved}
        >
          <Briefcase className="h-4 w-4" />
          {isSaved ? "Saved In Tracker" : "Save To Tracker"}
        </button>
        <button
          type="button"
          onClick={onPrep}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-surface-0)",
            color: "var(--theme-text-strong)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          Generate Prep Pack
        </button>
        <button
          type="button"
          onClick={onMock}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-surface-0)",
            color: "var(--theme-text-strong)",
          }}
        >
          <Bot className="h-4 w-4" />
          Start Mock Interview
        </button>
        <a
          href={job.applicationUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-surface-0)",
            color: "var(--theme-text-strong)",
          }}
        >
          Open Source
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
            {label}
          </div>
          <div className="theme-text-strong mt-3 text-3xl font-black">{value}</div>
          <div className="theme-text-muted mt-2 text-sm leading-6">{hint}</div>
        </div>
        <div
          className="rounded-2xl border p-3"
          style={{
            borderColor: "rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          <Icon className="h-5 w-5 text-red-100" />
        </div>
      </div>
    </GlassCard>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="theme-text-strong mb-2 text-sm font-semibold">{label}</div>
      {children}
    </label>
  );
}

function ContextRow({ label, value }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-[22px] border px-4 py-3"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="theme-text-muted text-sm">{label}</div>
      <div className="theme-text-strong text-right text-sm font-semibold">{value}</div>
    </div>
  );
}

function ActionLink({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-[22px] border px-4 py-4 transition hover:-translate-y-0.5"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-2xl border p-3"
          style={{
            borderColor: "rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          <Icon className="h-4 w-4 text-red-100" />
        </div>
        <div>
          <div className="theme-text-strong text-sm font-bold">{label}</div>
          <div className="theme-text-muted mt-1 text-sm leading-6">{description}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-red-100" />
    </Link>
  );
}

function Tag({ icon: Icon, label }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold"
      style={{
        borderColor: "var(--theme-border)",
        background: "rgba(255,255,255,0.06)",
        color: "var(--theme-text-strong)",
      }}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </div>
  );
}

function createSavedJobKey(item) {
  return [
    String(item?.company || "").trim().toLowerCase(),
    String(item?.role || "").trim().toLowerCase(),
    String(item?.jobLink || item?.applicationUrl || "").trim().toLowerCase(),
  ].join("::");
}

function buildLatestResumeVersion({ resumeOverview, resumeWorkspace }) {
  const latestAnalysis = resumeWorkspace?.latestAnalysis || {};
  const report = latestAnalysis?.report || {};
  const context = latestAnalysis?.context || {};
  const fileName = String(
    context?.fileName || report?.fileName || resumeOverview?.latestResumeFileName || "",
  ).trim();
  if (!fileName) {
    return "";
  }

  const parts = [fileName];
  const score = normalizeScore(report?.atsScore ?? resumeOverview?.atsScore);
  if (score != null) {
    parts.push(`ATS ${score}/100`);
  }
  return parts.join(" · ");
}

function getMockDifficulty(job) {
  if (job.missingSkills.length >= 3) {
    return "hard";
  }
  if (job.missingSkills.length >= 1 || job.matchScore < 80) {
    return "medium";
  }
  return "easy";
}

function inferInterviewType(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (
    normalizedRole.includes("teacher") ||
    normalizedRole.includes("fellow") ||
    normalizedRole.includes("academic") ||
    normalizedRole.includes("subject")
  ) {
    return "domain";
  }
  if (normalizedRole.includes("analyst")) {
    return "technical";
  }
  return "technical";
}

function formatWorkMode(value) {
  if (value === "on-site") {
    return "On-site";
  }
  return capitalizeWords(value || "Hybrid");
}

function formatDateLabel(value) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeScore(value) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Math.round(Number(value))))
    : null;
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

function capitalizeWords(value) {
  return String(value || "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function daysUntil(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const target = new Date(value);
  const today = new Date();
  if (Number.isNaN(target.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getMatchTone(score) {
  if (score >= 85) {
    return {
      border: "rgba(34,197,94,0.26)",
      background: "rgba(34,197,94,0.12)",
    };
  }
  if (score >= 72) {
    return {
      border: "rgba(56,189,248,0.24)",
      background: "rgba(56,189,248,0.12)",
    };
  }
  return {
    border: "rgba(250,204,21,0.24)",
    background: "rgba(250,204,21,0.12)",
  };
}
