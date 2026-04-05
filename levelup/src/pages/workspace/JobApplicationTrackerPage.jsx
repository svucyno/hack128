import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { normalizeCompanyPrepPacks } from "../../lib/companyPrep";
import { normalizeJobApplications } from "../../lib/userData";

const STATUS_COLUMNS = [
  {
    key: "wishlist",
    label: "Wishlist",
    description: "Interesting roles worth tracking before you invest time tailoring.",
    accent: "rgba(168, 85, 247, 0.2)",
  },
  {
    key: "ready",
    label: "Ready To Apply",
    description: "JD reviewed, resume tailored, ATS checked, and deadline known.",
    accent: "rgba(56, 189, 248, 0.2)",
  },
  {
    key: "applied",
    label: "Applied",
    description: "Submitted already, now waiting for response or next movement.",
    accent: "rgba(249, 115, 22, 0.2)",
  },
  {
    key: "interviewing",
    label: "Interviewing",
    description: "At least one round, test, or assignment is now in motion.",
    accent: "rgba(250, 204, 21, 0.2)",
  },
  {
    key: "offer",
    label: "Offer",
    description: "Positive stage, decision pending, or negotiation is active.",
    accent: "rgba(34, 197, 94, 0.22)",
  },
  {
    key: "closed",
    label: "Closed",
    description: "Rejected, withdrawn, expired, or no longer relevant.",
    accent: "rgba(239, 68, 68, 0.2)",
  },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Select source" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "unstop", label: "Unstop" },
  { value: "careers", label: "Careers Page" },
  { value: "referral", label: "Referral" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

const WORK_MODE_OPTIONS = [
  { value: "", label: "Select mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "responded", label: "Responded" },
  { value: "not-needed", label: "Not needed" },
];

const ROUND_TYPE_OPTIONS = [
  { value: "hr", label: "HR" },
  { value: "technical", label: "Technical" },
  { value: "demo", label: "Demo" },
  { value: "managerial", label: "Managerial" },
  { value: "teaching-demo", label: "Teaching Demo" },
  { value: "assignment", label: "Assignment" },
  { value: "other", label: "Other" },
];

const ROUND_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "cleared", label: "Cleared" },
  { value: "rejected", label: "Rejected" },
];

const TASK_SYNC_DEFAULTS = {
  deadline: true,
  followUp: true,
  interview: true,
};

const EMPTY_ROUND_DRAFT = {
  name: "",
  date: "",
  time: "",
  type: "technical",
  status: "planned",
  prepFocus: "",
  notes: "",
};

const FIELD_CLASS =
  "w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:scale-[1.005]";

const FIELD_STYLE = {
  background: "var(--theme-surface-0)",
  borderColor: "var(--theme-border)",
  color: "var(--theme-text-strong)",
};

export default function JobApplicationTrackerPage() {
  const navigate = useNavigate();
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const calendarTasks = useWorkspaceStore((state) => state.calendarTasks);
  const setCalendarTasks = useWorkspaceStore((state) => state.setCalendarTasks);
  const jobApplications = useWorkspaceStore((state) => state.jobApplications);
  const companyPrepPacks = useWorkspaceStore((state) => state.companyPrepPacks);
  const setJobApplications = useWorkspaceStore((state) => state.setJobApplications);

  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const guidance = profile?.careerGuidance || {};
  const latestResumeVersion = buildLatestResumeVersion({ resumeOverview, resumeWorkspace });
  const latestResumeScore = getLatestResumeScore({ resumeOverview, resumeWorkspace });
  const latestResumeRole = getLatestResumeRole({ resumeOverview, resumeWorkspace });
  const activeTargetRole = String(
    guidance.latestTargetRole ||
      guidance.latestRecommendedRoles?.[0]?.role ||
      latestResumeRole ||
      "",
  ).trim();
  const recommendedRoles = (Array.isArray(guidance.latestRecommendedRoles)
    ? guidance.latestRecommendedRoles
    : []
  )
    .map((role) => ({
      role: String(role?.role || "").trim(),
      fitScore: normalizeScore(role?.fitScore ?? role?.match),
    }))
    .filter((role) => role.role);
  const prioritySkills = uniqueStrings([
    ...(guidance?.latestSkillGapAnalysis?.prioritySkills || []),
    ...(guidance?.latestSkillGapAnalysis?.missingSkills || []),
    ...(resumeWorkspace?.latestAnalysis?.report?.missingSkills || []),
    ...(resumeOverview?.missingSkills || []),
  ]).slice(0, 10);
  const applications = normalizeJobApplications(jobApplications).sort(compareApplications);
  const prepPackLookup = normalizeCompanyPrepPacks(companyPrepPacks)
    .sort(
      (left, right) =>
        new Date(right.updatedAtIso || right.generatedAtIso || 0).getTime() -
        new Date(left.updatedAtIso || left.generatedAtIso || 0).getTime(),
    )
    .reduce((lookup, pack) => {
      if (pack.applicationId && !lookup.has(pack.applicationId)) {
        lookup.set(pack.applicationId, pack);
      }
      return lookup;
    }, new Map());

  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [dropStatus, setDropStatus] = useState("");
  const [roundDraft, setRoundDraft] = useState(EMPTY_ROUND_DRAFT);
  const [form, setForm] = useState(() =>
    createEmptyForm({
      defaultRole: activeTargetRole,
      defaultResumeVersion: latestResumeVersion,
      defaultResumeScore: latestResumeScore,
    }),
  );

  useEffect(() => {
    if (editingId) {
      return;
    }

    setForm((current) => {
      const nextForm = { ...current };
      let changed = false;

      if (!nextForm.role && activeTargetRole) {
        nextForm.role = activeTargetRole;
        changed = true;
      }

      if (!nextForm.linkedResumeVersion && latestResumeVersion) {
        nextForm.linkedResumeVersion = latestResumeVersion;
        changed = true;
      }

      if (
        (nextForm.linkedResumeScore === "" || nextForm.linkedResumeScore === null) &&
        latestResumeScore !== null
      ) {
        nextForm.linkedResumeScore = String(latestResumeScore);
        changed = true;
      }

      return changed ? nextForm : current;
    });
  }, [activeTargetRole, editingId, latestResumeScore, latestResumeVersion]);

  const openApplications = applications.filter(
    (application) => !["offer", "closed"].includes(application.status),
  );
  const applicationsThisWeek = applications.filter((application) =>
    isWithinLastDays(application.savedDate || application.createdAtIso, 7),
  ).length;
  const upcomingDeadlines = applications
    .filter(
      (application) =>
        application.deadline &&
        ["wishlist", "ready"].includes(application.status) &&
        isTodayOrFuture(application.deadline),
    )
    .sort(
      (left, right) =>
        toDateObject(left.deadline).getTime() - toDateObject(right.deadline).getTime(),
    );
  const upcomingRounds = applications
    .flatMap((application) =>
      application.interviewRounds
        .filter(
          (round) =>
            round.status === "planned" &&
            getRoundScheduledAt(round) &&
            isTodayOrFuture(getRoundScheduledAt(round)),
        )
        .map((round) => ({
          applicationId: application.id,
          company: application.company,
          role: application.role,
          round,
        })),
    )
    .sort(
      (left, right) =>
        toDateObject(getRoundScheduledAt(left.round)).getTime() -
        toDateObject(getRoundScheduledAt(right.round)).getTime(),
    );
  const followUpsDue = applications
    .filter(
      (application) =>
        application.followUpDate &&
        ["applied", "interviewing"].includes(application.status) &&
        !application.responseReceived &&
        isTodayOrFutureOrOverdue(application.followUpDate),
    )
    .sort(
      (left, right) =>
        toDateObject(left.followUpDate).getTime() - toDateObject(right.followUpDate).getTime(),
    );
  const bestLinkedScore = getBestLinkedScore(applications, latestResumeScore);
  const mostUsedResumeVersion = getMostUsedResumeVersion(applications) || latestResumeVersion || "";
  const wishlistToApplied = formatRate(
    applications.filter((application) => hasApplied(application)).length,
    applications.length,
  );
  const appliedToInterviewing = formatRate(
    applications.filter((application) => hasInterviewStarted(application)).length,
    applications.filter((application) => hasApplied(application)).length,
  );
  const interviewingToOffer = formatRate(
    applications.filter((application) => application.status === "offer").length,
    applications.filter((application) => hasInterviewStarted(application)).length,
  );
  const applicationsByStatus = STATUS_COLUMNS.reduce((accumulator, column) => {
    accumulator[column.key] = applications.filter((application) => application.status === column.key);
    return accumulator;
  }, {});
  const upcomingMoves = buildUpcomingMoves(applications);
  const previewApplication = buildPreviewApplication(form);
  const readyChecklist = buildReadyChecklist(previewApplication);

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTaskSyncChange = (field, value) => {
    setForm((current) => ({
      ...current,
      taskSync: {
        ...current.taskSync,
        [field]: value,
      },
    }));
  };

  const handleRoundDraftChange = (field, value) => {
    setRoundDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddRound = () => {
    const candidateRound = sanitizeInterviewRounds([
      {
        id: createRoundId(),
        ...roundDraft,
      },
    ])[0];

    if (!candidateRound?.name) {
      setError("Add a round name before saving the interview round.");
      return;
    }

    setForm((current) => ({
      ...current,
      interviewRounds: [...current.interviewRounds, candidateRound],
    }));
    setRoundDraft(EMPTY_ROUND_DRAFT);
    setError("");
  };

  const handleRemoveRound = (roundId) => {
    setForm((current) => ({
      ...current,
      interviewRounds: current.interviewRounds.filter((round) => round.id !== roundId),
    }));
  };

  const handleUseLatestResume = () => {
    setForm((current) => ({
      ...current,
      linkedResumeVersion: latestResumeVersion,
      linkedResumeScore:
        latestResumeScore == null ? current.linkedResumeScore : String(latestResumeScore),
    }));
  };

  const resetComposer = () => {
    setEditingId("");
    setError("");
    setRoundDraft(EMPTY_ROUND_DRAFT);
    setForm(
      createEmptyForm({
        defaultRole: activeTargetRole,
        defaultResumeVersion: latestResumeVersion,
        defaultResumeScore: latestResumeScore,
      }),
    );
  };

  const handleEditApplication = (application) => {
    setEditingId(application.id);
    setError("");
    setRoundDraft(EMPTY_ROUND_DRAFT);
    setForm({
      company: application.company,
      role: application.role,
      department: application.department,
      jobLocation: application.jobLocation,
      workMode: application.workMode,
      salary: application.salary,
      source: application.source,
      jobLink: application.jobLink,
      applicationLink: application.applicationLink,
      jobDescription: application.jobDescription,
      requiredSkillsText: formatTagInput(application.requiredSkills),
      mustHaveKeywordsText: formatTagInput(application.mustHaveKeywords),
      importantKeywordsText: formatTagInput(application.importantKeywords),
      experienceRequired: application.experienceRequired,
      eligibility: application.eligibility,
      linkedResumeVersion: application.linkedResumeVersion,
      linkedResumeScore:
        application.linkedResumeScore == null ? "" : String(application.linkedResumeScore),
      resumeTailored: application.resumeTailored,
      portfolioUrl: application.portfolioUrl,
      githubUrl: application.githubUrl,
      linkedinUrl: application.linkedinUrl,
      status: application.status,
      priority: application.priority,
      savedDate: application.savedDate || getTodayInput(),
      appliedDate: application.appliedDate,
      deadline: application.deadline,
      recruiterName: application.recruiterName,
      recruiterContact: application.recruiterContact,
      referralUsed: application.referralUsed,
      interviewRounds: application.interviewRounds || [],
      followUpDate: application.followUpDate,
      followUpStatus: application.followUpStatus,
      responseReceived: application.responseReceived,
      nextAction: application.nextAction,
      whyFit: application.whyFit,
      resumeChangesNeeded: application.resumeChangesNeeded,
      talkingPoints: application.talkingPoints,
      risksGaps: application.risksGaps,
      compensationNotes: application.compensationNotes,
      customizationsMade: application.customizationsMade,
      strategyNotes: application.strategyNotes || application.notes || "",
      finalOutcome: application.finalOutcome,
      taskSync: {
        deadline: application.taskSync?.deadline !== false,
        followUp: application.taskSync?.followUp !== false,
        interview: application.taskSync?.interview !== false,
      },
    });
  };

  const handleDeleteApplication = (applicationId) => {
    setJobApplications(applications.filter((application) => application.id !== applicationId));
    setCalendarTasks(removeGeneratedCalendarTasks(calendarTasks, applicationId));
    if (editingId === applicationId) {
      resetComposer();
    }
  };

  const handleOpenPrepPack = (application) => {
    const existingPack = prepPackLookup.get(application.id) || null;
    navigate("/workspace/company-prep", {
      state: {
        packId: existingPack?.id || "",
        seed: buildCompanyPrepSeed(application),
      },
    });
  };

  const handleStatusDrop = (status) => {
    if (!draggingId) {
      setDropStatus("");
      return;
    }

    const existing = applications.find((application) => application.id === draggingId);
    if (!existing) {
      setDraggingId("");
      setDropStatus("");
      return;
    }

    const updatedApplication = finalizeApplication(
      {
        ...existing,
        status,
        updatedAtIso: new Date().toISOString(),
      },
      existing,
    );
    const statusError = getStatusBlockingError(updatedApplication);
    if (statusError) {
      setError(statusError);
      setDraggingId("");
      setDropStatus("");
      return;
    }

    const nextApplications = applications
      .map((application) =>
        application.id === updatedApplication.id ? updatedApplication : application,
      )
      .sort(compareApplications);

    setJobApplications(nextApplications);
    setCalendarTasks(syncApplicationTasks(calendarTasks, updatedApplication));
    setDraggingId("");
    setDropStatus("");
    setError("");

    if (editingId === updatedApplication.id) {
      handleEditApplication(updatedApplication);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const company = form.company.trim();
    const role = form.role.trim();
    if (!company || !role) {
      setError("Company and role are required to save an application.");
      return;
    }

    const nowIso = new Date().toISOString();
    const applicationId = editingId || createApplicationId();
    const existingApplication = applications.find((application) => application.id === applicationId);
    const nextApplication = finalizeApplication(
      {
        id: applicationId,
        company,
        role,
        department: form.department.trim(),
        jobLocation: form.jobLocation.trim(),
        workMode: form.workMode,
        salary: form.salary.trim(),
        source: form.source,
        jobLink: form.jobLink.trim(),
        applicationLink: form.applicationLink.trim(),
        jobDescription: form.jobDescription.trim(),
        requiredSkills: parseTagInput(form.requiredSkillsText),
        mustHaveKeywords: parseTagInput(form.mustHaveKeywordsText),
        importantKeywords: parseTagInput(form.importantKeywordsText),
        experienceRequired: form.experienceRequired.trim(),
        eligibility: form.eligibility.trim(),
        linkedResumeVersion: form.linkedResumeVersion.trim(),
        linkedResumeScore: normalizeScore(form.linkedResumeScore),
        resumeTailored: Boolean(form.resumeTailored),
        portfolioUrl: form.portfolioUrl.trim(),
        githubUrl: form.githubUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        status: form.status,
        priority: form.priority,
        savedDate: form.savedDate,
        appliedDate: form.appliedDate,
        deadline: form.deadline,
        recruiterName: form.recruiterName.trim(),
        recruiterContact: form.recruiterContact.trim(),
        referralUsed: Boolean(form.referralUsed),
        interviewRounds: sanitizeInterviewRounds(form.interviewRounds),
        followUpDate: form.followUpDate,
        followUpStatus: form.followUpStatus,
        responseReceived: Boolean(form.responseReceived),
        nextAction: form.nextAction.trim(),
        whyFit: form.whyFit.trim(),
        resumeChangesNeeded: form.resumeChangesNeeded.trim(),
        talkingPoints: form.talkingPoints.trim(),
        risksGaps: form.risksGaps.trim(),
        compensationNotes: form.compensationNotes.trim(),
        customizationsMade: form.customizationsMade.trim(),
        strategyNotes: form.strategyNotes.trim(),
        finalOutcome: form.finalOutcome.trim(),
        createdAtIso: existingApplication?.createdAtIso || nowIso,
        updatedAtIso: nowIso,
        taskSync: {
          deadline: Boolean(form.taskSync.deadline),
          followUp: Boolean(form.taskSync.followUp),
          interview: Boolean(form.taskSync.interview),
        },
      },
      existingApplication,
    );

    const statusError = getStatusBlockingError(nextApplication);
    if (statusError) {
      setError(statusError);
      return;
    }

    const nextApplications = editingId
      ? applications.map((application) =>
          application.id === nextApplication.id ? nextApplication : application,
        )
      : [nextApplication, ...applications];

    setJobApplications(nextApplications.sort(compareApplications));
    setCalendarTasks(syncApplicationTasks(calendarTasks, nextApplication));
    resetComposer();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Placement Control Panel"
        title="Job Application Tracker"
        description="Track one application as one complete record: company, JD, linked resume version, ATS score, follow-ups, interview rounds, notes, and task sync. This is the control panel between Career Guidance, Resume Analyzer, and Task Calendar."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/workspace/resume-analyzer"
              className="theme-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            >
              <FileText className="h-4 w-4" />
              Resume Analyzer
            </Link>
            <Link
              to="/workspace/career-guidance"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
                color: "var(--theme-text-strong)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Career Guidance
            </Link>
            <Link
              to="/workspace/task-calendar"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
                color: "var(--theme-text-strong)",
              }}
            >
              <CalendarDays className="h-4 w-4" />
              Task Calendar
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
              <Sparkles className="h-4 w-4" />
              Company Prep
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TrackerStat
          label="Total Applications"
          value={String(applications.length)}
          hint="Every saved opportunity across all stages"
          icon={Briefcase}
        />
        <TrackerStat
          label="Open Applications"
          value={String(openApplications.length)}
          hint="Anything not moved to Offer or Closed"
          icon={Target}
        />
        <TrackerStat
          label="Applications This Week"
          value={String(applicationsThisWeek)}
          hint="Entries added in the last 7 days"
          icon={CalendarDays}
        />
        <TrackerStat
          label="Upcoming Deadlines"
          value={String(upcomingDeadlines.length)}
          hint={
            upcomingDeadlines[0]?.deadline
              ? `Next: ${formatDateLabel(upcomingDeadlines[0].deadline)}`
              : "No saved deadlines yet"
          }
          icon={Clock3}
        />
        <TrackerStat
          label="Upcoming Interview Rounds"
          value={String(upcomingRounds.length)}
          hint={
            upcomingRounds[0]?.round
              ? `${upcomingRounds[0].company} · ${upcomingRounds[0].round.name}`
              : "No rounds scheduled yet"
          }
          icon={Clock3}
        />
        <TrackerStat
          label="Best ATS Score"
          value={bestLinkedScore != null ? `${bestLinkedScore}/100` : "N/A"}
          hint="Highest ATS snapshot linked to any application"
          icon={Target}
        />
        <TrackerStat
          label="Most Used Resume"
          value={mostUsedResumeVersion ? truncateText(mostUsedResumeVersion, 38) : "Not linked"}
          hint="Resume version used most often across the pipeline"
          icon={FileText}
        />
        <TrackerStat
          label="Follow-Ups Due"
          value={String(followUpsDue.length)}
          hint={
            followUpsDue[0]?.followUpDate
              ? `Next: ${formatDateLabel(followUpsDue[0].followUpDate)}`
              : "No follow-up reminders pending"
          }
          icon={Link2}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <ConversionCard
          wishlistToApplied={wishlistToApplied}
          appliedToInterviewing={appliedToInterviewing}
          interviewingToOffer={interviewingToOffer}
        />

        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="theme-text-strong text-xl font-black">Live Context</div>
              <div className="theme-text-muted mt-2 text-sm leading-7">
                Current defaults pulled from Career Guidance and the latest analyzed resume.
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-red-200" />
          </div>

          <div className="mt-5 grid gap-3">
            <ContextRow
              label="Current target role"
              value={profileReady ? activeTargetRole || "Not selected yet" : "Loading..."}
            />
            <ContextRow
              label="Latest resume version"
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
              label="Resume top role"
              value={profileReady ? latestResumeRole || "Not available" : "Loading..."}
            />
          </div>

          {recommendedRoles.length ? (
            <div className="mt-5">
              <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                Suggested Roles
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendedRoles.slice(0, 5).map((role) => (
                  <button
                    key={`${role.role}-${role.fitScore}`}
                    type="button"
                    onClick={() => handleFormChange("role", role.role)}
                    className="rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{
                      borderColor: "rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.1)",
                      color: "var(--theme-text-strong)",
                    }}
                  >
                    {role.role}
                    {role.fitScore != null ? ` · ${role.fitScore}%` : ""}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {prioritySkills.length ? (
            <div className="mt-5">
              <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                Priority Gaps To Watch
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {prioritySkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: "rgba(250,204,21,0.2)",
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

          <div
            className="mt-5 rounded-[24px] border p-4"
            style={{
              borderColor: "var(--theme-border)",
              background: "var(--theme-surface-0)",
            }}
          >
            <div className="theme-text-strong text-sm font-bold">Status Rules</div>
            <div className="theme-text-muted mt-3 space-y-2 text-sm leading-7">
              {STATUS_COLUMNS.map((column) => (
                <div key={column.key}>
                  <span className="theme-text-strong font-semibold">{column.label}:</span>{" "}
                  {column.description}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <div className="space-y-6">
          <GlassCard className="overflow-hidden p-0">
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-5 sm:px-6"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <div>
                <div className="theme-text-strong text-xl font-black">Application Pipeline</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Discover role, save it to Wishlist, move it to Ready To Apply only after the prep
                  work is done, then track follow-ups, rounds, and final outcome from the same card.
                </div>
              </div>

              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "var(--theme-surface-0)",
                  color: "var(--theme-text-muted)",
                }}
              >
                <Link2 className="h-4 w-4" />
                One application = one complete record
              </div>
            </div>

            <div className="overflow-x-auto p-4 sm:p-5">
              <div className="grid min-w-[1680px] grid-flow-col auto-cols-[280px] gap-4">
                {STATUS_COLUMNS.map((column) => (
                  <StatusColumn
                    key={column.key}
                    column={column}
                    applications={applicationsByStatus[column.key] || []}
                    dropStatus={dropStatus}
                    onDragOver={() => setDropStatus(column.key)}
                    onDrop={() => handleStatusDrop(column.key)}
                    onEdit={handleEditApplication}
                    onDelete={handleDeleteApplication}
                    onOpenPrep={handleOpenPrepPack}
                    onDragStart={(applicationId) => setDraggingId(applicationId)}
                    onDragEnd={() => {
                      setDraggingId("");
                      setDropStatus("");
                    }}
                    getHasPrepPack={(applicationId) => prepPackLookup.has(applicationId)}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">Upcoming Moves</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Deadlines, follow-ups, and interview actions generated from the tracker.
                </div>
              </div>
              <Link
                to="/workspace/task-calendar"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "var(--theme-surface-0)",
                  color: "var(--theme-text-strong)",
                }}
              >
                Open Task Calendar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {upcomingMoves.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {upcomingMoves.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] border p-4"
                    style={{
                      borderColor: "var(--theme-border)",
                      background: "var(--theme-surface-0)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="theme-text-strong text-sm font-bold">{item.company}</div>
                        <div className="theme-text-muted mt-1 text-sm">{item.title}</div>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                        style={{
                          background: getMoveTone(item.kind).background,
                          color: getMoveTone(item.kind).color,
                        }}
                      >
                        {item.kind}
                      </span>
                    </div>
                    <div className="theme-text-strong mt-4 text-base font-semibold">
                      {item.kind === "interview"
                        ? formatDateTimeLabel(item.when)
                        : formatDateLabel(item.when)}
                    </div>
                    <div className="theme-text-muted mt-2 text-sm leading-7">{item.summary}</div>
                  </div>
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
                No live actions yet. Add a deadline, follow-up date, or interview round and this
                list will fill automatically.
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">
                  {editingId ? "Edit Application" : "Add Application"}
                </div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Use the exact flow: basic info, JD, resume link, timeline, status, rounds, notes,
                  then task sync.
                </div>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetComposer}
                  className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--theme-border)",
                    background: "var(--theme-surface-0)",
                    color: "var(--theme-text-strong)",
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
              <SectionCard
                title="A. Basic Info"
                description="Company, role, source, links, location, work mode, and package."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company">
                    <input
                      value={form.company}
                      onChange={(event) => handleFormChange("company", event.target.value)}
                      placeholder="Example: Zoho"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Role Title">
                    <input
                      value={form.role}
                      onChange={(event) => handleFormChange("role", event.target.value)}
                      placeholder="Example: Teacher"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Department / Category">
                    <input
                      value={form.department}
                      onChange={(event) => handleFormChange("department", event.target.value)}
                      placeholder="Example: Teaching / Product / Backend"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Source">
                    <select
                      value={form.source}
                      onChange={(event) => handleFormChange("source", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Job Link">
                    <input
                      type="url"
                      value={form.jobLink}
                      onChange={(event) => handleFormChange("jobLink", event.target.value)}
                      placeholder="https://..."
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Job Location">
                    <input
                      value={form.jobLocation}
                      onChange={(event) => handleFormChange("jobLocation", event.target.value)}
                      placeholder="Example: Chennai"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Work Mode">
                    <select
                      value={form.workMode}
                      onChange={(event) => handleFormChange("workMode", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {WORK_MODE_OPTIONS.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Salary / Package">
                    <input
                      value={form.salary}
                      onChange={(event) => handleFormChange("salary", event.target.value)}
                      placeholder="Example: 6.5 LPA"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="B. JD Information"
                description="Paste the job description, extract the main skills, and capture must-have keywords."
              >
                <Field label="Full JD">
                  <textarea
                    value={form.jobDescription}
                    onChange={(event) => handleFormChange("jobDescription", event.target.value)}
                    placeholder="Paste the full job description here."
                    rows={6}
                    className={`${FIELD_CLASS} resize-none`}
                    style={FIELD_STYLE}
                  />
                </Field>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Key Skills Required">
                    <textarea
                      value={form.requiredSkillsText}
                      onChange={(event) =>
                        handleFormChange("requiredSkillsText", event.target.value)
                      }
                      placeholder="Teaching, lesson planning, classroom management"
                      rows={3}
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Must-Have Keywords">
                    <textarea
                      value={form.mustHaveKeywordsText}
                      onChange={(event) =>
                        handleFormChange("mustHaveKeywordsText", event.target.value)
                      }
                      placeholder="Comma or new-line separated keywords"
                      rows={3}
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Important Keywords From JD">
                    <textarea
                      value={form.importantKeywordsText}
                      onChange={(event) =>
                        handleFormChange("importantKeywordsText", event.target.value)
                      }
                      placeholder="Keywords you want to check on the resume"
                      rows={3}
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Experience Required">
                    <input
                      value={form.experienceRequired}
                      onChange={(event) =>
                        handleFormChange("experienceRequired", event.target.value)
                      }
                      placeholder="Example: 0-2 years"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Eligibility / Education">
                    <textarea
                      value={form.eligibility}
                      onChange={(event) => handleFormChange("eligibility", event.target.value)}
                      placeholder="Eligibility, education requirements, or hiring constraints"
                      rows={3}
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="C. Resume Link"
                description="Attach the exact resume version, ATS score, and extra proof links used for this application."
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Field label="Resume Version">
                    <div className="space-y-3">
                      <input
                        value={form.linkedResumeVersion}
                        onChange={(event) =>
                          handleFormChange("linkedResumeVersion", event.target.value)
                        }
                        placeholder="Example: SathvikResume.pdf · ATS 68/100"
                        className={FIELD_CLASS}
                        style={FIELD_STYLE}
                      />
                      <button
                        type="button"
                        onClick={handleUseLatestResume}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:-translate-y-0.5"
                        style={{
                          borderColor: "rgba(56,189,248,0.22)",
                          background: "rgba(56,189,248,0.08)",
                          color: "var(--theme-text-strong)",
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Use latest
                      </button>
                    </div>
                  </Field>
                  <Field label="ATS Score">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.linkedResumeScore}
                      onChange={(event) =>
                        handleFormChange("linkedResumeScore", event.target.value)
                      }
                      placeholder="0-100"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <ToggleField
                    label="Resume Tailored?"
                    value={form.resumeTailored}
                    onChange={(value) => handleFormChange("resumeTailored", value)}
                  />
                </div>

                <div className="mt-4 grid gap-4">
                  <Field label="Portfolio URL">
                    <input
                      type="url"
                      value={form.portfolioUrl}
                      onChange={(event) => handleFormChange("portfolioUrl", event.target.value)}
                      placeholder="https://portfolio.example.com"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="GitHub URL">
                    <input
                      type="url"
                      value={form.githubUrl}
                      onChange={(event) => handleFormChange("githubUrl", event.target.value)}
                      placeholder="https://github.com/username"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="LinkedIn URL">
                    <input
                      type="url"
                      value={form.linkedinUrl}
                      onChange={(event) => handleFormChange("linkedinUrl", event.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="D. Timeline"
                description="Saved date, applied date, deadline, and follow-up date."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Saved Date">
                    <input
                      type="date"
                      value={form.savedDate}
                      onChange={(event) => handleFormChange("savedDate", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Applied Date">
                    <input
                      type="date"
                      value={form.appliedDate}
                      onChange={(event) => handleFormChange("appliedDate", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Deadline">
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(event) => handleFormChange("deadline", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Follow-Up Date">
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(event) => handleFormChange("followUpDate", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="E. Status"
                description="Pipeline stage, priority, recruiter details, referral flag, and next action."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current Status">
                    <select
                      value={form.status}
                      onChange={(event) => handleFormChange("status", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {STATUS_COLUMNS.map((column) => (
                        <option key={column.key} value={column.key}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      value={form.priority}
                      onChange={(event) => handleFormChange("priority", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Application Link">
                    <input
                      type="url"
                      value={form.applicationLink}
                      onChange={(event) => handleFormChange("applicationLink", event.target.value)}
                      placeholder="Exact application or portal link"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Recruiter Name">
                    <input
                      value={form.recruiterName}
                      onChange={(event) => handleFormChange("recruiterName", event.target.value)}
                      placeholder="Recruiter or hiring contact"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Recruiter Contact">
                    <input
                      value={form.recruiterContact}
                      onChange={(event) =>
                        handleFormChange("recruiterContact", event.target.value)
                      }
                      placeholder="Email, phone, or LinkedIn"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Follow-Up Status">
                    <select
                      value={form.followUpStatus}
                      onChange={(event) => handleFormChange("followUpStatus", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {FOLLOW_UP_STATUS_OPTIONS.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ToggleField
                    label="Referral Used?"
                    value={form.referralUsed}
                    onChange={(value) => handleFormChange("referralUsed", value)}
                  />
                  <ToggleField
                    label="Response Received?"
                    value={form.responseReceived}
                    onChange={(value) => handleFormChange("responseReceived", value)}
                  />
                </div>

                <div className="mt-4">
                  <Field label="Next Action">
                    <textarea
                      value={form.nextAction}
                      onChange={(event) => handleFormChange("nextAction", event.target.value)}
                      placeholder="Example: Rewrite summary, follow up on Tuesday, prepare demo round"
                      rows={3}
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>

                <div
                  className="mt-4 rounded-[22px] border p-4"
                  style={{
                    borderColor: "var(--theme-border)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="theme-text-strong text-sm font-bold">Status Gate</div>
                  <div className="theme-text-muted mt-2 text-sm leading-7">
                    {getStatusRuleCopy(form.status)}
                  </div>
                  <div className="mt-4 space-y-2">
                    {readyChecklist.map((item) => (
                      <ChecklistRow key={item.label} item={item} />
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="F. Interview Rounds"
                description="Track round name, date, time, type, prep focus, notes, and outcome."
              >
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={roundDraft.name}
                      onChange={(event) => handleRoundDraftChange("name", event.target.value)}
                      placeholder="Round Name"
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                    <select
                      value={roundDraft.type}
                      onChange={(event) => handleRoundDraftChange("type", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {ROUND_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="date"
                      value={roundDraft.date}
                      onChange={(event) => handleRoundDraftChange("date", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                    <input
                      type="time"
                      value={roundDraft.time}
                      onChange={(event) => handleRoundDraftChange("time", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    />
                    <select
                      value={roundDraft.status}
                      onChange={(event) => handleRoundDraftChange("status", event.target.value)}
                      className={FIELD_CLASS}
                      style={FIELD_STYLE}
                    >
                      {ROUND_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={roundDraft.prepFocus}
                    onChange={(event) => handleRoundDraftChange("prepFocus", event.target.value)}
                    rows={2}
                    placeholder="Topics to prepare"
                    className={`${FIELD_CLASS} resize-none`}
                    style={FIELD_STYLE}
                  />
                  <textarea
                    value={roundDraft.notes}
                    onChange={(event) => handleRoundDraftChange("notes", event.target.value)}
                    rows={3}
                    placeholder="Feedback, panel hints, or prep notes"
                    className={`${FIELD_CLASS} resize-none`}
                    style={FIELD_STYLE}
                  />
                  <button
                    type="button"
                    onClick={handleAddRound}
                    className="inline-flex items-center justify-center gap-2 rounded-[22px] border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                    style={{
                      borderColor: "rgba(239,68,68,0.22)",
                      background: "rgba(239,68,68,0.1)",
                      color: "var(--theme-text-strong)",
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Round
                  </button>
                </div>

                {form.interviewRounds.length ? (
                  <div className="mt-4 space-y-3">
                    {form.interviewRounds.map((round) => (
                      <div
                        key={round.id}
                        className="rounded-[22px] border px-4 py-4"
                        style={{
                          borderColor: "var(--theme-border)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="theme-text-strong text-sm font-bold">{round.name}</div>
                            <div className="theme-text-muted mt-1 text-sm">
                              {formatRoundSummary(round)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRound(round.id)}
                            className="rounded-full p-2 transition hover:bg-red-500/10"
                            style={{ color: "var(--theme-text-muted)" }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Tag label={formatChoiceLabel(round.type || "other")} />
                          <Tag label={formatChoiceLabel(round.status)} />
                          {round.prepFocus ? (
                            <Tag label={truncateText(round.prepFocus, 38)} />
                          ) : null}
                        </div>
                        {round.notes ? (
                          <div className="theme-text-muted mt-3 text-sm leading-7">
                            {round.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard
                title="G. Notes"
                description="Why the role fits, resume changes, talking points, risks, and final outcome."
              >
                <div className="grid gap-4">
                  <Field label="Why This Role Fits You">
                    <textarea
                      value={form.whyFit}
                      onChange={(event) => handleFormChange("whyFit", event.target.value)}
                      rows={3}
                      placeholder="Why this company and role are worth pursuing"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Resume Changes Needed">
                    <textarea
                      value={form.resumeChangesNeeded}
                      onChange={(event) =>
                        handleFormChange("resumeChangesNeeded", event.target.value)
                      }
                      rows={3}
                      placeholder="Bullet rewrites, keywords, or section changes"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Important Talking Points">
                    <textarea
                      value={form.talkingPoints}
                      onChange={(event) => handleFormChange("talkingPoints", event.target.value)}
                      rows={3}
                      placeholder="Stories, proof points, and interview anchors"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Risks / Gaps">
                    <textarea
                      value={form.risksGaps}
                      onChange={(event) => handleFormChange("risksGaps", event.target.value)}
                      rows={3}
                      placeholder="Missing skills, unclear experience, or weak proof areas"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Compensation Notes">
                    <textarea
                      value={form.compensationNotes}
                      onChange={(event) =>
                        handleFormChange("compensationNotes", event.target.value)
                      }
                      rows={3}
                      placeholder="Package expectations, negotiation notes, or constraints"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Customizations Made">
                    <textarea
                      value={form.customizationsMade}
                      onChange={(event) =>
                        handleFormChange("customizationsMade", event.target.value)
                      }
                      rows={3}
                      placeholder="Keywords added, bullets rewritten, or links updated"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Strategy Notes">
                    <textarea
                      value={form.strategyNotes}
                      onChange={(event) => handleFormChange("strategyNotes", event.target.value)}
                      rows={4}
                      placeholder="Recruiter details, application plan, or prep strategy"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                  <Field label="Final Outcome / Learning">
                    <textarea
                      value={form.finalOutcome}
                      onChange={(event) => handleFormChange("finalOutcome", event.target.value)}
                      rows={3}
                      placeholder="Offer details, rejection reason, or lesson learned"
                      className={`${FIELD_CLASS} resize-none`}
                      style={FIELD_STYLE}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="H. Task Sync"
                description="Push deadline reminders, follow-ups, and interview prep into Task Calendar."
              >
                <div className="space-y-3">
                  <SyncToggle
                    checked={form.taskSync.deadline}
                    onChange={(checked) => handleTaskSyncChange("deadline", checked)}
                    title="Deadline Reminder"
                    description="Create reminders 3 days before and 1 day before the deadline."
                  />
                  <SyncToggle
                    checked={form.taskSync.followUp}
                    onChange={(checked) => handleTaskSyncChange("followUp", checked)}
                    title="Follow-Up Reminder"
                    description="Create a follow-up reminder after the application is submitted."
                  />
                  <SyncToggle
                    checked={form.taskSync.interview}
                    onChange={(checked) => handleTaskSyncChange("interview", checked)}
                    title="Interview Prep Task"
                    description="Create prep, interview-day, and feedback tasks for planned rounds."
                  />
                </div>
              </SectionCard>

              {error ? (
                <div
                  className="rounded-[22px] border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(239,68,68,0.22)",
                    background: "rgba(239,68,68,0.1)",
                    color: "var(--theme-text-strong)",
                  }}
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(135deg,var(--theme-primary-from),var(--theme-primary-to))",
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingId ? "Update Application" : "Save Application"}
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function TrackerStat({ label, value, hint, icon: Icon }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-muted">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="theme-text-strong mt-4 break-words text-2xl font-black tracking-tight">
        {value}
      </div>
      <div className="theme-text-muted mt-2 text-sm leading-7">{hint}</div>
    </GlassCard>
  );
}

function ConversionCard({
  wishlistToApplied,
  appliedToInterviewing,
  interviewingToOffer,
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="theme-text-strong text-xl font-black">Conversion Funnel</div>
          <div className="theme-text-muted mt-2 text-sm leading-7">
            Quick pipeline health from discovery to final offer.
          </div>
        </div>
        <Target className="h-5 w-5 text-red-200" />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <ConversionItem
          label="Wishlist → Applied"
          value={wishlistToApplied}
          hint="How many tracked roles reached submission"
        />
        <ConversionItem
          label="Applied → Interviewing"
          value={appliedToInterviewing}
          hint="How often applications moved into rounds"
        />
        <ConversionItem
          label="Interviewing → Offer"
          value={interviewingToOffer}
          hint="Offer conversion from active interview stages"
        />
      </div>
    </GlassCard>
  );
}

function ConversionItem({ label, value, hint }) {
  return (
    <div
      className="rounded-[24px] border p-4"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
        {label}
      </div>
      <div className="theme-text-strong mt-3 text-3xl font-black">{value}</div>
      <div className="theme-text-muted mt-2 text-sm leading-7">{hint}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div
      className="rounded-[24px] border p-4"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="theme-text-strong text-base font-bold">{title}</div>
      <div className="theme-text-muted mt-2 text-sm leading-7">{description}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ContextRow({ label, value }) {
  return (
    <div
      className="rounded-[22px] border px-4 py-3"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-0)",
      }}
    >
      <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="theme-text-strong mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ToggleField({ label, value, onChange }) {
  return (
    <div>
      <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
        {label}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { checked: true, label: "Yes" },
          { checked: false, label: "No" },
        ].map((option) => {
          const active = value === option.checked;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.checked)}
              className="rounded-[18px] border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                borderColor: active ? "rgba(34,197,94,0.28)" : "var(--theme-border)",
                background: active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
                color: "var(--theme-text-strong)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistRow({ item }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 text-sm"
      style={{
        borderColor: item.done ? "rgba(34,197,94,0.22)" : "var(--theme-border)",
        background: item.done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
      }}
    >
      <div className="theme-text-strong font-medium">{item.label}</div>
      <div
        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          background: item.done ? "rgba(34,197,94,0.14)" : "rgba(249,115,22,0.14)",
          color: "var(--theme-text-strong)",
        }}
      >
        {item.done ? "done" : item.required ? "required" : "optional"}
      </div>
    </div>
  );
}

function SyncToggle({ checked, onChange, title, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: checked ? "rgba(34,197,94,0.24)" : "var(--theme-border)",
        background: checked ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
      }}
    >
      <div
        className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border"
        style={{
          borderColor: checked ? "rgba(34,197,94,0.5)" : "var(--theme-border)",
          background: checked ? "rgba(34,197,94,0.2)" : "transparent",
          color: "var(--theme-text-strong)",
        }}
      >
        {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </div>
      <div>
        <div className="theme-text-strong text-sm font-semibold">{title}</div>
        <div className="theme-text-muted mt-1 text-sm leading-7">{description}</div>
      </div>
    </button>
  );
}

function StatusColumn({
  column,
  applications,
  dropStatus,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
  onOpenPrep,
  onDragStart,
  onDragEnd,
  getHasPrepPack,
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className="min-h-[380px] rounded-[28px] border p-4"
      style={{
        borderColor:
          dropStatus === column.key ? "rgba(239,68,68,0.32)" : "var(--theme-border)",
        background: `linear-gradient(180deg, ${column.accent}, rgba(255,255,255,0.02) 38%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="theme-text-strong text-base font-black">{column.label}</div>
          <div className="theme-text-muted mt-2 text-sm leading-7">{column.description}</div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.24)",
            color: "var(--theme-text-strong)",
          }}
        >
          {applications.length}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {applications.length ? (
          applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenPrep={onOpenPrep}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              hasPrepPack={getHasPrepPack(application.id)}
            />
          ))
        ) : (
          <div
            className="rounded-[22px] border border-dashed px-4 py-8 text-center text-sm leading-7"
            style={{
              borderColor: "var(--theme-border)",
              color: "var(--theme-text-muted)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Drop an application card here.
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  onEdit,
  onDelete,
  onOpenPrep,
  onDragStart,
  onDragEnd,
  hasPrepPack,
}) {
  const nextRound = getNextPlannedRound(application);
  const linksAttached = getAttachedLinkCount(application);
  const readyChecklist = buildReadyChecklist(application);
  const readyCount = readyChecklist.filter((item) => item.done).length;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={() => onDragStart(application.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(application)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(application);
        }
      }}
      className="w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-1"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-1)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.14)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="theme-text-strong text-sm font-black">{application.company}</div>
          <div className="theme-text-muted mt-1 text-sm">{application.role}</div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(application.id);
          }}
          className="rounded-full p-2 transition hover:bg-red-500/10"
          style={{ color: "var(--theme-text-muted)" }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag label={formatChoiceLabel(application.priority)} />
        {application.source ? <Tag label={formatChoiceLabel(application.source)} /> : null}
        {application.workMode ? <Tag label={formatChoiceLabel(application.workMode)} /> : null}
        {application.resumeTailored ? <Tag label="Tailored resume" /> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {application.linkedResumeVersion ? (
          <Tag label={truncateText(application.linkedResumeVersion, 34)} />
        ) : null}
        {application.linkedResumeScore != null ? (
          <Tag label={`ATS ${application.linkedResumeScore}/100`} />
        ) : null}
        {application.deadline ? (
          <Tag label={`Deadline ${formatDateLabel(application.deadline)}`} />
        ) : null}
        {linksAttached ? <Tag label={`Links ${linksAttached}/3`} /> : null}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {application.savedDate ? (
          <div className="theme-text-muted">
            Saved:{" "}
            <span className="theme-text-strong font-semibold">
              {formatDateLabel(application.savedDate)}
            </span>
          </div>
        ) : null}
        {application.appliedDate ? (
          <div className="theme-text-muted">
            Applied:{" "}
            <span className="theme-text-strong font-semibold">
              {formatDateLabel(application.appliedDate)}
            </span>
          </div>
        ) : null}
        {application.followUpDate && !application.responseReceived ? (
          <div className="theme-text-muted">
            Follow-up:{" "}
            <span className="theme-text-strong font-semibold">
              {formatDateLabel(application.followUpDate)}
            </span>
          </div>
        ) : null}
        {nextRound ? (
          <div className="theme-text-muted">
            Next round:{" "}
            <span className="theme-text-strong font-semibold">{formatRoundSummary(nextRound)}</span>
          </div>
        ) : application.interviewRounds.length ? (
          <div className="theme-text-muted">
            Rounds tracked:{" "}
            <span className="theme-text-strong font-semibold">
              {application.interviewRounds.length}
            </span>
          </div>
        ) : null}
      </div>

      {["wishlist", "ready"].includes(application.status) ? (
        <div
          className="mt-4 rounded-[18px] border px-3 py-3 text-sm"
          style={{
            borderColor: "var(--theme-border)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
            Ready Check
          </div>
          <div className="theme-text-strong mt-2 font-semibold">
            {readyCount}/{readyChecklist.length} checks complete
          </div>
        </div>
      ) : null}

      {application.whyFit || application.nextAction || application.finalOutcome ? (
        <div
          className="mt-4 rounded-[18px] border px-3 py-3 text-sm leading-7"
          style={{
            borderColor: "var(--theme-border)",
            background: "rgba(255,255,255,0.02)",
            color: "var(--theme-text-muted)",
          }}
        >
          {truncateText(
            application.nextAction ||
              application.finalOutcome ||
              application.whyFit ||
              application.strategyNotes,
            132,
          )}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPrep(application);
          }}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
          style={{
            borderColor: "rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.08)",
            color: "var(--theme-text-strong)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {hasPrepPack ? "Open Prep" : "Prep Pack"}
        </button>

        {hasPrepPack ? (
          <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.16em]">
            saved
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Tag({ label }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{
        background: "rgba(255,255,255,0.18)",
        color: "var(--theme-text-strong)",
      }}
    >
      {label}
    </div>
  );
}

function createEmptyForm({ defaultRole, defaultResumeVersion, defaultResumeScore }) {
  return {
    company: "",
    role: defaultRole || "",
    department: "",
    jobLocation: "",
    workMode: "",
    salary: "",
    source: "",
    jobLink: "",
    applicationLink: "",
    jobDescription: "",
    requiredSkillsText: "",
    mustHaveKeywordsText: "",
    importantKeywordsText: "",
    experienceRequired: "",
    eligibility: "",
    linkedResumeVersion: defaultResumeVersion || "",
    linkedResumeScore:
      defaultResumeScore == null || Number.isNaN(defaultResumeScore)
        ? ""
        : String(defaultResumeScore),
    resumeTailored: false,
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    status: "wishlist",
    priority: "medium",
    savedDate: getTodayInput(),
    appliedDate: "",
    deadline: "",
    recruiterName: "",
    recruiterContact: "",
    referralUsed: false,
    interviewRounds: [],
    followUpDate: "",
    followUpStatus: "",
    responseReceived: false,
    nextAction: "",
    whyFit: "",
    resumeChangesNeeded: "",
    talkingPoints: "",
    risksGaps: "",
    compensationNotes: "",
    customizationsMade: "",
    strategyNotes: "",
    finalOutcome: "",
    taskSync: {
      ...TASK_SYNC_DEFAULTS,
    },
  };
}

function buildCompanyPrepSeed(application) {
  return {
    applicationId: application.id,
    company: application.company,
    role: application.role,
    jobDescription: application.jobDescription || "",
    linkedResumeVersion: application.linkedResumeVersion || "",
    linkedResumeScore: application.linkedResumeScore,
  };
}

function buildPreviewApplication(form) {
  return finalizeApplication({
    id: "preview",
    company: form.company.trim(),
    role: form.role.trim(),
    department: form.department.trim(),
    jobLocation: form.jobLocation.trim(),
    workMode: form.workMode,
    salary: form.salary.trim(),
    source: form.source,
    jobLink: form.jobLink.trim(),
    applicationLink: form.applicationLink.trim(),
    jobDescription: form.jobDescription.trim(),
    requiredSkills: parseTagInput(form.requiredSkillsText),
    mustHaveKeywords: parseTagInput(form.mustHaveKeywordsText),
    importantKeywords: parseTagInput(form.importantKeywordsText),
    experienceRequired: form.experienceRequired.trim(),
    eligibility: form.eligibility.trim(),
    linkedResumeVersion: form.linkedResumeVersion.trim(),
    linkedResumeScore: normalizeScore(form.linkedResumeScore),
    resumeTailored: Boolean(form.resumeTailored),
    portfolioUrl: form.portfolioUrl.trim(),
    githubUrl: form.githubUrl.trim(),
    linkedinUrl: form.linkedinUrl.trim(),
    status: form.status,
    priority: form.priority,
    savedDate: form.savedDate,
    appliedDate: form.appliedDate,
    deadline: form.deadline,
    recruiterName: form.recruiterName.trim(),
    recruiterContact: form.recruiterContact.trim(),
    referralUsed: Boolean(form.referralUsed),
    interviewRounds: sanitizeInterviewRounds(form.interviewRounds),
    followUpDate: form.followUpDate,
    followUpStatus: form.followUpStatus,
    responseReceived: Boolean(form.responseReceived),
    nextAction: form.nextAction.trim(),
    whyFit: form.whyFit.trim(),
    resumeChangesNeeded: form.resumeChangesNeeded.trim(),
    talkingPoints: form.talkingPoints.trim(),
    risksGaps: form.risksGaps.trim(),
    compensationNotes: form.compensationNotes.trim(),
    customizationsMade: form.customizationsMade.trim(),
    strategyNotes: form.strategyNotes.trim(),
    finalOutcome: form.finalOutcome.trim(),
    taskSync: {
      deadline: Boolean(form.taskSync.deadline),
      followUp: Boolean(form.taskSync.followUp),
      interview: Boolean(form.taskSync.interview),
    },
  });
}

function finalizeApplication(application, existingApplication = null) {
  const nowIso = new Date().toISOString();
  const today = getTodayInput();
  let status = normalizeStatus(application?.status);
  const createdAtIso = String(application?.createdAtIso || existingApplication?.createdAtIso || nowIso);
  const savedDate = String(
    application?.savedDate ||
      existingApplication?.savedDate ||
      createdAtIso.slice(0, 10) ||
      today,
  ).trim();
  const interviewRounds = sanitizeInterviewRounds(application?.interviewRounds);
  if (
    !["offer", "closed"].includes(status) &&
    interviewRounds.some(
      (round) =>
        Boolean(round.date || round.time || round.notes || round.prepFocus) ||
        ["completed", "cleared", "rejected"].includes(round.status),
    )
  ) {
    status = "interviewing";
  }
  let appliedDate = String(application?.appliedDate || existingApplication?.appliedDate || "").trim();
  if (["applied", "interviewing", "offer"].includes(status) && !appliedDate) {
    appliedDate = today;
  }

  let followUpDate = String(
    application?.followUpDate || existingApplication?.followUpDate || "",
  ).trim();
  if (
    application?.taskSync?.followUp !== false &&
    ["applied", "interviewing"].includes(status) &&
    !followUpDate &&
    appliedDate
  ) {
    followUpDate = addDays(appliedDate, 5);
  }

  let followUpStatus = normalizeFollowUpStatus(application?.followUpStatus);
  if (application?.responseReceived) {
    followUpStatus = "responded";
  } else if (!followUpStatus && followUpDate) {
    followUpStatus = "pending";
  }

  const strategyNotes = String(
    application?.strategyNotes || application?.notes || existingApplication?.strategyNotes || "",
  ).trim();

  return {
    id: String(application?.id || "").trim(),
    company: String(application?.company || "").trim(),
    role: String(application?.role || "").trim(),
    department: String(application?.department || "").trim(),
    jobLocation: String(application?.jobLocation || "").trim(),
    workMode: normalizeWorkMode(application?.workMode),
    salary: String(application?.salary || "").trim(),
    source: normalizeSource(application?.source),
    jobLink: String(application?.jobLink || "").trim(),
    applicationLink: String(application?.applicationLink || "").trim(),
    jobDescription: String(application?.jobDescription || "").trim(),
    requiredSkills: uniqueStrings(application?.requiredSkills || []).slice(0, 24),
    mustHaveKeywords: uniqueStrings(application?.mustHaveKeywords || []).slice(0, 24),
    importantKeywords: uniqueStrings(application?.importantKeywords || []).slice(0, 24),
    experienceRequired: String(application?.experienceRequired || "").trim(),
    eligibility: String(application?.eligibility || "").trim(),
    linkedResumeVersion: String(application?.linkedResumeVersion || "").trim(),
    linkedResumeScore: normalizeScore(application?.linkedResumeScore),
    resumeTailored: Boolean(application?.resumeTailored),
    portfolioUrl: String(application?.portfolioUrl || "").trim(),
    githubUrl: String(application?.githubUrl || "").trim(),
    linkedinUrl: String(application?.linkedinUrl || "").trim(),
    status,
    priority: normalizePriority(application?.priority),
    savedDate,
    appliedDate,
    deadline: String(application?.deadline || "").trim(),
    recruiterName: String(application?.recruiterName || "").trim(),
    recruiterContact: String(application?.recruiterContact || "").trim(),
    referralUsed: Boolean(application?.referralUsed),
    interviewRounds,
    followUpDate,
    followUpStatus,
    responseReceived: Boolean(application?.responseReceived),
    nextAction: String(application?.nextAction || "").trim(),
    whyFit: String(application?.whyFit || "").trim(),
    resumeChangesNeeded: String(application?.resumeChangesNeeded || "").trim(),
    talkingPoints: String(application?.talkingPoints || "").trim(),
    risksGaps: String(application?.risksGaps || "").trim(),
    compensationNotes: String(application?.compensationNotes || "").trim(),
    customizationsMade: String(application?.customizationsMade || "").trim(),
    strategyNotes,
    notes: strategyNotes,
    finalOutcome: String(application?.finalOutcome || "").trim(),
    createdAtIso,
    updatedAtIso: String(application?.updatedAtIso || nowIso).trim() || nowIso,
    taskSync: {
      deadline: application?.taskSync?.deadline !== false,
      followUp: application?.taskSync?.followUp !== false,
      interview: application?.taskSync?.interview !== false,
    },
  };
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

  const updatedAt =
    context?.analyzedAt ||
    latestAnalysis?.updatedAtIso ||
    resumeWorkspace?.updatedAtIso ||
    resumeOverview?.updatedAtIso;
  if (updatedAt) {
    parts.push(formatDateLabel(updatedAt));
  }

  return parts.join(" · ");
}

function getLatestResumeScore({ resumeOverview, resumeWorkspace }) {
  return normalizeScore(
    resumeWorkspace?.latestAnalysis?.report?.atsScore ?? resumeOverview?.atsScore,
  );
}

function getLatestResumeRole({ resumeOverview, resumeWorkspace }) {
  return String(
    resumeWorkspace?.latestAnalysis?.report?.jobMatches?.[0]?.role ||
      resumeWorkspace?.latestAnalysis?.report?.topRole ||
      resumeOverview?.topRole ||
      "",
  ).trim();
}

function getBestLinkedScore(applications, latestResumeScore) {
  const bestScore = applications.reduce((best, application) => {
    if (application.linkedResumeScore != null && application.linkedResumeScore > best) {
      return application.linkedResumeScore;
    }
    return best;
  }, -1);

  if (bestScore >= 0) {
    return bestScore;
  }

  return latestResumeScore;
}

function getMostUsedResumeVersion(applications) {
  const counts = new Map();

  applications.forEach((application) => {
    const version = String(application.linkedResumeVersion || "").trim();
    if (!version) {
      return;
    }

    counts.set(version, (counts.get(version) || 0) + 1);
  });

  let selected = "";
  let maxCount = 0;
  counts.forEach((count, version) => {
    if (count > maxCount) {
      selected = version;
      maxCount = count;
    }
  });

  return selected;
}

function buildReadyChecklist(application) {
  return [
    {
      label: "JD pasted",
      done: Boolean(application.jobDescription),
      required: true,
    },
    {
      label: "Resume linked",
      done: Boolean(application.linkedResumeVersion),
      required: true,
    },
    {
      label: "ATS score added",
      done: application.linkedResumeScore != null,
      required: true,
    },
    {
      label: "Resume tailored",
      done: Boolean(application.resumeTailored),
      required: true,
    },
    {
      label: "Deadline known",
      done: Boolean(application.deadline),
      required: true,
    },
    {
      label: "Keywords captured",
      done: Boolean(application.importantKeywords?.length || application.mustHaveKeywords?.length),
      required: false,
    },
  ];
}

function getStatusBlockingError(application) {
  if (application.status === "ready") {
    const blockers = buildReadyChecklist(application)
      .filter((item) => item.required && !item.done)
      .map((item) => item.label);

    if (blockers.length) {
      return `Ready To Apply requires: ${blockers.join(", ")}.`;
    }
  }

  if (application.status === "interviewing" && !application.interviewRounds.length) {
    return "Interviewing requires at least one interview round entry.";
  }

  return "";
}

function getStatusRuleCopy(status) {
  if (status === "wishlist") {
    return "Wishlist means the role is interesting but not prepared yet.";
  }
  if (status === "ready") {
    return "Ready To Apply means the JD is reviewed, resume is tailored, ATS is available, and the deadline is known.";
  }
  if (status === "applied") {
    return "Applied means the submission is done and the tracker will create follow-up reminders.";
  }
  if (status === "interviewing") {
    return "Interviewing means at least one round, test, or assignment is active.";
  }
  if (status === "offer") {
    return "Offer means an offer or final positive stage is now in hand.";
  }
  return "Closed means the opportunity ended, was withdrawn, or is no longer relevant.";
}

function compareApplications(left, right) {
  return (
    new Date(right.updatedAtIso || right.createdAtIso || 0).getTime() -
    new Date(left.updatedAtIso || left.createdAtIso || 0).getTime()
  );
}

function sanitizeInterviewRounds(rounds) {
  return (Array.isArray(rounds) ? rounds : [])
    .map((round) => ({
      id: String(round?.id || createRoundId()).trim(),
      name: String(round?.name || round?.label || "").trim(),
      date: String(round?.date || extractDateOnly(round?.scheduledAt) || "").trim(),
      time: String(round?.time || extractTime(round?.scheduledAt) || "").trim(),
      type: normalizeRoundType(round?.type),
      status: normalizeRoundStatus(round?.status),
      prepFocus: String(round?.prepFocus || "").trim(),
      notes: String(round?.notes || round?.note || "").trim(),
    }))
    .filter((round) => round.id && round.name)
    .slice(0, 12);
}

function createApplicationId() {
  return `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRoundId() {
  return `round-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildUpcomingMoves(applications) {
  const items = [];

  applications.forEach((application) => {
    if (
      application.deadline &&
      ["wishlist", "ready"].includes(application.status) &&
      isTodayOrFuture(application.deadline)
    ) {
      items.push({
        id: `${application.id}:deadline`,
        kind: "deadline",
        company: application.company,
        title: application.role,
        when: application.deadline,
        summary:
          application.resumeChangesNeeded ||
          "Prepare the final resume, confirm keyword coverage, and submit before the deadline.",
      });
    }

    if (
      application.followUpDate &&
      ["applied", "interviewing"].includes(application.status) &&
      !application.responseReceived &&
      isTodayOrFutureOrOverdue(application.followUpDate)
    ) {
      items.push({
        id: `${application.id}:follow-up`,
        kind: "follow-up",
        company: application.company,
        title: application.role,
        when: application.followUpDate,
        summary:
          application.nextAction ||
          "Check the application status, follow up with the recruiter, and log any reply.",
      });
    }

    const nextRound = getNextPlannedRound(application);
    if (nextRound && isTodayOrFuture(getRoundScheduledAt(nextRound))) {
      items.push({
        id: `${application.id}:${nextRound.id}`,
        kind: "interview",
        company: application.company,
        title: nextRound.name,
        when: getRoundScheduledAt(nextRound),
        summary:
          nextRound.prepFocus ||
          nextRound.notes ||
          `Prepare for ${nextRound.name} for the ${application.role} application.`,
      });
    }
  });

  return items
    .sort((left, right) => new Date(left.when).getTime() - new Date(right.when).getTime())
    .slice(0, 8);
}

function syncApplicationTasks(existingTasks, application) {
  const baseTasks = removeGeneratedCalendarTasks(existingTasks, application.id);
  const generatedTasks = buildGeneratedCalendarTasks(application);
  return sortCalendarTasks([...baseTasks, ...generatedTasks]);
}

function removeGeneratedCalendarTasks(existingTasks, applicationId) {
  const prefix = `jobapp:${applicationId}:`;
  return (Array.isArray(existingTasks) ? existingTasks : []).filter(
    (task) => !String(task?.id || "").startsWith(prefix),
  );
}

function buildGeneratedCalendarTasks(application) {
  const tasks = [];

  if (
    application.taskSync?.deadline &&
    application.deadline &&
    ["wishlist", "ready"].includes(application.status) &&
    isTodayOrFuture(application.deadline)
  ) {
    const deadlineThreeDays = buildReminderDate(application.deadline, -3, "09:00");
    const deadlineOneDay = buildReminderDate(application.deadline, -1, "09:00");

    tasks.push(
      buildCalendarTask({
        id: `jobapp:${application.id}:deadline:3`,
        title: `${application.company} deadline in 3 days`,
        note: `${application.role} deadline is ${formatDateLabel(application.deadline)}.`,
        when: deadlineThreeDays,
        fallbackTime: "09:00",
      }),
      buildCalendarTask({
        id: `jobapp:${application.id}:deadline:1`,
        title: `${application.company} final deadline reminder`,
        note: `Final reminder before the ${application.role} deadline.`,
        when: deadlineOneDay,
        fallbackTime: "09:00",
      }),
    );
  }

  if (
    application.taskSync?.followUp &&
    ["applied", "interviewing"].includes(application.status) &&
    !application.responseReceived
  ) {
    const followUpWhen = application.followUpDate
      ? buildReminderDate(application.followUpDate, 0, "11:00")
      : application.appliedDate
        ? buildReminderDate(application.appliedDate, 5, "11:00")
        : null;

    tasks.push(
      buildCalendarTask({
        id: `jobapp:${application.id}:follow-up`,
        title: `Follow up ${application.company}`,
        note:
          application.nextAction ||
          `Check the ${application.role} application and send a follow-up if needed.`,
        when: followUpWhen,
        fallbackTime: "11:00",
      }),
    );
  }

  if (application.taskSync?.interview) {
    application.interviewRounds.forEach((round) => {
      const scheduledAt = getRoundScheduledAt(round);
      if (!scheduledAt || round.status !== "planned") {
        return;
      }

      const prepLeadDays = getPrepLeadDays(scheduledAt);
      tasks.push(
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:prep:${round.id}`,
          title: `${application.company} prep for ${round.name}`,
          note:
            round.prepFocus ||
            `Prepare the main topics, stories, and proof points for ${round.name}.`,
          when: buildReminderDate(scheduledAt, -prepLeadDays, "18:00"),
          fallbackTime: "18:00",
        }),
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:day:${round.id}`,
          title: `${application.company} ${round.name}`,
          note:
            round.notes ||
            `Attend ${round.name} for the ${application.role} application.`,
          when: buildReminderDate(
            scheduledAt,
            0,
            extractTime(scheduledAt) || round.time || "09:00",
          ),
          fallbackTime: extractTime(scheduledAt) || round.time || "09:00",
        }),
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:feedback:${round.id}`,
          title: `${application.company} ${round.name} feedback`,
          note: `Capture what went well, what was asked, and what to improve after ${round.name}.`,
          when: buildReminderDate(scheduledAt, 1, "18:30"),
          fallbackTime: "18:30",
        }),
      );
    });
  }

  return tasks.filter(Boolean);
}

function buildCalendarTask({ id, title, note, when, fallbackTime }) {
  const eventDate = toDateObject(when);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }

  const time = extractTime(when) || fallbackTime;
  return {
    id,
    title,
    note,
    day: getDayLabel(eventDate),
    time,
    createdAtIso: new Date().toISOString(),
  };
}

function buildReminderDate(value, offsetDays, fallbackTime) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + offsetDays);
  setTimeOnDate(date, fallbackTime);

  if (startOfDay(date).getTime() < startOfToday().getTime()) {
    const today = startOfToday();
    setTimeOnDate(today, fallbackTime);
    return today;
  }

  return date;
}

function getPrepLeadDays(value) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  const deltaDays = Math.round((startOfDay(date).getTime() - startOfToday().getTime()) / 86400000);
  return deltaDays > 3 ? 2 : 1;
}

function sortCalendarTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => task?.id && task?.title && task?.day && task?.time)
    .slice()
    .sort((left, right) => {
      const dayDelta = getDayOrder(left.day) - getDayOrder(right.day);
      if (dayDelta !== 0) {
        return dayDelta;
      }

      return toMinutes(left.time) - toMinutes(right.time);
    });
}

function getDayOrder(day) {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(
    String(day || "").trim(),
  );
}

function toMinutes(time) {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((value) => Number(value));
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function extractTime(value) {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }

  const safeValue = String(value || "").trim();
  const timeMatch = safeValue.match(/T(\d{2}:\d{2})/);
  return timeMatch?.[1] || "";
}

function extractDateOnly(value) {
  const safeValue = String(value || "").trim();
  const dateMatch = safeValue.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch?.[1] || "";
}

function getDayLabel(value) {
  const date = value instanceof Date ? new Date(value) : toDateObject(value);
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return labels[date.getDay()] || "Monday";
}

function setTimeOnDate(date, time) {
  const [hour, minute] = String(time || "09:00")
    .split(":")
    .map((value) => Number(value));
  date.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
}

function getRoundScheduledAt(round) {
  if (!round) {
    return "";
  }

  const date = String(round.date || extractDateOnly(round.scheduledAt) || "").trim();
  const time = String(round.time || extractTime(round.scheduledAt) || "").trim();
  if (!date) {
    return "";
  }

  return time ? `${date}T${time}` : date;
}

function getNextPlannedRound(application) {
  return (application?.interviewRounds || [])
    .filter((round) => round.status === "planned" && getRoundScheduledAt(round))
    .sort(
      (left, right) =>
        toDateObject(getRoundScheduledAt(left)).getTime() -
        toDateObject(getRoundScheduledAt(right)).getTime(),
    )[0] || null;
}

function formatRoundSummary(round) {
  const scheduledAt = getRoundScheduledAt(round);
  const parts = [round.name];

  if (round.type) {
    parts.push(formatChoiceLabel(round.type));
  }

  if (scheduledAt) {
    parts.push(formatDateTimeLabel(scheduledAt));
  }

  return parts.join(" · ");
}

function addDays(value, days) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getTodayInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTimeLabel(value) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRate(numerator, denominator) {
  if (!denominator) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function isWithinLastDays(value, days) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const threshold = startOfToday();
  threshold.setDate(threshold.getDate() - Math.max(0, days - 1));
  return startOfDay(date).getTime() >= threshold.getTime();
}

function isTodayOrFuture(value) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return startOfDay(date).getTime() >= startOfToday().getTime();
}

function isTodayOrFutureOrOverdue(value) {
  const date = toDateObject(value);
  return !Number.isNaN(date.getTime());
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function toDateObject(value) {
  if (value instanceof Date) {
    return new Date(value);
  }

  const safeValue = String(value || "").trim();
  const dateOnlyMatch = safeValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
      12,
      0,
      0,
      0,
    );
  }

  return new Date(safeValue);
}

function hasApplied(application) {
  return Boolean(
    application?.appliedDate || ["applied", "interviewing", "offer"].includes(application?.status),
  );
}

function hasInterviewStarted(application) {
  return Boolean(
    application?.interviewRounds?.length || ["interviewing", "offer"].includes(application?.status),
  );
}

function getAttachedLinkCount(application) {
  return [application?.portfolioUrl, application?.githubUrl, application?.linkedinUrl].filter(Boolean)
    .length;
}

function parseTagInput(value) {
  return uniqueStrings(String(value || "").split(/[\n,;]+/)).slice(0, 24);
}

function formatTagInput(values) {
  return uniqueStrings(values || []).join(", ");
}

function uniqueStrings(values) {
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

function normalizeScore(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeStatus(value) {
  const normalized = String(value || "wishlist").trim().toLowerCase();
  if (normalized === "interview") {
    return "interviewing";
  }

  return STATUS_COLUMNS.some((column) => column.key === normalized) ? normalized : "wishlist";
}

function normalizeSource(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SOURCE_OPTIONS.some((option) => option.value === normalized) ? normalized : "";
}

function normalizeWorkMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return WORK_MODE_OPTIONS.some((option) => option.value === normalized) ? normalized : "";
}

function normalizePriority(value) {
  const normalized = String(value || "medium").trim().toLowerCase();
  return PRIORITY_OPTIONS.some((option) => option.value === normalized) ? normalized : "medium";
}

function normalizeFollowUpStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return FOLLOW_UP_STATUS_OPTIONS.some((option) => option.value === normalized) ? normalized : "";
}

function normalizeRoundType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ROUND_TYPE_OPTIONS.some((option) => option.value === normalized) ? normalized : "other";
}

function normalizeRoundStatus(value) {
  const normalized = String(value || "planned").trim().toLowerCase();
  if (normalized === "selected") {
    return "cleared";
  }

  return ROUND_STATUS_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "planned";
}

function formatChoiceLabel(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMoveTone(kind) {
  if (kind === "deadline") {
    return { background: "rgba(249,115,22,0.14)", color: "#fdba74" };
  }
  if (kind === "follow-up") {
    return { background: "rgba(56,189,248,0.14)", color: "#7dd3fc" };
  }
  return { background: "rgba(250,204,21,0.16)", color: "#fde68a" };
}

function truncateText(value, limit) {
  const safeValue = String(value || "").trim();
  if (!safeValue || safeValue.length <= limit) {
    return safeValue;
  }

  return `${safeValue.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}
