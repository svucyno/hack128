import { Bell, Search, Sparkles } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";

export default function TopNavbar() {
  const user = useWorkspaceStore((state) => state.user);
  const notifications = useWorkspaceStore((state) => state.notifications);
  const searchQuery = useWorkspaceStore((state) => state.searchQuery);
  const setSearchQuery = useWorkspaceStore((state) => state.setSearchQuery);

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/25 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          placeholder="Search modules, insights, skills, or roles..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-white/75 transition hover:border-red-400/30 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {notifications}
          </span>
        </button>

        <div className="hidden items-center gap-2 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-100 sm:flex">
          <Sparkles className="h-4 w-4" />
          AI active
        </div>

        <ThemeToggle compact />

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-rose-400 text-sm font-black text-white">
            {user.avatar}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-white">{user.name}</div>
            <div className="text-xs text-white/45">{user.email || user.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
