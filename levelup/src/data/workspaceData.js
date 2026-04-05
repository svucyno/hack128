import {
  BarChart3,
  CalendarDays,
  Briefcase,
  ClipboardCheck,
  FileSpreadsheet,
  FileSearch,
  FileText,
  GraduationCap,
  LayoutDashboard,
  PenTool,
  Settings,
  Sparkles,
  Users,
  BookOpenCheck,
  Video,
} from "lucide-react";

export const sidebarSections = [
  {
    title: "Dashboard",
    items: [{ label: "Overview", to: "/workspace", icon: LayoutDashboard }],
  },
  {
    title: "Career AI",
    items: [
      { label: "Resume Analyzer", to: "/workspace/resume-analyzer", icon: ClipboardCheck },
      { label: "Career Guidance", to: "/workspace/career-guidance", icon: Briefcase },
      { label: "Resume Parser", to: "/workspace/resume-parser", icon: FileSearch },
      { label: "Skill Gap", to: "/workspace/skill-gap-analysis", icon: BarChart3 },
      { label: "Role Predictor", to: "/workspace/job-role-predictor", icon: Sparkles },
      { label: "Performance", to: "/workspace/performance", icon: GraduationCap },
    ],
  },
  {
    title: "Learning AI",
    items: [
      { label: "Adaptive Learning", to: "/workspace/adaptive-learning", icon: BookOpenCheck },
      { label: "Courses & Tutors", to: "/workspace/courses", icon: Users },
    ],
  },
  {
    title: "Task Calendar",
    items: [{ label: "Task Calendar", to: "/workspace/task-calendar", icon: CalendarDays }],
  },
  {
    title: "Tools",
    items: [
      { label: "Summarizer", to: "/workspace/summarizer", icon: FileText },
      { label: "Video Brief", to: "/workspace/video-brief", icon: Video },
      { label: "Whiteboard", to: "/workspace/whiteboard", icon: PenTool },
      { label: "Student Risk", to: "/workspace/performance", icon: FileSpreadsheet },
      { label: "Settings", to: "/workspace/settings", icon: Settings },
    ],
  },
];

export const dashboardStats = [
  { label: "ATS Score", value: 91, suffix: "/100", tone: "from-red-500/30 to-rose-400/10" },
  { label: "Career Match", value: 88, suffix: "%", tone: "from-orange-500/30 to-red-400/10" },
  { label: "Skills Progress", value: 64, suffix: "%", tone: "from-red-600/30 to-amber-400/10" },
  { label: "Readiness Level", value: 82, suffix: "%", tone: "from-rose-500/30 to-red-500/10" },
];

export const dashboardModules = [
  { title: "Resume Analyzer", subtitle: "ATS scoring for resume and job description compatibility", to: "/workspace/resume-analyzer", metric: "91%" },
  { title: "Career Guidance", subtitle: "AI-based career recommendation platform for students", to: "/workspace/career-guidance", metric: "12 roles" },
  { title: "Skill Gap", subtitle: "Missing skills analysis for target roles", to: "/workspace/skill-gap-analysis", metric: "8 gaps" },
  { title: "Adaptive Learning", subtitle: "Personalized learning roadmap for different speeds", to: "/workspace/adaptive-learning", metric: "9 weeks" },
  { title: "Resume Parser", subtitle: "Extract skills, education, projects, and experience", to: "/workspace/resume-parser", metric: "94%" },
  { title: "Role Predictor", subtitle: "Recommend suitable job roles from profile signals", to: "/workspace/job-role-predictor", metric: "Top 3" },
  { title: "Performance", subtitle: "Student performance prediction and readiness insights", to: "/workspace/performance", metric: "Live" },
  { title: "Courses & Tutors", subtitle: "Volunteer tutors and video-based learning hub", to: "/workspace/courses", metric: "36 tutors" },
  { title: "Summarizer", subtitle: "NLP tool for lengthy material summarization", to: "/workspace/summarizer", metric: "5 min" },
  { title: "Whiteboard", subtitle: "Collaborative realtime board for interactive learning", to: "/workspace/whiteboard", metric: "Realtime" },
];

export const overviewTrend = [
  { name: "Mon", readiness: 44, ats: 62 },
  { name: "Tue", readiness: 52, ats: 68 },
  { name: "Wed", readiness: 58, ats: 75 },
  { name: "Thu", readiness: 63, ats: 78 },
  { name: "Fri", readiness: 72, ats: 84 },
  { name: "Sat", readiness: 77, ats: 88 },
  { name: "Sun", readiness: 82, ats: 91 },
];

export const quickActions = [
  { title: "Upload Resume", subtitle: "Start ATS scoring and resume parsing", icon: FileSearch, to: "/workspace/resume-analyzer" },
  { title: "Analyze Career", subtitle: "Open AI career guidance and role recommendations", icon: Briefcase, to: "/workspace/career-guidance" },
  { title: "Task Calendar", subtitle: "Plan weekly study blocks, resume work, and applications", icon: CalendarDays, to: "/workspace/task-calendar" },
];

