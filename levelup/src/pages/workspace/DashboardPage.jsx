import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Mail,
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
import {
  isResumeOwnedByLoggedInUser,
  normalizeResumeName,
} from "../../lib/resumeIdentity";

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
