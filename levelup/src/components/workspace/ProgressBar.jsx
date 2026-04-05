import { motion } from "framer-motion";

export default function ProgressBar({ value, tone = "from-red-500 to-rose-400" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7 }}
        className={`h-full rounded-full bg-gradient-to-r ${tone}`}
      />
    </div>
  );
}
