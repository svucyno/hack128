import { motion } from "framer-motion";
import { BriefcaseBusiness, ScanSearch } from "lucide-react";

function JobMatch({ matches }) {
  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="section-chip">Role Matching</span>
          <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
            Best-fit job roles
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
          <ScanSearch size={18} />
        </div>
      </div>

      <div className="space-y-4">
        {matches.map((match, index) => (
          <motion.div
            key={match.role}
            className="rounded-[24px] border border-white/8 bg-black/15 p-4"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-white/8 bg-white/5 p-2 text-accent">
                    <BriefcaseBusiness size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{match.role}</div>
                    <div className="text-sm text-ink-muted">{match.summary}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent-soft">
                {match.match}%
              </div>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                initial={{ width: 0 }}
                animate={{ width: `${match.match}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {match.focusAreas.map((focus) => (
                <span
                  key={focus}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-muted"
                >
                  {focus}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default JobMatch;