export const insightCards = [
  "Your strongest signal is product-oriented frontend engineering with high project quality.",
  "Adding deployment and cloud keywords could move your ATS score above 95.",
  "A 4-week backend and system-design sprint will strengthen your role predictor outcomes.",
];

export const atsInsights = {
  score: 91,
  keywordMatch: 84,
  missingSkills: ["Docker", "GraphQL", "AWS"],
  suggestions: [
    "Add measurable impact to project descriptions.",
    "Use role-specific keywords in the skills summary.",
    "Mention CI/CD and cloud exposure for better alignment.",
  ],
  breakdown: [
    { label: "Skills Match", value: 88 },
    { label: "Experience Alignment", value: 79 },
    { label: "Projects Quality", value: 93 },
    { label: "Formatting", value: 96 },
  ],
  keywordVisual: [
    { name: "Matched", value: 84 },
    { name: "Missing", value: 16 },
  ],
};

export const parsedResume = {
  name: "Ramisetty Amrutha",
  skills: ["React", "JavaScript", "Node.js", "MongoDB", "Tailwind CSS", "Python"],
  education: [{ title: "B.Tech, Computer Science", meta: "SV University | 2022 - 2026" }],
  projects: [
    { title: "AI Career Intelligence Platform", meta: "Resume parsing, ATS scoring, roadmap generation" },
    { title: "Volunteer Tutor Connect", meta: "Realtime mentor matching and session booking" },
  ],
  experience: [{ title: "Frontend Developer Intern", meta: "Built dashboards and responsive UI systems" }],
};

export const recommendedRoles = [
  { role: "Full Stack Developer", match: 94, salary: "Rs 8L - Rs 16L", growth: "High", demand: [68, 72, 78, 82, 88] },
  { role: "Frontend Engineer", match: 91, salary: "Rs 7L - Rs 14L", growth: "High", demand: [72, 74, 79, 84, 86] },
  { role: "Product Engineer", match: 88, salary: "Rs 9L - Rs 18L", growth: "Very High", demand: [60, 66, 74, 81, 90] },
];

export const skillGapData = [
  { skill: "Docker", priority: "High", progress: 15 },
  { skill: "AWS", priority: "High", progress: 22 },
  { skill: "System Design", priority: "Medium", progress: 36 },
  { skill: "GraphQL", priority: "Medium", progress: 18 },
  { skill: "Testing", priority: "Low", progress: 58 },
];

export const roadmapMilestones = [
  { week: "Week 1", topic: "Resume refinement + ATS keywords", done: true, tasks: ["Rewrite summary", "Improve projects", "Add metrics"] },
  { week: "Week 2", topic: "TypeScript + project polish", done: true, tasks: ["Strict typing", "Portfolio cleanup", "Deploy case study"] },
  { week: "Week 3", topic: "Node.js APIs + authentication", done: false, tasks: ["JWT auth", "REST patterns", "Role-based routes"] },
  { week: "Week 4", topic: "Docker + deployment fundamentals", done: false, tasks: ["Dockerfile", "Compose basics", "Cloud deploy"] },
  { week: "Week 5", topic: "Interview questions + mock practice", done: false, tasks: ["DSA revision", "Mock interview", "Behavioral prep"] },
];

export const predictorResults = [
  { role: "Full Stack Developer", confidence: 93 },
  { role: "Frontend Engineer", confidence: 89 },
  { role: "Software Development Engineer", confidence: 85 },
];

export const performanceSeries = [
  { week: "W1", readiness: 34, consistency: 42 },
  { week: "W2", readiness: 41, consistency: 49 },
  { week: "W3", readiness: 49, consistency: 52 },
  { week: "W4", readiness: 57, consistency: 61 },
  { week: "W5", readiness: 63, consistency: 66 },
  { week: "W6", readiness: 71, consistency: 72 },
  { week: "W7", readiness: 82, consistency: 80 },
];

export const skillDistribution = [
  { name: "Frontend", value: 34 },
  { name: "Backend", value: 22 },
  { name: "Data", value: 14 },
  { name: "Cloud", value: 10 },
  { name: "Core CS", value: 20 },
];

export const tutors = [
  { name: "Akhil Reddy", subject: "DSA + Java", availability: "Weekends", tag: "Top mentor" },
  { name: "Sneha Varma", subject: "UI/UX + Frontend", availability: "Evenings", tag: "Design focused" },
  { name: "Kiran Kumar", subject: "DBMS + SQL", availability: "Daily", tag: "Placement prep" },
];

export const summaryData = {
  shortSummary:
    "The uploaded notes focus on database normalization, indexing, query optimization, and transaction control for scalable systems.",
  keyPoints: [
    "Normalization reduces redundancy and improves consistency.",
    "Indexes speed up reads but add write overhead.",
    "Transactions guarantee ACID properties for reliability.",
    "Query optimization depends on execution plans and schema design.",
  ],
};
