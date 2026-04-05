import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { sidebarSections } from "../../data/workspaceData";

export default function Sidebar({ open, setOpen, collapsed = false, setCollapsed = () => undefined }) {
  const handleNavClick = () => {
    setOpen(false);
    setCollapsed(true);
  };

  const panel = (
    <div className="flex h-full flex-col rounded-[30px] border border-white/10 bg-black/35 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-red-200/70">LevelUp</div>
          <div className="mt-2 text-xl font-black text-white">AI Career OS</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="hidden rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white lg:inline-flex"
            onClick={() => setCollapsed(true)}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white lg:hidden" onClick={() => setOpen(false)} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {sidebarSections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">
              {section.title}
            </div>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.to === "/workspace"}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-gradient-to-r from-red-500/25 to-rose-400/15 text-white shadow-[0_10px_30px_rgba(239,68,68,0.18)]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 transition group-hover:scale-110" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-red-400/20 bg-gradient-to-br from-red-500/15 to-white/5 p-4">
        <div className="text-sm font-semibold text-white">Career Readiness AI</div>
        <p className="mt-2 text-xs leading-6 text-white/55">One dashboard for ATS scoring, role mapping, adaptive learning, tutoring, and AI guidance.</p>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-2xl border border-white/10 bg-black/40 p-3 text-white shadow-lg backdrop-blur lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-6 top-6 z-30 hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/45 text-white shadow-lg backdrop-blur transition hover:border-white/20 hover:bg-black/55 lg:inline-flex"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-5 w-5 text-red-100" />
        </button>
      ) : (
        <aside className="hidden lg:block lg:h-full lg:w-[290px] lg:shrink-0">{panel}</aside>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm lg:hidden"
          >
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              className="h-full w-[86%] max-w-[320px]"
            >
              {panel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
