import { motion } from "framer-motion";
import { AlertCircle, CircleDashed, Sparkles, TrendingUp } from "lucide-react";

const breakdownConfig = [
  { key: "keywordMatch", label: "Keyword Match", max: 30 },
  { key: "skillsMatch", label: "Skills Match", max: 25 },
  { key: "experience", label: "Experience", max: 15 },
  { key: "education", label: "Education", max: 10 },
  { key: "formatting", label: "Formatting", max: 10 },
  { key: "projectsImpact", label: "Projects / Impact", max: 10 },
];

function getScoreTone(score) {
  if (score < 50) {
    return {
      stroke: "#ff5f56",
      badge: "Poor",
      chip: "border-[#ff5f56]/25 bg-[#ff5f56]/10 text-[#ff9891]",
    };
  }

  if (score < 75) {
    return {
      stroke: "#f7b84b",
      badge: "Average",
      chip: "border-[#f7b84b]/25 bg-[#f7b84b]/10 text-[#ffd98c]",
    };
  }

  return {
    stroke: "#57d38c",
    badge: "Strong",
    chip: "border-[#57d38c]/25 bg-[#57d38c]/10 text-[#a6f0c2]",
  };
}

function ATSScore({ score, scoreLabel, breakdown, whyScoreIsLow, howToReachNinety }) {
  const tone = getScoreTone(score);
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="section-chip">ATS Intelligence</span>
          <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
            Resume scoring engine
          </h2>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.chip}`}>
          {tone.badge}
        </div>
      </div>

      <div className="mb-8 flex flex-col items-center gap-5">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 170 170">
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            <motion.circle
              cx="85"
              cy="85"
              r={radius}
              fill="transparent"
              stroke={tone.stroke}
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
              animate={{ strokeDasharray: circumference, strokeDashoffset: strokeOffset }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-[18px] rounded-full border border-white/10 bg-black/35 backdrop-blur-xl" />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent">
              <CircleDashed size={18} />
            </div>
            <div className="font-heading text-4xl font-bold text-ink">{score}/100</div>
            <div className="mt-2 text-sm font-semibold text-ink">
              {scoreLabel}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-ink-muted">
              ATS Score
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-ink-muted">
          <Sparkles size={14} className="text-accent" />
          Scored on keywords, skills, formatting, experience, education, and impact.
        </div>
      </div>

      <div className="space-y-4">
        {breakdownConfig.map(({ key, label, max }) => {
          const value = breakdown[key];
          const width = (value / max) * 100;

          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="font-semibold text-ink">
                  {value}/{max}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-[#ff5f56]/15 bg-[#ff5f56]/8 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertCircle size={16} className="text-[#ff9891]" />
            Why your score is low
          </div>
          <div className="space-y-2">
            {(whyScoreIsLow?.length ? whyScoreIsLow : ["Your resume still has a few weak ATS sections compared with stronger profiles."]).map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#57d38c]/15 bg-[#57d38c]/8 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp size={16} className="text-[#a6f0c2]" />
            How to increase score to 90+
          </div>
          <div className="space-y-2">
            {(howToReachNinety?.length ? howToReachNinety : ["Add more role-specific keywords, measurable achievements, and clearer experience bullets."]).map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ATSScore;
