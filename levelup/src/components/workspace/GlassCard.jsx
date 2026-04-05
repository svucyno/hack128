import { cn } from "../../utils/cn";

export default function GlassCard({ className = "", children }) {
  return (
    <div
      className={cn(
        "theme-glass-card rounded-[28px] border shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
