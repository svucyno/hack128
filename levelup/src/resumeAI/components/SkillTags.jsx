import { motion } from "framer-motion";
import { BadgeCheck, BadgeMinus, Code2 } from "lucide-react";

function SkillTags({ skills, missingSkills, topKeywords }) {
  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="section-chip">Skill Graph</span>
          <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
            Skills extracted and gap analysis
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
          <Code2 size={18} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <BadgeCheck size={16} className="text-accent" />
            Extracted skills
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.length ? (
              skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No explicit skills detected from the uploaded text.</p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <BadgeMinus size={16} className="text-[#f7b84b]" />
            Missing for top roles
          </div>
          <div className="flex flex-wrap gap-2">
            {missingSkills.length ? (
              missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[#f7b84b]/20 bg-[#f7b84b]/10 px-3 py-1 text-xs font-medium text-[#ffd98c]"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No major skill gaps detected against the top role match.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/8 bg-white/5 p-4">
        <div className="mb-3 text-sm font-semibold text-ink">Top ATS keywords detected</div>
        <div className="flex flex-wrap gap-2">
          {topKeywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-ink-muted"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default SkillTags;
