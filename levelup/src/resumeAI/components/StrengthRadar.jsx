import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

function StrengthRadar({ data }) {
  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.06 }}
    >
      <span className="section-chip">Strength Radar</span>
      <h2 className="mt-3 font-heading text-xl font-semibold text-ink">
        Resume strength map
      </h2>
      <div className="mt-4 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#9aa0b4", fontSize: 12 }}
            />
            <Radar
              name="ATS"
              dataKey="value"
              stroke="#ff4d57"
              fill="#ff4d57"
              fillOpacity={0.28}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default StrengthRadar;
