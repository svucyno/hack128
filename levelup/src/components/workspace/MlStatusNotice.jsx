import { Cpu, TriangleAlert } from "lucide-react";

export default function MlStatusNotice({
  checked = false,
  online = false,
  serviceName = "ML service",
  error = "",
  offlineMessage = "",
  onlineMessage = "",
  className = "",
}) {
  if (!checked) {
    return null;
  }

  const isOnline = Boolean(online);
  const Icon = isOnline ? Cpu : TriangleAlert;
  const borderColor = isOnline ? "rgba(34,197,94,0.24)" : "rgba(250,204,21,0.24)";
  const background = isOnline ? "rgba(34,197,94,0.1)" : "rgba(250,204,21,0.1)";
  const iconColor = isOnline ? "#bbf7d0" : "#fef08a";
  const message = isOnline
    ? onlineMessage || `${serviceName} is online. ML-backed analysis is active.`
    : offlineMessage ||
      `${serviceName} is offline. The page will fall back to built-in logic until the service is available.`;
  const detail = !isOnline && error ? error : "";

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 text-sm ${className}`.trim()}
      style={{
        borderColor,
        background,
        color: "var(--theme-text-strong, var(--resume-text-soft, #f8fafc))",
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: iconColor }} />
        <div>
          <div className="font-semibold">{message}</div>
          {detail ? (
            <div
              className="mt-1 text-xs leading-6"
              style={{ color: "var(--theme-text-muted, var(--resume-text-muted, #cbd5e1))" }}
            >
              {detail}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
