import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Download, ShieldCheck, Sparkles, Target } from "lucide-react";
import ATSScore from "./ATSScore";
import AnalysisSkeleton from "./AnalysisSkeleton";
import CareerCopilot from "./CareerCopilot";
import JobMatch from "./JobMatch";
import ResumeUpload from "./ResumeUpload";
import SkillTags from "./SkillTags";
import StrengthRadar from "./StrengthRadar";
import Suggestions from "./Suggestions";
import UserDetailsCard from "./UserDetailsCard";
import { analyzeResume } from "../utils/atsEngine";
import { parseResumeInput } from "../utils/resumeParser";

function EmptyState() {
  return (
    <motion.div
      className="glass-card flex min-h-[720px] flex-col justify-between p-6"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div>
        <span className="section-chip">AI Analysis Output</span>
        <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-ink">
          Recruiter-grade insights will appear here.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-muted">
          This panel becomes a live intelligence workspace once the resume is analyzed: ATS score, extracted profile data, job-role matches, skill gaps, radar chart, JD comparison, and an interactive career copilot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            icon: BrainCircuit,
            title: "ATS Engine",
            text: "Weighted scoring across keyword fit, skills, experience, formatting, education, and project impact.",
          },
          {
            icon: Target,
            title: "Role Matching",
            text: "Maps resume signals to predefined role profiles like software engineer, data analyst, and ML engineer.",
          },
          {
            icon: ShieldCheck,
            title: "Premium UX",
            text: "Futuristic glassmorphism cards, red-accent dark theme, motion transitions, and responsive layout.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-[26px] border border-white/8 bg-black/15 p-5"
          >
            <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
              <Icon size={18} />
            </div>
            <div className="font-heading text-lg font-semibold text-ink">{title}</div>
            <p className="mt-3 text-sm leading-7 text-ink-muted">{text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const [resumeFile, setResumeFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    if (!analysis) {
      return;
    }

    const { downloadAnalysisReport } = await import("../utils/reportExporter");
    downloadAnalysisReport(analysis);
  };

  useEffect(() => {
    if (!resumeFile || !resumeFile.name.toLowerCase().endsWith(".pdf")) {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(resumeFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [resumeFile]);

  const handleAnalyze = async () => {
    setError("");
    setIsAnalyzing(true);

    try {
      const startedAt = Date.now();
      const parsedResume = await parseResumeInput({
        file: resumeFile,
        manualText,
      });

      const report = analyzeResume({
        resumeText: parsedResume.text,
        jobDescription,
        fileName: parsedResume.fileName,
      });

      const elapsed = Date.now() - startedAt;
      const minimumDelay = 1200;

      if (elapsed < minimumDelay) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, minimumDelay - elapsed);
        });
      }

      setAnalysis(report);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Something went wrong while analyzing the resume.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
        <div className="absolute right-[-4rem] top-1/3 h-80 w-80 rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute bottom-[-5rem] left-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px]">
        <motion.div
          className="mb-6 flex flex-col gap-4 rounded-[30px] border border-white/8 bg-black/20 p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="section-chip">
                <Sparkles size={12} className="text-accent" />
                ResumeOS
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink-muted">
                Apple x ChatGPT x LinkedIn Premium
              </span>
            </div>
            <div className="font-heading text-2xl font-semibold text-ink sm:text-3xl">
              Advanced AI Resume Analyzer
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
              Upload a resume, compare it to a target role, and get a premium ATS dashboard with strengths, weaknesses, role-fit scoring, and a role-specific improvement plan.
            </p>
          </div>

          {analysis && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent-soft transition hover:border-accent/40 hover:bg-accent/15 hover:text-ink"
            >
              <Download size={16} />
              Download Report PDF
            </button>
          )}
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <ResumeUpload
            file={resumeFile}
            onFileChange={setResumeFile}
            manualText={manualText}
            onManualTextChange={setManualText}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            error={error}
            previewUrl={previewUrl}
          />

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AnalysisSkeleton />
                </motion.div>
              ) : analysis ? (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 2xl:grid-cols-[1.02fr_0.98fr]">
                    <UserDetailsCard
                      extractedUser={analysis.extractedUser}
                      strengths={analysis.strengths}
                    />
                    <ATSScore
                      score={analysis.atsScore}
                      scoreLabel={analysis.scoreLabel}
                      breakdown={analysis.breakdown}
                      whyScoreIsLow={analysis.whyScoreIsLow}
                      howToReachNinety={analysis.howToReachNinety}
                    />
                  </div>

                  <div className="grid gap-6 2xl:grid-cols-[1.02fr_0.98fr]">
                    <JobMatch matches={analysis.jobMatches} />
                    <StrengthRadar data={analysis.radarData} />
                  </div>

                  <SkillTags
                    skills={analysis.extractedSkills}
                    missingSkills={analysis.missingSkills}
                    topKeywords={analysis.topKeywords}
                  />

                  <Suggestions
                    suggestions={analysis.suggestions}
                    careerRecommendations={analysis.careerRecommendations}
                    jdComparison={analysis.jdComparison}
                    roleSpecificPlan={analysis.roleSpecificPlan}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CareerCopilot analysis={analysis} />
    </div>
  );
}

export default Dashboard;
