import { useEffect, useMemo, useRef, useState } from "react";
import { ref, serverTimestamp, update } from "firebase/database";
import { Link, NavLink } from "react-router-dom";
import {
  ArrowUp,
  Bot,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  LoaderCircle,
  Menu,
  MessageSquarePlus,
  Mic,
  MoonStar,
  Paperclip,
  Settings,
  Sparkles,
  SunMedium,
  Target,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { auth, db } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  buildAdaptiveLearningJourney,
  getNextUnlockedLevel,
  isRoadmapApprovalMessage,
  normalizeAdaptiveLearningState,
} from "../../lib/adaptiveLearning";
import { postServerJson } from "../../lib/serverApi";
import { saveAdaptiveLearningState } from "../../lib/userData";
import { useTheme } from "../../theme/ThemeProvider";

const STARTER_PROMPTS = [
  "Build a roadmap for web developer.",
  "What roles suit my resume?",
  "Create a 30-day placement plan.",
  "What skills am I missing?",
];

const MODE_OPTIONS = [
  { value: "quick", label: "Quick" },
  { value: "detailed", label: "Detailed" },
  { value: "action", label: "Action Plan" },
];

const APP_SECTIONS = [
  { label: "Career Guidance", to: "/workspace/career-guidance", icon: Briefcase },
  { label: "Resume Analyzer", to: "/workspace/resume-analyzer", icon: ClipboardCheck },
  { label: "Mock Interview Lab", to: "/workspace/mock-interview", icon: Mic },
  { label: "Job Application Tracker", to: "/workspace/job-applications", icon: Briefcase },
  { label: "Task Calendar", to: "/workspace/task-calendar", icon: CalendarDays },
  { label: "Performance", to: "/workspace/performance", icon: GraduationCap },
];

const INPUT_CHIPS = [
  "Build roadmap",
  "Find skill gaps",
  "Suggest roles",
  "Make study plan",
];

