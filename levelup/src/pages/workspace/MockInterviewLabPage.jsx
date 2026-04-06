import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  MessageSquareQuote,
  Mic,
  PlayCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { auth } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  buildLocalMockInterviewAnswerResult,
  buildLocalMockInterviewSession,
  normalizeMockInterviewState,
  recordMockInterviewAnswer,
  startMockInterviewSession,
} from "../../lib/mockInterview";
import { postServerJson } from "../../lib/serverApi";
import { saveMockInterviewState } from "../../lib/userData";

const INTERVIEW_TYPES = [
  {
    value: "technical",
    label: "Technical",
    description: "Role-specific technical depth and problem solving.",
  },
  {
    value: "hr",
    label: "HR",
    description: "Motivation, ownership, communication, and behavioral depth.",
  },
  {
    value: "domain",
    label: "Domain",
    description: "Teaching, subject, or field-specific judgment and delivery.",
  },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const CONFIDENCE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const MAX_QUESTION_OPTIONS = [3, 4, 5, 6];

export default function MockInterviewLabPage() {
  const location = useLocation();
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);

  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const adaptiveLearning = profile?.adaptiveLearning || {};

  const latestResumeVersion = useMemo(
    () => getLatestResumeVersion({ resumeOverview, resumeWorkspace }),
    [resumeOverview, resumeWorkspace],
  );
  const latestResumeScore = useMemo(
    () => getLatestResumeScore({ resumeOverview, resumeWorkspace }),
    [resumeOverview, resumeWorkspace],
  );
  const latestAnalyzedRole = useMemo(
    () => getLatestAnalyzedRole({ resumeOverview, resumeWorkspace }),
    [resumeOverview, resumeWorkspace],
  );
  const skillGaps = useMemo(
    () =>
      uniqueStrings([
        ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
        ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
        ...(resumeWorkspace.latestAnalysis?.report?.missingSkills || []),
        ...(resumeOverview.missingSkills || []),
      ]).slice(0, 10),
    [guidance, resumeOverview, resumeWorkspace],
  );
  const defaultRole = String(
    guidance.latestTargetRole ||
      adaptiveLearning.targetRole ||
      latestAnalyzedRole ||
      "",
  ).trim();
  const defaultFocusAreas = useMemo(
    () =>
      uniqueStrings([
        ...(guidance.latestFocusAreas || []),
        ...skillGaps,
      ]).slice(0, 8),
    [guidance, skillGaps],
  );

  const [localInterviewState, setLocalInterviewState] = useState(() =>
    normalizeMockInterviewState(profile?.mockInterview),
  );
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("medium");
  const [questionStartedAtMs, setQuestionStartedAtMs] = useState(0);
  const [liveNowMs, setLiveNowMs] = useState(Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [starting, setStarting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [form, setForm] = useState(() =>
    createInterviewForm(defaultRole, defaultFocusAreas),
  );
  const routePrefillRef = useRef("");

  const interviewState = localInterviewState;
  const activeSession =
    interviewState.sessions.find((session) => session.id === selectedSessionId) ||
    interviewState.sessions.find((session) => session.id === interviewState.activeSessionId) ||
    interviewState.sessions[0] ||
    null;
  const latestSummary =
    interviewState.sessions.find((session) => session.status === "completed") || null;
  const activeQuestionElapsedSeconds =
    activeSession?.status === "active" && questionStartedAtMs
      ? Math.max(0, Math.round((liveNowMs - questionStartedAtMs) / 1000))
      : 0;
  const topWeakArea = interviewState.weakAreasTrend[0] || null;

  useEffect(() => {
    setLocalInterviewState(normalizeMockInterviewState(profile?.mockInterview));
  }, [profile?.mockInterview]);

  useEffect(() => {
    if (
      selectedSessionId &&
      interviewState.sessions.some((session) => session.id === selectedSessionId)
    ) {
      return;
    }

    const nextSelectedSessionId =
      interviewState.activeSessionId || interviewState.sessions[0]?.id || "";
    if (nextSelectedSessionId !== selectedSessionId) {
      setSelectedSessionId(nextSelectedSessionId);
    }
  }, [interviewState.activeSessionId, interviewState.sessions, selectedSessionId]);

  useEffect(() => {
    setForm((current) => {
      const nextForm = { ...current };
      let changed = false;

      if (!nextForm.role && defaultRole) {
        nextForm.role = defaultRole;
        changed = true;
      }

      if (!nextForm.focusAreas && defaultFocusAreas.length) {
        nextForm.focusAreas = defaultFocusAreas.join("\n");
        changed = true;
      }

      if (isTeachingRole(defaultRole) && nextForm.interviewType === "technical") {
        nextForm.interviewType = "domain";
        changed = true;
      }

      return changed ? nextForm : current;
    });
  }, [defaultFocusAreas, defaultRole]);

  useEffect(() => {
    const prepPack = location.state?.companyPrepPack || null;
    const signature = JSON.stringify({
      packId: prepPack?.packId || "",
      applicationId: prepPack?.applicationId || "",
      role: prepPack?.role || "",
      company: prepPack?.company || "",
    });

    if (!prepPack || !signature || routePrefillRef.current === signature) {
      return;
    }

    routePrefillRef.current = signature;
    setForm((current) => ({
      ...current,
      role: String(prepPack.role || current.role).trim(),
      interviewType: normalizeInterviewTypeValue(
        prepPack.interviewType || current.interviewType,
      ),
      difficulty: normalizeDifficultyValue(prepPack.difficulty || current.difficulty),
      company: String(prepPack.company || current.company).trim(),
      focusAreas: Array.isArray(prepPack.focusAreas) && prepPack.focusAreas.length
        ? prepPack.focusAreas.join("\n")
        : current.focusAreas,
      jobDescription: String(prepPack.jobDescription || current.jobDescription).trim(),
      maxQuestions: String(prepPack.maxQuestions || current.maxQuestions || "4"),
    }));
    setNotice(
      `Loaded company prep for ${prepPack.company ? `${prepPack.company} · ` : ""}${prepPack.role || "selected role"}.`,
    );
    setError("");
  }, [location.state]);

  useEffect(() => {
    if (activeSession?.status !== "active" || !activeSession?.currentPrompt?.questionId) {
      setQuestionStartedAtMs(0);
      return;
    }

    setQuestionStartedAtMs(Date.now());
    setLiveNowMs(Date.now());
  }, [
    activeSession?.id,
    activeSession?.status,
    activeSession?.currentPrompt?.questionId,
  ]);

  useEffect(() => {
    if (activeSession?.status !== "active" || !questionStartedAtMs) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setLiveNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [activeSession?.status, questionStartedAtMs]);

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleStartInterview = async (event) => {
    event.preventDefault();

    const role = form.role.trim();
    if (!role) {
      setError("Choose or enter a target role before starting the interview.");
      return;
    }

    const focusAreas = parseFocusAreas(form.focusAreas);
    const previousState = interviewState;
    const currentUser = auth.currentUser;
    const localSession = buildLocalMockInterviewSession({
      role,
      interviewType: form.interviewType,
      difficulty: form.difficulty,
      company: form.company.trim(),
      focusAreas,
      jobDescription: form.jobDescription.trim(),
      maxQuestions: Number(form.maxQuestions) || 4,
      linkedResumeVersion: latestResumeVersion,
      atsScore: latestResumeScore,
      skillGaps,
    });

    setStarting(true);
    setError("");
    setNotice("");
    setWarning("");

    if (!currentUser) {
      const nextState = startMockInterviewSession(previousState, localSession);
      setLocalInterviewState(nextState);
      setSelectedSessionId(localSession.id);
      setAnswerDraft("");
      setConfidenceLevel("medium");
      setNotice(`Mock interview started for ${role}.`);
      setWarning("Using local mock interview mode because you are not signed in.");
      setStarting(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await postServerJson("/mock-interview/start", {
        token,
        body: {
          role,
          interviewType: form.interviewType,
          difficulty: form.difficulty,
          company: form.company.trim(),
          focusAreas,
          jobDescription: form.jobDescription.trim(),
          maxQuestions: Number(form.maxQuestions) || 4,
        },
      });

      const nextState = startMockInterviewSession(previousState, response.session);
      setLocalInterviewState(nextState);
      setSelectedSessionId(response?.session?.id || nextState.activeSessionId || "");
      setAnswerDraft("");
      setConfidenceLevel("medium");
      setNotice(`Mock interview started for ${role}.`);
      setWarning(response?.warning || "");
      await saveMockInterviewState(currentUser.uid, nextState);
    } catch (requestError) {
      const nextState = startMockInterviewSession(previousState, localSession);
      const fallbackMessage =
        requestError instanceof Error
          ? `${requestError.message} Using local mock interview mode for this session.`
          : "Could not reach the interview service. Using local mock interview mode for this session.";

      setLocalInterviewState(nextState);
      setSelectedSessionId(localSession.id);
      setAnswerDraft("");
      setConfidenceLevel("medium");
      setNotice(`Mock interview started for ${role}.`);
      setWarning(fallbackMessage);

      if (currentUser?.uid) {
        await saveMockInterviewState(currentUser.uid, nextState);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async (event) => {
    event.preventDefault();

    if (!activeSession?.currentPrompt?.question) {
      setError("Start an interview or choose an active session first.");
      return;
    }

    if (activeSession.status !== "active") {
      setError("This interview is already complete. Start a new one to continue practicing.");
      return;
    }

    if (!answerDraft.trim()) {
      setError("Type your interview answer before submitting it.");
      return;
    }

    const previousState = interviewState;
    const timeTakenSeconds = questionStartedAtMs
      ? Math.max(0, Math.round((Date.now() - questionStartedAtMs) / 1000))
      : 0;
    const currentUser = auth.currentUser;
    const localResult = buildLocalMockInterviewAnswerResult({
      session: activeSession,
      answer: answerDraft.trim(),
      confidenceLevel,
      timeTakenSeconds,
    });

    setScoring(true);
    setError("");
    setNotice("");
    setWarning("");

    try {
      let resultPayload = localResult;
      let warningMessage = "";

      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const response = await postServerJson("/mock-interview/answer", {
            token,
            body: {
              session: activeSession,
              answer: answerDraft.trim(),
              confidenceLevel,
              timeTakenSeconds,
            },
          });
          resultPayload = {
            ...response.result,
            confidenceLevel,
            timeTakenSeconds,
          };
          warningMessage = response?.warning || "";
        } catch (requestError) {
          warningMessage =
            requestError instanceof Error
              ? `${requestError.message} Using local scoring for this answer.`
              : "Could not reach the interview service. Using local scoring for this answer.";
        }
      } else {
        warningMessage = "Using local scoring because you are not signed in.";
      }

      const nextState = recordMockInterviewAnswer(
        previousState,
        activeSession.id,
        resultPayload,
      );
      const updatedSession =
        nextState.sessions.find((session) => session.id === activeSession.id) || null;

      setLocalInterviewState(nextState);
      setSelectedSessionId(activeSession.id);
      setAnswerDraft("");
      setConfidenceLevel("medium");
      setWarning(warningMessage);
      setNotice(
        updatedSession?.status === "completed"
          ? "Interview completed. The final feedback has been saved to Performance."
          : "Answer scored. Review the feedback and continue with the next question.",
      );

      if (currentUser?.uid) {
        await saveMockInterviewState(currentUser.uid, nextState);
      }
    } catch (requestError) {
      setLocalInterviewState(previousState);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not score the interview answer.",
      );
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Mock Interview Lab"
        title="Run full mock interview cycles with role-based questions, weighted scoring, and saved improvement signals."
        description="Mock Interview Lab now links your target role, latest resume version, ATS score, and skill-gap context into each session. Every answer gets a weighted breakdown, model answer guidance, deeper follow-up probes, and a final summary that feeds Performance."
        aside={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/workspace/performance"
              className="theme-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            >
              <Trophy className="h-4 w-4" />
              Open Performance
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
              <Target className="h-4 w-4" />
              Career Guidance
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <InterviewStat
          icon={Mic}
          label="Total Sessions"
          value={String(interviewState.totalSessions)}
          helper="All saved mock interviews"
        />
        <InterviewStat
          icon={CheckCircle2}
          label="Completed"
          value={String(interviewState.completedSessions)}
          helper="Finished and scored sessions"
        />
        <InterviewStat
          icon={Sparkles}
          label="Average Score"
          value={interviewState.completedSessions ? `${interviewState.averageScore}/100` : "N/A"}
          helper="Completed session average"
        />
        <InterviewStat
          icon={Target}
          label="Best Score"
          value={interviewState.bestScore ? `${interviewState.bestScore}/100` : "N/A"}
          helper={interviewState.targetRole || "Target role not selected yet"}
        />
        <InterviewStat
          icon={TrendingUp}
          label="Improvement"
          value={formatImprovementRate(interviewState.improvementRate)}
          helper="Change from first to latest completed session"
        />
        <InterviewStat
          icon={ClipboardList}
          label="Repeat Gap"
          value={topWeakArea ? `${topWeakArea.count}x` : "N/A"}
          helper={topWeakArea?.label || "No repeated weak area yet"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-6">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">Start New Interview</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Build one complete training cycle with role context, resume signals, and skill gaps.
                </div>
              </div>
              <Bot className="h-5 w-5 text-red-200" />
            </div>

            <div className="mt-5 grid gap-3">
              <ContextInfoCard
                label="Target Role"
                value={defaultRole || "Not set in Career Guidance yet"}
                helper="Auto-linked from Career Guidance first"
              />
              <ContextInfoCard
                label="Resume Version"
                value={latestResumeVersion || "No analyzed resume yet"}
                helper="Latest analyzed resume is linked into the session"
              />
              <ContextInfoCard
                label="ATS Score"
                value={latestResumeScore != null ? `${latestResumeScore}/100` : "Not analyzed"}
                helper="Pulled from the latest resume analysis"
              />
            </div>

            <div className="mt-4">
              <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
                Skill Gaps
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {skillGaps.length ? (
                  skillGaps.slice(0, 8).map((item) => <SessionTag key={item}>{item}</SessionTag>)
                ) : (
                  <SessionTag>No saved skill-gap analysis yet</SessionTag>
                )}
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleStartInterview}>
              <Field label="Target Role">
                <input
                  value={form.role}
                  onChange={(event) => handleFormChange("role", event.target.value)}
                  placeholder="Example: Teacher"
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Interview Type">
                  <select
                    value={form.interviewType}
                    onChange={(event) => handleFormChange("interviewType", event.target.value)}
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  >
                    {INTERVIEW_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Difficulty">
                  <select
                    value={form.difficulty}
                    onChange={(event) => handleFormChange("difficulty", event.target.value)}
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  >
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company Context">
                  <input
                    value={form.company}
                    onChange={(event) => handleFormChange("company", event.target.value)}
                    placeholder="Optional company or institution"
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  />
                </Field>

                <Field label="Questions">
                  <select
                    value={String(form.maxQuestions)}
                    onChange={(event) => handleFormChange("maxQuestions", event.target.value)}
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  >
                    {MAX_QUESTION_OPTIONS.map((count) => (
                      <option key={count} value={String(count)}>
                        {count} questions
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Focus Areas">
                <textarea
                  value={form.focusAreas}
                  onChange={(event) => handleFormChange("focusAreas", event.target.value)}
                  placeholder="One per line: lesson planning, classroom management, responsive design..."
                  rows={4}
                  className={`${FIELD_CLASS} resize-none`}
                  style={FIELD_STYLE}
                />
              </Field>

              <Field label="Job Description">
                <textarea
                  value={form.jobDescription}
                  onChange={(event) => handleFormChange("jobDescription", event.target.value)}
                  placeholder="Optional JD to make the interview more role-specific."
                  rows={5}
                  className={`${FIELD_CLASS} resize-none`}
                  style={FIELD_STYLE}
                />
              </Field>

              <button
                type="submit"
                disabled={starting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg,var(--theme-primary-from),var(--theme-primary-to))",
                }}
              >
                {starting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Preparing Interview
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Start Mock Interview
                  </>
                )}
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="theme-text-strong text-xl font-black">Recent Sessions</div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              Re-open any saved interview to review scores, model answers, and repeated weak areas.
            </div>

            <div className="mt-5 space-y-3">
              {interviewState.sessions.length ? (
                interviewState.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      activeSession?.id === session.id
                        ? "border-red-400/25 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{session.role}</div>
                        <div className="mt-1 text-sm text-white/55">
                          {formatInterviewType(session.interviewType)} · {session.difficulty}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          session.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-100"
                            : "bg-sky-500/15 text-sky-100"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                      {session.company ? <SessionTag>{session.company}</SessionTag> : null}
                      <SessionTag>{session.maxQuestions} questions</SessionTag>
                      {session.sessionContext.linkedResumeVersion ? (
                        <SessionTag>{session.sessionContext.linkedResumeVersion}</SessionTag>
                      ) : null}
                      {session.status === "completed" ? (
                        <SessionTag>{getSessionAverageScore(session)}/100 avg</SessionTag>
                      ) : (
                        <SessionTag>
                          {session.turns.length}/{session.maxQuestions} answered
                        </SessionTag>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/55">
                  No interview sessions yet. Start one and the full feedback trail will appear here.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          {error ? (
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {warning ? (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
              {warning}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
              {notice}
            </div>
          ) : null}

          {!profileReady ? (
            <GlassCard className="p-6 text-sm text-white/72">
              Loading interview context from your profile...
            </GlassCard>
          ) : !activeSession ? (
            <GlassCard className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                <Mic className="h-4 w-4" />
                Practice Mode
              </div>
              <div className="mt-5 text-3xl font-black text-white">
                No active mock interview yet
              </div>
              <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                Start an interview from the left panel to generate a role-aware question set, a weighted
                answer score, model answer guidance, deeper follow-up probes, and a final session review
                that also appears inside Performance.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {defaultFocusAreas.length ? (
                  defaultFocusAreas.slice(0, 6).map((item) => (
                    <SessionTag key={item}>{item}</SessionTag>
                  ))
                ) : (
                  <SessionTag>No focus areas generated yet</SessionTag>
                )}
              </div>
            </GlassCard>
          ) : (
            <>
              <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                        <Briefcase className="h-4 w-4" />
                        {activeSession.role}
                      </div>
                      <div className="mt-4 text-2xl font-black text-white">
                        {formatInterviewType(activeSession.interviewType)} interview
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/58">
                        {activeSession.company ? `Company context: ${activeSession.company}. ` : ""}
                        {activeSession.guidance || activeSession.intro}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <SessionTag>{activeSession.difficulty}</SessionTag>
                      <SessionTag>
                        {activeSession.turns.length}/{activeSession.maxQuestions} answered
                      </SessionTag>
                      <SessionTag>{activeSession.status}</SessionTag>
                    </div>
                  </div>

                  {activeSession.questionPlan.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {activeSession.questionPlan.map((item) => (
                        <SessionTag key={`${activeSession.id}-${item}`}>{item}</SessionTag>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  <SessionContextPanel session={activeSession} />

                  {activeSession.status === "completed" ? (
                    <CompletedInterviewSummary session={activeSession} />
                  ) : (
                    <>
                      <div
                        className="rounded-[28px] border px-5 py-5"
                        style={{
                          borderColor: "rgba(239,68,68,0.18)",
                          background: "rgba(239,68,68,0.08)",
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                          <MessageSquareQuote className="h-4 w-4" />
                          Current Question
                          <SessionTag>{activeSession.currentPrompt.questionType}</SessionTag>
                        </div>
                        <div className="mt-4 text-xl font-bold text-white">
                          {activeSession.currentPrompt.question}
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/48">
                              Evaluation Criteria
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeSession.currentPrompt.evaluationCriteria.map((item) => (
                                <SessionTag key={`${activeSession.id}-${item}`}>{item}</SessionTag>
                              ))}
                            </div>

                            {activeSession.currentPrompt.expectedFocus.length ? (
                              <>
                                <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/48">
                                  What This Tests
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {activeSession.currentPrompt.expectedFocus.map((item) => (
                                    <SessionTag key={`${activeSession.id}-focus-${item}`}>{item}</SessionTag>
                                  ))}
                                </div>
                              </>
                            ) : null}

                            {activeSession.currentPrompt.hints.length ? (
                              <div className="mt-5 text-sm leading-7 text-white/65">
                                Hints: {activeSession.currentPrompt.hints.join(" · ")}
                              </div>
                            ) : null}
                          </div>

                          <AnswerFrameworkCard session={activeSession} />
                        </div>
                      </div>

                      <form className="space-y-4" onSubmit={handleSubmitAnswer}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
                            Your Answer
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/65">
                            <SessionTag>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatDuration(activeQuestionElapsedSeconds)}
                              </span>
                            </SessionTag>
                            <SessionTag>Typed answer</SessionTag>
                          </div>
                        </div>

                        <textarea
                          value={answerDraft}
                          onChange={(event) => setAnswerDraft(event.target.value)}
                          rows={8}
                          placeholder="Type the interview answer you would speak out loud..."
                          className={`${FIELD_CLASS} resize-none`}
                          style={FIELD_STYLE}
                        />

                        <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                          <Field label="Confidence Level">
                            <select
                              value={confidenceLevel}
                              onChange={(event) => setConfidenceLevel(event.target.value)}
                              className={FIELD_CLASS}
                              style={FIELD_STYLE}
                            >
                              {CONFIDENCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/62">
                            Submit once you have a complete answer. The evaluator saves your time taken,
                            confidence level, weighted breakdown, missing areas, ideal answer, and deeper
                            follow-up probes for this question.
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={scoring}
                          className="inline-flex items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background:
                              "linear-gradient(135deg,var(--theme-primary-from),var(--theme-primary-to))",
                          }}
                        >
                          {scoring ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Scoring Answer
                            </>
                          ) : (
                            <>
                              <ClipboardList className="h-4 w-4" />
                              Score Answer
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="theme-text-strong text-xl font-black">Feedback Trail</div>
                    <div className="theme-text-muted mt-2 text-sm leading-7">
                      Every answer keeps the weighted score, model answer, missing areas, and follow-up probes.
                    </div>
                  </div>
                  {activeSession.status === "completed" ? (
                    <Link
                      to="/workspace/performance"
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={{
                        borderColor: "var(--theme-border)",
                        background: "var(--theme-surface-0)",
                        color: "var(--theme-text-strong)",
                      }}
                    >
                      Performance
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 space-y-4">
                  {activeSession.turns.length ? (
                    activeSession.turns.map((turn, index) => (
                      <TurnCard key={`${turn.questionId}-${index}`} turn={turn} index={index} />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/55">
                      No answers scored yet. Submit the current answer to begin the feedback trail.
                    </div>
                  )}
                </div>
              </GlassCard>

              {latestSummary?.id && latestSummary.id !== activeSession.id ? (
                <GlassCard className="p-5 sm:p-6">
                  <div className="theme-text-strong text-xl font-black">Latest Completed Session</div>
                  <div className="theme-text-muted mt-2 text-sm leading-7">
                    Most recent completed mock interview summary saved into your profile.
                  </div>
                  <div className="mt-5">
                    <CompletedInterviewSummary session={latestSummary} compact />
                  </div>
                </GlassCard>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InterviewStat({ icon: Icon, label, value, helper }) {
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

function ContextInfoCard({ label, value, helper }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs leading-6 text-white/55">{helper}</div>
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

function SessionTag({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
      {children}
    </span>
  );
}

function SessionContextPanel({ session }) {
  const skillGaps = session.sessionContext.skillGaps || [];
  const focusAreas = session.sessionContext.focusAreas?.length
    ? session.sessionContext.focusAreas
    : session.focusAreas;

  return (
    <div className="grid gap-4 rounded-[26px] border border-white/10 bg-white/5 p-5 lg:grid-cols-3">
      <ContextInfoCard
        label="Resume Version"
        value={session.sessionContext.linkedResumeVersion || "Not linked"}
        helper="Auto-linked from latest analyzed resume"
      />
      <ContextInfoCard
        label="ATS Score"
        value={session.sessionContext.atsScore ? `${session.sessionContext.atsScore}/100` : "Not analyzed"}
        helper="Resume Analyzer score at session start"
      />
      <ContextInfoCard
        label="Target Role"
        value={session.sessionContext.targetRole || session.role}
        helper="Career Guidance target captured for this session"
      />

      <div className="lg:col-span-3">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
              Skill Gaps
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {skillGaps.length ? (
                skillGaps.map((item) => <SessionTag key={`${session.id}-gap-${item}`}>{item}</SessionTag>)
              ) : (
                <SessionTag>No saved gaps</SessionTag>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
              Focus Areas
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusAreas.length ? (
                focusAreas.map((item) => <SessionTag key={`${session.id}-focus-${item}`}>{item}</SessionTag>)
              ) : (
                <SessionTag>No focus areas</SessionTag>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerFrameworkCard({ session }) {
  const steps = buildAnswerFramework(session);

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
        Recommended Answer Flow
      </div>
      <div className="mt-3 grid gap-3">
        {steps.map((step, index) => (
          <div
            key={`${session.id}-${step}`}
            className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/72"
          >
            <span className="font-semibold text-white">{index + 1}.</span> {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnCard({ turn, index }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Question {index + 1}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <SessionTag>{turn.questionType}</SessionTag>
            <SessionTag>{formatConfidenceLabel(turn.confidenceLevel)} confidence</SessionTag>
            <SessionTag>{formatDuration(turn.timeTakenSeconds)}</SessionTag>
          </div>
          <div className="mt-3 text-lg font-bold text-white">{turn.question}</div>
        </div>
        <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100">
          {turn.score}/100
        </div>
      </div>

      {turn.evaluationCriteria.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {turn.evaluationCriteria.map((item) => (
            <SessionTag key={`${turn.questionId}-${item}`}>{item}</SessionTag>
          ))}
        </div>
      ) : null}

      <div className="mt-4 text-sm leading-7 text-white/72">
        <span className="font-semibold text-white">Your answer:</span> {turn.answer}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricPill label="Clarity" value={`${turn.clarityScore}/20`} />
        <MetricPill label="Concept" value={`${turn.conceptUnderstandingScore}/25`} />
        <MetricPill label="Structure" value={`${turn.structureScore}/15`} />
        <MetricPill label="Examples" value={`${turn.practicalExamplesScore}/20`} />
        <MetricPill label="Communication" value={`${turn.communicationScore}/20`} />
      </div>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/72">
        <span className="font-semibold text-white">Feedback:</span> {turn.feedback}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FeedbackList title="What You Did Well" items={turn.didWell} tone="emerald" />
        <FeedbackList title="What Was Missing" items={turn.missingAreas} tone="amber" />
      </div>

      {turn.idealAnswer ? (
        <div className="mt-4 rounded-[20px] border border-sky-300/20 bg-sky-500/10 px-4 py-4 text-sm leading-7 text-sky-100">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">
            Ideal Answer
          </div>
          <div className="mt-2">{turn.idealAnswer}</div>
        </div>
      ) : null}

      {turn.followUpQuestions.length ? (
        <div className="mt-4 rounded-[20px] border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-4 text-sm leading-7 text-fuchsia-100">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100/80">
            Follow-up Questions
          </div>
          <div className="mt-3 grid gap-3">
            {turn.followUpQuestions.map((item) => (
              <div
                key={`${turn.questionId}-${item}`}
                className="rounded-[16px] border border-fuchsia-300/20 bg-black/10 px-4 py-3"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompletedInterviewSummary({ session, compact = false }) {
  const denominator = Math.max(session.turns.length, 1) * 100;

  return (
    <div
      className={`rounded-[26px] border ${compact ? "p-4" : "p-5 sm:p-6"}`}
      style={{
        borderColor: "rgba(34,197,94,0.22)",
        background: "rgba(34,197,94,0.08)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/85">
            Final Interview Summary
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="text-2xl font-black text-white">
              {session.summary.averageScore}/100
            </div>
            <div className="text-sm text-white/72">
              Total {session.summary.totalScore}/{denominator}
            </div>
          </div>
          <div className="mt-2 text-sm font-semibold text-emerald-100">
            {session.summary.hireSignal || "Summary saved"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SessionTag>{session.role}</SessionTag>
          <SessionTag>{formatInterviewType(session.interviewType)}</SessionTag>
        </div>
      </div>

      {session.summary.summary ? (
        <div className="mt-4 text-sm leading-7 text-white/75">{session.summary.summary}</div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FeedbackList title="Strengths" items={session.summary.strengths} tone="emerald" />
        <FeedbackList title="Weaknesses" items={session.summary.weaknesses} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FeedbackList
          title="Top Improvement Areas"
          items={session.summary.topImprovementAreas}
          tone="amber"
        />
        <FeedbackList
          title="Recommended Practice Topics"
          items={session.summary.recommendedPracticeTopics}
          tone="sky"
        />
      </div>

      {session.summary.nextSteps.length ? (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/48">
            Action Plan
          </div>
          <div className="mt-3 grid gap-3">
            {session.summary.nextSteps.map((item) => (
              <div
                key={`${session.id}-${item}`}
                className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/72"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeedbackList({ title, items, tone }) {
  const emptyText =
    title === "Strengths" || title === "What You Did Well"
      ? "No strengths recorded yet."
      : "No items recorded yet.";
  const toneStyles =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
      : tone === "sky"
        ? "border-sky-300/20 bg-sky-500/10 text-sky-100"
        : "border-amber-300/20 bg-amber-500/10 text-amber-100";

  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
        {title}
      </div>
      <div className="mt-3 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className={`rounded-[16px] border px-4 py-3 text-sm leading-7 ${toneStyles}`}
            >
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function createInterviewForm(defaultRole, focusAreas) {
  return {
    role: defaultRole || "",
    interviewType: isTeachingRole(defaultRole) ? "domain" : "technical",
    difficulty: "medium",
    company: "",
    focusAreas: Array.isArray(focusAreas) && focusAreas.length ? focusAreas.join("\n") : "",
    jobDescription: "",
    maxQuestions: "4",
  };
}

function parseFocusAreas(value) {
  return uniqueStrings(
    String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ).slice(0, 10);
}

function normalizeInterviewTypeValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hr") {
    return "hr";
  }
  if (normalized === "domain") {
    return "domain";
  }
  return "technical";
}

function normalizeDifficultyValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") {
    return "easy";
  }
  if (normalized === "hard") {
    return "hard";
  }
  return "medium";
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

function buildAnswerFramework(session) {
  if (isTeachingRole(session?.role) || session?.currentPrompt?.questionType === "Teaching Simulation") {
    return [
      "Simple introduction in beginner-friendly language.",
      "Define the core concept clearly.",
      "Explain the key principles step by step.",
      "Use one classroom or real-life example.",
      "Close with why it matters for learners.",
    ];
  }

  if (session?.interviewType === "hr" || session?.currentPrompt?.questionType === "Behavioral") {
    return [
      "State the situation clearly.",
      "Explain your responsibility or decision point.",
      "Walk through your action.",
      "Share the result with evidence.",
      "Close with what you learned.",
    ];
  }

  return [
    "Start with a simple introduction.",
    "Explain the core idea or problem.",
    "Break down key steps or tradeoffs.",
    "Use one practical example.",
    "Finish with why the answer matters.",
  ];
}

function formatInterviewType(value) {
  if (value === "hr") {
    return "HR";
  }
  if (value === "domain") {
    return "Domain";
  }
  return "Technical";
}

function formatConfidenceLabel(value) {
  if (value === "low") {
    return "Low";
  }
  if (value === "high") {
    return "High";
  }
  return "Medium";
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatImprovementRate(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) {
    return "Stable";
  }
  return `${numericValue > 0 ? "+" : ""}${numericValue} pts`;
}

function getSessionAverageScore(session) {
  return Number(session?.summary?.averageScore || session?.summary?.overallScore || 0);
}

function getLatestResumeVersion({ resumeOverview, resumeWorkspace }) {
  return String(
    resumeWorkspace?.latestAnalysis?.context?.fileName ||
      resumeWorkspace?.latestAnalysis?.report?.fileName ||
      resumeOverview?.latestResumeFileName ||
      "",
  ).trim();
}

function getLatestResumeScore({ resumeOverview, resumeWorkspace }) {
  const value =
    resumeWorkspace?.latestAnalysis?.report?.atsScore ?? resumeOverview?.atsScore;
  return Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Math.round(Number(value)))) : null;
}

function getLatestAnalyzedRole({ resumeOverview, resumeWorkspace }) {
  return String(
    resumeWorkspace?.latestAnalysis?.report?.jobMatches?.[0]?.role ||
      resumeWorkspace?.latestAnalysis?.report?.topRole ||
      resumeOverview?.topRole ||
      "",
  ).trim();
}

function isTeachingRole(role) {
  return /\b(teacher|faculty|lecturer|trainer|tutor|professor|educator)\b/i.test(
    String(role || ""),
  );
}

const FIELD_CLASS =
  "w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:scale-[1.005]";

const FIELD_STYLE = {
  background: "var(--theme-surface-0)",
  borderColor: "var(--theme-border)",
  color: "var(--theme-text-strong)",
};
