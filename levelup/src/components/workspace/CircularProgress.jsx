import { motion } from "framer-motion";

export default function CircularProgress({ value, label, size = 140 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ringGradient">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-24 text-center">
        <div className="text-3xl font-black text-white">{value}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
      </div>
    </div>
  );
}
