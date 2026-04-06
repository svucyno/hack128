import { buildCompanyPrepPack, normalizeCompanyPrepPacks } from "./companyPrep";
import { buildTrackerApplicationFromJob } from "./jobRecommendations";
import { normalizeJobApplications } from "./userData";

export function runApplicationAutopilot({
  job,
  jobApplications = [],
  companyPrepPacks = [],
  calendarTasks = [],
  linkedResumeVersion = "",
  linkedResumeScore = null,
  targetRole = "",
  resumeSkillGaps = [],
  recommendedRoles = [],
}) {
  const applications = sortApplications(normalizeJobApplications(jobApplications));
  const existingApplication = findExistingApplication(applications, job);
  const application = buildAutopilotApplication({
    job,
    existingApplication,
    linkedResumeVersion,
    linkedResumeScore,
    targetRole,
    resumeSkillGaps,
  });

  const nextApplications = sortApplications([
    application,
    ...applications.filter((item) => item.id !== application.id),
  ]);

  const prepPacks = sortPrepPacks(normalizeCompanyPrepPacks(companyPrepPacks));
  const existingPrepPack = findExistingPrepPack(prepPacks, application);
  const prepPack = buildCompanyPrepPack({
    id: existingPrepPack?.id || "",
    company: application.company,
    role: application.role,
    applicationId: application.id,
    applicationStatus: application.status,
    linkedResumeVersion: application.linkedResumeVersion,
    linkedResumeScore: application.linkedResumeScore,
    targetRole: String(targetRole || "").trim(),
    jobDescription: application.jobDescription,
    matchedSkills: uniqueStrings(job.matchedSkills || []).slice(0, 12),
    skillGaps: uniqueStrings([...job.missingSkills, ...resumeSkillGaps]).slice(0, 12),
    recommendedRoles,
    resumeTailored: Boolean(application.resumeTailored),
  });
  const nextPrepPacks = sortPrepPacks([
    prepPack,
    ...prepPacks.filter((pack) => pack.id !== prepPack.id),
  ]);

  const preservedTasks = removeGeneratedCalendarTasks(calendarTasks, application.id);
  const generatedTasks = buildGeneratedAutopilotTasks({
    application,
    prepPack,
    job,
  });
  const nextCalendarTasks = sortCalendarTasks([...preservedTasks, ...generatedTasks]);

  return {
    application,
    prepPack,
    nextApplications,
    nextPrepPacks,
    nextCalendarTasks,
    summary: buildAutopilotSummary({
      application,
      prepPack,
      job,
      tasksCreated: generatedTasks.length,
      trackerAction: existingApplication ? "updated" : "created",
    }),
  };
}

