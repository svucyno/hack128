import { motion } from "framer-motion";

export default function PageHeader({ eyebrow, title, description, aside }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="max-w-3xl">
        <div className="theme-badge inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
          {eyebrow}
        </div>
        <h1 className="theme-text-strong mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="theme-text-muted mt-3 max-w-2xl text-sm leading-7 sm:text-base">
          {description}
        </p>
      </div>
      {aside}
    </motion.div>
  );
}
