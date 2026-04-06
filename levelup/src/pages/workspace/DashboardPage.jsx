import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Briefcase,
  CalendarDays,
  FileText,
  Mail,
  Mic,
  Phone,
  Sparkles,
  Target,
  Upload,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { normalizeCompanyPrepPacks } from "../../lib/companyPrep";
import { normalizeMockInterviewState } from "../../lib/mockInterview";
import {
  isResumeOwnedByLoggedInUser,
  normalizeResumeName,
} from "../../lib/resumeIdentity";
import { normalizeJobApplications } from "../../lib/userData";

const HOW_TO_STEPS = [
  {
    number: "1",
    title: "Upload Resume",
    description: "Start with the Resume Analyzer and upload your latest resume.",
    to: "/workspace/resume-analyzer",
  },
  {
    number: "2",
    title: "Run Analysis",
    description: "Check ATS score, role fit, and missing skills from one place.",
    to: "/workspace/resume-analyzer",
  },
  {
    number: "3",
    title: "Improve Profile",
    description: "Update your resume using the skill gaps and suggestions.",
    to: "/workspace/skill-gap-analysis",
  },
  {
    number: "4",
    title: "Track Applications",
    description: "Use Job Application Tracker to manage deadlines, rounds, and resume versions.",
    to: "/workspace/job-applications",
  },
];