function buildAutopilotApplication({
  job,
  existingApplication,
  linkedResumeVersion,
  linkedResumeScore,
  targetRole,
  resumeSkillGaps,
}) {
  const baseApplication = buildTrackerApplicationFromJob({
    job,
    linkedResumeVersion,
    linkedResumeScore,
    targetRole,
    resumeSkillGaps,
  });
  const nowIso = new Date().toISOString();
  const today = getTodayInput();
  const existing = existingApplication || null;
  const taskSync = {
    deadline: existing?.taskSync?.deadline !== false,
    followUp: existing?.taskSync?.followUp !== false,
    interview: existing?.taskSync?.interview !== false,
  };
  const strategyNotes = uniqueStrings([
    existing?.strategyNotes,
    baseApplication.strategyNotes,
    "Application Autopilot prepared the tracker, prep pack, and calendar tasks.",
  ]).join(" ");
  let status = normalizeStatus(existing?.status || baseApplication.status);
  const interviewRounds = Array.isArray(existing?.interviewRounds) ? existing.interviewRounds : [];

  if (
    !["offer", "closed"].includes(status) &&
    interviewRounds.some(hasTrackedInterviewRoundData)
  ) {
    status = "interviewing";
  }

  let appliedDate = String(existing?.appliedDate || "").trim();
  if (["applied", "interviewing", "offer"].includes(status) && !appliedDate) {
    appliedDate = today;
  }

  let followUpDate = String(existing?.followUpDate || "").trim();
  if (taskSync.followUp && ["applied", "interviewing"].includes(status) && !followUpDate && appliedDate) {
    followUpDate = addDays(appliedDate, 5);
  }

  let followUpStatus = normalizeFollowUpStatus(existing?.followUpStatus);
  if (existing?.responseReceived) {
    followUpStatus = "responded";
  } else if (!followUpStatus && followUpDate) {
    followUpStatus = "pending";
  }

  return normalizeJobApplications([
    {
      ...baseApplication,
      ...existing,
      id: existing?.id || baseApplication.id,
      company: baseApplication.company,
      role: baseApplication.role,
      department: baseApplication.department,
      jobLocation: baseApplication.jobLocation,
      workMode: baseApplication.workMode,
      salary: baseApplication.salary,
      source: baseApplication.source,
      jobLink: baseApplication.jobLink,
      jobDescription: baseApplication.jobDescription,
      requiredSkills: baseApplication.requiredSkills,
      mustHaveKeywords: baseApplication.mustHaveKeywords,
      importantKeywords: baseApplication.importantKeywords,
      experienceRequired: baseApplication.experienceRequired,
      eligibility: baseApplication.eligibility,
      linkedResumeVersion: baseApplication.linkedResumeVersion || existing?.linkedResumeVersion || "",
      linkedResumeScore:
        baseApplication.linkedResumeScore ?? existing?.linkedResumeScore ?? null,
      status,
      priority: String(existing?.priority || baseApplication.priority || "").trim() || baseApplication.priority,
      savedDate: String(existing?.savedDate || baseApplication.savedDate || today).trim(),
      appliedDate,
      deadline: baseApplication.deadline,
      recruiterName: String(existing?.recruiterName || "").trim(),
      recruiterContact: String(existing?.recruiterContact || "").trim(),
      referralUsed: Boolean(existing?.referralUsed),
      interviewRounds,
      followUpDate,
      followUpStatus,
      responseReceived: Boolean(existing?.responseReceived),
      nextAction: buildAutopilotNextAction({
        status,
        missingSkills: job.missingSkills,
        company: baseApplication.company,
      }),
      whyFit: baseApplication.whyFit,
      resumeChangesNeeded:
        String(existing?.resumeChangesNeeded || "").trim() || baseApplication.resumeChangesNeeded,
      talkingPoints: String(existing?.talkingPoints || "").trim() || baseApplication.talkingPoints,
      risksGaps: uniqueStrings([
        ...splitTagText(existing?.risksGaps),
        ...splitTagText(baseApplication.risksGaps),
      ]).join(", "),
      compensationNotes:
        String(existing?.compensationNotes || "").trim() || baseApplication.compensationNotes,
      customizationsMade: String(existing?.customizationsMade || "").trim(),
      strategyNotes,
      notes: strategyNotes,
      finalOutcome: String(existing?.finalOutcome || "").trim(),
      createdAtIso: String(existing?.createdAtIso || baseApplication.createdAtIso || nowIso).trim(),
      updatedAtIso: nowIso,
      taskSync,
    },
  ])[0];
}

function buildGeneratedAutopilotTasks({ application, prepPack, job }) {
  const tasks = [
    ...buildStandardApplicationTasks(application),
    ...buildAutopilotFocusTasks({ application, prepPack, job }),
  ];

  return dedupeTasks(tasks);
}

