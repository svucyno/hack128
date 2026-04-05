import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Mail,
  Map,
  Phone,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  FOLLOW_UP_PROMPTS,
  SECTION_LIMITS,
  formatSectionLabel,
  getSectionScores,
  hydrateAnalysisWithAiInsights,
  normalizeNotFound,
  uniqueStrings,
} from "../../lib/resumeAnalysis";
import { postServerJson } from "../../lib/serverApi";

const SCORE_RING_CIRCUMFERENCE = 427;

export default function ResumeAnalysisResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const storedLatestAnalysis = profile?.resumeWorkspace?.latestAnalysis || null;

  const sourceReport = location.state?.report || storedLatestAnalysis?.report || null;
  const sourceContext = location.state?.context || storedLatestAnalysis?.context || null;
  const rawResumeText = location.state?.rawResumeText || storedLatestAnalysis?.rawResumeText || "";

  const [warning, setWarning] = useState(location.state?.warning || "");
  const [question, setQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showRewrites, setShowRewrites] = useState(false);

  const analysis = useMemo(
    () =>
      sourceReport ? hydrateAnalysisWithAiInsights(sourceReport, sourceContext || null) : null,
    [sourceContext, sourceReport],
  );

  const bestRole = analysis?.jobMatches?.[0] || null;
  const roleMatches = analysis?.jobMatches?.slice(0, 3) || [];
  const sectionScores = analysis ? getSectionScores(analysis) : null;
  const keywordDetails = useMemo(
    () => buildKeywordDetails(analysis),
    [analysis],
  );
  const qualityChecks = useMemo(
    () => buildQualityChecks(rawResumeText, analysis),
    [analysis, rawResumeText],
  );
  const scoreBars = useMemo(
    () => buildScoreBars(analysis, sectionScores),
    [analysis, sectionScores],
  );
  const improvementItems = useMemo(
    () => buildImprovementItems(analysis),
    [analysis],
  );
  const roadmap = useMemo(() => buildRoadmap(analysis, bestRole), [analysis, bestRole]);
  const careerSuggestions = useMemo(
    () => buildCareerSuggestions(roleMatches, analysis?.careerRecommendations),
    [analysis?.careerRecommendations, roleMatches],
  );
  const followUpPrompts =
    analysis?.aiInsights?.suggestedQuestions?.length
      ? analysis.aiInsights.suggestedQuestions
      : FOLLOW_UP_PROMPTS;

  useEffect(() => {
    setWarning(location.state?.warning || "");
  }, [location.state]);

  useEffect(() => {
    if (!analysis) {
      setMessages([]);
      return;
    }

    setMessages(buildAnalysisConversation(analysis, sourceContext));
  }, [analysis, sourceContext]);

  const handleSendQuestion = async (rawPrompt) => {
    const prompt = rawPrompt.trim();
    if (!prompt || !analysis || questionLoading) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
    };
    const assistantId = `assistant-${Date.now() + 1}`;
    const pendingMessage = {
      id: assistantId,
      role: "assistant",
      title: "Gemini Resume Assistant",
      text: "Thinking through your ATS report, role fit, and next improvements...",
    };

    setQuestionLoading(true);
    setMessages((current) => [...current, userMessage, pendingMessage]);
    setQuestion("");

    let nextAssistantMessage = {
      id: assistantId,
      role: "assistant",
      title: "Resume Assistant",
      text: generateFollowUpResponse(prompt, analysis, sourceContext),
    };

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be signed in to use Gemini follow-up chat.");
      }

      const token = await currentUser.getIdToken();
      const response = await postServerJson("/resume-analyzer/chat", {
        token,
        body: {
          analysis,
          question: prompt,
          context: sourceContext,
          history: messages
            .slice(-6)
            .map((item) => ({
              role: item.role,
              text: item.text,
            }))
            .filter((item) => item.text),
        },
      });

      nextAssistantMessage = {
        id: assistantId,
        role: "assistant",
        title:
          response?.provider === "Gemini" ? "Gemini Resume Assistant" : "Resume Assistant",
        text: response?.answer || generateFollowUpResponse(prompt, analysis, sourceContext),
        bullets: response?.bullets || [],
        footer: response?.warning
          ? response.warning
          : response?.provider === "Gemini"
            ? `${response.provider} · ${response.model}`
            : "",
      };

      if (response?.warning) {
        setWarning(response.warning);
      }
    } catch (serverError) {
      console.error("Resume analyzer follow-up error:", serverError);
      setWarning(
        serverError instanceof Error
          ? `${serverError.message} Using the built-in resume assistant for this answer.`
          : "Gemini follow-up was unavailable. Using the built-in resume assistant for this answer.",
      );
      nextAssistantMessage = {
        ...nextAssistantMessage,
        footer: "Built-in resume assistant",
      };
    } finally {
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? nextAssistantMessage : item)),
      );
      setQuestionLoading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="resume-page resume-font-body rounded-[32px] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="resume-card p-8">
            <button
              type="button"
              onClick={() => navigate("/workspace/resume-analyzer")}
              className="resume-ghost-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Analyzer
            </button>

            <h1 className="resume-font-display mt-6 text-4xl font-bold">
              No saved analysis was found.
            </h1>
            <p
              className="mt-4 max-w-2xl text-sm leading-7"
              style={{ color: "var(--resume-text-muted)" }}
            >
              {profileReady
                ? "Upload a resume and run analysis first. The detailed ATS report will open here."
                : "Loading your latest saved report from Firebase..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-page resume-font-body rounded-[32px] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/workspace/resume-analyzer")}
            className="resume-ghost-button"
          >
            <ArrowLeft className="h-4 w-4" />
            New Analysis
          </button>

          <div className="flex flex-wrap gap-2">
            <MetaChip label="Candidate" value={analysis.extractedUser.name} />
            <MetaChip
              label="Top Role"
              value={bestRole ? `${bestRole.role} · ${bestRole.match}%` : "Not available"}
            />
          </div>
        </div>

        {warning ? <div className="resume-alert resume-alert--warning mb-6">{warning}</div> : null}

        <div className="resume-card p-6 md:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <ScoreRing score={analysis.atsScore} />

            <div className="flex-1">
              <h1 className="resume-font-display text-3xl font-bold md:text-4xl">
                ATS Compatibility
              </h1>
              <p
                className="mt-3 text-sm leading-7"
                style={{ color: "var(--resume-text-muted)" }}
              >
                {getScoreSummary(analysis.atsScore)}
              </p>

              <div className="mt-6 space-y-4">
                {scoreBars.map((bar) => (
                  <ScoreBarRow key={bar.label} bar={bar} />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <MetaChip label="File" value={sourceContext?.fileName || analysis.fileName} />
                <MetaChip
                  label="Resume Words"
                  value={`${analysis.resumeWordCount || 0}`}
                />
                <MetaChip
                  label="Analyzed"
                  value={formatDateTime(sourceContext?.analyzedAt)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ResultCard
            icon={KeyRound}
            title="Keyword Analysis"
            tone="primary"
            delayClass="resume-stagger-1"
          >
            <KeywordSection title="Found" items={keywordDetails.found} tone="success" />
            <KeywordSection
              title="Missing"
              items={keywordDetails.missing}
              tone="danger"
              className="mt-4"
            />
          </ResultCard>

          <ResultCard
            icon={LayoutGrid}
            title="Format & Structure"
            tone="success"
            delayClass="resume-stagger-2"
          >
            <div className="space-y-3">
              {qualityChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 text-sm">
                  {check.pass ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--resume-success)" }} />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" style={{ color: "var(--resume-danger)" }} />
                  )}
                  <span style={{ color: check.pass ? "var(--resume-text-soft)" : "var(--resume-danger)" }}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </ResultCard>

          <ResultCard
            icon={Trophy}
            title="Strengths"
            tone="warning"
            delayClass="resume-stagger-3"
          >
            <ul className="space-y-3 text-sm">
              {(analysis.strengths.length ? analysis.strengths : FALLBACK_STRENGTHS).map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--resume-success)" }} />
                  <span style={{ color: "var(--resume-text-soft)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </ResultCard>

          <ResultCard
            icon={CircleAlert}
            title="Areas to Improve"
            tone="danger"
            delayClass="resume-stagger-4"
          >
            <ul className="space-y-3 text-sm">
              {(analysis.whyScoreIsLow.length
                ? analysis.whyScoreIsLow
                : analysis.suggestions.slice(0, 4)
              ).map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CircleAlert className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--resume-danger)" }} />
                  <span style={{ color: "var(--resume-text-soft)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </ResultCard>
        </div>

        <div className="resume-card resume-fade-up mt-6 p-6 md:p-8">
          <SectionHeading icon={Wrench} title="Actionable Improvements" />
          <div className="mt-6 space-y-4">
            {improvementItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-start gap-4">
                <div className="resume-step-index">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                      {item.title}
                    </div>
                    <span className={`resume-tone-badge resume-tone-badge--${item.priority}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p
                    className="mt-2 text-sm leading-7"
                    style={{ color: "var(--resume-text-muted)" }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="resume-card resume-fade-up resume-stagger-1 p-6 md:p-8">
            <SectionHeading icon={UserRound} title="Profile Summary & Skill Gap" />

            <div className="mt-6 space-y-3">
              <InfoRow icon={UserRound} label="Name" value={analysis.extractedUser.name} />
              <InfoRow
                icon={Mail}
                label="Email"
                value={normalizeNotFound(analysis.extractedUser.email)}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={normalizeNotFound(analysis.extractedUser.phone)}
              />
              <InfoRow
                icon={GraduationCap}
                label="Education"
                value={analysis.extractedUser.educationLevel}
              />
              <InfoRow
                icon={TrendingUp}
                label="Experience"
                value={
                  analysis.extractedUser.yearsExperienceDisplay
                    ? `${analysis.extractedUser.yearsExperienceDisplay} years`
                    : analysis.extractedUser.experienceLevel
                }
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SkillColumn title="You Have" items={bestRole?.matchedSkills || analysis.extractedSkills} tone="success" />
              <SkillColumn title="Missing Skills" items={bestRole?.missingSkills || analysis.missingSkills} tone="danger" />
            </div>
          </div>

          <div className="resume-card resume-fade-up resume-stagger-2 p-6 md:p-8">
            <SectionHeading icon={Briefcase} title="Role Match Analysis" />

            <div className="mt-6 space-y-4">
              {roleMatches.length ? (
                roleMatches.map((match) => (
                  <div key={match.role} className="resume-card-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold" style={{ color: "var(--resume-text)" }}>
                          {match.role}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: "var(--resume-text-muted)" }}>
                          {getSalaryRange(match.role)}
                        </div>
                      </div>
                      <span className="resume-tone-badge resume-tone-badge--success">
                        {match.match}%
                      </span>
                    </div>
                    <div className="mt-4">
                      <InlineProgress value={match.match} tone="success" />
                    </div>
                    <div
                      className="mt-3 text-sm leading-7"
                      style={{ color: "var(--resume-text-muted)" }}
                    >
                      {match.summary || "Role match generated from the current resume evidence."}
                    </div>
                  </div>
                ))
              ) : (
                <div className="resume-card-soft p-4 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
                  Add a target job description or strengthen project evidence to get clearer role matches here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="resume-card resume-fade-up mt-6 p-6 md:p-8">
          <SectionHeading icon={Map} title="Career Suggestions & Roadmap" />

          <div className="mt-6 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              {careerSuggestions.length ? (
                careerSuggestions.map((item) => (
                  <div key={item.role} className="resume-card-soft p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold" style={{ color: "var(--resume-text)" }}>
                          {item.role}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: "var(--resume-text-muted)" }}>
                          Salary range: {item.salaryRange}
                        </div>
                      </div>
                      <span className="resume-tone-badge resume-tone-badge--primary">
                        {item.matchLabel}
                      </span>
                    </div>
                    <div
                      className="mt-3 text-sm leading-7"
                      style={{ color: "var(--resume-text-muted)" }}
                    >
                      {item.summary}
                    </div>
                  </div>
                ))
              ) : (
                <div className="resume-card-soft p-4 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
                  Career paths will appear here once the analysis has clearer role evidence.
                </div>
              )}

              <Link to="/workspace/career-guidance" className="resume-ghost-button">
                <Briefcase className="h-4 w-4" />
                Open Career Guidance
              </Link>
            </div>

            <div className="space-y-5">
              {roadmap.map((phase, index) => (
                <div key={phase.phase} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="resume-phase-index">{index + 1}</div>
                    {index < roadmap.length - 1 ? <div className="resume-phase-line" /> : null}
                  </div>

                  <div className="pb-4">
                    <div
                      className="text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--resume-primary)" }}
                    >
                      {phase.phase}
                    </div>
                    <div className="mt-1 text-base font-semibold" style={{ color: "var(--resume-text)" }}>
                      {phase.title}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--resume-primary)" }} />
                          <span style={{ color: "var(--resume-text-muted)" }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="resume-card resume-fade-up resume-stagger-1 p-6 md:p-8">
            <SectionHeading icon={FileText} title="AI Resume Improver" />

            <div className="mt-6 grid gap-4">
              <div className="resume-card-soft p-4">
                <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                  Before
                </div>
                <div className="mt-3 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
                  Worked on project.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRewrites((current) => !current)}
                className="resume-primary-button justify-center"
              >
                <Sparkles className="h-4 w-4" />
                {showRewrites ? "Hide Improved Resume" : "Improve Resume"}
              </button>

              <div className="resume-card-soft p-4">
                <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                  After
                </div>
                {showRewrites ? (
                  <ul className="mt-3 space-y-3">
                    {(analysis.aiInsights?.rewrittenBullets?.length
                      ? analysis.aiInsights.rewrittenBullets
                      : FALLBACK_REWRITES
                    ).map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <Sparkles className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--resume-primary)" }} />
                        <span style={{ color: "var(--resume-text-muted)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
                    Click `Improve Resume` to reveal stronger bullet suggestions generated from the current report.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="resume-card resume-fade-up resume-stagger-2 p-6 md:p-8">
            <SectionHeading icon={Bot} title="AI Chat Assistant" />

            <div className="mt-6 space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {followUpPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={questionLoading}
                  onClick={() => void handleSendQuestion(prompt)}
                  className="resume-chip resume-chip--neutral disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendQuestion(question);
                }
              }}
              disabled={questionLoading}
              rows={5}
              className="resume-input mt-5 px-4 py-4 text-sm leading-7 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="How can I improve my resume?"
            />

            <button
              type="button"
              onClick={() => void handleSendQuestion(question)}
              disabled={!question.trim() || questionLoading}
              className="resume-primary-button mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bot className="h-4 w-4" />
              {questionLoading ? "Thinking..." : "Ask Assistant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const [dashOffset, setDashOffset] = useState(SCORE_RING_CIRCUMFERENCE);
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));

  useEffect(() => {
    const nextOffset = SCORE_RING_CIRCUMFERENCE - (safeScore / 100) * SCORE_RING_CIRCUMFERENCE;
    const frame = window.requestAnimationFrame(() => {
      setDashOffset(nextOffset);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [safeScore]);

  return (
    <div className="flex shrink-0 items-center justify-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 160 160" className="h-full w-full">
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="var(--resume-border)"
            strokeWidth="10"
          />
          <circle
            className="resume-score-ring"
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="url(#resume-score-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 80 80)"
          />
          <defs>
            <linearGradient id="resume-score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--resume-primary)" />
              <stop offset="100%" stopColor="var(--resume-success)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: "var(--resume-text)" }}>
            {safeScore}
          </span>
          <span className="text-xs" style={{ color: "var(--resume-text-muted)" }}>
            ATS Score
          </span>
        </div>
      </div>
    </div>
  );
}

function ScoreBarRow({ bar }) {
  return (
    <div>
      <div
        className="mb-1 flex items-center justify-between text-xs"
        style={{ color: "var(--resume-text-soft)" }}
      >
        <span>{bar.label}</span>
        <span className="font-semibold">{bar.value}%</span>
      </div>
      <InlineProgress value={bar.value} tone={bar.tone} />
    </div>
  );
}

function InlineProgress({ value, tone = "primary" }) {
  const toneColor =
    tone === "danger"
      ? "var(--resume-danger)"
      : tone === "warning"
        ? "var(--resume-warning)"
        : tone === "success"
          ? "var(--resume-success)"
          : "var(--resume-primary)";

  return (
    <div className="resume-progress-track">
      <div
        className="resume-progress-fill"
        style={{
          width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`,
          background: toneColor,
        }}
      />
    </div>
  );
}

function ResultCard({ icon: Icon, title, tone = "primary", delayClass = "", children }) {
  const toneColor =
    tone === "danger"
      ? "var(--resume-danger)"
      : tone === "warning"
        ? "var(--resume-warning)"
        : tone === "success"
          ? "var(--resume-success)"
          : "var(--resume-primary)";
  const toneBackground =
    tone === "danger"
      ? "rgba(248,113,113,0.12)"
      : tone === "warning"
        ? "rgba(251,191,36,0.12)"
        : tone === "success"
          ? "rgba(52,211,153,0.12)"
          : "rgba(124,106,239,0.12)";

  return (
    <div className={`resume-card resume-fade-up p-6 ${delayClass}`}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: toneBackground }}
        >
          <Icon className="h-4 w-4" style={{ color: toneColor }} />
        </div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--resume-text)" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: "rgba(124,106,239,0.12)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--resume-primary)" }} />
      </div>
      <h2 className="text-lg font-semibold" style={{ color: "var(--resume-text)" }}>
        {title}
      </h2>
    </div>
  );
}

function KeywordSection({ title, items, tone, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-2 text-xs" style={{ color: "var(--resume-text-muted)" }}>
        {title} ({items.length})
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span key={item} className={`resume-chip resume-chip--${tone}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm" style={{ color: "var(--resume-text-muted)" }}>
            No data available.
          </span>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="resume-card-soft flex items-center gap-3 px-4 py-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: "rgba(124,106,239,0.12)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--resume-primary)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs" style={{ color: "var(--resume-text-muted)" }}>
          {label}
        </div>
        <div className="truncate text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SkillColumn({ title, items, tone }) {
  return (
    <div className="resume-card-soft p-4">
      <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
        {title}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items?.length ? items.slice(0, 8) : ["Not available"]).map((item, index) => (
          <span key={`${title}-${item}-${index}`} className={`resume-chip resume-chip--${tone}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[92%] rounded-2xl border px-4 py-4 ${
          isAssistant ? "resume-card-soft" : "resume-chat-user"
        }`}
      >
        {isAssistant ? (
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "rgba(124,106,239,0.12)" }}
            >
              <Bot className="h-4 w-4" style={{ color: "var(--resume-primary)" }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                {message.title || "Resume Assistant"}
              </div>
              <div className="text-[11px]" style={{ color: "var(--resume-text-muted)" }}>
                ATS review
              </div>
            </div>
          </div>
        ) : null}

        {message.text ? (
          <div className="whitespace-pre-wrap text-sm leading-7">{message.text}</div>
        ) : null}

        {message.bullets?.length ? (
          <div className="mt-3 space-y-2">
            {message.bullets.map((item) => (
              <div key={item} className="resume-card-soft px-3 py-3 text-sm leading-7">
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {message.footer ? (
          <div className="mt-3 text-xs" style={{ color: "var(--resume-text-muted)" }}>
            {message.footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <span className="resume-chip resume-chip--neutral">
      <span style={{ color: "var(--resume-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--resume-text)" }}>{value}</span>
    </span>
  );
}

function buildKeywordDetails(analysis) {
  if (!analysis) {
    return { found: [], missing: [] };
  }

  return {
    found: (
      analysis.jdComparison?.matchedKeywords?.length
        ? analysis.jdComparison.matchedKeywords
        : analysis.topKeywords
    ).slice(0, 6),
    missing: (
      analysis.jdComparison?.missingKeywords?.length
        ? analysis.jdComparison.missingKeywords
        : analysis.missingSkills
    ).slice(0, 5),
  };
}

function buildQualityChecks(rawResumeText, analysis) {
  const resumeText = String(rawResumeText || "");
  const hasBullets = /(^|\n)\s*[•\-*]/m.test(resumeText);
  const hasMetrics = /(\d+%|\$\d+|\d+\+?\s+(users?|clients?|projects?|years?|months?))/i.test(
    resumeText,
  );
  const hasSummary = /(summary|objective|profile|about)/i.test(resumeText);
  const hasEducation =
    analysis?.extractedUser?.educationLevel &&
    analysis.extractedUser.educationLevel !== "Not specified";
  const hasSkills = Boolean(analysis?.extractedSkills?.length);
  const hasContact =
    analysis?.extractedUser?.email !== "Not found" &&
    analysis?.extractedUser?.phone !== "Not found";

  return [
    { label: "Contact information", pass: hasContact },
    { label: "Professional summary", pass: hasSummary },
    { label: "Bullet points used", pass: hasBullets },
    { label: "Skills section", pass: hasSkills },
    { label: "Education section", pass: hasEducation },
    { label: "Quantified achievements", pass: hasMetrics },
  ];
}

function buildScoreBars(analysis, sectionScores) {
  if (!analysis || !sectionScores) {
    return [];
  }

  return [
    {
      label: "Keyword Match",
      value: analysis.jdComparison?.score || Math.min(sectionScores.skills * 2, 100),
      tone: analysis.jdComparison?.score >= 70 ? "success" : "primary",
    },
    {
      label: "Formatting",
      value: Math.round((sectionScores.formatting / SECTION_LIMITS.formatting) * 100),
      tone: "success",
    },
    {
      label: "Impact & Metrics",
      value: Math.round(
        ((sectionScores.projects + sectionScores.experience) /
          (SECTION_LIMITS.projects + SECTION_LIMITS.experience)) *
          100,
      ),
      tone: "warning",
    },
    {
      label: "Completeness",
      value: Math.round(
        ((sectionScores.skills +
          sectionScores.projects +
          sectionScores.experience +
          sectionScores.education +
          sectionScores.formatting) /
          100) *
          100,
      ),
      tone: "primary",
    },
  ];
}

function buildImprovementItems(analysis) {
  if (!analysis) {
    return [];
  }

  const priorityActions = uniqueStrings([
    ...(analysis.aiInsights?.priorityActions || []),
    ...(analysis.suggestions || []),
    ...(analysis.howToReachNinety || []),
  ]).slice(0, 5);

  return priorityActions.map((item, index) => ({
    title:
      index === 0
        ? "Fix the highest-impact issue first"
        : index === 1
          ? "Close the missing keyword gap"
          : index === 2
            ? "Rewrite weak bullets"
            : index === 3
              ? "Strengthen ATS structure"
              : "Add evidence for role fit",
    description: item,
    priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
  }));
}

function buildCareerSuggestions(roleMatches, careerRecommendations) {
  const roles = uniqueStrings([
    ...roleMatches.map((item) => item.role),
    ...(careerRecommendations || []),
  ]).slice(0, 4);

  return roles.map((role) => {
    const match = roleMatches.find((item) => item.role.toLowerCase() === role.toLowerCase());

    return {
      role,
      salaryRange: getSalaryRange(role),
      matchLabel: match ? `${match.match}% match` : "Suggested path",
      summary:
        match?.summary ||
        "Suggested from the strongest resume signals and adjacent role overlap.",
    };
  });
}

function buildRoadmap(analysis, bestRole) {
  const roadmapItems = uniqueStrings([
    ...(analysis?.roleSpecificPlan || []),
    ...(bestRole?.improvementPlan || []),
    ...(analysis?.howToReachNinety || []),
    ...(analysis?.suggestions || []),
    ...(analysis?.missingSkills || [])
      .slice(0, 3)
      .map((skill) => `Learn and apply ${skill} in a portfolio-quality project.`),
  ]);

  const grouped = [
    {
      phase: "Week 1-2",
      title: "Quick Wins",
      items: roadmapItems.slice(0, 3),
    },
    {
      phase: "Week 3-4",
      title: "Content Upgrade",
      items: roadmapItems.slice(3, 6),
    },
    {
      phase: "Month 2-3",
      title: "Career Growth",
      items: roadmapItems.slice(6, 9),
    },
  ];

  return grouped.map((item) => ({
    ...item,
    items: item.items.length
      ? item.items
      : ["Keep iterating on resume quality and targeted role skills."],
  }));
}

function buildAnalysisConversation(analysis, context) {
  const bestRole = analysis.jobMatches[0] || null;
  const keywordDetails = buildKeywordDetails(analysis);

  return [
    {
      id: "analysis-request",
      role: "user",
      text: context?.jobDescription
        ? "Analyze my resume against this job description."
        : "Analyze my resume and tell me how strong it is for ATS.",
    },
    {
      id: "analysis-score",
      role: "assistant",
      title: "ATS Result",
      text: `I analyzed ${context?.fileName || analysis.fileName}. Your resume currently scores ${analysis.atsScore}/100 and the strongest role match is ${bestRole?.role || "still forming"}.`,
    },
    {
      id: "analysis-keywords",
      role: "assistant",
      title: "Keyword Snapshot",
      text: `Matched keywords: ${keywordDetails.found.join(", ") || "Not enough data yet"}. Missing keywords: ${keywordDetails.missing.join(", ") || "No major misses detected"}.`,
    },
    {
      id: "analysis-actions",
      role: "assistant",
      title: "What To Do Next",
      text:
        analysis.aiInsights?.priorityActions?.join(" ") ||
        analysis.suggestions.slice(0, 3).join(" "),
    },
  ];
}

function generateFollowUpResponse(prompt, analysis, context) {
  const lowerPrompt = prompt.toLowerCase();
  const bestRole = analysis.jobMatches?.[0] || null;
  const weakestSections = Object.entries(getSectionScores(analysis))
    .sort((left, right) => left[1] - right[1])
    .slice(0, 2)
    .map(([key]) => formatSectionLabel(key).toLowerCase());

  if (lowerPrompt.includes("score") || lowerPrompt.includes("ats")) {
    return `Your ATS score is ${analysis.atsScore}/100. The weakest sections are ${weakestSections.join(
      " and ",
    )}. Improving those first will move the score fastest.`;
  }

  if (lowerPrompt.includes("role") || lowerPrompt.includes("job")) {
    if (!bestRole) {
      return "I do not have a clear role recommendation yet. Add a stronger resume and a target job description for more precise role matching.";
    }

    return `${bestRole.role} is the strongest fit at ${bestRole.match}%. The most important focus areas are ${bestRole.focusAreas
      .slice(0, 3)
      .join(", ") || "project depth, keywords, and stronger evidence"}.`;
  }

  if (lowerPrompt.includes("skill")) {
    return `The main missing skills are ${analysis.missingSkills.slice(0, 5).join(", ") || "still unclear from the current report"}. Strengthen those with projects, keywords, and better bullet phrasing.`;
  }

  if (
    lowerPrompt.includes("rewrite") ||
    lowerPrompt.includes("improve") ||
    lowerPrompt.includes("bullet")
  ) {
    return `${analysis.aiInsights?.rewrittenBullets?.[0] || "Rewrite bullets with action verbs, technical depth, and measurable outcomes."} Add metrics, ownership, and tools to make each bullet stronger.`;
  }

  if (lowerPrompt.includes("job description") || lowerPrompt.includes("jd")) {
    return context?.jobDescription
      ? `Your current JD match is ${analysis.jdComparison?.score || 0}%. The top missing keywords are ${(analysis.jdComparison?.missingKeywords || []).slice(0, 5).join(", ") || "minimal right now"}.`
      : "Add a target job description to unlock a real ATS keyword match and missing keyword analysis.";
  }

  return `Start with the weakest sections: ${weakestSections.join(
    " and ",
  )}. Then strengthen missing skills, add measurable outcomes, and align the resume more closely with ${bestRole?.role || "your target role"}.`;
}

function getScoreSummary(score) {
  if (score >= 80) {
    return "Excellent. Your resume is already well positioned for ATS screening and only needs targeted polishing.";
  }

  if (score >= 60) {
    return "Good foundation, but there is still room to improve keyword coverage, impact, and structure.";
  }

  return "Your resume needs stronger ATS optimization. Focus on missing keywords, measurable outcomes, and cleaner structure first.";
}

function getSalaryRange(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole.includes("frontend")) {
    return "$75k - $125k";
  }

  if (normalizedRole.includes("full stack")) {
    return "$85k - $140k";
  }

  if (normalizedRole.includes("backend")) {
    return "$85k - $145k";
  }

  if (normalizedRole.includes("mobile")) {
    return "$80k - $135k";
  }

  if (normalizedRole.includes("data")) {
    return "$80k - $135k";
  }

  if (normalizedRole.includes("devops")) {
    return "$95k - $155k";
  }

  return "$75k - $130k";
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

const FALLBACK_STRENGTHS = [
  "Core resume signals are available for ATS parsing and role matching.",
  "The report identified a usable role direction for the next iteration.",
];

const FALLBACK_REWRITES = [
  "Developed a React-based dashboard that improved workflow visibility and reduced manual tracking effort.",
  "Built and shipped role-aligned features with clearer technical depth, measurable outcomes, and ATS-friendly phrasing.",
  "Strengthened project bullets with action verbs, deployment evidence, and quantified impact.",
];
