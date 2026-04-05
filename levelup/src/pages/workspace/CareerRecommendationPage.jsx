import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import ProgressBar from "../../components/workspace/ProgressBar";
import { recommendedRoles } from "../../data/workspaceData";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export default function CareerRecommendationPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Career Recommendation" title="Discover best-fit roles from skills and interests." description="Interactive career cards combine match percentage, salary range, and growth outlook to guide role selection." />
      <GlassCard className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" placeholder="Enter skills" />
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" placeholder="Enter interests" />
          <button className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-5 py-3 text-sm font-semibold text-white">Generate Recommendations</button>
        </div>
      </GlassCard>
      <div className="grid gap-6 xl:grid-cols-3">
        {recommendedRoles.map((role) => (
          <GlassCard key={role.role} className="p-6 transition duration-300 hover:-translate-y-1 hover:border-red-400/20">
            <div className="flex items-start justify-between">
              <div className="text-2xl font-bold text-white">{role.role}</div>
              <div className="text-right">
                <div className="text-3xl font-black text-red-200">{role.match}%</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Match</div>
              </div>
            </div>
            <div className="mt-4 text-sm leading-7 text-white/60">Salary range: {role.salary}. Growth potential: {role.growth}. Strong fit for modern product and engineering teams.</div>
            <div className="mt-6">
              <ProgressBar value={role.match} />
            </div>
            <div className="mt-5 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={role.demand.map((value, index) => ({ index, value }))}>
                  <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
