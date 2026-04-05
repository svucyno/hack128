import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowRight,
  Clipboard,
  FileUp,
  LoaderCircle,
  RefreshCcw,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";
import { push, ref, serverTimestamp, set, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  ATS_WORKFLOW_STEPS,
  RESUME_PROCESSING_STEPS,
  buildHistorySnapshot,
  buildOverviewPayload,
  buildResumeDraftPayload,
  countWords,
  formatBytes,
  getDropzoneErrorMessage,
  hydrateAnalysisWithAiInsights,
} from "../../lib/resumeAnalysis";
import { isResumeOwnedByLoggedInUser } from "../../lib/resumeIdentity";
import { postServerJson } from "../../lib/serverApi";
import { saveResumeWorkspaceState, toFileMetadata } from "../../lib/userData";
import { analyzeResume } from "../../resumeAI/utils/atsEngine";
import { parseResumeInput } from "../../resumeAI/utils/resumeParser";

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const user = useWorkspaceStore((state) => state.user);
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const savedResumeWorkspace = profile?.resumeWorkspace || null;
  const accountName = profile?.name || user.name || "";

  const [activeTab, setActiveTab] = useState("upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [savedDraftFileMeta, setSavedDraftFileMeta] = useState(null);
  const [manualText, setManualText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const hydratedRef = useRef(false);
  const lastDraftRef = useRef("");

  const latestAnalysis = savedResumeWorkspace?.latestAnalysis || null;
  const hasLatestReport = Boolean(latestAnalysis?.report);
  const latestReportTimestamp = latestAnalysis?.context?.analyzedAt || "";
  const hasUploadInput = Boolean(resumeFile);
  const hasPasteInput = Boolean(manualText.trim());
  const hasInput = activeTab === "upload" ? hasUploadInput : hasPasteInput;

  useEffect(() => {
    if (hydratedRef.current || !savedResumeWorkspace) {
      return;
    }

    const nextManualText = savedResumeWorkspace.manualText || "";
    const nextJobDescription = savedResumeWorkspace.jobDescription || "";
    const nextSavedFileMeta = savedResumeWorkspace.selectedFile || null;
    const nextInputMode =
      savedResumeWorkspace.inputMode === "manual" || nextManualText.trim()
        ? "paste"
        : "upload";

    setActiveTab(nextInputMode);
    setManualText(nextManualText);
    setJobDescription(nextJobDescription);
    setSavedDraftFileMeta(nextSavedFileMeta);

    lastDraftRef.current = JSON.stringify(
      buildResumeDraftPayload({
        inputMode: nextInputMode === "paste" ? "manual" : "file",
        manualText: nextManualText,
        jobDescription: nextJobDescription,
        resumeFile: null,
        savedDraftFileMeta: nextSavedFileMeta,
      }),
    );
    hydratedRef.current = true;
  }, [savedResumeWorkspace]);

  useEffect(() => {
    if (!profileReady || hydratedRef.current) {
      return;
    }

    lastDraftRef.current = JSON.stringify(
      buildResumeDraftPayload({
        inputMode: activeTab === "paste" ? "manual" : "file",
        manualText,
        jobDescription,
        resumeFile,
        savedDraftFileMeta,
      }),
    );
    hydratedRef.current = true;
  }, [activeTab, jobDescription, manualText, profileReady, resumeFile, savedDraftFileMeta]);

  useEffect(() => {
    if (!profileReady || !user.uid || !hydratedRef.current) {
      return;
    }

    const payload = buildResumeDraftPayload({
      inputMode: activeTab === "paste" ? "manual" : "file",
      manualText,
      jobDescription,
      resumeFile,
      savedDraftFileMeta,
    });
    const serializedPayload = JSON.stringify(payload);

    if (serializedPayload === lastDraftRef.current) {
      return;
    }

    lastDraftRef.current = serializedPayload;
    void saveResumeWorkspaceState(user.uid, payload);
  }, [
    activeTab,
    jobDescription,
    manualText,
    profileReady,
    resumeFile,
    savedDraftFileMeta,
    user.uid,
  ]);

  useEffect(() => {
    if (!loading) {
      setProcessingStepIndex(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setProcessingStepIndex((current) =>
        current === RESUME_PROCESSING_STEPS.length - 1 ? current : current + 1,
      );
    }, 850);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  const persistResumeOverview = async (payload, swallowErrors = false) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    try {
      await update(ref(db, `users/${currentUser.uid}/resumeOverview`), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (persistError) {
      console.error("Resume overview sync error:", persistError);
      if (!swallowErrors) {
        throw persistError;
      }
      return false;
    }
  };

  const saveAnalysisSnapshot = async ({
    report,
    parsed,
    source,
    selectedFile,
    identityMatched,
  }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const snapshotRef = push(ref(db, `users/${currentUser.uid}/resumeAnalyses`));
    const historyId = snapshotRef.key || "";
    const context = {
      source,
      fileName: parsed.fileName,
      analyzedAt: new Date().toISOString(),
      historyId,
      jobDescription: jobDescription.trim(),
    };

    await Promise.all([
      set(
        snapshotRef,
        buildHistorySnapshot({
          report,
          parsed,
          source,
          selectedFile,
          identityMatched,
          jobDescription,
        }),
      ),
      persistResumeOverview(
        buildOverviewPayload({
          report,
          parsed,
          source,
          identityMatched,
        }),
      ),
      saveResumeWorkspaceState(currentUser.uid, {
        ...buildResumeDraftPayload({
          inputMode: source === "manual" ? "manual" : "file",
          manualText: source === "manual" ? parsed.text : manualText,
          jobDescription,
          resumeFile: source === "upload" ? resumeFile : null,
          savedDraftFileMeta: source === "upload" ? savedDraftFileMeta : null,
        }),
        latestAnalysis: {
          historyId,
          rawResumeText: parsed.text,
          report,
          context,
        },
      }),
    ]);

    return context;
  };

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
    onDropAccepted: async (acceptedFiles) => {
      const nextFile = acceptedFiles?.[0];
      if (!nextFile) {
        return;
      }

      setActiveTab("upload");
      setResumeFile(nextFile);
      setSavedDraftFileMeta(null);
      setError("");
      setWarning("");

      await persistResumeOverview(
        {
          latestResumeFileName: nextFile.name,
          source: "upload",
          status: "uploaded",
          uploadedAt: serverTimestamp(),
        },
        true,
      );
    },
    onDropRejected: (fileRejections) => {
      setError(getDropzoneErrorMessage(fileRejections));
    },
  });

  const handleAnalyze = async () => {
    if (!hasInput) {
      setError(
        activeTab === "upload"
          ? "Upload a resume before running analysis."
          : "Paste the resume text before running analysis.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");

    try {
      const usingUpload = activeTab === "upload";
      const parsed = await parseResumeInput({
        file: usingUpload ? resumeFile : null,
        manualText: usingUpload ? "" : manualText,
      });
      const source = usingUpload ? "upload" : "manual";
      const selectedFile = usingUpload ? toFileMetadata(resumeFile) : null;
      const baseContext = {
        source,
        fileName: parsed.fileName,
        analyzedAt: new Date().toISOString(),
        historyId: "",
        jobDescription: jobDescription.trim(),
      };

      const localReport = analyzeResume({
        resumeText: parsed.text,
        jobDescription,
        fileName: parsed.fileName,
      });

      let report = hydrateAnalysisWithAiInsights(localReport, baseContext);
      let runtimeWarning = "";

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const response = await postServerJson("/resume-analyzer/analyze", {
            token,
            body: {
              resumeText: parsed.text,
              jobDescription,
              fileName: parsed.fileName,
            },
          });

          if (response?.report && typeof response.report === "object") {
            report = hydrateAnalysisWithAiInsights(response.report, baseContext);
          }

          if (response?.warning) {
            runtimeWarning = response.warning;
          }
        } catch (serverError) {
          console.error("Gemini resume analysis error:", serverError);
          runtimeWarning = mergeWarnings(
            runtimeWarning,
            serverError instanceof Error
              ? `${serverError.message} Using the built-in ATS engine for this run.`
              : "Gemini enhancement was unavailable. Using the built-in ATS engine for this run.",
          );
        }
      } else {
        runtimeWarning = mergeWarnings(
          runtimeWarning,
          "Sign in to use Gemini enhancement. The current report uses the built-in ATS engine only.",
        );
      }

      const identityMatched = isResumeOwnedByLoggedInUser(
        accountName,
        report.extractedUser.name,
      );

      let nextContext = baseContext;
      try {
        const savedContext = await saveAnalysisSnapshot({
          report,
          parsed,
          source,
          selectedFile,
          identityMatched,
        });

        if (savedContext) {
          nextContext = savedContext;
        }
      } catch (persistError) {
        console.error("Analysis snapshot save error:", persistError);
        runtimeWarning = mergeWarnings(
          runtimeWarning,
          "Analysis completed, but the report could not be saved to Firebase.",
        );
      }

      navigate("/workspace/resume-analyzer/results", {
        state: {
          report,
          context: nextContext,
          rawResumeText: parsed.text,
          warning: runtimeWarning,
        },
      });
    } catch (analysisError) {
      setError(
        analysisError instanceof Error ? analysisError.message : "Analysis failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveTab("upload");
    setResumeFile(null);
    setSavedDraftFileMeta(null);
    setManualText("");
    setJobDescription("");
    setError("");
    setWarning("");
  };

  const handleOpenLatestReport = () => {
    if (!hasLatestReport) {
      return;
    }

    navigate("/workspace/resume-analyzer/results", {
      state: {
        report: latestAnalysis.report,
        context: latestAnalysis.context || null,
        rawResumeText: latestAnalysis.rawResumeText || "",
      },
    });
  };

  return (
    <div className="resume-page resume-font-body rounded-[32px] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="resume-fade-up text-center">
          <div className="resume-badge mx-auto">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered
          </div>
          <h1 className="resume-font-display mt-5 text-4xl font-bold sm:text-5xl">
            Resume Analyzer
          </h1>
          <p
            className="mx-auto mt-3 max-w-2xl text-base leading-7"
            style={{ color: "var(--resume-text-muted)" }}
          >
            Upload a file or paste your resume, add a target job description, and
            open the complete ATS dashboard on the next page.
          </p>
        </div>

        <div className="resume-card resume-fade-up resume-stagger-1 mt-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--resume-text-soft)" }}
              >
                Resume input
              </div>
              <div
                className="mt-1 text-sm leading-6"
                style={{ color: "var(--resume-text-muted)" }}
              >
                Choose one active source using the tabs below.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasLatestReport ? (
                <button
                  type="button"
                  onClick={handleOpenLatestReport}
                  className="resume-ghost-button"
                >
                  <ArrowRight className="h-4 w-4" />
                  Open Latest Report
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleReset}
                className="resume-ghost-button"
              >
                <RefreshCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: "var(--resume-text-soft)" }}
            >
              Job Description{" "}
              <span style={{ color: "var(--resume-text-muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                setError("");
              }}
              rows={4}
              className="resume-input min-h-28 px-4 py-3 text-sm leading-7"
              placeholder="Paste the target job description here for tailored analysis..."
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-[20px] p-1 resume-card-soft">
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setError("");
              }}
              className={`resume-tab ${activeTab === "upload" ? "resume-tab--active" : ""}`}
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("paste");
                setError("");
              }}
              className={`resume-tab ${activeTab === "paste" ? "resume-tab--active" : ""}`}
            >
              <Clipboard className="h-4 w-4" />
              Paste Text
            </button>
          </div>

          {activeTab === "upload" ? (
            <div className="mt-5">
              <div
                {...dropzone.getRootProps()}
                className={`resume-dropzone ${dropzone.isDragActive ? "resume-dropzone--active" : ""}`}
              >
                <input {...dropzone.getInputProps()} />
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(124,106,239,0.12)" }}
                >
                  <FileUp className="h-7 w-7" style={{ color: "var(--resume-primary)" }} />
                </div>
                <div className="mt-5 text-lg font-semibold" style={{ color: "var(--resume-text-soft)" }}>
                  {resumeFile ? resumeFile.name : "Drop your resume here or click to browse"}
                </div>
                <div className="mt-2 text-sm" style={{ color: "var(--resume-text-muted)" }}>
                  Supports PDF, DOC, DOCX up to 5MB
                </div>
              </div>

              <div className="resume-card-soft mt-4 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                      {resumeFile?.name || savedDraftFileMeta?.name || "No file selected yet"}
                    </div>
                    <div className="mt-2 text-sm leading-6" style={{ color: "var(--resume-text-muted)" }}>
                      {resumeFile
                        ? `${formatBytes(resumeFile.size)} ready to analyze.`
                        : savedDraftFileMeta?.name
                          ? "A previous file reference is saved. Re-upload the file on this device to analyze it again."
                          : "Upload a resume file to continue."}
                    </div>
                  </div>
                  {resumeFile ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setResumeFile(null);
                      }}
                      className="resume-ghost-button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <textarea
                value={manualText}
                onChange={(event) => {
                  setManualText(event.target.value);
                  setError("");
                }}
                rows={10}
                className="resume-input min-h-[260px] px-4 py-4 text-sm leading-7"
                placeholder="Paste your full resume text here..."
              />
              <div
                className="mt-3 text-right text-xs uppercase tracking-[0.18em]"
                style={{ color: "var(--resume-text-muted)" }}
              >
                {countWords(manualText)} words
              </div>
            </div>
          )}

          {error ? (
            <div className="resume-alert resume-alert--danger mt-5">{error}</div>
          ) : null}

          {warning ? (
            <div className="resume-alert resume-alert--warning mt-5">{warning}</div>
          ) : null}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!hasInput || loading}
            className="resume-primary-button mt-6 w-full justify-center"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ScanSearch className="h-4 w-4" />
            )}
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>

          <div
            className="mt-3 text-center text-xs"
            style={{ color: "var(--resume-text-muted)" }}
          >
            Your latest report is saved to your workspace so you can reopen it later.
          </div>

          {hasLatestReport ? (
            <div
              className="mt-4 text-center text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--resume-text-muted)" }}
            >
              Last report: {formatDateTime(latestReportTimestamp)}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="resume-card resume-fade-up resume-stagger-2 mt-6 p-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(124,106,239,0.12)" }}
              >
                <LoaderCircle
                  className="h-5 w-5 animate-spin"
                  style={{ color: "var(--resume-primary)" }}
                />
              </div>
              <div>
                <div className="text-lg font-semibold" style={{ color: "var(--resume-text-soft)" }}>
                  AI analyzing your resume...
                </div>
                <div className="mt-1 text-sm" style={{ color: "var(--resume-text-muted)" }}>
                  Parsing, matching, scoring, and generating improvements.
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {RESUME_PROCESSING_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`resume-step-card ${index <= processingStepIndex ? "resume-step-card--active" : ""}`}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "var(--resume-text-muted)" }}
                  >
                    Step {index + 1}
                  </div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: "var(--resume-text)" }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="resume-card resume-fade-up resume-stagger-3 mt-6 p-6 sm:p-8">
          <div className="resume-badge">
            <Sparkles className="h-3.5 w-3.5" />
            Flow
          </div>
          <h2 className="resume-font-display mt-4 text-3xl font-bold">
            Input to result page
          </h2>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
            The first page collects the resume and job description. After analysis,
            the detailed ATS report opens on a separate screen.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ATS_WORKFLOW_STEPS.map((step, index) => (
              <div key={step.title} className="resume-card-soft p-4">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: "var(--resume-primary)" }}
                >
                  Step {index + 1}
                </div>
                <div className="mt-3 text-base font-semibold" style={{ color: "var(--resume-text-soft)" }}>
                  {step.title}
                </div>
                <div className="mt-2 text-sm leading-7" style={{ color: "var(--resume-text-muted)" }}>
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function mergeWarnings(currentWarning, nextWarning) {
  const messages = [currentWarning, nextWarning].filter(Boolean);
  return Array.from(new Set(messages)).join(" ");
}
