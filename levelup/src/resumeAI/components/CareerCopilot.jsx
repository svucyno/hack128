import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquarePlus, SendHorizonal, Sparkles } from "lucide-react";

function generateResponse(input, analysis) {
  if (!analysis) {
    return "Analyze a resume first, then I can explain ATS score gaps, best-fit roles, and the fastest improvements.";
  }

  const prompt = input.toLowerCase();
  const bestRole = analysis.jobMatches[0];

  if (prompt.includes("score") || prompt.includes("ats")) {
    return `The ATS score is ${analysis.atsScore}/100. The weakest areas are ${Object.entries(
      analysis.breakdown,
    )
      .sort((left, right) => left[1] - right[1])
      .slice(0, 2)
      .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase())
      .join(" and ")}.`;
  }

  if (prompt.includes("role") || prompt.includes("job")) {
    return `${bestRole.role} is the strongest role match at ${bestRole.match}%. Focus next on ${bestRole.focusAreas
      .slice(0, 2)
      .join(" and ")} to improve conversion.`;
  }

  if (prompt.includes("skill") || prompt.includes("gap")) {
    return analysis.missingSkills.length
      ? `The biggest missing skills are ${analysis.missingSkills.join(", ")}. Add direct evidence through projects, certifications, or role-aligned bullets.`
      : "The current resume does not show major skill gaps for the top role match. Improve differentiation with stronger quantified impact.";
  }

  if (prompt.includes("improve") || prompt.includes("better")) {
    return analysis.suggestions[0] || "Lead with quantified outcomes and clearer role-aligned keywords.";
  }

  return `You look strongest for ${bestRole.role}. The fastest upgrade path is to tighten keyword alignment, add measurable results, and close gaps around ${analysis.missingSkills
    .slice(0, 2)
    .join(" and ") || bestRole.focusAreas.slice(0, 2).join(" and ")}.`;
}

function CareerCopilot({ analysis }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const quickPrompts = useMemo(
    () => [
      "How can I improve my ATS score?",
      "What job role fits best?",
      "What skills am I missing?",
    ],
    [],
  );

  const handleSend = (value) => {
    const prompt = value.trim();
    if (!prompt) {
      return;
    }

    setMessages((current) => [
      ...current,
      { type: "user", text: prompt },
      { type: "assistant", text: generateResponse(prompt, analysis) },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            className="glass-card mb-4 w-[min(380px,calc(100vw-2.5rem))] p-4"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Bot size={16} className="text-accent" />
                  AI Career Copilot
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  Ask about ATS score, roles, skill gaps, or next steps.
                </div>
              </div>
              <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-soft">
                Beta
              </div>
            </div>

            <div className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-ink-muted">
                  Ask a question or tap one of the prompts below.
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.type}-${index}`}
                  className={`rounded-2xl border p-4 text-sm leading-6 ${
                    message.type === "assistant"
                      ? "border-white/8 bg-black/15 text-ink-muted"
                      : "border-accent/20 bg-accent/10 text-ink"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-ink-muted transition hover:border-accent/30 hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSend(input);
                  }
                }}
                className="input-shell"
                placeholder="Ask for a role plan or ATS explanation..."
              />
              <button
                type="button"
                onClick={() => handleSend(input)}
                className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-accent/30 bg-accent text-canvas transition hover:scale-[1.02]"
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-full border border-accent/25 bg-canvas-soft/90 px-5 py-3 text-sm font-semibold text-ink shadow-glow backdrop-blur-xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        {open ? <MessageSquarePlus size={18} className="text-accent" /> : <Sparkles size={18} className="text-accent" />}
        Career Copilot
      </motion.button>
    </div>
  );
}

export default CareerCopilot;
