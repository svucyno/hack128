import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileSearch,
  LoaderCircle,
  ScanSearch,
  Target,
  UploadCloud,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import ProgressBar from "../../components/workspace/ProgressBar";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  formatBytes,
  getDropzoneErrorMessage,
  normalizeAnalysisReport,
} from "../../lib/resumeAnalysis";
import { analyzeResume } from "../../resumeAI/utils/atsEngine";
import { parseResumeInput } from "../../resumeAI/utils/resumeParser";

function InputTab({ active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
        active
          ? "theme-shell-panel theme-text-strong border"
          : "theme-text-muted opacity-75 hover:opacity-100"
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border px-4 py-3">
      <div className="theme-text-muted text-[11px] uppercase tracking-[0.18em]">{label}</div>
      <div className="theme-text-strong mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ChipList({ title, items, tone = "neutral", emptyText }) {
  const chipClass =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "red"
          ? "border-red-400/20 bg-red-500/10 text-red-100"
          : "border-white/10 bg-white/5 theme-text-strong";

  return (
    <div>
      <div className="theme-text-muted text-xs uppercase tracking-[0.18em]">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className={`rounded-full border px-3 py-2 text-xs font-semibold ${chipClass}`}
            >
              {item}
            </div>
          ))
        ) : (
          <div className="theme-text-muted text-sm">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function RoleCard({ role, index }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="theme-text-muted text-[11px] uppercase tracking-[0.18em]">
            Top Role {index + 1}
          </div>
          <div className="theme-text-strong mt-2 text-xl font-bold">{role.role}</div>
        </div>
        <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
          {role.match}%
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={role.match} />
      </div>

      <div className="theme-text-muted mt-4 text-sm leading-7">
        {role.summary || "Role fit predicted from skills, projects, and profile signals."}
      </div>

      <ChipList
        title="Matched Skills"
        items={role.matchedSkills || []}
        tone="emerald"
        emptyText="No matched skills were returned."
      />

      <div className="mt-5">
        <ChipList
          title="Missing Skills"
          items={role.missingSkills || []}
          tone="amber"
          emptyText="No major missing skills were returned."
        />
      </div>
    </GlassCard>
  );
}

