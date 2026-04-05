import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { tutors } from "../../data/workspaceData";

export default function TutorPlatformPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="AI Tutor Platform" title="Connect volunteer tutors with learners in a premium mentoring interface." description="Browse tutor cards, match by subject and availability, and trigger quick connect actions for mentoring support." />
      <div className="grid gap-6 xl:grid-cols-3">
        {tutors.map((tutor) => (
          <GlassCard key={tutor.name} className="p-6 transition duration-300 hover:-translate-y-1 hover:border-red-400/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-bold text-white">{tutor.name}</div>
                <div className="mt-2 text-sm text-white/50">{tutor.subject}</div>
              </div>
              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">{tutor.tag}</span>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/65">Availability: {tutor.availability}</div>
            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-4 py-3 text-sm font-semibold text-white">Connect</button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">Chat</button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
