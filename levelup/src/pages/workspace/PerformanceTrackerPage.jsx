import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Flame,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import CircularProgress from "../../components/workspace/CircularProgress";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  getNextUnlockedLevel,
  isLevelUnlocked,
  normalizeAdaptiveLearningState,
} from "../../lib/adaptiveLearning";

const STATUS_COLORS = ["#34d399", "#f59e0b", "#64748b"];

export default function PerformanceTrackerPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const adaptiveLearning = useMemo(
    () => normalizeAdaptiveLearningState(profile?.adaptiveLearning),
    [profile?.adaptiveLearning],
  );
  const performance = useMemo(
    () => buildAdaptivePerformance(adaptiveLearning),
    [adaptiveLearning],
  );

  if (!profileReady) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Adaptive Performance"
          title="Performance"
          description="Loading your adaptive-learning performance metrics."
        />
        <GlassCard className="p-6 text-sm text-white/72">
          Loading performance data from Adaptive Learning...
        </GlassCard>
      </div>
    );
  }

  if (!adaptiveLearning.levels.length) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Adaptive Performance"
          title="Performance"
          description="This section becomes live as soon as you activate an Adaptive Learning roadmap and start completing levels."
        />

        <GlassCard className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                <GraduationCap className="h-4 w-4" />
                Adaptive Tracker
              </div>
              <div className="text-3xl font-black text-white">
                No adaptive-learning performance to track yet
              </div>
              <div className="max-w-2xl text-sm leading-7 text-white/62">
                The Performance page now reads its signals from your Adaptive Learning
                journey. Once you activate a roadmap and start finishing day-wise
                levels, this page will show readiness, consistency, quiz accuracy,
                compiler progress, XP, streaks, and weekly trends.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/workspace/adaptive-learning"
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  Open Adaptive Learning
                </Link>
                <Link
                  to="/workspace/career-guidance"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <Target className="h-4 w-4" />
                  Generate Roadmap
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                What will appear here
              </div>
              <div className="mt-4 space-y-4">
                <InsightRow
                  icon={TrendingUp}
                  title="Readiness Trend"
                  description="Week-by-week progress pulled from your level completion and assessments."
                />
                <InsightRow
                  icon={CheckCircle2}
                  title="Quiz Accuracy"
                  description="Performance from the MCQs attached to each adaptive-learning level."
                />
                <InsightRow
                  icon={Code2}
                  title="Compiler Progress"
                  description="Coding-challenge pass rate from the built-in compiler checks."
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Adaptive Performance"
        title="Performance"
        description={`Live performance signals from your Adaptive Learning journey for ${adaptiveLearning.targetRole || "your active target role"}. This page updates from completed levels, quiz answers, compiler runs, streaks, and XP.`}
        aside={
          <RiskBadge
            level={performance.riskLevel}
            label={performance.riskLabel}
            summary={performance.riskSummary}
          />
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <PerformanceStatCard
          icon={TrendingUp}
          label="Readiness"
          value={`${performance.readiness}%`}
          helper={performance.readinessHelper}
        />
        <PerformanceStatCard
          icon={Flame}
          label="Consistency"
          value={`${performance.consistency}%`}
          helper={`${adaptiveLearning.streak} day streak`}
        />
        <PerformanceStatCard
          icon={CheckCircle2}
          label="Quiz Accuracy"
          value={`${performance.quizAccuracy}%`}
          helper={`${performance.correctAnswers}/${performance.answeredQuestions} correct`}
        />
        <PerformanceStatCard
          icon={Code2}
          label="Compiler Pass"
          value={`${performance.compilerPassRate}%`}
          helper={`${performance.codePassedLevels}/${performance.codingLevels} levels passed`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">Weekly Adaptive Trend</div>
              <div className="mt-2 text-sm leading-7 text-white/58">
                Readiness and consistency are grouped from your roadmap weeks and
                scored from completed levels, quizzes, and coding drills.
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
              {adaptiveLearning.sourceRoadmapTitle || "Active roadmap"}
            </div>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance.weeklySeries}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f0f12",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="readiness"
                  name="Readiness"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="consistency"
                  name="Consistency"
                  stroke="#f472b6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="grid gap-5 p-6 sm:grid-cols-2">
          <CircularProgress value={performance.readiness} label="Readiness" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={performance.statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {performance.statusDistribution.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${entry.value}`}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f0f12",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="sm:col-span-2 grid gap-3">
            {performance.statusDistribution.map((entry, index) => (
              <div
                key={`${entry.name}-${entry.value}-row`}
                className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3 text-sm text-white/72">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                  />
                  {entry.name}
                </div>
                <div className="text-sm font-semibold text-white">{entry.value}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-6">
          <div className="text-lg font-semibold text-white">Adaptive Signals</div>
          <div className="mt-2 text-sm leading-7 text-white/58">
            These signals are computed from your level completion, assessments, and
            coding runs.
          </div>

          <div className="mt-5 grid gap-4">
            {performance.signals.map((signal) => (
              <InsightRow
                key={signal.title}
                icon={signal.icon}
                title={signal.title}
                description={signal.description}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">Current Performance Focus</div>
              <div className="mt-2 text-sm leading-7 text-white/58">
                This is the next work the student needs to finish in Adaptive Learning.
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
              {performance.nextLevel?.label || "No active level"}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
                Active Mission
              </div>
              <div className="mt-3 text-xl font-black text-white">
                {performance.nextLevel?.title || "No unlocked level"}
              </div>
              <div className="mt-2 text-sm leading-7 text-white/62">
                {performance.nextLevel?.objective ||
                  "Activate and continue your adaptive-learning roadmap to see the next mission."}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricPill label="XP" value={`${adaptiveLearning.xp}`} />
                <MetricPill
                  label="Unlocked"
                  value={`${performance.unlockedLevels}/${adaptiveLearning.totalLevels}`}
                />
                <MetricPill
                  label="Questions"
                  value={`${performance.answeredQuestions}/${performance.totalQuestions}`}
                />
                <MetricPill
                  label="Compiler Tests"
                  value={`${performance.passedTests}/${performance.totalTests}`}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
                Needs Attention
              </div>
              <div className="mt-4 space-y-3">
                {performance.blockers.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/workspace/adaptive-learning"
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500/25"
                >
                  Open Adaptive Learning
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function PerformanceStatCard({ icon: Icon, label, value, helper }) {
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

function RiskBadge({ level, label, summary }) {
  const Icon =
    level === "high" ? ShieldAlert : level === "medium" ? AlertTriangle : ShieldCheck;
  const toneClass =
    level === "high"
      ? "border-rose-300/20 bg-rose-500/10 text-rose-100"
      : level === "medium"
        ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
        : "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={`rounded-[24px] border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 max-w-xs text-sm leading-6">{summary}</div>
    </div>
  );
}

function InsightRow({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white/80">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-7 text-white/58">{description}</div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function buildAdaptivePerformance(adaptiveLearning) {
  const levels = Array.isArray(adaptiveLearning?.levels) ? adaptiveLearning.levels : [];
  const totalLevels = levels.length;
  const unlockedLevels = levels.filter((level, index) =>
    isLevelUnlocked(levels, index),
  ).length;
  const completedLevels = levels.filter((level) => level.completed).length;
  const lockedLevels = Math.max(totalLevels - unlockedLevels, 0);
  const inProgressLevels = Math.max(unlockedLevels - completedLevels, 0);
  const nextLevel = getNextUnlockedLevel(levels);

  const totalQuestions = levels.reduce(
    (sum, level) => sum + (Array.isArray(level.questions) ? level.questions.length : 0),
    0,
  );
  const answeredQuestions = levels.reduce((sum, level) => {
    const answers = level?.assessment?.answers || {};
    return (
      sum +
      (Array.isArray(level.questions)
        ? level.questions.filter((question) => typeof answers[question.id] === "number").length
        : 0)
    );
  }, 0);
  const correctAnswers = levels.reduce((sum, level) => {
    const answers = level?.assessment?.answers || {};
    return (
      sum +
      (Array.isArray(level.questions)
        ? level.questions.filter(
            (question) => answers[question.id] === question.correctOptionIndex,
          ).length
        : 0)
    );
  }, 0);

  const codingLevels = levels.filter(
    (level) => Array.isArray(level?.codingChallenge?.tests) && level.codingChallenge.tests.length,
  ).length;
  const codePassedLevels = levels.filter((level) => level?.assessment?.codePassed).length;
  const totalTests = levels.reduce((sum, level) => {
    const testsCount =
      level?.assessment?.totalTests ||
      (Array.isArray(level?.codingChallenge?.tests) ? level.codingChallenge.tests.length : 0);
    return sum + testsCount;
  }, 0);
  const passedTests = levels.reduce(
    (sum, level) => sum + Number(level?.assessment?.passedTests || 0),
    0,
  );

  const quizAccuracy = toPercent(correctAnswers, answeredQuestions);
  const quizCoverage = toPercent(answeredQuestions, totalQuestions);
  const compilerAccuracy = toPercent(passedTests, totalTests);
  const compilerPassRate = toPercent(codePassedLevels, codingLevels);
  const streakScore = clamp(Math.round((adaptiveLearning.streak || 0) * 14), 0, 100);
  const readiness = clamp(
    Math.round(
      adaptiveLearning.completionRate * 0.42 +
        quizAccuracy * 0.2 +
        compilerAccuracy * 0.18 +
        streakScore * 0.2,
    ),
    0,
    100,
  );
  const consistency = clamp(
    Math.round(
      streakScore * 0.4 +
        adaptiveLearning.completionRate * 0.35 +
        quizCoverage * 0.15 +
        compilerPassRate * 0.1,
    ),
    0,
    100,
  );

  const risk = deriveRisk({
    readiness,
    consistency,
    streak: adaptiveLearning.streak || 0,
    completionRate: adaptiveLearning.completionRate || 0,
  });

  const blockers = buildBlockers({
    nextLevel,
    adaptiveLearning,
    quizCoverage,
    compilerPassRate,
    lockedLevels,
  });

  return {
    unlockedLevels,
    readiness,
    consistency,
    readinessHelper: `${completedLevels}/${totalLevels} days completed`,
    quizAccuracy,
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    compilerPassRate,
    compilerAccuracy,
    codingLevels,
    codePassedLevels,
    totalTests,
    passedTests,
    nextLevel,
    blockers,
    statusDistribution: [
      { name: "Completed", value: completedLevels },
      { name: "Unlocked", value: inProgressLevels },
      { name: "Locked", value: lockedLevels },
    ].filter((entry) => entry.value > 0),
    weeklySeries: buildWeeklySeries(levels),
    signals: buildSignals({
      adaptiveLearning,
      readiness,
      consistency,
      quizAccuracy,
      compilerPassRate,
      nextLevel,
    }),
    riskLevel: risk.level,
    riskLabel: risk.label,
    riskSummary: risk.summary,
  };
}

function buildWeeklySeries(levels) {
  const grouped = [];

  levels.forEach((level, index) => {
    const weekKey = String(level?.weekLabel || `Week ${index + 1}`).trim();
    let entry = grouped.find((item) => item.week === weekKey);

    if (!entry) {
      entry = {
        week: weekKey,
        totalLevels: 0,
        completedLevels: 0,
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        codingLevels: 0,
        passedLevels: 0,
      };
      grouped.push(entry);
    }

    entry.totalLevels += 1;
    if (level.completed) {
      entry.completedLevels += 1;
    }

    const questions = Array.isArray(level.questions) ? level.questions : [];
    const answers = level?.assessment?.answers || {};
    entry.totalQuestions += questions.length;
    entry.answeredQuestions += questions.filter(
      (question) => typeof answers[question.id] === "number",
    ).length;
    entry.correctAnswers += questions.filter(
      (question) => answers[question.id] === question.correctOptionIndex,
    ).length;

    const hasCoding = Array.isArray(level?.codingChallenge?.tests) && level.codingChallenge.tests.length;
    if (hasCoding) {
      entry.codingLevels += 1;
    }
    if (level?.assessment?.codePassed) {
      entry.passedLevels += 1;
    }
  });

  return grouped.map((entry) => {
    const completion = toPercent(entry.completedLevels, entry.totalLevels);
    const quizAccuracy = toPercent(entry.correctAnswers, entry.answeredQuestions);
    const compilerProgress = toPercent(entry.passedLevels, entry.codingLevels);

    return {
      week: entry.week,
      readiness: clamp(
        Math.round(completion * 0.5 + quizAccuracy * 0.25 + compilerProgress * 0.25),
        0,
        100,
      ),
      consistency: clamp(
        Math.round(
          completion * 0.55 +
            toPercent(entry.answeredQuestions, entry.totalQuestions) * 0.25 +
            compilerProgress * 0.2,
        ),
        0,
        100,
      ),
    };
  });
}

function buildSignals({
  adaptiveLearning,
  readiness,
  consistency,
  quizAccuracy,
  compilerPassRate,
  nextLevel,
}) {
  return [
    {
      icon: TrendingUp,
      title: "Readiness score",
      description: `${readiness}% readiness from completion, quiz results, coding checks, and streak momentum.`,
    },
    {
      icon: Flame,
      title: "Daily rhythm",
      description:
        adaptiveLearning.streak > 0
          ? `${adaptiveLearning.streak} day streak active. Consistency is currently ${consistency}%.`
          : "No active streak right now. Completing one full day will restart the streak meter.",
    },
    {
      icon: CheckCircle2,
      title: "Question performance",
      description:
        quizAccuracy > 0
          ? `${quizAccuracy}% MCQ accuracy across the answered adaptive-learning questions.`
          : "No MCQ answers yet. Start answering level questions to unlock quiz-based performance insights.",
    },
    {
      icon: Code2,
      title: "Coding drill performance",
      description:
        compilerPassRate > 0
          ? `${compilerPassRate}% of coding levels have passed compiler checks so far.`
          : "No coding drill has been fully passed yet. Run the compiler on the active level to improve this score.",
    },
    {
      icon: Target,
      title: "Next target",
      description:
        nextLevel?.title
          ? `The next unlocked level is ${nextLevel.label}: ${nextLevel.title}.`
          : "All current levels are complete. Activate a new roadmap when you are ready for the next sprint.",
    },
  ];
}

function buildBlockers({
  nextLevel,
  adaptiveLearning,
  quizCoverage,
  compilerPassRate,
  lockedLevels,
}) {
  const blockers = [];

  if (nextLevel?.checklist?.some((item) => !item.done)) {
    blockers.push(
      `Pending checklist items in ${nextLevel.label}: ${nextLevel.checklist
        .filter((item) => !item.done)
        .map((item) => item.text)
        .slice(0, 2)
        .join(" | ")}`,
    );
  }

  if (quizCoverage < 60) {
    blockers.push("A large part of the level MCQs is still unanswered. Finish more questions for a stronger performance signal.");
  }

  if (compilerPassRate < 50) {
    blockers.push("Coding drill pass rate is still low. Re-run the compiler on active levels and fix failed tests.");
  }

  if ((adaptiveLearning.streak || 0) === 0) {
    blockers.push("The streak meter is inactive. Completing one full adaptive-learning day will restart it.");
  }

  if (lockedLevels > 0) {
    blockers.push(`${lockedLevels} levels are still locked behind pending work in the earlier days.`);
  }

  return blockers.slice(0, 4);
}

function deriveRisk({ readiness, consistency, streak, completionRate }) {
  if (readiness < 45 || (completionRate < 25 && streak === 0)) {
    return {
      level: "high",
      label: "High Risk",
      summary:
        "The learner is behind on adaptive-learning completion or has lost momentum. Finish the current unlocked level before opening anything new.",
    };
  }

  if (readiness < 70 || consistency < 65) {
    return {
      level: "medium",
      label: "Medium Risk",
      summary:
        "Progress is moving, but quiz coverage, compiler passes, or streak consistency still need tightening.",
    };
  }

  return {
    level: "low",
    label: "Low Risk",
    summary:
      "Adaptive-learning progress is healthy. Keep the streak going and continue closing the next unlocked level.",
    };
}

function toPercent(part, whole) {
  if (!whole) {
    return 0;
  }

  return clamp(Math.round((Number(part) / Number(whole)) * 100), 0, 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