function buildStandardApplicationTasks(application) {
  const tasks = [];

  if (
    application.taskSync?.deadline &&
    application.deadline &&
    ["wishlist", "ready"].includes(application.status) &&
    isTodayOrFuture(application.deadline)
  ) {
    tasks.push(
      buildCalendarTask({
        id: `jobapp:${application.id}:deadline:3`,
        title: `${application.company} deadline in 3 days`,
        note: `${application.role} deadline is ${formatDateLabel(application.deadline)}.`,
        when: buildReminderDate(application.deadline, -3, "09:00"),
        fallbackTime: "09:00",
      }),
      buildCalendarTask({
        id: `jobapp:${application.id}:deadline:1`,
        title: `${application.company} final deadline reminder`,
        note: `Final reminder before the ${application.role} deadline.`,
        when: buildReminderDate(application.deadline, -1, "09:00"),
        fallbackTime: "09:00",
      }),
    );
  }

  if (
    application.taskSync?.followUp &&
    ["applied", "interviewing"].includes(application.status) &&
    !application.responseReceived
  ) {
    const followUpWhen = application.followUpDate
      ? buildReminderDate(application.followUpDate, 0, "11:00")
      : application.appliedDate
        ? buildReminderDate(application.appliedDate, 5, "11:00")
        : null;

    tasks.push(
      buildCalendarTask({
        id: `jobapp:${application.id}:follow-up`,
        title: `Follow up ${application.company}`,
        note:
          application.nextAction ||
          `Check the ${application.role} application and send a follow-up if needed.`,
        when: followUpWhen,
        fallbackTime: "11:00",
      }),
    );
  }

  if (application.taskSync?.interview) {
    application.interviewRounds.forEach((round) => {
      const scheduledAt = getRoundScheduledAt(round);
      if (!scheduledAt || round.status !== "planned") {
        return;
      }

      const prepLeadDays = getPrepLeadDays(scheduledAt);
      tasks.push(
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:prep:${round.id}`,
          title: `${application.company} prep for ${round.name}`,
          note:
            round.prepFocus ||
            `Prepare the main topics, stories, and proof points for ${round.name}.`,
          when: buildReminderDate(scheduledAt, -prepLeadDays, "18:00"),
          fallbackTime: "18:00",
        }),
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:day:${round.id}`,
          title: `${application.company} ${round.name}`,
          note:
            round.notes ||
            `Attend ${round.name} for the ${application.role} application.`,
          when: buildReminderDate(
            scheduledAt,
            0,
            extractTime(scheduledAt) || round.time || "09:00",
          ),
          fallbackTime: extractTime(scheduledAt) || round.time || "09:00",
        }),
        buildCalendarTask({
          id: `jobapp:${application.id}:interview:feedback:${round.id}`,
          title: `${application.company} ${round.name} feedback`,
          note: `Capture what went well and what to improve after ${round.name}.`,
          when: buildReminderDate(scheduledAt, 1, "18:30"),
          fallbackTime: "18:30",
        }),
      );
    });
  }

  return tasks.filter(Boolean);
}

function buildAutopilotFocusTasks({ application, prepPack, job }) {
  if (["offer", "closed"].includes(application.status)) {
    return [];
  }

  const tasks = [];
  const missingSkills = uniqueStrings(job.missingSkills || []).slice(0, 3);

  if (["wishlist", "ready"].includes(application.status)) {
    tasks.push(
      buildCalendarTask({
        id: `jobapp:${application.id}:autopilot:resume`,
        title: `Tailor resume for ${application.company}`,
        note: missingSkills.length
          ? `Strengthen proof around ${missingSkills.join(", ")} before applying.`
          : `Tighten role-specific bullets and measurable outcomes for ${application.role}.`,
        when: buildNextSlotDate(0, "18:30"),
        fallbackTime: "18:30",
      }),
    );
  }

  tasks.push(
    buildCalendarTask({
      id: `jobapp:${application.id}:autopilot:prep-pack`,
      title: `Review ${application.company} prep pack`,
      note:
        prepPack.riskAreas?.[0] ||
        `Check likely rounds, common topics, and risk areas for ${application.role}.`,
      when: buildNextSlotDate(0, "20:00"),
      fallbackTime: "20:00",
    }),
    buildCalendarTask({
      id: `jobapp:${application.id}:autopilot:mock`,
      title: `Run ${application.company} mock interview`,
      note:
        prepPack.mockInterviewProfile?.focusAreas?.slice(0, 3).join(", ") ||
        `Practice the role-specific interview flow before the real process starts.`,
      when: buildNextSlotDate(1, "19:00"),
      fallbackTime: "19:00",
    }),
  );

  return tasks.filter(Boolean);
}

