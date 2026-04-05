import GlassCard from "../../components/workspace/GlassCard";
import CircularProgress from "../../components/workspace/CircularProgress";
import PageHeader from "../../components/workspace/PageHeader";
import ProgressBar from "../../components/workspace/ProgressBar";
import SkeletonBlock from "../../components/workspace/SkeletonBlock";
import UploadZone from "../../components/workspace/UploadZone";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { atsInsights } from "../../data/workspaceData";

export default function AtsResumePage() {
  const isLoading = Boolean(useWorkspaceStore((state) => state.processing.resume) || useWorkspaceStore((state) => state.processing.jobDescription));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="ATS Resume Scoring" title="Evaluate resume compatibility with target job descriptions." description="Upload a resume and a target job description to inspect score, keyword alignment, missing skills, and resume optimization tips." />
      <div className="grid gap-6 xl:grid-cols-2">
        <UploadZone storageKey="resume" title="Upload Resume" subtitle="PDF or DOCX | drag and drop your latest resume" />
        <UploadZone storageKey="jobDescription" title="Upload Job Description" subtitle="Paste or upload the target role requirements" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <GlassCard className="p-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <SkeletonBlock className="h-56" />
              <SkeletonBlock className="h-56" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <CircularProgress value={atsInsights.score} label="ATS score" />
              <CircularProgress value={atsInsights.keywordMatch} label="Keyword match" />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-white">Missing Skills</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {atsInsights.missingSkills.map((skill) => (
                  <span key={skill} className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-100">{skill}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Suggestions</div>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/60">
                {atsInsights.suggestions.map((item) => (
                  <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <div className="text-sm font-semibold text-white">Section Breakdown</div>
          <div className="mt-6 space-y-5">
            {atsInsights.breakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <ProgressBar value={item.value} />
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="text-sm font-semibold text-white">Keyword Match Visualization</div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={atsInsights.keywordVisual} dataKey="value" innerRadius={68} outerRadius={100} paddingAngle={4}>
                  {["#ef4444", "#3b0d10"].map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f0f12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
