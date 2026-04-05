import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatbotImage from "../assets/images/chatbot.png";
import DinoLogin from "../components/DinoLogin";
import ThemeToggle from "../components/ThemeToggle";

const features = [
  "Resume analyzer and ATS score checker",
  "AI career guidance and role recommendations",
  "Resume parser for skills, education, projects, and experience",
  "Adaptive learning roadmap personalized for students",
  "Performance prediction and readiness tracking",
  "Volunteer tutor videos, courses, and collaborative whiteboard",
  "Document summarizer using NLP",
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="theme-page min-h-screen">
      <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="theme-public-ambient absolute inset-0" />
        <div className="theme-glow-pink absolute -left-28 top-24 h-72 w-72 rounded-full blur-3xl" />
        <div className="theme-glow-blue absolute right-0 top-16 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-200">
              AI Career Intelligence Platform
            </div>
            <h1 className="text-5xl font-black leading-tight sm:text-6xl">
              Career confusion
              <span className="bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent"> to career readiness</span>
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/65">
              A unified AI platform for students that analyzes resumes, checks ATS compatibility, recommends careers, identifies skill gaps, creates adaptive learning plans, predicts performance risk, and connects learners with tutor-driven learning.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/login")}
                className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(239,68,68,0.28)]"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/register")}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/75"
              >
                Register
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/70">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-red-500/10 via-transparent to-rose-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/35 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="h-[560px] rounded-[30px] border border-white/10 bg-black/35">
                <DinoLogin mood="excited" typing />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoCard value="91/100" label="ATS readiness" />
                <InfoCard value="10+" label="AI modules" />
                <InfoCard value="24/7" label="Mentor guidance" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-3">
          <ProjectCard
            title="Abstract"
            text="Build an AI-powered platform that guides students from career confusion to career readiness by combining resume parsing, ATS scoring, career guidance, skill gap analysis, and adaptive learning in one system."
          />
          <ProjectCard
            title="Workflow"
            text="User → Resume Upload → Resume Parsing Engine → ATS Scoring & NLP Matching → Career Recommendation Engine → Skill Gap Analysis → Adaptive Learning Roadmap → Dashboard + Chatbot"
          />
          <ProjectCard
            title="Impact"
            text="Improves employability, placement success, and career growth through compatibility scores, recommended job roles, missing skills, personalized roadmaps, and continuous guidance."
          />
        </section>
      </main>

      <LandingChatbot onGetStarted={() => navigate("/login")} onCareerPage={() => navigate("/workspace/career-guidance")} />
    </div>
  );
}

function InfoCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
    </div>
  );
}

function ProjectCard({ title, text }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="text-xl font-bold">{title}</div>
      <p className="mt-4 text-sm leading-7 text-white/65">{text}</p>
    </div>
  );
}

function LandingChatbot({ onGetStarted, onCareerPage }) {
  const [open, setOpen] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, from: "bot", text: "I’m your AI Career Mentor. I can help with career paths, ATS score understanding, and next learning steps." }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => timeoutRef.current && clearTimeout(timeoutRef.current), []);
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = (text) => {
    if (!text.trim() || isTyping) return;
    const userText = text.trim();
    setMessages((prev) => [...prev, { id: prev.length + 1, from: "user", text: userText }]);
    setInput("");
    setIsTyping(true);
    timeoutRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          from: "bot",
          text: userText.toLowerCase().includes("career")
            ? "Open the AI Career Guidance page after login for role recommendations, skill gaps, and roadmap insights."
            : "Use Get Started to log in, upload your resume, and begin with the ATS and resume analyzer workspace.",
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 grid justify-items-end gap-3">
      {open && (
        <div className="w-[calc(100vw-2.5rem)] max-w-md rounded-[28px] border border-white/10 bg-black/60 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">AI Career Mentor</div>
              <div className="text-xs text-white/45">Career recommendation platform</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">Close</button>
          </div>
          <div className="mt-4 grid gap-3">
            {messages.map((message) => (
              <div key={message.id} className={message.from === "bot" ? "rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80" : "ml-auto rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-white"}>
                {message.text}
              </div>
            ))}
            {isTyping && <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/60">Typing...</div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onCareerPage} className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">Open Career Guidance</button>
            <button onClick={onGetStarted} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">Get Started</button>
          </div>
          <div className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage(input)}
              placeholder="Ask about careers, ATS, or roadmap..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button onClick={() => sendMessage(input)} className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-400 px-4 py-3 text-sm font-semibold text-white">Send</button>
          </div>
        </div>
      )}
      {showButton && (
        <button
          onClick={() => setOpen((value) => !value)}
          className="grid h-24 w-24 place-items-center rounded-full border-2 border-red-400/70 bg-black/80 shadow-[0_0_36px_rgba(239,68,68,0.4)]"
        >
          <img src={chatbotImage} alt="" className="h-[84%] w-[84%] object-contain" />
        </button>
      )}
    </div>
  );
}
