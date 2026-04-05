import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CheckCheck,
  CheckCircle2,
  Code2,
  Flame,
  Gamepad2,
  HelpCircle,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { auth } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  answerAdaptiveQuestion,
  buildAdaptiveLearningJourney,
  getNextUnlockedLevel,
  isLevelUnlocked,
  normalizeAdaptiveLearningState,
  recordAdaptiveCodeRun,
  toggleAdaptiveChecklistItem,
} from "../../lib/adaptiveLearning";
import { saveAdaptiveLearningState } from "../../lib/userData";
import { cn } from "../../utils/cn";

const EXECUTION_TIMEOUT_MS = 2500;

export default function AdaptiveLearningPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [localAdaptiveLearning, setLocalAdaptiveLearning] = useState(() =>
    normalizeAdaptiveLearningState(profile?.adaptiveLearning),
  );
  const [codeDrafts, setCodeDrafts] = useState({});
  const [compilerRuns, setCompilerRuns] = useState({});
  const [runningLevelId, setRunningLevelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const guidance = profile?.careerGuidance || {};
  const latestRoadmap =
    guidance?.latestRoadmap?.weeks?.length ? guidance.latestRoadmap : null;
  const targetRole =
    guidance.latestTargetRole ||
    profile?.resumeOverview?.topRole ||
    profile?.resumeOverview?.recommendedRoles?.[0]?.role ||
    "";
  const skillGapAnalysis = guidance.latestSkillGapAnalysis || {
    matchedSkills: [],
    missingSkills: [],
    prioritySkills: [],
  };
  const adaptiveLearning = localAdaptiveLearning;
  const nextLevel = useMemo(
    () => getNextUnlockedLevel(adaptiveLearning.levels),
    [adaptiveLearning.levels],
  );
  const selectedLevel =
    adaptiveLearning.levels.find((level) => level.id === selectedLevelId) ||
    nextLevel ||
    adaptiveLearning.levels[0] ||
    null;
  const selectedLevelIndex = adaptiveLearning.levels.findIndex(
    (level) => level.id === selectedLevel?.id,
  );
  const selectedLevelUnlocked =
    selectedLevelIndex >= 0
      ? isLevelUnlocked(adaptiveLearning.levels, selectedLevelIndex)
      : false;
  const canActivateLatestRoadmap = Boolean(latestRoadmap?.weeks?.length);
  const selectedAnswers = selectedLevel?.assessment?.answers || {};
  const quizAnsweredCount = selectedLevel?.questions?.filter(
    (question) => typeof selectedAnswers[question.id] === "number",
  ).length || 0;
  const quizCorrectCount = selectedLevel?.questions?.filter(
    (question) => selectedAnswers[question.id] === question.correctOptionIndex,
  ).length || 0;
  const activeCodeDraft = selectedLevel
    ? codeDrafts[selectedLevel.id] ??
      selectedLevel.assessment?.code ??
      selectedLevel.codingChallenge?.starterCode ??
      ""
    : "";
  const compilerSnapshot = selectedLevel
    ? compilerRuns[selectedLevel.id] ||
      buildStoredCompilerSnapshot(selectedLevel.assessment)
    : null;

  useEffect(() => {
    setLocalAdaptiveLearning(normalizeAdaptiveLearningState(profile?.adaptiveLearning));
  }, [profile?.adaptiveLearning]);

  useEffect(() => {
    if (!selectedLevel && selectedLevelId) {
      setSelectedLevelId("");
      return;
    }

    if (selectedLevelId) {
      return;
    }

    if (nextLevel?.id) {
      setSelectedLevelId(nextLevel.id);
    }
  }, [nextLevel, selectedLevel, selectedLevelId]);

  useEffect(() => {
    if (!selectedLevel?.id) {
      return;
    }

    setCodeDrafts((current) => {
      if (typeof current[selectedLevel.id] === "string") {
        return current;
      }

      return {
        ...current,
        [selectedLevel.id]:
          selectedLevel.assessment?.code ||
          selectedLevel.codingChallenge?.starterCode ||
          "",
      };
    });
  }, [
    selectedLevel?.id,
    selectedLevel?.assessment?.code,
    selectedLevel?.codingChallenge?.starterCode,
  ]);

  const handleActivateLatestRoadmap = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You must be logged in to activate the roadmap.");
      return;
    }

    if (!latestRoadmap?.weeks?.length) {
      setError("No roadmap is available yet. Create one in Career Guidance first.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const previousState = adaptiveLearning;

    try {
      const nextState = buildAdaptiveLearningJourney({
        roadmap: latestRoadmap,
        targetRole,
        skillGapAnalysis,
        sourceChatId: guidance.activeChatId || "",
        sourceRoadmapUpdatedAtIso: latestRoadmap.updatedAtIso || "",
        existingState: adaptiveLearning,
      });

      setLocalAdaptiveLearning(nextState);
      setCodeDrafts({});
      setCompilerRuns({});
      await saveAdaptiveLearningState(currentUser.uid, nextState);
      setSelectedLevelId(nextState.levels[0]?.id || "");
      setNotice("Latest roadmap activated. Day 1 is unlocked.");
    } catch (activationError) {
      setLocalAdaptiveLearning(previousState);
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Could not activate the roadmap.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChecklist = async (checklistId) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedLevel) {
      return;
    }

    if (!selectedLevelUnlocked || saving) {
      return;
    }

    const previousState = adaptiveLearning;
    const wasCompleted = selectedLevel.completed;
    const nextState = toggleAdaptiveChecklistItem(
      adaptiveLearning,
      selectedLevel.id,
      checklistId,
    );
    const nextSelectedLevel =
      nextState.levels.find((level) => level.id === selectedLevel.id) || null;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      setLocalAdaptiveLearning(nextState);
      await saveAdaptiveLearningState(currentUser.uid, nextState);

      if (!wasCompleted && nextSelectedLevel?.completed) {
        const unlockedLevel = getNextUnlockedLevel(nextState.levels);
        setSelectedLevelId(unlockedLevel?.id || nextSelectedLevel.id);
        setNotice(
          `${selectedLevel.label} completed. ${nextSelectedLevel.xpReward} XP earned and the next level is now unlocked.`,
        );
      }
    } catch (saveError) {
      setLocalAdaptiveLearning(previousState);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your adaptive learning progress.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerQuestion = async (questionId, optionIndex) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedLevel || !selectedLevelUnlocked || saving) {
      return;
    }

    const previousState = adaptiveLearning;
    const nextState = answerAdaptiveQuestion(
      adaptiveLearning,
      selectedLevel.id,
      questionId,
      optionIndex,
    );

    setSaving(true);
    setError("");
    setNotice("");
    setLocalAdaptiveLearning(nextState);

    try {
      await saveAdaptiveLearningState(currentUser.uid, nextState);
    } catch (saveError) {
      setLocalAdaptiveLearning(previousState);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your question progress.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRunCode = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedLevel || !selectedLevelUnlocked || runningLevelId) {
      return;
    }

    const challenge = selectedLevel.codingChallenge;
    const code = String(activeCodeDraft || "").trimEnd();

    if (!code.trim()) {
      setError("Write code before running the compiler.");
      return;
    }

    setRunningLevelId(selectedLevel.id);
    setError("");
    setNotice("");

    try {
      const result = await runJavaScriptChallenge({ code, challenge });
      const nextState = recordAdaptiveCodeRun(adaptiveLearning, selectedLevel.id, {
        code,
        codeOutput: buildCompilerOutput(result),
        codeError: result.error || "",
        codePassed: result.passed,
        passedTests: result.passedTests,
      });

      setCompilerRuns((current) => ({
        ...current,
        [selectedLevel.id]: result,
      }));
      setLocalAdaptiveLearning(nextState);
      setSaving(true);
      await saveAdaptiveLearningState(currentUser.uid, nextState);
      setNotice(
        result.passed
          ? `Compiler checks passed for ${selectedLevel.label}.`
          : `Compiler checks completed. ${result.passedTests}/${result.totalTests} tests passed.`,
      );
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Could not run the compiler for this level.",
      );
    } finally {
      setRunningLevelId("");
      setSaving(false);
    }
  };

  const handleResetCode = () => {
    if (!selectedLevel) {
      return;
    }

    setCodeDrafts((current) => ({
      ...current,
      [selectedLevel.id]: selectedLevel.codingChallenge?.starterCode || "",
    }));
    setCompilerRuns((current) => {
      if (!current[selectedLevel.id]) {
        return current;
      }

      const nextRuns = { ...current };
      delete nextRuns[selectedLevel.id];
      return nextRuns;
    });
    setNotice("");
    setError("");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Candy Progression"
        title="Adaptive Learning"
        description="Career Guidance roadmaps become locked daily levels. Finish each checklist to unlock the next day, build XP, and keep your streak alive."
      />

      <div className="relative overflow-hidden rounded-[36px] border border-fuchsia-200/20 bg-[radial-gradient(circle_at_top_left,rgba(255,225,245,0.28),transparent_28%),radial-gradient(circle_at_top_right,rgba(147,197,253,0.22),transparent_26%),linear-gradient(135deg,#291344_0%,#482164_34%,#6b2f7f_70%,#22113c_100%)] p-6 text-white shadow-[0_28px_80px_rgba(51,11,70,0.42)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] opacity-60" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-pink-100">
              <Gamepad2 className="h-4 w-4" />
              Level-Based Growth
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {adaptiveLearning.roadmapAccepted
                ? adaptiveLearning.sourceRoadmapTitle || "Adaptive roadmap active"
                : "No adaptive roadmap activated yet"}
            </div>
            <div className="mt-3 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              {adaptiveLearning.roadmapAccepted
                ? `Current target role: ${adaptiveLearning.targetRole || targetRole || "not set yet"}. Complete one day at a time to unlock the next level, earn XP, and keep your daily streak alive.`
                : "Create a roadmap in Career Guidance, then approve it there or activate the latest roadmap below to convert it into a day-by-day game plan."}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HudCard icon={Zap} label="XP" value={String(adaptiveLearning.xp)} />
            <HudCard icon={Flame} label="Streak" value={`${adaptiveLearning.streak}d`} />
            <HudCard
              icon={Trophy}
              label="Progress"
              value={`${adaptiveLearning.completionRate}%`}
            />
            <HudCard
              icon={Target}
              label="Current Day"
              value={
                adaptiveLearning.totalLevels
                  ? `Day ${adaptiveLearning.currentLevel}`
                  : "Locked"
              }
            />
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!adaptiveLearning.levels.length ? (
        <GlassCard className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
                <BookOpenCheck className="h-4 w-4" />
                Adaptive Unlock Flow
              </div>
              <div className="text-3xl font-black text-white">
                Approve a roadmap to generate daily levels
              </div>
              <div className="max-w-2xl text-sm leading-7 text-white/64">
                Once Career Guidance gives you a roadmap, reply with something like
                {" "}
                <span className="font-semibold text-white">okay</span>
                {" "}
                or
                {" "}
                <span className="font-semibold text-white">go ahead</span>
                {" "}
                and this section will convert that roadmap into locked day-by-day levels with checklist tasks, XP, and streak tracking.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/workspace/career-guidance"
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  Open Career Guidance
                </Link>
                {canActivateLatestRoadmap ? (
                  <button
                    type="button"
                    onClick={handleActivateLatestRoadmap}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Star className="h-4 w-4" />
                    Use Latest Roadmap
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                Latest Career Guidance Snapshot
              </div>
              <div className="mt-4 space-y-4">
                <SnapshotRow
                  label="Target Role"
                  value={targetRole || "No target role selected yet"}
                />
                <SnapshotRow
                  label="Roadmap"
                  value={latestRoadmap?.title || "No roadmap generated yet"}
                />
                <SnapshotRow
                  label="Priority Skills"
                  value={
                    skillGapAnalysis?.prioritySkills?.length
                      ? skillGapAnalysis.prioritySkills.join(", ")
                      : "No priority skills yet"
                  }
                />
              </div>
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <GlassCard className="overflow-hidden p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38">
                    Level Trail
                  </div>
                  <div className="mt-2 text-lg font-bold text-white">
                    Finish one day to unlock the next
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
                  {adaptiveLearning.completedLevels}/{adaptiveLearning.totalLevels}
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {adaptiveLearning.levels.map((level, index) => (
                  <LevelTrailItem
                    key={level.id}
                    level={level}
                    index={index}
                    active={selectedLevel?.id === level.id}
                    unlocked={isLevelUnlocked(adaptiveLearning.levels, index)}
                    onSelect={() => setSelectedLevelId(level.id)}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6">
            {canActivateLatestRoadmap &&
            latestRoadmap?.title &&
            latestRoadmap.title !== adaptiveLearning.sourceRoadmapTitle ? (
              <div className="rounded-[24px] border border-sky-300/20 bg-sky-500/10 px-5 py-4 text-sm text-sky-100">
                A newer roadmap from Career Guidance is available.
                <button
                  type="button"
                  onClick={handleActivateLatestRoadmap}
                  disabled={saving}
                  className="ml-3 inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Replace Journey
                </button>
              </div>
            ) : null}

            <GlassCard className="overflow-hidden p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100">
                    <Sparkles className="h-4 w-4" />
                    Active Mission
                  </div>
                  <div className="mt-4 text-2xl font-black text-white">
                    {selectedLevel?.title || "No level selected"}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/62">
                    {selectedLevel
                      ? `${selectedLevel.label} from ${selectedLevel.weekLabel}. Focus topic: ${selectedLevel.topic}.`
                      : "Select a level to inspect its checklist and unlock rules."}
                  </div>
                </div>

                {selectedLevel ? (
                  <div className="flex flex-wrap gap-2">
                    <MetaPill label={selectedLevel.label} />
                    <MetaPill label={`${selectedLevel.xpReward} XP`} tone="amber" />
                    <MetaPill
                      label={
                        selectedLevel.completed
                          ? "Completed"
                          : selectedLevelUnlocked
                            ? "Unlocked"
                            : "Locked"
                      }
                      tone={
                        selectedLevel.completed
                          ? "emerald"
                          : selectedLevelUnlocked
                            ? "pink"
                            : "slate"
                      }
                    />
                  </div>
                ) : null}
              </div>

              {selectedLevel ? (
                <>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <MetricPanel
                      label="Target Role"
                      value={adaptiveLearning.targetRole || targetRole || "Not set"}
                    />
                    <MetricPanel
                      label="Topic"
                      value={selectedLevel.topic || "Core focus"}
                    />
                    <MetricPanel
                      label="Longest Streak"
                      value={`${adaptiveLearning.longestStreak} days`}
                    />
                  </div>

                  <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                      Objective
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/78">
                      {selectedLevel.objective || "Complete the checklist to move forward."}
                    </div>
                  </div>

                  <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-white">Checklist</div>
                        <div className="mt-1 text-sm text-white/50">
                          All items must be complete before the next day unlocks.
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/72">
                        {
                          selectedLevel.checklist.filter((item) => item.done).length
                        }/{selectedLevel.checklist.length}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {selectedLevel.checklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleChecklist(item.id)}
                          disabled={!selectedLevelUnlocked || saving}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition",
                            item.done
                              ? "border-emerald-400/20 bg-emerald-500/10"
                              : "border-white/10 bg-black/20 hover:border-fuchsia-300/20 hover:bg-fuchsia-500/10",
                            !selectedLevelUnlocked || saving
                              ? "cursor-not-allowed opacity-65"
                              : "",
                          )}
                        >
                          {item.done ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                          ) : selectedLevelUnlocked ? (
                            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-white/20" />
                          ) : (
                            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-white/35" />
                          )}
                          <div className="text-sm leading-7 text-white/78">{item.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedLevel.questions?.length ? (
                    <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-3 text-fuchsia-100">
                          <HelpCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">Level Assessment</div>
                          <div className="mt-1 text-sm text-white/52">
                            Every level now includes MCQs plus a coding drill with a live compiler.
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <MetricPanel
                              label="MCQs"
                              value={`${quizAnsweredCount}/${selectedLevel.questions.length}`}
                            />
                            <MetricPanel
                              label="Correct"
                              value={`${quizCorrectCount}/${selectedLevel.questions.length}`}
                            />
                            <MetricPanel
                              label="Compiler"
                              value={
                                selectedLevel.assessment?.codePassed
                                  ? "Passed"
                                  : selectedLevel.assessment?.lastRunAtIso
                                    ? `${selectedLevel.assessment?.passedTests || 0}/${selectedLevel.assessment?.totalTests || 0}`
                                    : "Not run"
                              }
                            />
                          </div>

                          {selectedLevel.questions.map((question, index) => {
                            const selectedAnswer = selectedAnswers[question.id];
                            const hasAnswered = typeof selectedAnswer === "number";

                            return (
                              <div
                                key={`${selectedLevel.id}-${question.id}`}
                                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                              >
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/70">
                                  Multiple Choice {index + 1}
                                </div>
                                <div className="mt-2 text-sm leading-7 text-white/82">
                                  {question.prompt}
                                </div>

                                <div className="mt-4 space-y-2">
                                  {question.options.map((option, optionIndex) => {
                                    const isCorrect = optionIndex === question.correctOptionIndex;
                                    const isSelected = selectedAnswer === optionIndex;

                                    return (
                                      <button
                                        key={`${question.id}-option-${optionIndex + 1}`}
                                        type="button"
                                        onClick={() =>
                                          handleAnswerQuestion(question.id, optionIndex)
                                        }
                                        disabled={!selectedLevelUnlocked || saving}
                                        className={cn(
                                          "flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-sm transition",
                                          hasAnswered
                                            ? isCorrect
                                              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                              : isSelected
                                                ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                                                : "border-white/10 bg-white/5 text-white/60"
                                            : "border-white/10 bg-white/5 text-white/80 hover:border-fuchsia-300/20 hover:bg-fuchsia-500/10",
                                          !selectedLevelUnlocked || saving
                                            ? "cursor-not-allowed opacity-70"
                                            : "",
                                        )}
                                      >
                                        <span>{option}</span>
                                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                          {hasAnswered
                                            ? isCorrect
                                              ? "Correct"
                                              : isSelected
                                                ? "Your pick"
                                                : ""
                                            : ""}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {hasAnswered ? (
                                  <div
                                    className={cn(
                                      "mt-4 rounded-[18px] border px-4 py-3 text-sm leading-7",
                                      selectedAnswer === question.correctOptionIndex
                                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                        : "border-amber-300/20 bg-amber-500/10 text-amber-100",
                                    )}
                                  >
                                    {question.explanation ||
                                      `Correct answer: ${
                                        question.options[question.correctOptionIndex]
                                      }`}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                                <Code2 className="h-4 w-4" />
                                JavaScript Compiler
                              </div>
                              <div className="mt-3 text-lg font-bold text-white">
                                {selectedLevel.codingChallenge?.title || "Coding Drill"}
                              </div>
                              <div className="mt-2 text-sm leading-7 text-white/62">
                                {selectedLevel.codingChallenge?.prompt}
                              </div>
                            </div>

                            <MetaPill
                              label={
                                selectedLevel.assessment?.codePassed
                                  ? "Passed"
                                  : compilerSnapshot?.totalTests
                                    ? `${compilerSnapshot.passedTests}/${compilerSnapshot.totalTests} Tests`
                                    : "Not Run"
                              }
                              tone={
                                selectedLevel.assessment?.codePassed
                                  ? "emerald"
                                  : compilerSnapshot?.totalTests
                                    ? "amber"
                                    : "slate"
                              }
                            />
                          </div>

                          {selectedLevel.codingChallenge?.hints?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {selectedLevel.codingChallenge.hints.map((hint) => (
                                <span
                                  key={`${selectedLevel.id}-${hint}`}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                                >
                                  {hint}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-4 rounded-[20px] border border-white/10 bg-[#0c1020] p-3">
                            <textarea
                              value={activeCodeDraft}
                              onChange={(event) =>
                                setCodeDrafts((current) => ({
                                  ...current,
                                  [selectedLevel.id]: event.target.value,
                                }))
                              }
                              spellCheck={false}
                              disabled={!selectedLevelUnlocked || saving}
                              className="min-h-[260px] w-full resize-y border-0 bg-transparent font-mono text-sm leading-7 text-sky-50 outline-none"
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleRunCode}
                              disabled={!selectedLevelUnlocked || Boolean(runningLevelId) || saving}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Play className="h-4 w-4" />
                              {runningLevelId === selectedLevel.id ? "Running..." : "Run Code"}
                            </button>
                            <button
                              type="button"
                              onClick={handleResetCode}
                              disabled={!selectedLevelUnlocked || Boolean(runningLevelId)}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reset
                            </button>
                          </div>

                          <div className="mt-5 grid gap-3 lg:grid-cols-2">
                            {selectedLevel.codingChallenge?.tests?.map((test) => (
                              <div
                                key={`${selectedLevel.id}-${test.id}`}
                                className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4"
                              >
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                                  {test.label}
                                </div>
                                <div className="mt-2 text-xs leading-6 text-white/60">
                                  Expected: {formatChallengeValue(test.expected)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 rounded-[20px] border border-white/10 bg-[#090d18] p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                              Compiler Output
                            </div>

                            {compilerSnapshot ? (
                              <div className="mt-3 space-y-3">
                                <div
                                  className={cn(
                                    "rounded-[16px] border px-4 py-3 text-sm",
                                    compilerSnapshot.error
                                      ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                                      : compilerSnapshot.passed
                                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                        : "border-amber-300/20 bg-amber-500/10 text-amber-100",
                                  )}
                                >
                                  {compilerSnapshot.error
                                    ? compilerSnapshot.error
                                    : compilerSnapshot.passed
                                      ? `All ${compilerSnapshot.totalTests} tests passed.`
                                      : `${compilerSnapshot.passedTests}/${compilerSnapshot.totalTests} tests passed.`}
                                </div>

                                {compilerSnapshot.testResults?.length ? (
                                  <div className="space-y-2">
                                    {compilerSnapshot.testResults.map((result) => (
                                      <div
                                        key={`${selectedLevel.id}-${result.id}`}
                                        className={cn(
                                          "rounded-[16px] border px-4 py-3 text-sm",
                                          result.pass
                                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                            : "border-rose-400/20 bg-rose-500/10 text-rose-100",
                                        )}
                                      >
                                        <div className="font-semibold">{result.label}</div>
                                        {!result.pass ? (
                                          <div className="mt-2 text-xs leading-6">
                                            Expected: {formatChallengeValue(result.expected)}
                                            <br />
                                            Actual: {formatChallengeValue(result.actual)}
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                {compilerSnapshot.logs?.length ? (
                                  <pre className="overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-xs leading-6 text-white/75">
                                    {compilerSnapshot.logs.join("\n")}
                                  </pre>
                                ) : selectedLevel.assessment?.codeOutput ? (
                                  <pre className="overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-xs leading-6 text-white/75">
                                    {selectedLevel.assessment.codeOutput}
                                  </pre>
                                ) : null}
                              </div>
                            ) : (
                              <div className="mt-3 text-sm leading-7 text-white/52">
                                Run the code to see test results and compiler output here.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedLevel.resources?.length ? (
                    <div className="mt-6">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
                        Resource Cues
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedLevel.resources.map((resource) => (
                          <span
                            key={`${selectedLevel.id}-${resource}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                          >
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!selectedLevelUnlocked ? (
                    <div className="mt-6 rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                      This day is locked. Complete the previous day first to unlock it.
                    </div>
                  ) : null}
                </>
              ) : null}
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-lg font-bold text-white">Completion Meter</div>
              <div className="mt-2 text-sm leading-7 text-white/60">
                Progress only advances when an entire day checklist is completed.
              </div>

              <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff7bc1_0%,#ffcf6e_55%,#7de2ff_100%)] transition-all"
                  style={{ width: `${adaptiveLearning.completionRate}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricPanel
                  label="Completed Days"
                  value={`${adaptiveLearning.completedLevels}/${adaptiveLearning.totalLevels}`}
                />
                <MetricPanel
                  label="Current Streak"
                  value={`${adaptiveLearning.streak} days`}
                />
                <MetricPanel
                  label="XP Earned"
                  value={`${adaptiveLearning.xp}`}
                />
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {!profileReady ? (
        <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70">
          Loading your adaptive learning profile...
        </div>
      ) : null}
    </div>
  );
}

function HudCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/78">{value}</div>
    </div>
  );
}

function LevelTrailItem({ level, index, active, unlocked, onSelect }) {
  const alignment = index % 2 === 0 ? "justify-start" : "justify-end";

  return (
    <div className={cn("relative flex", alignment)}>
      {index > 0 ? (
        <div
          className={cn(
            "pointer-events-none absolute -top-6 h-8 w-1 rounded-full",
            index % 2 === 0 ? "left-12" : "right-12",
            level.completed
              ? "bg-[linear-gradient(180deg,#ffcf6e,#7de2ff)]"
              : "bg-white/15",
          )}
        />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group flex w-[250px] items-center gap-4 text-left transition",
          unlocked ? "hover:translate-y-[-2px]" : "opacity-80",
        )}
      >
        <div
          className={cn(
            "relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 text-white shadow-[0_18px_32px_rgba(0,0,0,0.28)]",
            level.completed
              ? "border-[#fff2ad] bg-[linear-gradient(135deg,#ffcf6e,#ff9f67)]"
              : unlocked
                ? "border-white/60 bg-[linear-gradient(135deg,#ff79c8,#9d7bff,#72dcff)]"
                : "border-slate-500/60 bg-[linear-gradient(135deg,#475569,#1f2937)]",
            active ? "ring-4 ring-white/25" : "",
          )}
        >
          {level.completed ? (
            <CheckCheck className="h-9 w-9" />
          ) : unlocked ? (
            <span className="text-2xl font-black">{level.dayNumber}</span>
          ) : (
            <Lock className="h-8 w-8 text-white/75" />
          )}
          <div className="absolute -bottom-2 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            {level.xpReward} XP
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 rounded-[24px] border px-4 py-4 backdrop-blur",
            active
              ? "border-white/20 bg-white/18"
              : "border-white/10 bg-white/8",
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
            {level.label} • {level.weekLabel}
          </div>
          <div className="mt-2 truncate text-base font-black text-white">
            {level.title}
          </div>
          <div className="mt-1 truncate text-sm text-white/62">{level.topic}</div>
        </div>
      </button>
    </div>
  );
}

function MetaPill({ label, tone = "neutral" }) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
      : tone === "emerald"
        ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
        : tone === "pink"
          ? "border-fuchsia-300/20 bg-fuchsia-500/10 text-fuchsia-100"
          : "border-white/10 bg-white/10 text-white/72";

  return (
    <div className={cn("rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]", toneClasses)}>
      {label}
    </div>
  );
}

function MetricPanel({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function buildStoredCompilerSnapshot(assessment = {}) {
  if (
    !assessment?.lastRunAtIso &&
    !assessment?.codeOutput &&
    !assessment?.codeError
  ) {
    return null;
  }

  return {
    passed: Boolean(assessment?.codePassed),
    passedTests: Number(assessment?.passedTests || 0),
    totalTests: Number(assessment?.totalTests || 0),
    logs: String(assessment?.codeOutput || "")
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean),
    error: String(assessment?.codeError || ""),
    testResults: [],
  };
}

function buildCompilerOutput(result) {
  const sections = [];

  if (result?.logs?.length) {
    sections.push(`Logs:\n${result.logs.join("\n")}`);
  }

  if (result?.testResults?.length) {
    sections.push(
      `Tests:\n${result.testResults
        .map((test) => `${test.pass ? "PASS" : "FAIL"} ${test.label}`)
        .join("\n")}`,
    );
  }

  if (result?.error) {
    sections.push(`Error:\n${result.error}`);
  }

  return sections.join("\n\n").trim();
}

function formatChallengeValue(value) {
  try {
    if (typeof value === "string") {
      return JSON.stringify(value);
    }

    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

async function runJavaScriptChallenge({ code, challenge }) {
  if (!challenge?.functionName) {
    return {
      passed: false,
      passedTests: 0,
      totalTests: 0,
      testResults: [],
      logs: [],
      error: "This level does not have a valid coding challenge yet.",
    };
  }

  return new Promise((resolve) => {
    const workerSource = `
      const formatValue = (value) => {
        try {
          return typeof value === "string" ? value : JSON.stringify(value);
        } catch (error) {
          return String(value);
        }
      };

      self.onmessage = (event) => {
        const { code, challenge } = event.data;
        const logs = [];
        const consoleProxy = {
          log: (...args) => logs.push(args.map(formatValue).join(" ")),
          warn: (...args) => logs.push(args.map(formatValue).join(" ")),
          error: (...args) => logs.push(args.map(formatValue).join(" ")),
        };

        try {
          const factory = new Function(
            "console",
            '"use strict";\\n' + code + '\\nreturn typeof ' + challenge.functionName + ' === "function" ? ' + challenge.functionName + ' : null;'
          );
          const fn = factory(consoleProxy);

          if (typeof fn !== "function") {
            throw new Error('Define a function named "' + challenge.functionName + '" before running the compiler.');
          }

          const testResults = (Array.isArray(challenge.tests) ? challenge.tests : []).map((test) => {
            const actual = fn(...(Array.isArray(test.args) ? test.args : []));
            const pass = JSON.stringify(actual) === JSON.stringify(test.expected);

            return {
              id: test.id,
              label: test.label,
              pass,
              actual,
              expected: test.expected,
            };
          });

          self.postMessage({
            passed: testResults.every((test) => test.pass),
            passedTests: testResults.filter((test) => test.pass).length,
            totalTests: testResults.length,
            testResults,
            logs,
            error: "",
          });
        } catch (error) {
          self.postMessage({
            passed: false,
            passedTests: 0,
            totalTests: Array.isArray(challenge.tests) ? challenge.tests.length : 0,
            testResults: [],
            logs,
            error: error && error.message ? error.message : "Execution failed.",
          });
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve({
        passed: false,
        passedTests: 0,
        totalTests: Array.isArray(challenge.tests) ? challenge.tests.length : 0,
        testResults: [],
        logs: [],
        error: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000} seconds.`,
      });
    }, EXECUTION_TIMEOUT_MS);

    worker.onmessage = (event) => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve({
        passed: Boolean(event?.data?.passed),
        passedTests: Number(event?.data?.passedTests || 0),
        totalTests: Number(event?.data?.totalTests || 0),
        testResults: Array.isArray(event?.data?.testResults) ? event.data.testResults : [],
        logs: Array.isArray(event?.data?.logs) ? event.data.logs : [],
        error: String(event?.data?.error || ""),
      });
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve({
        passed: false,
        passedTests: 0,
        totalTests: Array.isArray(challenge.tests) ? challenge.tests.length : 0,
        testResults: [],
        logs: [],
        error: event?.message || "Worker execution failed.",
      });
    };

    worker.postMessage({
      code,
      challenge: {
        functionName: challenge.functionName,
        tests: Array.isArray(challenge.tests) ? challenge.tests : [],
      },
    });
  });
}
