import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ScanSearch,
  UploadCloud,
} from "lucide-react";

function formatBytes(bytes = 0) {
  if (!bytes) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function ResumeUpload({
  file,
  onFileChange,
  manualText,
  onManualTextChange,
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  error,
  previewUrl,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFilePick = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    onFileChange(selectedFile);
  };

  return (
    <motion.div
      className="glass-card sticky top-6 p-6"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-6">
        <span className="section-chip">Resume Input</span>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          AI-powered resume review with premium ATS scoring.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-ink-muted">
          Upload a PDF or DOC file, compare it against a job description, and get a recruiter-style breakdown with job-role matching, skill gaps, and actionable fixes.
        </p>
      </div>

      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFilePick(event.dataTransfer.files?.[0]);
        }}
        className={`group relative mb-5 flex min-h-[220px] w-full flex-col items-center justify-center rounded-[30px] border border-dashed px-6 py-8 text-center transition duration-300 ${
          isDragging
            ? "border-accent/80 bg-accent/10"
            : "border-white/15 bg-black/20 hover:border-accent/40 hover:bg-black/25"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,77,87,0.18),transparent_40%)] opacity-80" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 text-accent transition group-hover:scale-105">
            <UploadCloud size={28} />
          </div>
          <div className="font-heading text-xl font-semibold text-ink">
            Drag & drop your resume
          </div>
          <div className="mt-2 text-sm text-ink-muted">
            Supports PDF, DOC, and DOCX. Best extraction quality comes from PDF or DOCX.
          </div>
          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
            Drop file here or browse
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => handleFilePick(event.target.files?.[0])}
        />
      </motion.button>

      <div className="mb-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText size={16} className="text-accent" />
            Uploaded file preview
          </div>
          {file ? (
            <>
              <div className="mb-3 rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-sm font-semibold text-ink">{file.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                  {formatBytes(file.size)}
                </div>
              </div>
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="Resume PDF preview"
                  className="h-56 w-full rounded-2xl border border-white/8 bg-black/30"
                />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-2xl border border-white/8 bg-black/25 text-center">
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent">
                      <FileSpreadsheet size={20} />
                    </div>
                    <p className="text-sm text-ink-muted">
                      Document preview is optimized for PDFs.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : manualText.trim() ? (
            <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm leading-7 text-ink-muted">
              Manual resume text is ready for analysis.
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-white/8 bg-black/25 text-center">
              <div>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent">
                  <UploadCloud size={20} />
                </div>
                <p className="text-sm text-ink-muted">
                  Upload a resume or paste text to start the analysis.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
            <div className="mb-3 text-sm font-semibold text-ink">
              Paste resume text manually
            </div>
            <textarea
              rows={7}
              value={manualText}
              onChange={(event) => onManualTextChange(event.target.value)}
              className="input-shell min-h-[176px] resize-none"
              placeholder="Paste your resume text here if you prefer manual input or your DOC file doesn't parse cleanly..."
            />
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
            <div className="mb-3 text-sm font-semibold text-ink">
              Compare against a job description
            </div>
            <textarea
              rows={7}
              value={jobDescription}
              onChange={(event) => onJobDescriptionChange(event.target.value)}
              className="input-shell min-h-[176px] resize-none"
              placeholder="Paste a target job description to unlock keyword matching and JD comparison..."
            />
          </div>
        </div>
      </div>

      {!file && !manualText.trim() && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            "Auto extract name, contact info, and experience level",
            "Generate ATS score with detailed breakdown",
            "Match top job roles and show skill gaps",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-ink-muted"
            >
              {item}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-[#ff5f56]/20 bg-[#ff5f56]/10 px-4 py-3 text-sm text-[#ff9891]">
          {error}
        </div>
      )}

      <motion.button
        type="button"
        onClick={onAnalyze}
        disabled={isAnalyzing}
        whileHover={!isAnalyzing ? { scale: 1.01 } : undefined}
        whileTap={!isAnalyzing ? { scale: 0.99 } : undefined}
        className="animate-glow flex w-full items-center justify-center gap-3 rounded-[24px] border border-accent/30 bg-gradient-to-r from-accent to-[#ff6972] px-5 py-4 font-semibold text-canvas shadow-glow transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isAnalyzing ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            AI thinking...
          </>
        ) : (
          <>
            <ScanSearch size={18} />
            Analyze Resume
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

export default ResumeUpload;