export default function JobRolePredictorPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const latestAnalysis = profile?.resumeWorkspace?.latestAnalysis || null;
  const latestReport = latestAnalysis?.report || null;
  const hasLatestReport = Boolean(latestReport);

  const [activeTab, setActiveTab] = useState(hasLatestReport ? "latest" : "upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState(
    hasLatestReport
      ? {
          ...normalizeAnalysisReport(latestReport),
          previewText: String(latestAnalysis?.rawResumeText || "").trim().slice(0, 600),
          source: "latest",
        }
      : null,
  );

  useEffect(() => {
    if (hasLatestReport && activeTab !== "upload" && activeTab !== "paste") {
      setActiveTab("latest");
      return;
    }

    if (!hasLatestReport && activeTab === "latest") {
      setActiveTab("upload");
    }
  }, [activeTab, hasLatestReport]);

  const hasReadyInput =
    activeTab === "latest"
      ? hasLatestReport
      : activeTab === "upload"
        ? Boolean(resumeFile)
        : manualText.trim().length >= 30;

  const dropzone = useDropzone({
    multiple: false,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    onDropAccepted: (acceptedFiles) => {
      const nextFile = acceptedFiles?.[0];
      if (!nextFile) {
        return;
      }

      setActiveTab("upload");
      setResumeFile(nextFile);
      setError("");
    },
    onDropRejected: (rejections) => {
      setError(getDropzoneErrorMessage(rejections));
    },
  });

  const handlePredict = async () => {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "latest") {
        if (!latestReport) {
          throw new Error("No latest analyzed resume is available yet.");
        }

        setPrediction({
          ...normalizeAnalysisReport(latestReport),
          previewText: String(latestAnalysis?.rawResumeText || "").trim().slice(0, 600),
          source: "latest",
        });
        return;
      }

      const parsedInput = await parseResumeInput({
        file: activeTab === "upload" ? resumeFile : null,
        manualText: activeTab === "paste" ? manualText : "",
      });
      const analysis = analyzeResume({
        resumeText: parsedInput.text,
        fileName: parsedInput.fileName,
      });

      setPrediction({
        ...normalizeAnalysisReport(analysis),
        previewText: parsedInput.previewText,
        source: activeTab,
      });
    } catch (predictionError) {
      setError(predictionError instanceof Error ? predictionError.message : "Role prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  const topRole = prediction?.jobMatches?.[0] || null;
  const sourceLabel =
    prediction?.source === "latest"
      ? "Latest analyzed resume"
      : prediction?.source === "paste"
        ? "Pasted resume text"
        : prediction?.source === "upload"
          ? "Uploaded resume"
          : "No source";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Job Role Recommendation Engine"
        title="Predict suitable job roles from the actual resume."
        description="Upload a resume, paste the resume text, or reuse the latest analyzed resume to generate live role predictions, fit scores, matched skills, and missing skills."
      />

      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <InputTab
                active={activeTab === "latest"}
                disabled={!hasLatestReport}
                onClick={() => {
                  if (hasLatestReport) {
                    setActiveTab("latest");
                    setError("");
                  }
                }}
              >
                Use Latest Resume
              </InputTab>
              <InputTab
                active={activeTab === "upload"}
                onClick={() => {
                  setActiveTab("upload");
                  setError("");
                }}
              >
                Upload Resume
              </InputTab>
              <InputTab
                active={activeTab === "paste"}
                onClick={() => {
                  setActiveTab("paste");
                  setError("");
                }}
              >
                Paste Text
              </InputTab>
            </div>

            {activeTab === "latest" ? (
              <div className="theme-shell-panel rounded-[28px] border p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <FileSearch className="h-5 w-5 theme-text-strong" />
                  </div>
                  <div>
                    <div className="theme-text-strong text-lg font-semibold">Latest analyzed resume</div>
                    <div className="theme-text-muted text-sm">
                      Reuse your saved ATS analysis and role matches immediately.
                    </div>
                  </div>
                </div>

                {hasLatestReport ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoPill
                      label="File"
                      value={
                        latestAnalysis?.context?.fileName ||
                        latestReport?.fileName ||
                        "Latest resume"
                      }
                    />
                    <InfoPill
                      label="Current Top Role"
                      value={latestReport?.jobMatches?.[0]?.role || "Not available"}
                    />
                    <InfoPill
                      label="ATS Score"
                      value={
                        latestReport?.atsScore != null
                          ? `${latestReport.atsScore}/100`
                          : "Not analyzed"
                      }
                    />
                    <InfoPill
                      label="Analyzed At"
                      value={formatTimestamp(latestAnalysis?.context?.analyzedAt)}
                    />
                  </div>
                ) : (
                  <div className="theme-text-muted mt-5 text-sm">
                    No latest analyzed resume is available yet. Run Resume Analyzer once, or use upload/paste here directly.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "upload" ? (
              <div
                {...dropzone.getRootProps()}
                className={`theme-shell-panel cursor-pointer rounded-[28px] border border-dashed p-8 text-center transition ${
                  dropzone.isDragActive
                    ? "border-pink-400/60 bg-pink-500/10"
                    : "hover:-translate-y-0.5 hover:border-pink-400/30 hover:bg-white/[0.07]"
                }`}
              >
                <input {...dropzone.getInputProps()} />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/10">
                  <UploadCloud className="h-8 w-8 theme-text-strong" />
                </div>
                <div className="theme-text-strong mt-5 text-xl font-semibold">
                  Drop your resume here or click to browse
                </div>
                <div className="theme-text-muted mt-2 text-sm">PDF, DOC, or DOCX up to 5 MB</div>
                {resumeFile ? (
                  <div className="mt-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
                    {resumeFile.name} • {formatBytes(resumeFile.size)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "paste" ? (
              <div className="theme-shell-panel rounded-[28px] border p-5">
                <label htmlFor="role-predictor-manual" className="theme-text-muted text-xs uppercase tracking-[0.24em]">
                  Resume Text
                </label>
                <textarea
                  id="role-predictor-manual"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  placeholder="Paste the full resume text here..."
                  className="mt-4 min-h-72 w-full resize-none rounded-[24px] border px-4 py-4 text-sm leading-7 outline-none transition focus:border-pink-400/35"
                  style={{
                    backgroundColor: "var(--theme-surface-dark)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-strong)",
                  }}
                />
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePredict}
              disabled={!hasReadyInput || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Predicting Roles
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" />
                  Predict Roles
                </>
              )}
            </button>
          </div>

          <div className="theme-shell-panel rounded-[28px] border p-6">
            <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
              Prediction Snapshot
            </div>
            <div className="theme-text-strong mt-4 text-2xl font-black">
              {topRole?.role || "No role prediction yet"}
            </div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              {topRole
                ? "Top role prediction is based on skills, projects, experience, education, and extracted keyword alignment."
                : "Run the predictor and the strongest matching role will appear here."}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoPill
                label="Source"
                value={sourceLabel}
              />
              <InfoPill
                label="Candidate"
                value={prediction?.extractedUser?.name || "Waiting"}
              />
              <InfoPill
                label="Top Match"
                value={topRole ? `${topRole.match}%` : "Waiting"}
              />
              <InfoPill
                label="Detected Skills"
                value={
                  prediction?.extractedSkills?.length
                    ? `${prediction.extractedSkills.length} skills`
                    : "Waiting"
                }
              />
            </div>

            {prediction?.topKeywords?.length ? (
              <div className="mt-6">
                <ChipList
                  title="Top Signals"
                  items={prediction.topKeywords.slice(0, 8)}
                  emptyText="No strong signals were detected yet."
                />
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {prediction ? (
        <>
          <GlassCard className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Best Fit
                </div>
                <div className="theme-text-strong mt-4 text-3xl font-black">
                  {topRole?.role || "No role found"}
                </div>
                <div className="theme-text-muted mt-2 text-sm">
                  {topRole?.summary || "Role fit is predicted from the current resume signals."}
                </div>
              </div>
              <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 px-6 py-5 text-center text-red-100">
                <div className="text-[11px] uppercase tracking-[0.18em] text-red-100/70">Confidence</div>
                <div className="mt-2 text-4xl font-black">
                  {topRole?.match != null ? `${topRole.match}%` : "--"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoPill label="Education" value={prediction.extractedUser.educationLevel || "Not available"} />
              <InfoPill label="Experience" value={prediction.extractedUser.experienceLevel || "Not available"} />
              <InfoPill
                label="Years"
                value={`${prediction.extractedUser.yearsExperienceDisplay || "0"} year(s)`}
              />
              <InfoPill
                label="Resume File"
                value={prediction.fileName || "Resume"}
              />
            </div>
          </GlassCard>

          <div className="grid gap-6 xl:grid-cols-3">
            {prediction.jobMatches.slice(0, 3).map((role, index) => (
              <RoleCard key={`${role.role}-${index}`} role={role} index={index} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Target className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Role Reasoning</div>
                  <div className="theme-text-muted text-sm">Why this role is the strongest current match.</div>
                </div>
              </div>

              <div className="theme-shell-panel mt-5 rounded-[24px] border p-5 text-sm leading-7 theme-text-strong">
                {topRole?.summary || "No role reasoning is available yet."}
              </div>

              <div className="mt-5 grid gap-5">
                <ChipList
                  title="Focus Areas"
                  items={topRole?.focusAreas || []}
                  tone="red"
                  emptyText="No focus areas returned."
                />
                <ChipList
                  title="Extracted Skills"
                  items={prediction.extractedSkills || []}
                  tone="emerald"
                  emptyText="No extracted skills returned."
                />
                <ChipList
                  title="Overall Missing Skills"
                  items={prediction.missingSkills || []}
                  tone="amber"
                  emptyText="No major missing skills returned."
                />
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <BriefcaseBusiness className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Next Moves</div>
                  <div className="theme-text-muted text-sm">Practical steps to improve fit for the predicted role.</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(topRole?.improvementPlan || prediction.suggestions || []).slice(0, 5).map((item) => (
                  <div
                    key={`plan-${item}`}
                    className="theme-shell-panel rounded-[22px] border px-4 py-4 text-sm leading-7 theme-text-strong"
                  >
                    {item}
                  </div>
                ))}
                {!((topRole?.improvementPlan || prediction.suggestions || []).length) ? (
                  <div className="theme-shell-panel rounded-[22px] border px-4 py-4 text-sm theme-text-muted">
                    No improvement plan is available yet.
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                <ChipList
                  title="Career Recommendations"
                  items={topRole?.careerRecommendations || prediction.careerRecommendations || []}
                  emptyText="No career recommendations returned."
                />
              </div>

              {prediction.previewText ? (
                <div className="theme-shell-panel mt-5 rounded-[24px] border p-5">
                  <div className="theme-text-muted text-xs uppercase tracking-[0.18em]">Preview Text</div>
                  <div className="theme-text-strong mt-3 text-sm leading-7">
                    {prediction.previewText}
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <BadgeCheck className="h-5 w-5 theme-text-strong" />
              </div>
              <div>
                <div className="theme-text-strong text-lg font-semibold">Role Predictor Notes</div>
                <div className="theme-text-muted text-sm">
                  Role prediction is generated from the same underlying resume-analysis engine, so the output stays aligned with ATS score, extracted skills, and target-role fit.
                </div>
              </div>
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}

function formatTimestamp(value) {
  const parsedTime = new Date(value || "").getTime();
  if (Number.isNaN(parsedTime) || !parsedTime) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsedTime));
}
