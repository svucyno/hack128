import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Flame,
  NotebookPen,
  Plus,
  Trash2,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { cn } from "../../utils/cn";

const DAYS = [
  { short: "Mon", label: "Monday" },
  { short: "Tue", label: "Tuesday" },
  { short: "Wed", label: "Wednesday" },
  { short: "Thu", label: "Thursday" },
  { short: "Fri", label: "Friday" },
  { short: "Sat", label: "Saturday" },
  { short: "Sun", label: "Sunday" },
];

const DAY_HEADER_STYLES = {
  Monday: "bg-[#83ead4]",
  Tuesday: "bg-[#95ebe6]",
  Wednesday: "bg-[#c7f5ed]",
  Thursday: "bg-[#eee6f7]",
  Friday: "bg-[#f6d3df]",
  Saturday: "bg-[#f6dccf]",
  Sunday: "bg-[#f7e5c3]",
};

const TIME_BLOCKS = [
  {
    key: "morning",
    label: "Morning",
    range: "08:00 - 11:59",
    start: 8 * 60,
    end: 11 * 60 + 59,
    tone: "bg-[#98ecd7]",
  },
  {
    key: "midday",
    label: "Midday",
    range: "12:00 - 14:59",
    start: 12 * 60,
    end: 14 * 60 + 59,
    tone: "bg-[#bdeef1]",
  },
  {
    key: "afternoon",
    label: "Afternoon",
    range: "15:00 - 17:59",
    start: 15 * 60,
    end: 17 * 60 + 59,
    tone: "bg-[#e8dff4]",
  },
  {
    key: "evening",
    label: "Evening",
    range: "18:00 - 21:59",
    start: 18 * 60,
    end: 21 * 60 + 59,
    tone: "bg-[#f6d8da]",
  },
];

const TASK_TONES = [
  "border-[#d5c65d] bg-[#f7e66f] text-slate-900 shadow-[0_8px_16px_rgba(163,135,0,0.14)]",
  "border-[#efcf79] bg-[#ffe78e] text-slate-900 shadow-[0_8px_16px_rgba(184,134,11,0.14)]",
  "border-[#d6cb68] bg-[#f9eb7b] text-slate-900 shadow-[0_8px_16px_rgba(163,135,0,0.13)]",
  "border-[#d4c15d] bg-[#f5df65] text-slate-900 shadow-[0_8px_16px_rgba(163,135,0,0.12)]",
  "border-[#e0cf76] bg-[#ffef9d] text-slate-900 shadow-[0_8px_16px_rgba(184,134,11,0.12)]",
];

const SUGGESTED_TASKS = [
  {
    title: "Resume headline",
    note: "Match it to product and frontend roles.",
    day: "Monday",
    time: "09:00",
  },
  {
    title: "Project metrics",
    note: "Add numbers to project bullets and outcomes.",
    day: "Tuesday",
    time: "12:30",
  },
  {
    title: "DBMS revision",
    note: "Review normalization, joins, and transactions.",
    day: "Wednesday",
    time: "16:00",
  },
  {
    title: "Apply to roles",
    note: "Customize keywords before sending applications.",
    day: "Friday",
    time: "10:00",
  },
];

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="theme-shell-panel rounded-[24px] border p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] theme-text-muted">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="theme-text-strong mt-3 text-2xl font-black">{value}</div>
    </div>
  );
}