export default function CareerGuidancePage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const user = useWorkspaceStore((state) => state.user);
  const { theme, toggleTheme } = useTheme();

  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("detailed");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [startingFresh, setStartingFresh] = useState(false);
  const [localChatId, setLocalChatId] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [activatingAdaptiveRoadmap, setActivatingAdaptiveRoadmap] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const bottomRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestAnalyzedResumeRole =
    getLatestAnalyzedResumeRole(profile) || resumeOverview.topRole || "";
  const chats = getSortedChats(guidance.chats);
  const storedActiveChatId = guidance.activeChatId || chats[0]?.id || "";
  const activeChatId = startingFresh ? "" : localChatId || storedActiveChatId;
  const activeChat = startingFresh
    ? null
    : chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
  const latestAssistantMessage = getLatestAssistantMessage(activeChat);
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
                text: "Thinking through your profile and building the best next move...",
                pending: true,
                loading: true,
              },
            ]
          : []),
      ]
    : messages;
  const adaptiveLearning = normalizeAdaptiveLearningState(profile?.adaptiveLearning);
  const identityMatch = resumeOverview.identityMatch;
  const activeChatTitle = startingFresh
    ? "New Career Chat"
    : activeChat?.title || "Career Guidance";
  const activeTargetRole =
    (startingFresh
      ? ""
      : getChatTargetRole(activeChat) || guidance.latestTargetRole) || "";
  const currentTargetRole =
    activeTargetRole ||
    guidance.latestTargetRole ||
    adaptiveLearning.targetRole ||
    latestAnalyzedResumeRole ||
    "Not set";
  const activeFocusAreas = useMemo(
    () =>
      uniqueStrings([
        ...(activeChat?.latestFocusAreas || []),
        ...(guidance.latestFocusAreas || []),
        ...(resumeWorkspace.latestAnalysis?.report?.missingSkills || []),
        ...(resumeOverview.missingSkills || []),
      ]).slice(0, 8),
    [activeChat, guidance.latestFocusAreas, resumeOverview.missingSkills, resumeWorkspace],
  );
  const activeSuggestedQuestions =
    activeChat?.latestSuggestedQuestions ||
    guidance.latestSuggestedQuestions ||
    latestAssistantMessage?.suggestedQuestions ||
    STARTER_PROMPTS;
  const activeSkillGapAnalysis =
    getChatSkillGapAnalysis(activeChat) ||
    normalizeSkillGapAnalysis(guidance.latestSkillGapAnalysis) ||
    normalizeSkillGapAnalysis({
      missingSkills: resumeWorkspace.latestAnalysis?.report?.missingSkills || resumeOverview.missingSkills || [],
      matchedSkills:
        resumeWorkspace.latestAnalysis?.report?.extractedSkills ||
        resumeOverview.extractedSkills ||
        [],
      prioritySkills:
        guidance.latestSkillGapAnalysis?.prioritySkills ||
        resumeWorkspace.latestAnalysis?.report?.missingSkills ||
        resumeOverview.missingSkills ||
        [],
    }) || {
      matchedSkills: [],
      missingSkills: [],
      prioritySkills: [],
    };
  const suggestedRoles = useMemo(
    () =>
      normalizeRecommendedRoles(
        activeChat?.latestRecommendedRoles ||
          guidance.latestRecommendedRoles ||
          latestAssistantMessage?.recommendedRoles ||
          [],
      ),
    [activeChat, guidance.latestRecommendedRoles, latestAssistantMessage],
  );
  const resumeSnapshot = useMemo(
    () => buildResumeSnapshot(profile),
    [profile],
  );
  const weeklyPlan = useMemo(
    () => buildWeeklyPlan({ activeChat, guidance, adaptiveLearning }),
    [activeChat, guidance, adaptiveLearning],
  );
  const quickActionLinks = useMemo(
    () => [
      {
        label: "Start Mock Interview",
        to: "/workspace/mock-interview",
        helper: "Practice this target role right now",
      },
      {
        label: "Analyze Resume",
        to: "/workspace/resume-analyzer",
        helper: "Refresh ATS and role-fit signals",
      },
      {
        label: "Open Calendar",
        to: "/workspace/task-calendar",
        helper: "Turn guidance into weekly tasks",
      },
    ],
    [],
  );

  useEffect(() => {
    if (!startingFresh && storedActiveChatId) {
      setLocalChatId(storedActiveChatId);
    }
  }, [startingFresh, storedActiveChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedMessages.length, sending, startingFresh]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!Recognition) {
      setVoiceSupported(false);
      return undefined;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setDraft((current) => joinPromptText(current, transcript));
      }
    };
    recognition.onend = () => {
      setVoiceListening(false);
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setError("Voice input could not capture audio. Try again or type your prompt.");
    };

    speechRecognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop?.();
      speechRecognitionRef.current = null;
    };
  }, []);

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
    setSuccessNotice("");
    setNavDrawerOpen(false);
    setContextDrawerOpen(false);

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
          setSuccessNotice,
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
    setSuccessNotice("");
    setNavDrawerOpen(false);
    setContextDrawerOpen(false);
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
    setSuccessNotice("");
    setNavDrawerOpen(false);
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
      setSuccessNotice,
      setError,
      setActivatingAdaptiveRoadmap,
      ...payload,
    });
  };

  const handleInsertPrompt = (snippet) => {
    setDraft((current) => joinPromptText(current, snippet));
  };

  const handleToggleVoice = () => {
    const recognition = speechRecognitionRef.current;
    if (!recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    try {
      if (voiceListening) {
        recognition.stop();
        setVoiceListening(false);
        return;
      }

      setError("");
      recognition.start();
      setVoiceListening(true);
    } catch {
      setVoiceListening(false);
      setError("Voice input could not start. Try again or type your prompt.");
    }
  };

  const handleSaveGuidance = () => {
    setSuccessNotice("Guidance is already saved in Recent Chats.");
  };

  const currentMode = MODE_OPTIONS.find((item) => item.value === mode) || MODE_OPTIONS[1];

  return (
    <div className="h-full overflow-hidden">
      <div
        className={`grid h-full min-h-0 ${
          contextPanelOpen
            ? "xl:grid-cols-[280px_minmax(0,1fr)_360px]"
            : "xl:grid-cols-[280px_minmax(0,1fr)_72px]"
        }`}
      >
        <AppSidebar
          className="hidden xl:flex"
          user={user}
          chats={chats}
          activeChatId={activeChatId}
          startingFresh={startingFresh}
          onSelectChat={handleSelectChat}
          onStartFresh={handleStartFresh}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <section className="flex min-h-0 flex-col border-y border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(3,3,4,0.06))] xl:border-x xl:border-y-0">
          <ChatTopBar
            currentTargetRole={currentTargetRole}
            activeChatTitle={activeChatTitle}
            mode={currentMode.value}
            onModeChange={setMode}
            onNewChat={handleStartFresh}
            onOpenSidebar={() => setNavDrawerOpen(true)}
            onOpenContext={() => setContextDrawerOpen(true)}
          />

          <div className="space-y-2 border-b border-white/10 px-4 py-3 sm:px-6">
            {!profileReady ? (
              <GuidanceBanner>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading your live career context...
              </GuidanceBanner>
            ) : null}

            {guidance.lastWarning ? (
              <GuidanceBanner tone="warning">
                <TriangleAlert className="h-4 w-4" />
                {guidance.lastWarning}
              </GuidanceBanner>
            ) : null}

            {successNotice ? (
              <GuidanceBanner tone="success">
                <Sparkles className="h-4 w-4" />
                {successNotice}
              </GuidanceBanner>
            ) : null}

            {identityMatch === false ? (
              <GuidanceBanner tone="warning">
                <TriangleAlert className="h-4 w-4" />
                Your latest analyzed resume does not match the logged-in user, so resume-based guidance may be less reliable until you upload the correct resume.
              </GuidanceBanner>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              {!displayedMessages.length ? (
                <CareerEmptyState
                  suggestedQuestions={activeSuggestedQuestions}
                  focusAreas={activeFocusAreas}
                  onPromptClick={(prompt) => void handleSend(prompt)}
                  sending={sending}
                />
              ) : (
                <ChatMessageList
                  messages={displayedMessages}
                  chatId={activeChat?.id || activeChatId || guidance.activeChatId || ""}
                  adaptiveLearning={adaptiveLearning}
                  activatingAdaptiveRoadmap={activatingAdaptiveRoadmap}
                  onActivateRoadmap={(payload) => void handleActivateRoadmap(payload)}
                  onSuggestionClick={(prompt) => void handleSend(prompt)}
                  onSaveGuidance={handleSaveGuidance}
                />
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <ChatInputBar
            draft={draft}
            mode={currentMode.value}
            sending={sending}
            error={error}
            voiceSupported={voiceSupported}
            voiceListening={voiceListening}
            onChangeDraft={setDraft}
            onSubmit={handleSubmit}
            onSend={() => void handleSend()}
            onInsertResume={() => handleInsertPrompt("Use my latest resume analysis as context.")}
            onInsertJd={() => handleInsertPrompt("Job description:\n")}
            onToggleVoice={handleToggleVoice}
            onChipClick={(label) => void handleSend(resolvePromptChip(label, currentTargetRole))}
          />
        </section>

        <ContextPanel
          className="hidden xl:flex"
          open={contextPanelOpen}
          onToggleOpen={() => setContextPanelOpen((current) => !current)}
          currentTargetRole={currentTargetRole}
          suggestedRoles={suggestedRoles}
          resumeSnapshot={resumeSnapshot}
          skillGapAnalysis={activeSkillGapAnalysis}
          weeklyPlan={weeklyPlan}
          quickActions={quickActionLinks}
          onPromptClick={(prompt) => void handleSend(prompt)}
        />
      </div>

      {navDrawerOpen ? (
        <MobileDrawer onClose={() => setNavDrawerOpen(false)} side="left">
          <AppSidebar
            className="flex h-full"
            user={user}
            chats={chats}
            activeChatId={activeChatId}
            startingFresh={startingFresh}
            onSelectChat={handleSelectChat}
            onStartFresh={handleStartFresh}
            theme={theme}
            toggleTheme={toggleTheme}
            onClose={() => setNavDrawerOpen(false)}
          />
        </MobileDrawer>
      ) : null}

      {contextDrawerOpen ? (
        <MobileDrawer onClose={() => setContextDrawerOpen(false)} side="right">
          <ContextPanel
            className="flex h-full"
            open
            mobile
            onToggleOpen={() => setContextDrawerOpen(false)}
            currentTargetRole={currentTargetRole}
            suggestedRoles={suggestedRoles}
            resumeSnapshot={resumeSnapshot}
            skillGapAnalysis={activeSkillGapAnalysis}
            weeklyPlan={weeklyPlan}
            quickActions={quickActionLinks}
            onPromptClick={(prompt) => void handleSend(prompt)}
          />
        </MobileDrawer>
      ) : null}
    </div>
  );
}

function AppSidebar({
  className = "",
  user,
  chats,
  activeChatId,
  startingFresh,
  onSelectChat,
  onStartFresh,
  theme,
  toggleTheme,
  onClose,
}) {
  return (
    <aside
      className={`min-h-0 flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Career Workspace
          </div>
          <div className="mt-2 text-xl font-black text-white">Career Guidance</div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/70 xl:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="px-5 py-5">
        <button
          type="button"
          onClick={onStartFresh}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Navigation
          </div>
          <div className="mt-3 space-y-2">
            {APP_SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "border-red-400/20 bg-red-500/10 text-white"
                        : "border-white/10 bg-white/5 text-white/68 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Recent Chats
          </div>
          <div className="mt-3 space-y-3">
            {chats.length ? (
              chats.slice(0, 6).map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onSelectChat(chat)}
                  className={`w-full rounded-[22px] border p-4 text-left transition ${
                    !startingFresh && activeChatId === chat.id
                      ? "border-red-400/20 bg-red-500/10"
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
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/55">
                No saved guidance yet. Start a chat and it will appear here.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-white">
              {user?.avatar || "S"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {user?.name || "Student"}
              </div>
              <div className="truncate text-xs text-white/55">{user?.email || "Workspace user"}</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <NavLink
              to="/workspace/settings"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:border-white/20 hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:border-white/20 hover:text-white"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ChatTopBar({
  currentTargetRole,
  activeChatTitle,
  mode,
  onModeChange,
  onNewChat,
  onOpenSidebar,
  onOpenContext,
}) {
  return (
    <div className="border-b border-white/10 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 xl:hidden">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/72"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenContext}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/72"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
              Career Guidance
            </div>
            <div className="mt-2 text-2xl font-black text-white">Career Guidance</div>
            <div className="mt-2 text-sm leading-7 text-white/55">
              {activeChatTitle || "Career Guidance"} · Ask about roadmap, role fit, ATS, interviews, or next actions.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
            <Target className="h-4 w-4" />
            {currentTargetRole}
          </div>

          <ModeSelector mode={mode} onModeChange={onModeChange} />

          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="inline-flex rounded-[18px] border border-white/10 bg-white/5 p-1">
      {MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onModeChange(option.value)}
          className={`rounded-[14px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
            mode === option.value
              ? "bg-red-500 text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GuidanceBanner({ children, tone = "neutral" }) {
  const toneClasses =
    tone === "warning"
      ? "border border-amber-400/20 bg-amber-500/10 text-amber-100"
      : tone === "success"
        ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : "border border-white/10 bg-white/5 text-white/72";

  return (
    <div className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm ${toneClasses}`}>
      {children}
    </div>
  );
}

function CareerEmptyState({ suggestedQuestions, focusAreas, onPromptClick, sending }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-red-400/20 bg-red-500/10 text-red-100">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="mt-5 text-3xl font-black text-white">
          What would you like help with in your career today?
        </div>
        <div className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/58">
          Ask like ChatGPT, then get structured guidance with roles, roadmaps, skill gaps, and next actions.
        </div>

        {focusAreas?.length ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {focusAreas.slice(0, 6).map((item) => (
              <TagPill key={item}>{item}</TagPill>
            ))}
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
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Quick Suggestions
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 6).map((prompt) => (
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

function ChatMessageList({
  messages,
  chatId,
  adaptiveLearning,
  activatingAdaptiveRoadmap,
  onActivateRoadmap,
  onSuggestionClick,
  onSaveGuidance,
}) {
  return (
    <>
      {messages.map((message) =>
        message.role === "assistant" ? (
          <AIMessageBubble
            key={message.id}
            message={message}
            chatId={chatId}
            adaptiveLearning={adaptiveLearning}
            activatingAdaptiveRoadmap={activatingAdaptiveRoadmap}
            onActivateRoadmap={onActivateRoadmap}
            onSuggestionClick={onSuggestionClick}
            onSaveGuidance={onSaveGuidance}
          />
        ) : (
          <UserMessageBubble key={message.id} message={message} />
        ),
      )}
    </>
  );
}

function UserMessageBubble({ message }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-2xl rounded-[28px] border border-red-400/20 bg-[linear-gradient(135deg,rgba(239,68,68,0.24),rgba(190,24,93,0.12))] px-5 py-4 text-white shadow-[0_14px_40px_rgba(120,10,10,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
            You
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
            {formatMessageTime(message)}
          </div>
        </div>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white">
          {String(message.text || "").trim()}
        </div>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
        <UserRound className="h-5 w-5" />
      </div>
    </div>
  );
}

function AIMessageBubble({
  message,
  chatId,
  adaptiveLearning,
  activatingAdaptiveRoadmap,
  onActivateRoadmap,
  onSuggestionClick,
  onSaveGuidance,
}) {
  const showProfileSummary = hasProfileSummary(message.profileSummary);
  const showParsedResumeData = hasParsedResumeData(message.parsedResumeData);
  const showAtsBreakdown = hasAtsBreakdown(message.atsBreakdown);
  const showSkillGapAnalysis = hasSkillGapAnalysis(message.skillGapAnalysis);
  const showPerformanceInsights = hasPerformanceInsights(message.performanceInsights);
  const recommendedRoles = normalizeRecommendedRoles(message.recommendedRoles);
  const skills = uniqueStrings([
    ...(message.focusAreas || []),
    ...(message.skillGapAnalysis?.matchedSkills || []),
    ...(message.parsedResumeData?.skills || []),
  ]).slice(0, 10);
  const gaps = uniqueStrings([
    ...(message.skillGapAnalysis?.prioritySkills || []),
    ...(message.skillGapAnalysis?.missingSkills || []),
    ...(message.atsBreakdown?.missingKeywords || []),
  ]).slice(0, 10);
  const actionPlan = buildActionPlanItems(message);
  const roadmapIsActive =
    Boolean(message.roadmap?.weeks?.length) &&
    adaptiveLearning?.roadmapAccepted &&
    adaptiveLearning.sourceRoadmapTitle === String(message.roadmap?.title || "").trim() &&
    (!adaptiveLearning.sourceChatId || adaptiveLearning.sourceChatId === chatId);
  const summaryText = String(message.summary || "").trim() || truncateText(message.text, 220);

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100">
        {message.loading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 max-w-4xl flex-1 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
              Career Coach
            </div>
            <div className="mt-1 text-sm text-white/55">
              Response generated {formatMessageTime(message)}
            </div>
          </div>

          {message.targetRole ? <TagPill tone="red">{message.targetRole}</TagPill> : null}
        </div>

        <div className="mt-5 space-y-4">
          {summaryText ? (
            <ResponseCard title="Summary">
              <div className="text-sm leading-7 text-white/76">{summaryText}</div>
            </ResponseCard>
          ) : null}

          {message.text && message.text !== summaryText ? (
            <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/64">
              {message.text}
            </div>
          ) : null}

          {(message.targetRole || recommendedRoles.length) ? (
            <ResponseCard title="Career Direction">
              {message.targetRole ? (
                <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                  Current target role: {message.targetRole}
                </div>
              ) : null}
              {recommendedRoles.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {recommendedRoles.slice(0, 3).map((role) => (
                    <div
                      key={`${message.id}-${role.role}`}
                      className="rounded-[20px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-white">{role.role}</div>
                        {role.fitScore ? (
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                            {role.fitScore}%
                          </div>
                        ) : null}
                      </div>
                      {role.reason ? (
                        <div className="mt-3 text-sm leading-7 text-white/58">{role.reason}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </ResponseCard>
          ) : null}

          {(showAtsBreakdown || showParsedResumeData || showProfileSummary) ? (
            <ResponseCard title="Resume Snapshot">
              <div className="grid gap-3 md:grid-cols-3">
                {showAtsBreakdown ? (
                  <MetricCard
                    label="Latest ATS"
                    value={`${message.atsBreakdown.finalScore || 0}/100`}
                    helper={message.atsBreakdown.label || "Resume signal"}
                  />
                ) : null}
                {showParsedResumeData ? (
                  <MetricCard
                    label="Resume Name"
                    value={message.parsedResumeData.name || "Not available"}
                    helper={message.parsedResumeData.email || "Parsed identity"}
                  />
                ) : null}
                {showProfileSummary ? (
                  <MetricCard
                    label="Profile Headline"
                    value={message.profileSummary.headline || "Student profile"}
                    helper={truncateText(message.profileSummary.overview, 80) || "Career summary"}
                  />
                ) : null}
              </div>

              {message.atsBreakdown?.matchedKeywords?.length ? (
                <div className="mt-4">
                  <SectionLabel>Matched Keywords</SectionLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.atsBreakdown.matchedKeywords.slice(0, 8).map((item) => (
                      <TagPill key={`${message.id}-match-${item}`} tone="emerald">
                        {item}
                      </TagPill>
                    ))}
                  </div>
                </div>
              ) : null}

              {message.atsBreakdown?.missingKeywords?.length ? (
                <div className="mt-4">
                  <SectionLabel>Missing Keywords</SectionLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.atsBreakdown.missingKeywords.slice(0, 8).map((item) => (
                      <TagPill key={`${message.id}-missing-${item}`} tone="amber">
                        {item}
                      </TagPill>
                    ))}
                  </div>
                </div>
              ) : null}

              {message.atsBreakdown?.sectionBreakdown?.length ? (
                <div className="mt-4 grid gap-3">
                  {message.atsBreakdown.sectionBreakdown.slice(0, 3).map((item) => (
                    <div
                      key={`${message.id}-${item.label}`}
                      className="rounded-[18px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">
                          {item.score}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(239,68,68,0.95),rgba(251,146,60,0.95))]"
                          style={{ width: `${getAtsBreakdownPercent(item)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </ResponseCard>
          ) : null}

          {skills.length ? (
            <ResponseCard title="Skills">
              <div className="flex flex-wrap gap-2">
                {skills.map((item) => (
                  <TagPill key={`${message.id}-skill-${item}`}>{item}</TagPill>
                ))}
              </div>
            </ResponseCard>
          ) : null}

          {(showSkillGapAnalysis || gaps.length) ? (
            <ResponseCard title="Gaps">
              {message.skillGapAnalysis?.matchedSkills?.length ? (
                <div>
                  <SectionLabel>Matched Skills</SectionLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.skillGapAnalysis.matchedSkills.slice(0, 8).map((item) => (
                      <TagPill key={`${message.id}-matched-${item}`} tone="emerald">
                        {item}
                      </TagPill>
                    ))}
                  </div>
                </div>
              ) : null}

              {gaps.length ? (
                <div className={message.skillGapAnalysis?.matchedSkills?.length ? "mt-4" : ""}>
                  <SectionLabel>Top Skill Gaps</SectionLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {gaps.map((item) => (
                      <TagPill key={`${message.id}-gap-${item}`} tone="amber">
                        {item}
                      </TagPill>
                    ))}
                  </div>
                </div>
              ) : null}
            </ResponseCard>
          ) : null}

          {message.roadmap?.weeks?.length ? (
            <ResponseCard title="Recommended Roadmap">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
                  {message.roadmap.title || "Career roadmap"}
                </div>
                {roadmapIsActive ? (
                  <TagPill tone="emerald">Active in Adaptive Learning</TagPill>
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
                    className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activatingAdaptiveRoadmap ? "Activating..." : "Use in Adaptive Learning"}
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-4">
                {message.roadmap.weeks.slice(0, 3).map((week) => (
                  <div
                    key={`${message.id}-${week.label}`}
                    className="rounded-[20px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
                      {week.label}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{week.goal}</div>
                    {(week.tasks || []).length ? (
                      <div className="mt-3 space-y-2">
                        {week.tasks.slice(0, 4).map((task) => (
                          <div
                            key={`${week.label}-${task}`}
                            className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/68"
                          >
                            {task}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ResponseCard>
          ) : null}

          {actionPlan.length ? (
            <ResponseCard title="Next 7 Days Plan">
              <div className="grid gap-3">
                {actionPlan.map((item) => (
                  <div
                    key={`${message.id}-plan-${item}`}
                    className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/72"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </ResponseCard>
          ) : null}

          {showPerformanceInsights ? (
            <ResponseCard title="Placement Signals">
              <div className="flex flex-wrap items-center gap-2">
                {message.performanceInsights.riskLevel ? (
                  <TagPill tone={getRiskTone(message.performanceInsights.riskLevel)}>
                    {message.performanceInsights.riskLevel} risk
                  </TagPill>
                ) : null}
                {message.confidence ? (
                  <TagPill tone={getConfidenceTone(message.confidence)}>
                    {message.confidence} confidence
                  </TagPill>
                ) : null}
              </div>

              {message.performanceInsights.summary ? (
                <div className="mt-4 text-sm leading-7 text-white/68">
                  {message.performanceInsights.summary}
                </div>
              ) : null}

              {message.performanceInsights.suggestions?.length ? (
                <div className="mt-4 grid gap-3">
                  {message.performanceInsights.suggestions.slice(0, 4).map((item) => (
                    <div
                      key={`${message.id}-signal-${item}`}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/72"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
            </ResponseCard>
          ) : null}

          <ActionRow
            message={message}
            roadmapIsActive={roadmapIsActive}
            activatingAdaptiveRoadmap={activatingAdaptiveRoadmap}
            onActivateRoadmap={onActivateRoadmap}
            onSuggestionClick={onSuggestionClick}
            onSaveGuidance={onSaveGuidance}
            chatId={chatId}
          />

          {message.suggestedQuestions?.length ? (
            <div>
              <SectionLabel>Ask Next</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {message.suggestedQuestions.slice(0, 5).map((prompt) => (
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

          {message.warning || message.disclaimer ? (
            <div className="rounded-[18px] border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100">
              {[message.warning, message.disclaimer].filter(Boolean).join(" ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  message,
  roadmapIsActive,
  activatingAdaptiveRoadmap,
  onActivateRoadmap,
  onSuggestionClick,
  onSaveGuidance,
  chatId,
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <SectionLabel>Suggested Actions</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onSuggestionClick("Convert this guidance into a 7-day task calendar plan.")
          }
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
        >
          Add to Task Calendar
        </button>

        <Link
          to="/workspace/mock-interview"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
        >
          Start Mock Interview
        </Link>

        <Link
          to="/workspace/resume-analyzer"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
        >
          Update Resume
        </Link>

        <button
          type="button"
          onClick={onSaveGuidance}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
        >
          Save Guidance
        </button>

        {message.roadmap?.weeks?.length ? (
          roadmapIsActive ? (
            <TagPill tone="emerald">Roadmap Active</TagPill>
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
              className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activatingAdaptiveRoadmap ? "Activating..." : "Use in Adaptive Learning"}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

function ResponseCard({ title, children }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:p-5">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      {helper ? <div className="mt-1 text-xs leading-6 text-white/55">{helper}</div> : null}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
      {children}
    </div>
  );
}

function TagPill({ children, tone = "neutral" }) {
  return (
    <span
      className={`rounded-full border px-3 py-2 text-xs font-medium ${getTagClasses(tone)}`}
    >
      {children}
    </span>
  );
}

function ChatInputBar({
  draft,
  mode,
  sending,
  error,
  voiceSupported,
  voiceListening,
  onChangeDraft,
  onSubmit,
  onSend,
  onInsertResume,
  onInsertJd,
  onToggleVoice,
  onChipClick,
}) {
  return (
    <div className="border-t border-white/10 bg-black/20 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <form onSubmit={onSubmit}>
          <div className="rounded-[30px] border border-white/10 bg-[#09090d]/85 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-white/10 px-2 pb-3">
              <button
                type="button"
                onClick={onInsertResume}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <Paperclip className="h-4 w-4" />
                Attach Resume
              </button>
              <button
                type="button"
                onClick={onInsertJd}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <FileText className="h-4 w-4" />
                Attach JD
              </button>
              <button
                type="button"
                onClick={onToggleVoice}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  voiceListening
                    ? "border-red-400/20 bg-red-500/10 text-red-100"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                <Mic className="h-4 w-4" />
                {voiceListening ? "Listening" : "Voice"}
              </button>
            </div>

            <textarea
              value={draft}
              onChange={(event) => onChangeDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              rows={1}
              placeholder={getInputPlaceholder(mode)}
              className="min-h-[112px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-white outline-none placeholder:text-white/32"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-2 pt-3">
              <div className="text-xs uppercase tracking-[0.18em] text-white/32">
                Enter to send, Shift+Enter for a new line
              </div>
              <div className="flex items-center gap-2">
                {!voiceSupported ? (
                  <div className="text-xs text-white/35">Voice input not available in this browser</div>
                ) : null}
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
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {INPUT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={sending}
              onClick={() => onChipClick(chip)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}
      </div>
    </div>
  );
}

function ContextPanel({
  className = "",
  open,
  mobile = false,
  onToggleOpen,
  currentTargetRole,
  suggestedRoles,
  resumeSnapshot,
  skillGapAnalysis,
  weeklyPlan,
  quickActions,
  onPromptClick,
}) {
  if (!open && !mobile) {
    return (
      <aside className={`min-h-0 border-l border-white/10 ${className}`}>
        <div className="flex h-full items-start justify-center px-3 py-5">
          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] ${mobile ? "" : "border-l border-white/10"} ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Live Context
          </div>
          <div className="mt-2 text-xl font-black text-white">Context Panel</div>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/70"
        >
          {mobile ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <ContextCard
          title="Current Goal"
          helper="Career Guidance target role"
          actionLabel={currentTargetRole && currentTargetRole !== "Not set" ? "Refine" : null}
          onAction={
            currentTargetRole && currentTargetRole !== "Not set"
              ? () => onPromptClick(`Refine my plan for ${currentTargetRole}.`)
              : null
          }
        >
          <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {currentTargetRole}
          </div>
        </ContextCard>

        <ContextCard title="Latest Resume Snapshot" helper="Latest analyzed resume data">
          <div className="grid gap-3">
            <MetricCard label="Resume" value={resumeSnapshot.fileName || "Not analyzed"} />
            <MetricCard
              label="ATS Score"
              value={resumeSnapshot.atsScore != null ? `${resumeSnapshot.atsScore}/100` : "Not analyzed"}
              helper={resumeSnapshot.updatedAtLabel || "No timestamp available"}
            />
          </div>
        </ContextCard>

        <ContextCard title="Top Skill Gaps" helper="Live from guidance and resume analysis">
          <div className="flex flex-wrap gap-2">
            {skillGapAnalysis.prioritySkills?.length ? (
              skillGapAnalysis.prioritySkills.slice(0, 6).map((item) => (
                <TagPill key={`gap-${item}`} tone="amber">
                  {item}
                </TagPill>
              ))
            ) : (
              <EmptyCardText>No critical gaps saved yet.</EmptyCardText>
            )}
          </div>
        </ContextCard>

        <ContextCard title="Suggested Roles" helper="Best-fit roles from your latest guidance">
          <div className="grid gap-3">
            {suggestedRoles.length ? (
              suggestedRoles.slice(0, 4).map((role) => (
                <div
                  key={`suggested-${role.role}`}
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{role.role}</div>
                    {role.fitScore ? (
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">
                        {role.fitScore}%
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyCardText>No suggested roles yet.</EmptyCardText>
            )}
          </div>
        </ContextCard>

        <ContextCard title="Current Weekly Plan" helper={weeklyPlan.title || "No active weekly plan"}>
          {weeklyPlan.items.length ? (
            <div className="grid gap-3">
              {weeklyPlan.items.map((item) => (
                <div
                  key={`week-${item}`}
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/72"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <EmptyCardText>No weekly actions generated yet.</EmptyCardText>
          )}
        </ContextCard>

        <ContextCard title="Quick Actions" helper="Jump into related workflows">
          <div className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="text-sm font-semibold text-white">{action.label}</div>
                <div className="mt-1 text-xs leading-6 text-white/55">{action.helper}</div>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => onPromptClick("Turn my current guidance into a weekly action plan.")}
              className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20 hover:bg-black/30"
            >
              <div className="text-sm font-semibold text-white">Add Weekly Tasks</div>
              <div className="mt-1 text-xs leading-6 text-white/55">
                Ask Career Guidance to convert this into daily actions.
              </div>
            </button>
          </div>
        </ContextCard>
      </div>
    </aside>
  );
}

function ContextCard({ title, helper, actionLabel, onAction, children }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            {title}
          </div>
          {helper ? <div className="mt-2 text-sm leading-6 text-white/55">{helper}</div> : null}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:border-white/20 hover:text-white"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyCardText({ children }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/52">
      {children}
    </div>
  );
}

function MobileDrawer({ children, onClose, side = "left" }) {
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close drawer"
      />
      <div className={`relative h-full w-full p-3 ${side === "right" ? "flex justify-end" : ""}`}>
        <div className="h-full w-full max-w-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-[#06070b] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
          <div className="h-full">{children}</div>
        </div>
      </div>
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
      getChatTargetRole(activeChat) ||
      activeTargetRole ||
      guidance.latestTargetRole ||
      "",
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
  setSuccessNotice,
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
    setSuccessNotice("Roadmap activated in Adaptive Learning. Day 1 is now unlocked.");
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

function buildResumeSnapshot(profile) {
  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestAnalysis = resumeWorkspace?.latestAnalysis || {};
  const report = latestAnalysis?.report || {};
  const context = latestAnalysis?.context || {};

  return {
    fileName: String(
      context.fileName || report.fileName || resumeOverview.latestResumeFileName || "",
    ).trim(),
    atsScore: normalizeNumber(report.atsScore ?? resumeOverview.atsScore),
    updatedAtLabel: formatContextDate(
      context.analyzedAt || latestAnalysis.updatedAtIso || resumeWorkspace.updatedAtIso || "",
    ),
  };
}

function buildWeeklyPlan({ activeChat, guidance, adaptiveLearning }) {
  const roadmap =
    (activeChat?.latestRoadmap?.weeks?.length && activeChat.latestRoadmap) ||
    (guidance?.latestRoadmap?.weeks?.length && guidance.latestRoadmap) ||
    null;

  if (roadmap?.weeks?.length) {
    const firstWeek = roadmap.weeks[0];
    return {
      title: firstWeek.label || roadmap.title || "Current roadmap week",
      items: uniqueStrings(firstWeek.tasks || []).slice(0, 4),
    };
  }

  const nextLevel = getNextUnlockedLevel(adaptiveLearning?.levels || []);
  if (nextLevel) {
    return {
      title: nextLevel.label || nextLevel.title || "Current adaptive level",
      items: uniqueStrings(
        (nextLevel.checklist || []).map((item) => item.text || ""),
      ).slice(0, 4),
    };
  }

  return {
    title: "",
    items: [],
  };
}

function buildActionPlanItems(message) {
  const roadmapTasks =
    message.roadmap?.weeks?.[0]?.tasks?.length ? message.roadmap.weeks[0].tasks : [];

  return uniqueStrings([
    ...roadmapTasks,
    ...(message.finalSuggestions || []),
    ...(message.performanceInsights?.suggestions || []),
    ...(message.atsBreakdown?.suggestions || []),
    ...(message.skillGapAnalysis?.prioritySkills || []).map(
      (item) => `Practice and prove ${item}.`,
    ),
  ]).slice(0, 5);
}

function resolvePromptChip(label, currentTargetRole) {
  if (label === "Build roadmap") {
    return `Build a roadmap for ${currentTargetRole !== "Not set" ? currentTargetRole : "my target role"}.`;
  }
  if (label === "Find skill gaps") {
    return "Find my skill gaps from my latest resume and target role.";
  }
  if (label === "Suggest roles") {
    return "Suggest the best roles for my current resume.";
  }
  return `Make a study plan for ${currentTargetRole !== "Not set" ? currentTargetRole : "placement preparation"}.`;
}

function getInputPlaceholder(mode) {
  if (mode === "quick") {
    return "Ask for a fast answer about roles, ATS, or next steps...";
  }
  if (mode === "action") {
    return "Ask for a concrete action plan, weekly tasks, or next 7 days guidance...";
  }
  return "Ask anything about your career, roadmap, interviews, or skills...";
}

function joinPromptText(current, snippet) {
  const safeCurrent = String(current || "").trim();
  const safeSnippet = String(snippet || "").trim();
  if (!safeSnippet) {
    return safeCurrent;
  }
  if (!safeCurrent) {
    return safeSnippet;
  }
  return `${safeCurrent}\n${safeSnippet}`;
}

function normalizeRecommendedRoles(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => {
      if (typeof item === "string") {
        return {
          role: item.trim(),
          fitScore: 0,
          reason: "",
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      return {
        role: String(item.role || item.label || "").trim(),
        fitScore: normalizeNumber(item.fitScore ?? item.match),
        reason: String(item.reason || item.why || "").trim(),
      };
    })
    .filter((item) => item?.role)
    .slice(0, 6);
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
  return (
    getSortedMessages(chat?.messages)
      .filter((message) => message.role === "assistant")
      .slice(-1)[0] || null
  );
}

function normalizeSkillGapAnalysis(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return {
    matchedSkills: uniqueStrings(
      Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills : [],
    ).slice(0, 8),
    missingSkills: uniqueStrings(
      Array.isArray(candidate.missingSkills) ? candidate.missingSkills : [],
    ).slice(0, 8),
    prioritySkills: uniqueStrings(
      Array.isArray(candidate.prioritySkills) ? candidate.prioritySkills : [],
    ).slice(0, 5),
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

function getLatestAnalyzedResumeRole(profile) {
  return String(
    profile?.resumeWorkspace?.latestAnalysis?.report?.jobMatches?.[0]?.role ||
      profile?.resumeWorkspace?.latestAnalysis?.report?.topRole ||
      "",
  ).trim();
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
    return message.pending ? "just now" : "now";
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
  return truncateText(
    lastMessage?.text || "Open this chat to continue the conversation.",
    110,
  );
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

function formatContextDate(value) {
  const timeValue = getTimeValue(value);
  if (!timeValue) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timeValue));
}

function normalizeNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.max(0, Math.round(numericValue));
}

function getRiskTone(riskLevel) {
  const normalized = String(riskLevel || "").toLowerCase();
  if (normalized === "low") {
    return "emerald";
  }
  if (normalized === "high") {
    return "red";
  }
  return "amber";
}

function getConfidenceTone(confidence) {
  const normalized = String(confidence || "").toLowerCase();
  if (normalized === "high") {
    return "emerald";
  }
  if (normalized === "low") {
    return "amber";
  }
  return "neutral";
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

function truncateText(value, maxLength = 220) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}