function buildAutopilotSummary({ application, prepPack, job, tasksCreated, trackerAction }) {
  return {
    applicationId: application.id,
    prepPackId: prepPack.id,
    company: application.company,
    role: application.role,
    trackerAction,
    status: application.status,
    matchScore: normalizeScore(job.matchScore),
    linkedResumeVersion: application.linkedResumeVersion,
    linkedResumeScore: application.linkedResumeScore,
    missingSkills: uniqueStrings(job.missingSkills || []).slice(0, 5),
    tasksCreated,
    nextAction: application.nextAction,
    mockInterviewState: {
      companyPrepPack: buildAutopilotMockInterviewState(prepPack),
    },
  };
}

export function buildAutopilotMockInterviewState(prepPack) {
  return {
    packId: prepPack.id,
    applicationId: prepPack.applicationId,
    role: prepPack.role,
    company: prepPack.company,
    difficulty: String(
      prepPack.mockInterviewProfile?.difficulty || prepPack.expectedDifficulty || "medium",
    ).toLowerCase(),
    interviewType: prepPack.mockInterviewProfile?.interviewType || "technical",
    focusAreas: prepPack.mockInterviewProfile?.focusAreas || [],
    jobDescription: prepPack.jobDescription || "",
    maxQuestions: prepPack.mockInterviewProfile?.maxQuestions || 4,
  };
}

function findExistingApplication(applications, job) {
  const targetKey = createSavedJobKey(job);
  return applications.find(
    (application) =>
      createSavedJobKey(application) === targetKey ||
      (application.company.toLowerCase() === String(job.company || "").trim().toLowerCase() &&
        application.role.toLowerCase() === String(job.role || "").trim().toLowerCase()),
  );
}

function findExistingPrepPack(prepPacks, application) {
  return prepPacks.find(
    (pack) =>
      pack.applicationId === application.id ||
      (pack.company.toLowerCase() === application.company.toLowerCase() &&
        pack.role.toLowerCase() === application.role.toLowerCase()),
  );
}

function buildAutopilotNextAction({ status, missingSkills, company }) {
  if (["applied", "interviewing"].includes(status)) {
    return `Use the prep pack and scheduled tasks to stay ready for the ${company} process.`;
  }

  const topGaps = uniqueStrings(missingSkills || []).slice(0, 3);
  if (topGaps.length) {
    return `Close the top gaps in ${topGaps.join(", ")}, review the prep pack, and run a mock interview before moving this to Ready To Apply.`;
  }

  return "Review the prep pack, run a mock interview, and move this to Ready To Apply.";
}

function removeGeneratedCalendarTasks(existingTasks, applicationId) {
  const prefix = `jobapp:${applicationId}:`;
  return (Array.isArray(existingTasks) ? existingTasks : []).filter(
    (task) => !String(task?.id || "").startsWith(prefix),
  );
}

function buildCalendarTask({ id, title, note, when, fallbackTime }) {
  const eventDate = toDateObject(when);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }

  const time = extractTime(when) || fallbackTime;
  return {
    id,
    title,
    note,
    day: getDayLabel(eventDate),
    time,
    createdAtIso: new Date().toISOString(),
  };
}

function buildReminderDate(value, offsetDays, fallbackTime) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + offsetDays);
  setTimeOnDate(date, fallbackTime);

  if (startOfDay(date).getTime() < startOfToday().getTime()) {
    const today = startOfToday();
    setTimeOnDate(today, fallbackTime);
    return today;
  }

  return date;
}