function InputField({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7f715c]">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function LearningRoadmapPage() {
  const calendarTasks = useWorkspaceStore((state) => state.calendarTasks);
  const setCalendarTasks = useWorkspaceStore((state) => state.setCalendarTasks);

  const [form, setForm] = useState({
    title: "",
    note: "",
    day: getCurrentDayLabel(),
    time: "09:00",
  });
  const [error, setError] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [dropTarget, setDropTarget] = useState(null);

  const tasks = sanitizeTasks(calendarTasks);
  const totalTasks = tasks.length;
  const busiestDay = getBusiestDay(tasks);
  const tasksByBlock = buildTaskMatrix(tasks);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddTask = () => {
    const title = form.title.trim();
    const note = form.note.trim();
    const day = form.day.trim();
    const time = form.time.trim();

    if (!title) {
      setError("Enter a task title before adding it to the calendar.");
      return;
    }

    if (!day || !time) {
      setError("Choose a valid day and time.");
      return;
    }

    const nextTask = {
      id: createTaskId(),
      title,
      note,
      day,
      time,
      createdAtIso: new Date().toISOString(),
    };

    setCalendarTasks(
      sanitizeTasks([...tasks, nextTask]).sort(compareTasks),
    );
    setForm((current) => ({
      ...current,
      title: "",
      note: "",
      time: current.time,
    }));
    setError("");
  };

  const handleDeleteTask = (taskId) => {
    setCalendarTasks(tasks.filter((task) => task.id !== taskId));
  };

  const handleTaskDrop = (day, blockKey) => {
    if (!draggingTaskId) {
      setDropTarget(null);
      return;
    }

    setCalendarTasks(
      tasks
        .map((task) =>
          task.id === draggingTaskId
            ? {
                ...task,
                day,
                time: getMovedTaskTime(task.time, blockKey),
              }
            : task,
        )
        .sort(compareTasks),
    );
    setDraggingTaskId("");
    setDropTarget(null);
  };

  const handleApplySuggestion = (suggestion) => {
    setForm({
      title: suggestion.title,
      note: suggestion.note,
      day: suggestion.day,
      time: suggestion.time,
    });
    setError("");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Weekly Matrix Board"
        title="Task Calendar"
        description="Add tasks on the right. They will appear in the matching day and time block like pinned notes."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Total Tasks" value={String(totalTasks)} icon={CalendarDays} />
            <SummaryCard label="Busiest Day" value={busiestDay} icon={Flame} />
            <SummaryCard label="View" value="Weekly" icon={Clock3} />
          </div>

          <GlassCard className="overflow-hidden p-4 sm:p-5">
            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="overflow-hidden rounded-[26px] border-2 border-[#4da1c7] bg-[#fbf8f0] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                  <div className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))]">
                    <div className="border-r border-[#c6d7dd] bg-[#111a24] px-5 py-6">
                      <div className="mx-auto flex h-full max-w-[118px] items-center justify-center rounded-[8px] border border-white/10 bg-[#fff9eb] px-4 py-4 text-center shadow-[0_6px_14px_rgba(0,0,0,0.18)]">
                        <div className="text-[1.02rem] font-black leading-5 text-slate-900">
                          Tasks and schedule
                        </div>
                      </div>
                    </div>

                    {DAYS.map((day) => (
                      <div
                        key={day.label}
                        className={cn(
                          "border-l border-[#c6d7dd] px-4 py-4",
                          DAY_HEADER_STYLES[day.label],
                        )}
                      >
                        <div className="mx-auto flex h-full max-w-[116px] flex-col justify-center rounded-[8px] border border-[#b8b09d] bg-[#fffaf0] px-4 py-3 text-center shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
                          <div className="text-[1rem] font-black text-slate-900">{day.short}</div>
                          <div className="mt-1 text-xs text-slate-500">{day.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {TIME_BLOCKS.map((block, blockIndex) => (
                    <div
                      key={block.key}
                      className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))]"
                    >
                      <div
                        className={cn(
                          "border-r border-t border-[#c6d7dd] px-5 py-5",
                          block.tone,
                        )}
                      >
                        <div className="mx-auto flex min-h-[142px] max-w-[118px] flex-col justify-center rounded-[8px] border border-[#b8b09d] bg-[#fffaf0] px-4 py-4 text-center shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
                          <div className="text-[1rem] font-black text-slate-900">{block.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{block.range}</div>
                        </div>
                      </div>

                      {DAYS.map((day, dayIndex) => {
                        const cellTasks = tasksByBlock[day.label]?.[block.key] || [];

                        return (
                          <div
                            key={`${day.label}-${block.key}`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (
                                !dropTarget ||
                                dropTarget.day !== day.label ||
                                dropTarget.blockKey !== block.key
                              ) {
                                setDropTarget({ day: day.label, blockKey: block.key });
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleTaskDrop(day.label, block.key);
                            }}
                            className={cn(
                              "min-h-[182px] border-l border-t border-[#d8ddd8] bg-[#fffdf8] px-3 py-3 transition",
                              dropTarget?.day === day.label && dropTarget?.blockKey === block.key
                                ? "bg-[#fff6da] ring-2 ring-[#f0cb5d]/60 ring-inset"
                                : "",
                            )}
                          >
                            <div className="flex h-full flex-col items-start gap-3">
                              {cellTasks.map((task, index) => (
                                <div
                                  key={task.id}
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", task.id);
                                    setDraggingTaskId(task.id);
                                    setDropTarget({ day: task.day, blockKey: block.key });
                                  }}
                                  onDragEnd={() => {
                                    setDraggingTaskId("");
                                    setDropTarget(null);
                                  }}
                                  className={cn(
                                    "w-[124px] rounded-[4px] border p-2.5 cursor-grab active:cursor-grabbing",
                                    TASK_TONES[(dayIndex + blockIndex + index) % TASK_TONES.length],
                                    draggingTaskId === task.id ? "opacity-60" : "",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-600">
                                      {task.time}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="rounded-full border border-slate-400/40 bg-white/35 p-0.5 text-slate-500 transition hover:bg-white/80 hover:text-slate-800"
                                      aria-label={`Delete ${task.title}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="mt-1.5 text-[0.92rem] font-black leading-5 text-slate-900">
                                    {task.title}
                                  </div>
                                  <div className="mt-2 text-xs leading-5 text-slate-700">
                                    {task.note || "No note added."}
                                  </div>
                                </div>
                              ))}

                              {!cellTasks.length ? (
                                <div className="h-full min-h-[130px] w-full rounded-[10px] border border-dashed border-[#e3e0d6] bg-[#fffdfa]" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="border-[#4da1c7] bg-[#fff7ee]/95 p-6 shadow-[0_18px_48px_rgba(77,161,199,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-full border border-[#decab4] bg-[#fffaf0] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#7f5f4d] shadow-[0_8px_16px_rgba(0,0,0,0.06)]">
              Add Task
            </div>
            <div className="rounded-full border border-[#d8c7b2] bg-[#ffe8c8] p-2 text-[#a55e39] shadow-[0_8px_16px_rgba(165,94,57,0.12)]">
              <Plus className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5">
            <div className="text-2xl font-black text-slate-900">Type task notes</div>
            <div className="mt-3 text-sm leading-7 text-[#6f6458]">
              Create a task by typing its title and note, then choose the day and time to place it into the matrix.
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <InputField label="Task Title">
              <input
                value={form.title}
                onChange={(event) => handleFieldChange("title", event.target.value)}
                placeholder="Example: Update ATS keywords"
                className="w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition placeholder:text-[#b4a591] focus:border-[#e19158] focus:bg-[#fffef7]"
                style={fieldStyle}
              />
            </InputField>

            <InputField label="Task Note">
              <textarea
                value={form.note}
                onChange={(event) => handleFieldChange("note", event.target.value)}
                placeholder="Type the note you want to pin into the calendar..."
                rows={5}
                className="w-full resize-none rounded-[22px] border px-4 py-3 text-sm leading-7 outline-none transition placeholder:text-[#b4a591] focus:border-[#e19158] focus:bg-[#fffef7]"
                style={fieldStyle}
              />
            </InputField>

            <InputField label="Day">
              <select
                value={form.day}
                onChange={(event) => handleFieldChange("day", event.target.value)}
                className="w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:border-[#e19158] focus:bg-[#fffef7]"
                style={fieldStyle}
              >
                {DAYS.map((day) => (
                  <option key={day.label} value={day.label}>
                    {day.label}
                  </option>
                ))}
              </select>
            </InputField>

            <InputField label="Time">
              <input
                type="time"
                value={form.time}
                onChange={(event) => handleFieldChange("time", event.target.value)}
                className="w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:border-[#e19158] focus:bg-[#fffef7]"
                style={fieldStyle}
              />
            </InputField>

            {error ? (
              <div className="rounded-[20px] border border-[#f0bbb7] bg-[#fff0ef] px-4 py-3 text-sm text-[#ad4c43]">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleAddTask}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#da9f78] bg-gradient-to-r from-[#f2a567] via-[#ef8b6a] to-[#ec7a7c] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(236,122,124,0.24)] transition hover:brightness-105"
            >
              <NotebookPen className="h-4 w-4" />
              Add To Calendar
            </button>
          </div>

          <div className="mt-8 border-t border-[#eadccd] pt-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7f715c]">
              Quick Suggestions
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_TASKS.map((task) => (
                <button
                  key={`${task.title}-${task.day}-${task.time}`}
                  type="button"
                  onClick={() => handleApplySuggestion(task)}
                  className="rounded-full border border-[#dbcdbf] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#665c52] shadow-[0_6px_12px_rgba(0,0,0,0.04)] transition hover:border-[#e29a62] hover:bg-[#fff1dd] hover:text-slate-900"
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[#eadccd] pt-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7f715c]">
              Added Tasks
            </div>
            <div className="mt-4 space-y-3">
              {tasks.length ? (
                tasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[22px] border border-[#deceb8] bg-[#fffaf2] px-4 py-4 shadow-[0_10px_20px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="mt-1 text-sm text-[#7e7367]">
                          {task.day} • {task.time}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="rounded-full border border-[#e0d1bf] bg-[#fff2e6] p-2 text-[#8d7058] transition hover:border-[#cf9b6f] hover:bg-[#ffe8d2] hover:text-slate-900"
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {task.note ? (
                      <div className="mt-3 text-sm leading-7 text-[#665d54]">
                        {task.note}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#deceb8] bg-[#fffaf2] px-4 py-4 text-sm text-[#7e7367]">
                  No tasks added yet. Use the form above to start building the weekly matrix.
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function getCurrentDayLabel() {
  const dayIndex = new Date().getDay();
  const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS[mappedIndex]?.label || "Monday";
}

function getMovedTaskTime(currentTime = "", blockKey = "") {
  const currentBlock = getTimeBlock(currentTime);
  if (currentBlock === blockKey && currentTime) {
    return currentTime;
  }

  return getBlockDefaultTime(blockKey);
}

function createTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task) => ({
      id: String(task?.id || "").trim(),
      title: String(task?.title || "").trim(),
      note: String(task?.note || "").trim(),
      day: String(task?.day || "").trim(),
      time: String(task?.time || "").trim(),
      createdAtIso: String(task?.createdAtIso || "").trim(),
    }))
    .filter((task) => task.id && task.title && task.day && task.time)
    .sort(compareTasks);
}

function buildTaskMatrix(tasks = []) {
  return DAYS.reduce((dayAccumulator, day) => {
    dayAccumulator[day.label] = TIME_BLOCKS.reduce((blockAccumulator, block) => {
      blockAccumulator[block.key] = tasks.filter(
        (task) => task.day === day.label && getTimeBlock(task.time) === block.key,
      );
      return blockAccumulator;
    }, {});
    return dayAccumulator;
  }, {});
}

function getTimeBlock(time = "") {
  const minutes = parseTimeToMinutes(time);

  const matchedBlock = TIME_BLOCKS.find(
    (block) => minutes >= block.start && minutes <= block.end,
  );

  return matchedBlock?.key || "evening";
}

function getBlockDefaultTime(blockKey = "") {
  const block = TIME_BLOCKS.find((item) => item.key === blockKey);
  if (!block) {
    return "09:00";
  }

  const hours = String(Math.floor(block.start / 60)).padStart(2, "0");
  const minutes = String(block.start % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(time = "") {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

function compareTasks(left, right) {
  const dayDelta = getDayIndex(left.day) - getDayIndex(right.day);
  if (dayDelta !== 0) {
    return dayDelta;
  }

  const timeDelta = parseTimeToMinutes(left.time) - parseTimeToMinutes(right.time);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  return String(left.createdAtIso || "").localeCompare(String(right.createdAtIso || ""));
}

function getDayIndex(dayLabel = "") {
  return DAYS.findIndex((day) => day.label === dayLabel);
}

function getBusiestDay(tasks = []) {
  if (!tasks.length) {
    return "None";
  }

  const counts = DAYS.map((day) => ({
    label: day.short,
    total: tasks.filter((task) => task.day === day.label).length,
  })).sort((left, right) => right.total - left.total);

  return counts[0]?.total ? counts[0].label : "None";
}

const fieldStyle = {
  backgroundColor: "#fffaf0",
  borderColor: "#d9ccb8",
  color: "#0f172a",
};
