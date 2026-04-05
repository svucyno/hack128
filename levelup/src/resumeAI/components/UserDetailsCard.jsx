import { motion } from "framer-motion";
import { BriefcaseBusiness, GraduationCap, Mail, Phone, UserRound } from "lucide-react";

const detailItems = [
  { key: "name", label: "Name", icon: UserRound },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "experienceLevel", label: "Experience Level", icon: BriefcaseBusiness },
  { key: "educationLevel", label: "Education", icon: GraduationCap },
];

function UserDetailsCard({ extractedUser, strengths }) {
  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="section-chip">Auto Extracted</span>
          <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
            Candidate snapshot
          </h2>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-2 text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-accent-soft">
            Work Experience
          </div>
          <div className="text-sm font-semibold text-ink">
            {extractedUser.yearsExperienceDisplay} yrs inferred
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {detailItems.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-white/8 bg-black/15 p-4"
          >
            <div className="mb-3 inline-flex rounded-xl border border-white/8 bg-white/5 p-2 text-accent">
              <Icon size={18} />
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {extractedUser[key]}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/10 p-4 text-sm leading-6 text-ink-muted">
        {extractedUser.experienceNote}
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          Resume Strengths
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {strengths.map((strength) => (
            <span
              key={strength}
              className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft"
            >
              {strength}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default UserDetailsCard;