function buildNextSlotDate(offsetDays, fallbackTime) {
  const date = startOfToday();
  date.setDate(date.getDate() + offsetDays);
  setTimeOnDate(date, fallbackTime);

  if (date.getTime() < Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function getPrepLeadDays(value) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  const deltaDays = Math.round((startOfDay(date).getTime() - startOfToday().getTime()) / 86400000);
  return deltaDays > 3 ? 2 : 1;
}

function getRoundScheduledAt(round) {
  if (round?.date && round?.time) {
    return `${round.date}T${round.time}`;
  }
  if (round?.date) {
    return `${round.date}T09:00`;
  }
  return "";
}

function hasTrackedInterviewRoundData(round) {
  return Boolean(round?.date || round?.time || round?.notes || round?.prepFocus) ||
    ["completed", "cleared", "rejected"].includes(String(round?.status || "").toLowerCase());
}

function sortApplications(applications) {
  return (Array.isArray(applications) ? applications : [])
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAtIso || right.createdAtIso || 0).getTime() -
        new Date(left.updatedAtIso || left.createdAtIso || 0).getTime(),
    );
}

function sortPrepPacks(prepPacks) {
  return (Array.isArray(prepPacks) ? prepPacks : [])
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAtIso || right.generatedAtIso || 0).getTime() -
        new Date(left.updatedAtIso || left.generatedAtIso || 0).getTime(),
    );
}

function sortCalendarTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => task?.id && task?.title && task?.day && task?.time)
    .slice()
    .sort((left, right) => {
      const dayDelta = getDayOrder(left.day) - getDayOrder(right.day);
      if (dayDelta !== 0) {
        return dayDelta;
      }

      return toMinutes(left.time) - toMinutes(right.time);
    });
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return (Array.isArray(tasks) ? tasks : []).filter((task) => {
    const id = String(task?.id || "").trim();
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function createSavedJobKey(item) {
  return [
    String(item?.company || "").trim().toLowerCase(),
    String(item?.role || "").trim().toLowerCase(),
    String(item?.jobLink || item?.applicationUrl || "").trim().toLowerCase(),
  ].join("::");
}

function normalizeStatus(value) {
  const normalized = String(value || "wishlist").trim().toLowerCase();
  if (normalized === "interview") {
    return "interviewing";
  }
  if (["wishlist", "ready", "applied", "interviewing", "offer", "closed"].includes(normalized)) {
    return normalized;
  }
  return "wishlist";
}

function normalizeFollowUpStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "sent", "responded"].includes(normalized)) {
    return normalized;
  }
  return "";
}

function splitTagText(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function normalizeScore(value) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Math.round(Number(value))))
    : null;
}

function formatDateLabel(value) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDayOrder(day) {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(
    String(day || "").trim(),
  );
}

function toMinutes(time) {
  const parts = String(time || "")
    .split(":")
    .map((item) => Number(item));
  if (!Number.isFinite(parts[0])) {
    return 0;
  }
  return parts[0] * 60 + (Number.isFinite(parts[1]) ? parts[1] : 0);
}

function extractTime(value) {
  const input = String(value || "").trim();
  const match = input.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function setTimeOnDate(date, time) {
  const [hours, minutes] = String(time || "09:00")
    .split(":")
    .map((value) => Number(value));
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
}

function addDays(value, days) {
  const date = toDateObject(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function toDateObject(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (!value) {
    return new Date(NaN);
  }
  if (String(value).includes("T")) {
    return new Date(value);
  }
  return new Date(`${value}T00:00`);
}

function startOfDay(value) {
  const date = toDateObject(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfToday() {
  return startOfDay(new Date());
}

function isTodayOrFuture(value) {
  const date = startOfDay(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= startOfToday().getTime();
}

function getDayLabel(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}
