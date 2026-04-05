import { useEffect, useRef, useState } from "react";
import { ref, serverTimestamp, update } from "firebase/database";
import {
  ArrowUp,
  Bot,
  Brain,
  Compass,
  LoaderCircle,
  MessageSquarePlus,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import { auth, db } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  buildAdaptiveLearningJourney,
  isRoadmapApprovalMessage,
  normalizeAdaptiveLearningState,
} from "../../lib/adaptiveLearning";
import { postServerJson } from "../../lib/serverApi";
import { saveAdaptiveLearningState } from "../../lib/userData";

const STARTER_PROMPTS = [
  "Analyze my profile summary, ATS score, and skill gaps.",
  "Recommend the top roles that fit my current resume.",
  "Create a 6-week roadmap to improve my placement readiness.",
  "Explain what is missing in my resume for a better ATS score.",
];

export default function CareerGuidancePage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [startingFresh, setStartingFresh] = useState(false);
  const [localChatId, setLocalChatId] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [adaptiveNotice, setAdaptiveNotice] = useState("");
  const [activatingAdaptiveRoadmap, setActivatingAdaptiveRoadmap] = useState(false);
  const bottomRef = useRef(null);

  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};
  const chats = getSortedChats(guidance.chats);
  const storedActiveChatId = guidance.activeChatId || chats[0]?.id || "";
  const activeChatId = startingFresh ? "" : localChatId || storedActiveChatId;
  const activeChat = startingFresh
    ? null
    : chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
  const messages = getSortedMessages(activeChat?.messages);
  const displayedMessages = sending
    ? [
        ...messages,
        ...(pendingPrompt
          ? [
              {
                id: "pending-user",
                role: "user",
                text: pendingPrompt,
                pending: true,
              },
              {
                id: "pending-assistant",
                role: "assistant",
                text: "Thinking through your profile and preparing the best next step...",
                pending: true,
                loading: true,
              },
            ]
          : []),
      ]
    : messages;
  const engineLabel = activeChat?.provider || guidance.lastProvider || "Career AI";
  const engineModel = activeChat?.model || guidance.lastModel || "personalized";
  const identityMatch = profile?.resumeOverview?.identityMatch;
  const activeChatTitle = startingFresh
    ? "New Career Chat"
    : activeChat?.title || "Career Guidance";
  const activeChatSummary =
    activeChat?.summary ||
    guidance.latestSummary ||
    "Ask for role-fit analysis, ATS improvement, project ideas, or a roadmap.";
  const activeTargetRole =
    (startingFresh
      ? ""
      : getChatTargetRole(activeChat) || guidance.latestTargetRole || resumeOverview.topRole) || "";
  const activeFocusAreas =
    activeChat?.latestFocusAreas || guidance.latestFocusAreas || resumeOverview.missingSkills || [];
  const activeSuggestedQuestions =
    activeChat?.latestSuggestedQuestions || guidance.latestSuggestedQuestions || STARTER_PROMPTS;
  const activeSkillGapAnalysis =
    getChatSkillGapAnalysis(activeChat) ||
    normalizeSkillGapAnalysis(guidance.latestSkillGapAnalysis) ||
    normalizeSkillGapAnalysis({
      missingSkills: resumeOverview.missingSkills || [],
      matchedSkills: resumeOverview.extractedSkills || [],
      prioritySkills: resumeOverview.missingSkills || [],
    });
  const adaptiveLearning = normalizeAdaptiveLearningState(profile?.adaptiveLearning);

  useEffect(() => {
    if (!startingFresh && storedActiveChatId) {
      setLocalChatId(storedActiveChatId);
    }
  }, [startingFresh, storedActiveChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedMessages.length, sending, startingFresh]);

  const handleSend = async (messageOverride) => {
    const nextMessage = String(messageOverride ?? draft).trim();
    if (!nextMessage || sending) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You must be logged in to use Career Guidance.");
      return;
    }

    setError("");
    setSending(true);
    setPendingPrompt(nextMessage);
    setAdaptiveNotice("");

    try {
      const token = await currentUser.getIdToken();
      const roadmapForAdaptiveLearning = getRoadmapActivationPayload({
        activeChat,
        guidance,
        activeTargetRole,
        activeSkillGapAnalysis,
      });
      const response = await postServerJson("/career-guidance/chat", {
        token,
        body: {
          message: nextMessage,
          chatId: activeChatId,
          createNewChat: startingFresh || !activeChatId,
        },
      });

      setDraft("");
      setStartingFresh(false);
      setLocalChatId(response.chatId || "");

      if (roadmapForAdaptiveLearning && isRoadmapApprovalMessage(nextMessage)) {
        await activateRoadmapInAdaptiveLearning({
          currentUser,
          adaptiveLearning,
          setAdaptiveNotice,
          setError,
          setActivatingAdaptiveRoadmap,
          ...roadmapForAdaptiveLearning,
        });
      }
    } catch (requestError) {
      setError(requestError.message || "Career guidance request failed.");
    } finally {
      setSending(false);
      setPendingPrompt("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await handleSend();
  };

  const handleStartFresh = () => {
    setStartingFresh(true);
    setLocalChatId("");
    setDraft("");
    setError("");
    setPendingPrompt("");
    setAdaptiveNotice("");
  };

  const syncSelectedChat = async (chat) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !chat?.id) {
      return;
    }

    try {
      await update(ref(db, `users/${currentUser.uid}/careerGuidance`), {
        activeChatId: chat.id,
        latestSummary: chat.summary || "",
        latestTargetRole: getChatTargetRole(chat),
        latestFocusAreas: Array.isArray(chat.latestFocusAreas) ? chat.latestFocusAreas : [],
        latestRecommendedRoles: Array.isArray(chat.latestRecommendedRoles)
          ? chat.latestRecommendedRoles
          : [],
        latestSuggestedQuestions: Array.isArray(chat.latestSuggestedQuestions)
          ? chat.latestSuggestedQuestions
          : [],
        latestSkillGapAnalysis: getChatSkillGapAnalysis(chat) || {
          matchedSkills: [],
          missingSkills: [],
          prioritySkills: [],
        },
        latestRoadmap:
          chat.latestRoadmap && Array.isArray(chat.latestRoadmap.weeks)
            ? chat.latestRoadmap
            : null,
        updatedAt: serverTimestamp(),
        updatedAtIso: new Date().toISOString(),
      });
    } catch (syncError) {
      console.error("Career guidance chat sync error:", syncError);
    }
  };

  const handleSelectChat = (chat) => {
    if (!chat?.id) {
      return;
    }

    setStartingFresh(false);
    setLocalChatId(chat.id);
    setError("");
    setPendingPrompt("");
    setAdaptiveNotice("");
    void syncSelectedChat(chat);
  };

  const handleActivateRoadmap = async (payload) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You must be logged in to activate Adaptive Learning.");
      return;
    }

    await activateRoadmapInAdaptiveLearning({
      currentUser,
      adaptiveLearning,
      setAdaptiveNotice,
      setError,
      setActivatingAdaptiveRoadmap,
      ...payload,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-200">
              Advanced AI Career Intelligence
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Advanced AI Career Intelligence System
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/62 sm:text-base">
              Chat naturally, then get a structured intelligence report with profile summary,
              parsed resume data, ATS breakdown, skill gaps, role recommendations, roadmap, and
              improvement actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill icon={Bot} label={engineLabel} />
            <StatusPill icon={Sparkles} label={engineModel} />
            <button
              type="button"
              onClick={handleStartFresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="grid min-h-[80vh] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] lg:border-b-0 lg:border-r">
            <div className="p-5">
              <button
                type="button"
                onClick={handleStartFresh}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Start New Chat
              </button>
            </div>

            <div className="px-5 pb-5">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                  <Compass className="h-4 w-4 text-red-300" />
                  Current Context
                </div>
                <div className="mt-4 grid gap-3">
                  <ContextRow label="ATS Score" value={resumeOverview.atsScore != null ? `${resumeOverview.atsScore}/100` : "Not analyzed"} />
                  <ContextRow label="Top Role" value={resumeOverview.topRole || "Not available"} />
                  <ContextRow label="Target Role" value={activeTargetRole || "Not chosen yet"} />
                  <ContextRow
                    label="Resume Match"
                    value={
                      identityMatch === false
                        ? "Mismatch"
                        : identityMatch === true
                          ? "Matched"
                          : "Pending"
                    }
                  />
                </div>

                {activeFocusAreas.length ? (
                  <div className="mt-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                      Focus Areas
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeFocusAreas.slice(0, 5).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeSkillGapAnalysis?.prioritySkills?.length ? (
                  <div className="mt-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                      Current Gap Snapshot
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeSkillGapAnalysis.prioritySkills.slice(0, 5).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
                Recent Chats
              </div>
              <div className="mt-4 space-y-3">
                {chats.length ? (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        !startingFresh && activeChatId === chat.id
                          ? "border-red-400/25 bg-red-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">
                        {chat.title || "Career guidance"}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
                        {getChatPreview(chat)}
                      </div>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/30">
                        {formatChatTimestamp(chat)}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/55">
                    No chat history yet. Start one and it will appear here like a Gemini-style recent conversation list.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(3,3,4,0.06))]">
            {!profileReady ? (
              <InlineBanner>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading your personalized context...
              </InlineBanner>
            ) : null}

            {guidance.lastWarning ? (
              <InlineBanner tone="warning">
                <TriangleAlert className="h-4 w-4" />
                {guidance.lastWarning}
              </InlineBanner>
            ) : null}

            {adaptiveNotice ? (
              <InlineBanner tone="success">
                <Sparkles className="h-4 w-4" />
                {adaptiveNotice}
              </InlineBanner>
            ) : null}

            {identityMatch === false ? (
              <InlineBanner tone="warning">
                <TriangleAlert className="h-4 w-4" />
                Your latest analyzed resume does not match the logged-in user, so resume-derived guidance may be less reliable until you upload the correct resume.
              </InlineBanner>
            ) : null}

            <div className="border-b border-white/10 px-4 py-5 sm:px-6">
              <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38">
                    Active Conversation
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">{activeChatTitle}</div>
                  <div className="mt-2 text-sm leading-7 text-white/55">{activeChatSummary}</div>
                  {activeTargetRole ? (
                    <div className="mt-3 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
                      Target role: {activeTargetRole}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill icon={Brain} label={engineLabel} compact />
                  <StatusPill icon={Target} label={engineModel} compact />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                {!displayedMessages.length ? (
                  <EmptyState
                    onPromptClick={(prompt) => void handleSend(prompt)}
                    sending={sending}
                    suggestedQuestions={activeSuggestedQuestions}
                    focusAreas={activeFocusAreas}
                  />
                ) : null}

                {displayedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    chatId={activeChat?.id || activeChatId || guidance.activeChatId || ""}
                    adaptiveLearning={adaptiveLearning}
                    activatingAdaptiveRoadmap={activatingAdaptiveRoadmap}
                    onActivateRoadmap={(payload) => void handleActivateRoadmap(payload)}
                    onSuggestionClick={(prompt) => void handleSend(prompt)}
                  />
                ))}

                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/20 px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-5xl">
                <form onSubmit={handleSubmit}>
                  <div className="rounded-[30px] border border-white/10 bg-[#09090d]/85 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="Ask like you would in Gemini: role fit, ATS fixes, roadmap, projects, or interview prep..."
                      className="min-h-[84px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-white outline-none placeholder:text-white/32"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-2 pt-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/32">
                        Enter to send, Shift+Enter for a new line
                      </div>
                      <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/50"
                      >
                        {sending ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function StatusPill({ icon: Icon, label, compact = false }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 text-red-100 ${
        compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-sm font-medium text-white/80">{value}</div>
    </div>
  );
}

function InlineBanner({ children, tone = "neutral" }) {
  const toneClasses =
    tone === "warning"
      ? "border-b border-amber-400/15 bg-amber-500/10 text-amber-100"
      : tone === "success"
        ? "border-b border-emerald-400/15 bg-emerald-500/10 text-emerald-100"
      : "border-b border-white/10 bg-white/5 text-white/70";

  return (
    <div className={`px-4 py-3 text-sm sm:px-6 ${toneClasses}`}>
      <div className="mx-auto flex max-w-5xl items-center gap-3">{children}</div>
    </div>
  );
}

function EmptyState({ onPromptClick, sending, suggestedQuestions, focusAreas }) {
  return (
    <div className="grid gap-6">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
        <div className="flex items-center gap-3 text-red-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-white">Start an AI career intelligence conversation</div>
            <div className="mt-1 text-sm text-white/55">
              Ask naturally and the assistant will respond like a real career intelligence system with ATS analysis, role fit, roadmap planning, and follow-up suggestions.
            </div>
          </div>
        </div>

        {focusAreas?.length ? (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
              Current Focus Areas
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusAreas.slice(0, 5).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptClick(prompt)}
            disabled={sending}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-red-400/20 hover:bg-red-500/10 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium leading-7 text-white/78">{prompt}</div>
          </button>
        ))}
      </div>

      {suggestedQuestions?.length ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Quick Suggestions
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPromptClick(prompt)}
                disabled={sending}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70 transition hover:border-red-400/20 hover:text-white disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  chatId,
  adaptiveLearning,
  activatingAdaptiveRoadmap,
  onActivateRoadmap,
  onSuggestionClick,
}) {
  const isAssistant = message.role === "assistant";
  const showProfileSummary = hasProfileSummary(message.profileSummary);
  const showParsedResumeData = hasParsedResumeData(message.parsedResumeData);
  const showAtsBreakdown = hasAtsBreakdown(message.atsBreakdown);
  const showSkillGapAnalysis = hasSkillGapAnalysis(message.skillGapAnalysis);
  const showPerformanceInsights = hasPerformanceInsights(message.performanceInsights);
  const showFinalSuggestions = Array.isArray(message.finalSuggestions) && message.finalSuggestions.length;
  const roadmapIsActive =
    Boolean(message.roadmap?.weeks?.length) &&
    adaptiveLearning?.roadmapAccepted &&
    adaptiveLearning.sourceRoadmapTitle === String(message.roadmap?.title || "").trim() &&
    (!adaptiveLearning.sourceChatId || adaptiveLearning.sourceChatId === chatId);

  return (
    <div className={`flex gap-4 ${isAssistant ? "items-start" : "justify-end"}`}>
      {isAssistant ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100">
          {message.loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </div>
      ) : null}

      <div
        className={`${
          isAssistant
            ? "max-w-4xl flex-1 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 sm:p-6"
            : "max-w-2xl rounded-[30px] border border-red-400/20 bg-[linear-gradient(135deg,rgba(239,68,68,0.28),rgba(190,24,93,0.14))] p-5 text-white shadow-[0_14px_40px_rgba(120,10,10,0.22)]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
            {isAssistant ? "Career Copilot" : "You"}
          </div>
          <div className="text-xs uppercase tracking-[0.16em] text-white/28">
            {formatMessageTime(message)}
          </div>
        </div>

        <div className={`mt-4 whitespace-pre-wrap text-sm leading-7 ${isAssistant ? "text-white/80" : "text-white"}`}>
          {String(message.text || "").trim()}
        </div>

        {isAssistant && message.summary ? (
          <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Executive Summary</div>
            <div className="mt-2 text-sm leading-7 text-white/72">{message.summary}</div>
          </div>
        ) : null}

        {isAssistant && message.targetRole ? (
          <div className="mt-5">
            <InfoCard label="Target Role" value={message.targetRole} />
          </div>
        ) : null}

        {isAssistant && showProfileSummary ? (
          <DetailSection title="Profile Summary">
            {message.profileSummary.headline ? (
              <div className="text-base font-semibold text-white">{message.profileSummary.headline}</div>
            ) : null}
            {message.profileSummary.overview ? (
              <div className="mt-2 text-sm leading-7 text-white/68">
                {message.profileSummary.overview}
              </div>
            ) : null}
            {message.profileSummary.strengths?.length ? (
              <TagBlock
                className="mt-4"
                label="Strengths"
                items={message.profileSummary.strengths}
                tone="emerald"
              />
            ) : null}
            {message.profileSummary.concerns?.length ? (
              <TagBlock
                className="mt-4"
                label="Watchouts"
                items={message.profileSummary.concerns}
                tone="amber"
              />
            ) : null}
          </DetailSection>
        ) : null}

        {isAssistant && showParsedResumeData ? (
          <DetailSection title="Parsed Resume Data">
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Name" value={message.parsedResumeData.name || "Not available"} />
              <InfoCard label="Email" value={message.parsedResumeData.email || "Not available"} />
              <InfoCard label="Phone" value={message.parsedResumeData.phone || "Not available"} />
            </div>
            {message.parsedResumeData.skills?.length ? (
              <TagBlock
                className="mt-4"
                label="Skills"
                items={message.parsedResumeData.skills}
                tone="neutral"
              />
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SimpleListCard
                title="Education"
                items={message.parsedResumeData.education}
                emptyText="No education lines were extracted."
              />
              <SimpleListCard
                title="Certifications"
                items={message.parsedResumeData.certifications}
                emptyText="No certifications were extracted."
              />
              <SimpleListCard
                title="Experience"
                items={message.parsedResumeData.experience}
                emptyText="No clear experience lines were extracted."
              />
              <SimpleListCard
                title="Projects"
                items={message.parsedResumeData.projects}
                emptyText="No clear project lines were extracted."
              />
            </div>
          </DetailSection>
        ) : null}

        {isAssistant && showAtsBreakdown ? (
          <DetailSection title="ATS Score + Breakdown">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-red-100/70">
                  Final ATS Score
                </div>
                <div className="mt-3 text-4xl font-black text-white">
                  {message.atsBreakdown.finalScore}
                  <span className="text-xl text-white/45">/100</span>
                </div>
                {message.atsBreakdown.label ? (
                  <div className="mt-3 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                    {message.atsBreakdown.label}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard
                  label="Keyword Match"
                  value={`${message.atsBreakdown.keywordScore}/100`}
                />
                <InfoCard
                  label="Semantic Match"
                  value={`${message.atsBreakdown.semanticScore}/100`}
                />
                <InfoCard
                  label="Resume Quality"
                  value={`${message.atsBreakdown.resumeQualityScore}/100`}
                />
              </div>
            </div>

            {message.atsBreakdown.sectionBreakdown?.length ? (
              <div className="mt-5 space-y-3">
                {message.atsBreakdown.sectionBreakdown.map((item) => (
                  <div
                    key={`${message.id}-${item.label}`}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="mt-1 text-sm text-white/52">{item.weight}</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
                        {item.score}
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(239,68,68,0.95),rgba(251,146,60,0.95))]"
                        style={{ width: `${getAtsBreakdownPercent(item)}%` }}
                      />
                    </div>
                    {item.insight ? (
                      <div className="mt-3 text-sm leading-7 text-white/62">{item.insight}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {message.atsBreakdown.matchedKeywords?.length ? (
              <TagBlock
                className="mt-5"
                label="Matched Keywords"
                items={message.atsBreakdown.matchedKeywords}
                tone="emerald"
              />
            ) : null}

            {message.atsBreakdown.missingKeywords?.length ? (
              <TagBlock
                className="mt-4"
                label="Missing Keywords"
                items={message.atsBreakdown.missingKeywords}
                tone="amber"
              />
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SimpleListCard
                title="Issues Found"
                items={message.atsBreakdown.issuesFound}
                emptyText="No major ATS issues were highlighted."
                tone="amber"
              />
              <SimpleListCard
                title="Suggestions"
                items={message.atsBreakdown.suggestions}
                emptyText="No extra ATS suggestions were returned."
                tone="emerald"
              />
            </div>
          </DetailSection>
        ) : null}

        {isAssistant && showSkillGapAnalysis ? (
          <DetailSection title="Skill Gap Analysis">
            {message.skillGapAnalysis.matchedSkills?.length ? (
              <TagBlock
                label="Matched Skills"
                items={message.skillGapAnalysis.matchedSkills}
                tone="emerald"
              />
            ) : null}
            {message.skillGapAnalysis.missingSkills?.length ? (
              <TagBlock
                className="mt-4"
                label="Missing Skills"
                items={message.skillGapAnalysis.missingSkills}
                tone="amber"
              />
            ) : null}
            {message.skillGapAnalysis.prioritySkills?.length ? (
              <TagBlock
                className="mt-4"
                label="Priority Skills To Learn"
                items={message.skillGapAnalysis.prioritySkills}
                tone="red"
              />
            ) : null}
          </DetailSection>
        ) : null}

        {isAssistant && message.recommendedRoles?.length ? (
          <div className="mt-5">
            <div className="text-sm font-semibold text-white">Recommended Roles</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {message.recommendedRoles.map((role) => (
                <div
                  key={`${message.id}-${role.role}`}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{role.role}</div>
                    <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100">
                      {role.fitScore}%
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/60">{role.reason}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isAssistant && message.focusAreas?.length ? (
          <div className="mt-5">
            <div className="text-sm font-semibold text-white">Focus Areas</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {message.focusAreas.map((item) => (
                <span
                  key={`${message.id}-${item}`}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {isAssistant && message.roadmap?.weeks?.length ? (
          <DetailSection title="Learning Roadmap">
            <div className="text-sm font-semibold text-white">
              {message.roadmap.title || "Roadmap"}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {roadmapIsActive ? (
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Active in Adaptive Learning
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onActivateRoadmap?.({
                      roadmap: message.roadmap,
                      targetRole: message.targetRole,
                      skillGapAnalysis: message.skillGapAnalysis,
                      sourceChatId: chatId,
                    })
                  }
                  disabled={activatingAdaptiveRoadmap || message.pending}
                  className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activatingAdaptiveRoadmap ? "Activating..." : "Use In Adaptive Learning"}
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {message.roadmap.weeks.slice(0, 6).map((week) => (
                <div
                  key={`${message.id}-${week.label}`}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-red-200">
                    {week.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{week.goal}</div>
                  <div className="mt-3 space-y-2">
                    {(week.tasks || []).slice(0, 4).map((task) => (
                      <div
                        key={`${week.label}-${task}`}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/68"
                      >
                        {task}
                      </div>
                    ))}
                  </div>
                  {week.resources?.length ? (
                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Resources
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {week.resources.map((resource) => (
                          <span
                            key={`${week.label}-${resource}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/68"
                          >
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {isAssistant && showPerformanceInsights ? (
          <DetailSection title="Performance Insights">
            <div className="flex flex-wrap items-start gap-3">
              {message.performanceInsights.riskLevel ? (
                <div
                  className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${getRiskClasses(
                    message.performanceInsights.riskLevel,
                  )}`}
                >
                  {message.performanceInsights.riskLevel} risk
                </div>
              ) : null}
            </div>
            {message.performanceInsights.summary ? (
              <div className="mt-4 text-sm leading-7 text-white/68">
                {message.performanceInsights.summary}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SimpleListCard
                title="Signals"
                items={message.performanceInsights.signals}
                emptyText="No performance signals were returned."
              />
              <SimpleListCard
                title="Suggestions"
                items={message.performanceInsights.suggestions}
                emptyText="No performance suggestions were returned."
                tone="emerald"
              />
            </div>
            {message.performanceInsights.missingData?.length ? (
              <TagBlock
                className="mt-4"
                label="Missing Academic Data"
                items={message.performanceInsights.missingData}
                tone="amber"
              />
            ) : null}
          </DetailSection>
        ) : null}

        {isAssistant && showFinalSuggestions ? (
          <DetailSection title="Final Suggestions">
            <div className="space-y-2">
              {message.finalSuggestions.map((item) => (
                <div
                  key={`${message.id}-${item}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/68"
                >
                  {item}
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {isAssistant && message.suggestedQuestions?.length ? (
          <div className="mt-5">
            <div className="text-sm font-semibold text-white">Ask Next</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {message.suggestedQuestions.map((prompt) => (
                <button
                  key={`${message.id}-${prompt}`}
                  type="button"
                  onClick={() => onSuggestionClick(prompt)}
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/72 transition hover:border-red-400/20 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isAssistant && (message.confidence || message.disclaimer || message.warning) ? (
          <div className="mt-5 flex flex-wrap items-start gap-3">
            {message.confidence ? (
              <div
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${getConfidenceClasses(
                  message.confidence,
                )}`}
              >
                {message.confidence} confidence
              </div>
            ) : null}
            {message.warning ? (
              <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                warning
              </div>
            ) : null}
          </div>
        ) : null}

        {isAssistant && (message.disclaimer || message.warning) ? (
          <div className="mt-4 text-sm leading-7 text-white/50">
            {[message.warning, message.disclaimer].filter(Boolean).join(" ")}
          </div>
        ) : null}
      </div>

      {!isAssistant ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
          <UserRound className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}

function getRoadmapActivationPayload({
  activeChat,
  guidance,
  activeTargetRole,
  activeSkillGapAnalysis,
}) {
  const chatRoadmap = activeChat?.latestRoadmap?.weeks?.length ? activeChat.latestRoadmap : null;
  const guidanceRoadmap =
    guidance?.latestRoadmap?.weeks?.length ? guidance.latestRoadmap : null;
  const roadmap = chatRoadmap || guidanceRoadmap;

  if (!roadmap?.weeks?.length) {
    return null;
  }

  return {
    roadmap,
    targetRole:
      getChatTargetRole(activeChat) || activeTargetRole || guidance.latestTargetRole || "",
    skillGapAnalysis:
      getChatSkillGapAnalysis(activeChat) ||
      normalizeSkillGapAnalysis(guidance.latestSkillGapAnalysis) ||
      activeSkillGapAnalysis,
    sourceChatId: activeChat?.id || guidance.activeChatId || "",
  };
}

async function activateRoadmapInAdaptiveLearning({
  currentUser,
  roadmap,
  targetRole,
  skillGapAnalysis,
  sourceChatId,
  adaptiveLearning,
  setAdaptiveNotice,
  setError,
  setActivatingAdaptiveRoadmap,
}) {
  if (!currentUser || !roadmap?.weeks?.length) {
    return;
  }

  setActivatingAdaptiveRoadmap(true);
  setError("");

  try {
    const nextState = buildAdaptiveLearningJourney({
      roadmap,
      targetRole,
      skillGapAnalysis,
      sourceChatId,
      sourceRoadmapUpdatedAtIso: roadmap.updatedAtIso || "",
      existingState: adaptiveLearning,
    });

    await saveAdaptiveLearningState(currentUser.uid, nextState);
    setAdaptiveNotice(
      "Roadmap activated in Adaptive Learning. Day 1 is now unlocked.",
    );
  } catch (activationError) {
    setError(
      activationError instanceof Error
        ? activationError.message
        : "Could not activate Adaptive Learning from the roadmap.",
    );
  } finally {
    setActivatingAdaptiveRoadmap(false);
  }
}

function getSortedChats(chats) {
  return Object.entries(chats || {})
    .map(([id, value]) => ({
      id,
      ...value,
    }))
    .sort(
      (left, right) =>
        getTimeValue(right.updatedAtIso || right.createdAtIso) -
        getTimeValue(left.updatedAtIso || left.createdAtIso),
    );
}

function getSortedMessages(messages) {
  return Object.entries(messages || {})
    .map(([id, value]) => ({
      id,
      ...value,
    }))
    .sort(
      (left, right) =>
        getTimeValue(left.createdAtIso || left.createdAt) -
        getTimeValue(right.createdAtIso || right.createdAt),
    );
}

function getLatestAssistantMessage(chat) {
  return getSortedMessages(chat?.messages)
    .filter((message) => message.role === "assistant")
    .slice(-1)[0] || null;
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

function getChatTargetRole(chat) {
  const latestAssistant = getLatestAssistantMessage(chat);
  return String(
    chat?.latestTargetRole ||
      latestAssistant?.targetRole ||
      chat?.latestRecommendedRoles?.[0]?.role ||
      latestAssistant?.recommendedRoles?.[0]?.role ||
      "",
  ).trim();
}

function getChatSkillGapAnalysis(chat) {
  const latestAssistant = getLatestAssistantMessage(chat);
  return (
    normalizeSkillGapAnalysis(chat?.latestSkillGapAnalysis) ||
    normalizeSkillGapAnalysis(latestAssistant?.skillGapAnalysis)
  );
}

function getTimeValue(value) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = new Date(value || "").getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function formatMessageTime(message) {
  const timeValue = getTimeValue(message?.createdAtIso || message?.createdAt);
  if (!timeValue) {
    return message.pending ? "pending" : "now";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timeValue));
}

function getChatPreview(chat) {
  const summary = String(chat?.summary || "").trim();
  if (summary) {
    return summary;
  }

  const messages = getSortedMessages(chat?.messages);
  const lastMessage = messages[messages.length - 1];
  return truncateText(lastMessage?.text || "Open this chat to continue the conversation.", 110);
}

function formatChatTimestamp(chat) {
  const timeValue = getTimeValue(chat?.updatedAtIso || chat?.createdAtIso);
  if (!timeValue) {
    return "recent";
  }

  const date = new Date(timeValue);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return new Intl.DateTimeFormat("en-US", {
    ...(isSameDay
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          month: "short",
          day: "numeric",
        }),
  }).format(date);
}

function getConfidenceClasses(confidence) {
  const normalized = String(confidence || "").toLowerCase();

  if (normalized === "high") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (normalized === "low") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getRiskClasses(riskLevel) {
  const normalized = String(riskLevel || "").toLowerCase();

  if (normalized === "low") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (normalized === "high") {
    return "border-red-400/20 bg-red-500/10 text-red-100";
  }

  return "border-amber-400/20 bg-amber-500/10 text-amber-100";
}

function getAtsBreakdownPercent(item) {
  const score = Number(item?.score) || 0;
  const weight = Number.parseInt(String(item?.weight || "").replace(/[^\d]/g, ""), 10);
  if (weight > 0) {
    return Math.max(0, Math.min(100, Math.round((score / weight) * 100)));
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasProfileSummary(profileSummary) {
  return Boolean(
    profileSummary?.headline ||
      profileSummary?.overview ||
      profileSummary?.strengths?.length ||
      profileSummary?.concerns?.length,
  );
}

function hasParsedResumeData(parsedResumeData) {
  return Boolean(
    parsedResumeData?.name ||
      parsedResumeData?.email ||
      parsedResumeData?.phone ||
      parsedResumeData?.education?.length ||
      parsedResumeData?.skills?.length ||
      parsedResumeData?.experience?.length ||
      parsedResumeData?.projects?.length ||
      parsedResumeData?.certifications?.length,
  );
}

function hasAtsBreakdown(atsBreakdown) {
  return Boolean(
    atsBreakdown?.finalScore ||
      atsBreakdown?.label ||
      atsBreakdown?.keywordScore ||
      atsBreakdown?.semanticScore ||
      atsBreakdown?.resumeQualityScore ||
      atsBreakdown?.sectionBreakdown?.length ||
      atsBreakdown?.matchedKeywords?.length ||
      atsBreakdown?.missingKeywords?.length ||
      atsBreakdown?.issuesFound?.length ||
      atsBreakdown?.suggestions?.length,
  );
}

function hasSkillGapAnalysis(skillGapAnalysis) {
  return Boolean(
    skillGapAnalysis?.matchedSkills?.length ||
      skillGapAnalysis?.missingSkills?.length ||
      skillGapAnalysis?.prioritySkills?.length,
  );
}

function hasPerformanceInsights(performanceInsights) {
  return Boolean(
    performanceInsights?.riskLevel ||
      performanceInsights?.summary ||
      performanceInsights?.signals?.length ||
      performanceInsights?.missingData?.length ||
      performanceInsights?.suggestions?.length,
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-sm font-medium text-white/82">{value}</div>
    </div>
  );
}

function TagBlock({ label, items, tone = "neutral", className = "" }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${label}-${item}`}
            className={`rounded-full border px-3 py-2 text-xs ${getTagClasses(tone)}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SimpleListCard({ title, items, emptyText, tone = "neutral" }) {
  const toneClass = tone === "emerald" ? "border-emerald-400/15" : tone === "amber" ? "border-amber-400/15" : "border-white/10";

  return (
    <div className={`rounded-[22px] border ${toneClass} bg-white/5 p-4`}>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 space-y-2">
        {items?.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/68"
            >
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/42">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function getTagClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "amber") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "red") {
    return "border-red-400/20 bg-red-500/10 text-red-100";
  }

  return "border-white/10 bg-white/5 text-white/72";
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}