export default function DashboardPage() {
  const user = useWorkspaceStore((state) => state.user);
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const jobApplications = useWorkspaceStore((state) => state.jobApplications);
  const companyPrepPacks = useWorkspaceStore((state) => state.companyPrepPacks);
  const calendarTasks = useWorkspaceStore((state) => state.calendarTasks);

  const displayName = profile?.name || user.name || "Student";
  const displayEmail = profile?.email || user.email || "Not available";
  const resumeOverview = profile?.resumeOverview || null;
  const accountName = displayName;
  const resumeName = resumeOverview?.parsedName || "";
  const resumeNameMatches = isResumeOwnedByLoggedInUser(accountName, resumeName);
  const hasResumeNameMismatch =
    Boolean(resumeOverview?.status === "analyzed") &&
    normalizeResumeName(resumeName) &&
    !resumeNameMatches;
  const visibleResumeOverview = resumeNameMatches ? resumeOverview : null;
  const careerTwin = buildCareerTwin({
    profile,
    visibleResumeOverview,
    jobApplications,
    companyPrepPacks,
    calendarTasks,
  });

  const summaryCards = [
    {
      label: "ATS Score",
      value: formatOptionalValue(visibleResumeOverview?.atsScore, (current) => `${current}/100`),
    },
    {
      label: "Top Role",
      value: formatOptionalValue(visibleResumeOverview?.topRole),
    },
    {
      label: "Resume",
      value: resumeOverview?.latestResumeFileName ? "Uploaded" : "Not uploaded",
    },
    {
      label: "Status",
      value: getResumeStatusLabel(resumeOverview),
    },
  ];

  const accountRows = [
    {
      label: "Name",
      value: profileReady ? displayName || "Not available" : "Loading...",
      icon: UserRound,
    },
    {
      label: "Email",
      value: profileReady ? displayEmail : "Loading...",
      icon: Mail,
    },
    {
      label: "Phone",
      value: profileReady
        ? normalizeNotFound(visibleResumeOverview?.phone)
        : "Loading...",
      icon: Phone,
    },
    {
      label: "Latest Resume",
      value: profileReady
        ? formatOptionalValue(resumeOverview?.latestResumeFileName)
        : "Loading...",
      icon: FileText,
    },
    {
      label: "Email Status",
      value: profileReady ? (user.emailVerified ? "Verified" : "Not verified") : "Loading...",
      icon: Mail,
    },
  ];

  const resumeRows = [
    {
      label: "ATS Score",
      value: profileReady
        ? formatOptionalValue(visibleResumeOverview?.atsScore, (current) => `${current}/100`)
        : "Loading...",
    },
    {
      label: "Top Role Match",
      value: profileReady
        ? visibleResumeOverview?.topRole
          ? `${visibleResumeOverview.topRole} (${visibleResumeOverview.topRoleMatch || 0}%)`
          : "Not available"
        : "Loading...",
    },
    {
      label: "Education",
      value: profileReady
        ? formatOptionalValue(visibleResumeOverview?.educationLevel)
        : "Loading...",
    },
    {
      label: "Experience",
      value: profileReady
        ? formatOptionalValue(
            visibleResumeOverview?.yearsExperienceDisplay ||
              visibleResumeOverview?.experienceLevel,
          )
        : "Loading...",
    },
    {
      label: "Resume Email",
      value: profileReady
        ? normalizeNotFound(visibleResumeOverview?.parsedEmail)
        : "Loading...",
    },
    {
      label: "Status",
      value: profileReady ? getResumeStatusLabel(visibleResumeOverview) : "Loading...",
    },
  ];

  const resumeNotice = hasResumeNameMismatch
    ? `Resume details are hidden because the parsed resume name "${resumeName || "Not found"}" does not match the logged-in user "${accountName || "Not available"}".`
    : !resumeOverview?.latestResumeFileName
      ? "Upload and analyze a resume from the Resume Analyzer to populate the resume overview for this account."
      : "";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`Overview for ${displayName}.`}
        description="Profile, resume, actions, and modules."
        aside={
          <div className="theme-badge rounded-full border px-4 py-2 text-sm font-medium">
            Live from Firebase
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <GlassCard className="h-full min-h-[124px] p-6">
              <div className="text-xs uppercase tracking-[0.34em] text-white/45">
                {card.label}
              </div>
              <div className="mt-5 text-2xl font-black tracking-tight text-white sm:text-[2.1rem]">
                {profileReady ? card.value : "Loading..."}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard className="overflow-hidden p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-red-100">
              <Bot className="h-4 w-4" />
              Career Twin
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-white">
              One live read of your placement system.
            </div>
            <div className="mt-3 max-w-3xl text-sm leading-8 text-white/65">
              This section combines your verified resume state, target role, application pipeline,
              prep packs, calendar load, and interview patterns to suggest the single next move that
              improves placement readiness fastest.
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            Live from saved workspace data
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TwinMetricCard
                label="Target Role"
                value={profileReady ? careerTwin.targetRole : "Loading..."}
                helper="Current role signal across guidance and resume"
              />
              <TwinMetricCard
                label="Open Pipeline"
                value={profileReady ? `${careerTwin.openApplications}` : "Loading..."}
                helper={`${careerTwin.readyApplications} ready · ${careerTwin.interviewingApplications} interviewing`}
              />
              <TwinMetricCard
                label="Interview Drag"
                value={profileReady ? careerTwin.topWeakSignal : "Loading..."}
                helper={careerTwin.interviewSignalHelper}
              />
              <TwinMetricCard
                label="Prep Load"
                value={profileReady ? `${careerTwin.prepPackCount} prep packs` : "Loading..."}
                helper={`${careerTwin.calendarTaskCount} task reminders live`}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                  Twin Read
                </div>
                <div className="mt-4 text-lg font-semibold text-white">
                  {careerTwin.headline}
                </div>
                <div className="mt-4 grid gap-3">
                  {careerTwin.insights.map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/68"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                  System Chain
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {careerTwin.chain.map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                        item.active
                          ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-black/20 text-white/62"
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>

                {careerTwin.priorityTags.length ? (
                  <>
                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                      Priority Tags
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {careerTwin.priorityTags.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="rounded-[32px] border p-5 lg:p-6"
            style={{
              borderColor: "rgba(239,68,68,0.18)",
              background:
                "linear-gradient(180deg,rgba(239,68,68,0.12),rgba(255,255,255,0.03))",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-100/90">
              Next Best Move
            </div>
            <div className="mt-4 text-2xl font-black tracking-tight text-white">
              {careerTwin.nextMove.title}
            </div>
            <div className="mt-3 text-sm leading-8 text-white/72">
              {careerTwin.nextMove.description}
            </div>

            <Link
              to={careerTwin.nextMove.to}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              {careerTwin.nextMove.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-6 grid gap-3">
              {careerTwin.nextMove.supportingActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70 transition hover:-translate-y-0.5 hover:bg-black/30"
                >
                  <div className="font-semibold text-white">{action.label}</div>
                  <div className="mt-1">{action.helper}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <OverviewPanel title="Account" icon={Sparkles}>
          <div className="mt-6 space-y-4">
            {accountRows.map((row) => (
              <DetailRow key={row.label} {...row} />
            ))}
          </div>
        </OverviewPanel>

        <OverviewPanel title="Resume" icon={Sparkles}>
          <div className="mt-6 space-y-4">
            {resumeRows.map((row) => (
              <DetailRow key={row.label} {...row} />
            ))}
          </div>

          {resumeNotice ? (
            <div
              className={`mt-5 rounded-[28px] border px-5 py-4 text-sm leading-7 ${
                hasResumeNameMismatch
                  ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/65"
              }`}
            >
              {resumeNotice}
            </div>
          ) : null}
        </OverviewPanel>
      </div>

      <GlassCard className="p-6 lg:p-8">
        <div className="text-2xl font-semibold tracking-tight text-white">
          How To Use The App
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {HOW_TO_STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + index * 0.06 }}
            >
              <Link to={step.to}>
                <div className="group h-full rounded-[34px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-red-400/20 hover:bg-white/[0.07]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-red-500/15 to-rose-400/20 text-xl font-black text-red-200">
                      {step.number}
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/45 transition group-hover:translate-x-1 group-hover:text-red-200" />
                  </div>

                  <div className="mt-8 text-[1.9rem] font-black leading-none tracking-tight text-white">
                    {step.title}
                  </div>
                  <div className="mt-5 text-base leading-9 text-white/65">
                    {step.description}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Resume Analyzer"
          description="Upload a fresh resume, run ATS scoring, and save the latest report."
          to="/workspace/resume-analyzer"
          icon={Upload}
        />
        <ActionCard
          title="Career Guidance"
          description="Turn your current profile and resume signals into recommended next moves."
          to="/workspace/career-guidance"
          icon={Briefcase}
        />
        <ActionCard
          title="Skill Gap Analysis"
          description="See what is missing for your target role and prioritize what to learn next."
          to="/workspace/skill-gap-analysis"
          icon={Target}
        />
        <ActionCard
          title="Job Applications"
          description="Track companies, deadlines, interview rounds, and the resume version sent."
          to="/workspace/job-applications"
          icon={Briefcase}
        />
      </div>
    </div>
  );
}

function OverviewPanel({ title, icon: Icon, children }) {
  return (
    <GlassCard className="p-6 lg:p-7">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
        <Icon className="h-4 w-4 text-red-200" />
        {title}
      </div>
      {children}
    </GlassCard>
  );
}

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-white/75">
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-red-200" /> : null}
        <span className="text-base font-medium">{label}</span>
      </div>
      <div className="max-w-full break-words text-base font-semibold text-white sm:max-w-[58%] sm:text-right">
        {value}
      </div>
    </div>
  );
}

function TwinMetricCard({ label, value, helper }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
        {label}
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-2 text-sm leading-7 text-white/58">{helper}</div>
    </div>
  );
}

function ActionCard({ title, description, to, icon: Icon }) {
  return (
    <Link to={to}>
      <GlassCard className="group h-full p-5 transition duration-300 hover:-translate-y-1 hover:border-red-400/20 hover:bg-white/[0.07]">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-200">
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-5 w-5 text-white/35 transition group-hover:translate-x-1 group-hover:text-red-200" />
        </div>
        <div className="mt-6 text-xl font-bold tracking-tight text-white">{title}</div>
        <div className="mt-3 text-sm leading-7 text-white/60">{description}</div>
      </GlassCard>
    </Link>
  );
}

function normalizeNotFound(value) {
  return value && value !== "Not found" ? value : "Not available";
}

function formatOptionalValue(value, formatter = (current) => current) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return formatter(value);
}

function getResumeStatusLabel(resumeOverview) {
  if (!resumeOverview?.latestResumeFileName) {
    return "Not available";
  }

  if (resumeOverview.status === "analyzed") {
    return "Analyzed";
  }

  if (resumeOverview.status) {
    return resumeOverview.status
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return "Uploaded";
}

function buildCareerTwin({
  profile,
  visibleResumeOverview,
  jobApplications,
  companyPrepPacks,
  calendarTasks,
}) {
  const guidance = profile?.careerGuidance || {};
  const applications = normalizeJobApplications(jobApplications);
  const prepPacks = normalizeCompanyPrepPacks(companyPrepPacks);
  const mockInterview = normalizeMockInterviewState(profile?.mockInterview);
  const missingSkills = uniqueStrings([
    ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
    ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
    ...(visibleResumeOverview?.missingSkills || []),
  ]);
  const targetRole =
    guidance.latestTargetRole ||
    visibleResumeOverview?.topRole ||
    guidance.latestRecommendedRoles?.[0]?.role ||
    "Not set";
  const atsScore = Number.isFinite(Number(visibleResumeOverview?.atsScore))
    ? Math.round(Number(visibleResumeOverview.atsScore))
    : null;
  const openApplications = applications.filter((item) => item.status !== "closed");
  const readyApplications = openApplications.filter((item) => item.status === "ready");
  const interviewingApplications = openApplications.filter((item) => item.status === "interviewing");
  const topWeakArea = mockInterview.weakAreasTrend[0]?.label || "";
  const nearestDeadline = getNearestDeadline(openApplications);
  const nextMove = buildCareerTwinNextMove({
    resumeReady: Boolean(visibleResumeOverview?.latestResumeFileName),
    targetRole,
    atsScore,
    missingSkills,
    readyApplications,
    interviewingApplications,
    openApplications,
    topWeakArea,
    prepPackCount: prepPacks.length,
  });

  const headline = !visibleResumeOverview?.latestResumeFileName
    ? "The system is waiting for a trusted resume analysis before it can personalize the full placement loop."
    : `You are currently leaning toward ${targetRole}, with ${openApplications.length} open application${openApplications.length === 1 ? "" : "s"} feeding the pipeline.`;

  const insights = uniqueStrings([
    atsScore != null
      ? `ATS is currently ${atsScore}/100, so ${atsScore >= 80 ? "the bottleneck is no longer the resume baseline alone." : "resume quality is still a direct lever for better role fit and shortlist probability."}`
      : "No ATS score is available yet, so the system is missing its strongest ranking signal.",
    nearestDeadline
      ? `The nearest tracked deadline is ${nearestDeadline.company} · ${nearestDeadline.role} on ${nearestDeadline.deadline}.`
      : "No deadline-driven pressure is visible in the current tracker.",
    topWeakArea
      ? `Mock interviews keep flagging ${topWeakArea} as the most repeated weak pattern.`
      : missingSkills[0]
        ? `${missingSkills[0]} is still showing up as the main missing skill signal.`
        : "The profile has no single dominant weak signal yet, which means execution volume is the next lever.",
  ]).slice(0, 3);

  return {
    targetRole,
    openApplications: openApplications.length,
    readyApplications: readyApplications.length,
    interviewingApplications: interviewingApplications.length,
    prepPackCount: prepPacks.length,
    calendarTaskCount: Array.isArray(calendarTasks) ? calendarTasks.length : 0,
    topWeakSignal: topWeakArea || missingSkills[0] || "No repeated gap yet",
    interviewSignalHelper:
      topWeakArea
        ? `${mockInterview.completedSessions} completed sessions are feeding this signal`
        : mockInterview.completedSessions
          ? `${mockInterview.completedSessions} completed sessions with no repeated weak area`
          : "Complete scored interviews to reveal a repeated pattern",
    headline,
    insights,
    chain: [
      { label: "Resume", active: Boolean(visibleResumeOverview?.latestResumeFileName) },
      { label: "Role", active: targetRole !== "Not set" },
      { label: "Apply", active: openApplications.length > 0 },
      { label: "Prep", active: prepPacks.length > 0 },
      { label: "Interview", active: mockInterview.totalSessions > 0 },
    ],
    priorityTags: uniqueStrings([
      ...(missingSkills.slice(0, 2) || []),
      nearestDeadline ? `Deadline: ${nearestDeadline.company}` : "",
      readyApplications[0]?.company ? `Ready: ${readyApplications[0].company}` : "",
    ]).slice(0, 4),
    nextMove,
  };
}

function buildCareerTwinNextMove({
  resumeReady,
  targetRole,
  atsScore,
  missingSkills,
  readyApplications,
  interviewingApplications,
  openApplications,
  topWeakArea,
  prepPackCount,
}) {
  if (!resumeReady) {
    return {
      title: "Analyze your resume first",
      description:
        "The entire placement loop gets stronger once ATS score, role fit, and missing skills are available from a verified resume analysis.",
      cta: "Open Resume Analyzer",
      to: "/workspace/resume-analyzer",
      supportingActions: [
        {
          label: "Open Career Guidance",
          helper: "Set a target role after the resume analysis lands.",
          to: "/workspace/career-guidance",
        },
      ],
    };
  }

  if (!targetRole || targetRole === "Not set") {
    return {
      title: "Set a target role",
      description:
        "The system can rank jobs, skill gaps, and prep packs better once Career Guidance locks onto one role direction.",
      cta: "Open Career Guidance",
      to: "/workspace/career-guidance",
      supportingActions: [
        {
          label: "Review Resume Signals",
          helper: "Check whether the current top role from the resume still makes sense.",
          to: "/workspace/resume-analyzer",
        },
      ],
    };
  }

  if (readyApplications.length) {
    const nextApplication = readyApplications[0];
    return {
      title: `Submit the ready ${nextApplication.company} application`,
      description:
        "A tracker entry is already marked Ready To Apply, so the fastest gain now is moving it into the submitted pipeline and activating follow-up reminders.",
      cta: "Open Job Tracker",
      to: "/workspace/job-applications",
      supportingActions: [
        {
          label: "Review Company Prep",
          helper: "Check likely rounds and risk areas before you submit.",
          to: "/workspace/company-prep",
        },
      ],
    };
  }

  if (interviewingApplications.length || topWeakArea) {
    return {
      title: "Run one targeted mock interview",
      description:
        topWeakArea
          ? `${topWeakArea} is the weakest repeated interview signal right now, so a focused drill will raise readiness faster than another generic practice round.`
          : "An interview is already active in the pipeline, so the best next move is a targeted practice round before the real process advances.",
      cta: "Open Mock Interview",
      to: "/workspace/mock-interview",
      supportingActions: [
        {
          label: "Open Company Prep",
          helper: "Use likely rounds and topics to focus the drill.",
          to: "/workspace/company-prep",
        },
      ],
    };
  }

  if (atsScore != null && atsScore < 80) {
    return {
      title: "Push ATS above the current baseline",
      description:
        "The resume still has headroom. Raising ATS before scaling applications improves role fit, keyword coverage, and tracker quality at the same time.",
      cta: "Improve Resume",
      to: "/workspace/resume-analyzer",
      supportingActions: [
        {
          label: "Open Skill Gap Analysis",
          helper: "Prioritize the skill signals that are dragging ATS and role match down.",
          to: "/workspace/skill-gap-analysis",
        },
      ],
    };
  }

  if (missingSkills.length) {
    return {
      title: `Close ${missingSkills[0]} before scaling applications`,
      description:
        "The current role direction is clear, but one visible skill gap is still holding back stronger fit and better prep outcomes.",
      cta: "Open Skill Gap Analysis",
      to: "/workspace/skill-gap-analysis",
      supportingActions: [
        {
          label: "Open Adaptive Learning",
          helper: "Turn the gap into a concrete learning sprint.",
          to: "/workspace/adaptive-learning",
        },
      ],
    };
  }

  if (!openApplications.length) {
    return {
      title: "Turn readiness into applications",
      description:
        "The profile is in workable shape, but the pipeline is empty. The next lift is to convert fit into live opportunities.",
      cta: "Open Recommended Jobs",
      to: "/workspace/recommended-jobs",
      supportingActions: [
        {
          label: "Open Job Tracker",
          helper: "Save shortlisted roles and begin the application loop.",
          to: "/workspace/job-applications",
        },
      ],
    };
  }

  return {
    title: prepPackCount ? "Review your prep packs" : "Strengthen company-specific preparation",
    description:
      prepPackCount
        ? "The system already has company-specific prep context saved, so the next gain is execution quality, not more setup."
        : "You have live opportunities, but no saved prep context yet. Company prep will tighten interview readiness.",
    cta: "Open Company Prep",
    to: "/workspace/company-prep",
    supportingActions: [
      {
        label: "Open Task Calendar",
        helper: "Convert the next move into scheduled reminders and prep blocks.",
        to: "/workspace/task-calendar",
      },
    ],
  };
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

function getNearestDeadline(applications) {
  return (Array.isArray(applications) ? applications : [])
    .filter(
      (item) =>
        item.deadline &&
        ["wishlist", "ready", "applied"].includes(String(item.status || "").toLowerCase()),
    )
    .map((item) => ({
      company: item.company,
      role: item.role,
      deadline: item.deadline,
      deadlineTime: new Date(item.deadline).getTime(),
    }))
    .filter((item) => !Number.isNaN(item.deadlineTime))
    .sort((left, right) => left.deadlineTime - right.deadlineTime)[0] || null;
}
