import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import GlassCard from "./GlassCard";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";

export default function UploadZone({ title, subtitle, storageKey = "default" }) {
  const file = useWorkspaceStore((state) => state.uploadedFiles[storageKey]);
  const processing = useWorkspaceStore((state) => state.processing[storageKey]);
  const setUploadedFile = useWorkspaceStore((state) => state.setUploadedFile);
  const setProcessing = useWorkspaceStore((state) => state.setProcessing);
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles?.[0]) {
        setUploadedFile(storageKey, acceptedFiles[0]);
        setProcessing(storageKey, true);
        window.setTimeout(() => setProcessing(storageKey, false), 1400);
      }
    },
    [setProcessing, setUploadedFile, storageKey]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  return (
    <GlassCard
      className={`group flex min-h-52 cursor-pointer flex-col items-center justify-center gap-4 border-dashed p-8 text-center transition duration-300 hover:-translate-y-1 hover:border-red-400/30 hover:bg-white/[0.07] ${
        isDragActive ? "border-red-400/50 bg-red-500/10" : ""
      }`}
    >
      <div {...getRootProps()} className="flex w-full flex-col items-center gap-4">
        <input {...getInputProps()} />
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
        <UploadCloud className="h-8 w-8" />
      </div>
      <div>
        <div className="text-lg font-semibold text-white">{title}</div>
        <div className="mt-2 text-sm text-white/55">{subtitle}</div>
        {file && <div className="mt-3 text-xs font-medium text-red-100">{file.name}</div>}
        {processing && <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">Processing...</div>}
      </div>
      <button className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-red-400/30 hover:bg-red-500/15">
        Browse files
      </button>
      </div>
    </GlassCard>
  );
}
