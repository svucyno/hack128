import { motion } from "framer-motion";
import { ArrowUpRight, Crosshair, Lightbulb, Rocket, Target } from "lucide-react";

function Suggestions({
  suggestions,
  careerRecommendations,
  jdComparison,
  roleSpecificPlan,
}) {
  return (
    <motion.div
      className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
    >
      <div className="glass-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="section-chip">Resume Actions</span>
            <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
              Improvement suggestions
            </h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
            <Lightbulb size={18} />
          </div>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-black/15 p-4"
            >
              <div className="mt-1 rounded-xl border border-accent/20 bg-accent/10 p-2 text-accent">
                <ArrowUpRight size={14} />
              </div>
              <p className="text-sm leading-6 text-ink-muted">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="section-chip">Career Path</span>
              <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
                Personalized recommendations
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
              <Rocket size={18} />
            </div>
          </div>

          <div className="space-y-3">
            {careerRecommendations.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-white/8 bg-black/15 p-4 text-sm leading-6 text-ink-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="section-chip">Role Plan</span>
              <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
                Role-specific improvement plan
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
              <Target size={18} />
            </div>
          </div>

          <div className="space-y-3">
            {roleSpecificPlan.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-white/8 bg-black/15 p-4 text-sm leading-6 text-ink-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {jdComparison && (
          <div className="glass-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span className="section-chip">JD Compare</span>
                <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
                  Resume vs job description
                </h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
                <Crosshair size={18} />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-ink-muted">Alignment score</span>
                <span className="text-lg font-semibold text-ink">
                  {jdComparison.score}%
                </span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                  style={{ width: `${jdComparison.score}%` }}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    Matched
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jdComparison.matchedKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent-soft"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    Missing
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jdComparison.missingKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-[#f7b84b]/20 bg-[#f7b84b]/10 px-3 py-1 text-xs text-[#ffd98c]"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Suggestions;
