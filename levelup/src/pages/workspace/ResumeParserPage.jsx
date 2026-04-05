import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  BriefcaseBusiness,
  FileSearch,
  GraduationCap,
  LoaderCircle,
  ScanText,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { formatBytes, getDropzoneErrorMessage } from "../../lib/resumeAnalysis";
import { parseStructuredResume } from "../../resumeAI/utils/atsEngine";
import { parseResumeInput } from "../../resumeAI/utils/resumeParser";

function ParserSectionCard({
  icon: Icon,
  title,
  items,
  emptyLabel,
}) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon className="h-5 w-5 theme-text-strong" />
        </div>
        <div>
          <div className="theme-text-strong text-lg font-semibold">{title}</div>
          <div className="theme-text-muted text-sm">
            {items.length ? `${items.length} extracted item${items.length === 1 ? "" : "s"}` : emptyLabel}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item}
              className="theme-shell-panel rounded-[22px] border px-4 py-3 text-sm leading-6 theme-text-strong"
            >
              {item}
            </div>
          ))
        ) : (
          <div className="theme-shell-panel rounded-[22px] border px-4 py-3 text-sm theme-text-muted">
            {emptyLabel}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border px-4 py-3">
      <div className="theme-text-muted text-xs uppercase tracking-[0.24em]">{label}</div>
      <div className="theme-text-strong mt-2 text-sm font-semibold sm:text-base">{value}</div>
    </div>
  );
}

function formatSectionName(sectionName = "") {
  if (sectionName === "summary") {
    return "Summary";
  }

  if (sectionName === "experience") {
    return "Experience";
  }

  if (sectionName === "education") {
    return "Education";
  }

  if (sectionName === "skills") {
    return "Skills";
  }

  if (sectionName === "projects") {
    return "Projects";
  }

  return sectionName;
}

export default function ResumeParserPage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const hasReadyInput =
    activeTab === "upload" ? Boolean(resumeFile) : manualText.trim().length >= 30;

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

  const handleParseResume = async () => {
    setLoading(true);
    setError("");

    try {
      const parsedInput = await parseResumeInput({
        file: activeTab === "upload" ? resumeFile : null,
        manualText: activeTab === "paste" ? manualText : "",
      });

      const structuredResume = parseStructuredResume({
        resumeText: parsedInput.text,
        fileName: parsedInput.fileName,
      });

      setResult({
        ...structuredResume,
        previewText: parsedInput.previewText,
      });
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Resume parsing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resume Parser & Structured Profile Extraction"
        title="Turn resumes into structured profile data."
        description="Upload a PDF or DOCX resume, or paste the raw text, and extract candidate details, skills, education, projects, and experience into a readable structured profile."
      />

      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "upload"
                    ? "theme-shell-panel theme-text-strong border"
                    : "theme-text-muted opacity-75 hover:opacity-100"
                }`}
              >
                Upload Resume
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "paste"
                    ? "theme-shell-panel theme-text-strong border"
                    : "theme-text-muted opacity-75 hover:opacity-100"
                }`}
              >
                Paste Text
              </button>
            </div>

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
                <div className="mt-5 theme-text-strong text-xl font-semibold">
                  Drop your resume here or click to browse
                </div>
                <div className="theme-text-muted mt-2 text-sm">
                  PDF, DOC, or DOCX up to 5 MB
                </div>
                {resumeFile ? (
                  <div className="mt-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
                    {resumeFile.name} • {formatBytes(resumeFile.size)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="theme-shell-panel rounded-[28px] border p-5">
                <label htmlFor="resume-parser-manual" className="theme-text-muted text-xs uppercase tracking-[0.24em]">
                  Resume Text
                </label>
                <textarea
                  id="resume-parser-manual"
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
                <div className="theme-text-muted mt-3 text-xs">
                  Paste enough text for the parser to detect sections, skills, education, projects, and experience.
                </div>
              </div>
            )}

            {error ? (
              <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleParseResume}
              disabled={!hasReadyInput || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Parsing Resume
                </>
              ) : (
                <>
                  <ScanText className="h-4 w-4" />
                  Parse Resume
                </>
              )}
            </button>
          </div>

          <div className="theme-shell-panel rounded-[28px] border p-6">
            <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
              Parsing Output
            </div>
            <div className="theme-text-strong mt-4 text-2xl font-black">
              {result ? result.fileName : "No parsed resume yet"}
            </div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              {result
                ? "Structured resume data is ready below. You can inspect extracted sections and verify what the parser recognized."
                : "Once you parse a resume, this panel will show the file name, word count, and detected sections."}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProfileField
                label="Words"
                value={result ? `${result.resumeWordCount} words` : "Waiting"}
              />
              <ProfileField
                label="Detected"
                value={
                  result?.metadata?.detectedSections?.length
                    ? `${result.metadata.detectedSections.length} sections`
                    : "Waiting"
                }
              />
            </div>

            <div className="mt-6">
              <div className="theme-text-muted text-xs uppercase tracking-[0.24em]">
                Detected Sections
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result?.metadata?.detectedSections?.length ? (
                  result.metadata.detectedSections.map((sectionName) => (
                    <div
                      key={sectionName}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-strong"
                    >
                      {formatSectionName(sectionName)}
                    </div>
                  ))
                ) : (
                  <div className="theme-text-muted text-sm">No sections parsed yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <LoaderCircle className="h-7 w-7 animate-spin theme-text-strong" />
            </div>
            <div>
              <div className="theme-text-strong text-xl font-semibold">Parsing resume structure...</div>
              <div className="theme-text-muted mt-2 text-sm">
                Extracting candidate details, section headers, education, projects, experience, and skills.
              </div>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {result ? (
        <>
          <GlassCard className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Parsed Candidate
                </div>
                <div className="theme-text-strong mt-4 text-3xl font-black">
                  {result.extractedUser.name}
                </div>
                <div className="theme-text-muted mt-2 text-sm">
                  Parser output from {result.fileName}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.topKeywords.slice(0, 8).map((keyword) => (
                  <div
                    key={keyword}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-strong"
                  >
                    {keyword}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ProfileField label="Email" value={result.extractedUser.email} />
              <ProfileField label="Phone" value={result.extractedUser.phone} />
              <ProfileField
                label="Experience"
                value={`${result.extractedUser.experienceLevel} • ${result.extractedUser.yearsExperienceDisplay} year(s)`}
              />
              <ProfileField label="Education" value={result.extractedUser.educationLevel} />
            </div>

            <div className="theme-shell-panel mt-6 rounded-[24px] border p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 theme-text-strong" />
                <div>
                  <div className="theme-text-strong font-semibold">Parser Notes</div>
                  <div className="theme-text-muted mt-2 text-sm leading-7">
                    {result.extractedUser.experienceNote}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <ParserSectionCard
              icon={FileSearch}
              title="Skills"
              items={result.extractedSkills}
              emptyLabel="No skills were extracted from the current resume text."
            />
            <ParserSectionCard
              icon={GraduationCap}
              title="Education"
              items={result.sections.education}
              emptyLabel="No education section was detected."
            />
            <ParserSectionCard
              icon={BriefcaseBusiness}
              title="Experience"
              items={result.sections.experience}
              emptyLabel="No experience section was detected."
            />
            <ParserSectionCard
              icon={UserRound}
              title="Projects"
              items={result.sections.projects}
              emptyLabel="No project section was detected."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <ParserSectionCard
              icon={Sparkles}
              title="Summary"
              items={result.sections.summary}
              emptyLabel="No dedicated profile summary was detected."
            />
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <ScanText className="h-5 w-5 theme-text-strong" />
                </div>
                <div>
                  <div className="theme-text-strong text-lg font-semibold">Preview Text</div>
                  <div className="theme-text-muted text-sm">
                    First 600 characters of the parsed resume text
                  </div>
                </div>
              </div>
              <div className="theme-shell-panel mt-5 rounded-[24px] border p-5 text-sm leading-7 theme-text-strong">
                {result.previewText || "No preview available."}
              </div>
            </GlassCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
