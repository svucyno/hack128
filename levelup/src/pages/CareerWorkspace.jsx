import DinoLogin from "../components/DinoLogin";

const solutionCards = [
  {
    id: "ats",
    kicker: "Module 01",
    title: "AI ATS Scoring System",
    summary:
      "Evaluate resumes against job descriptions with NLP-driven compatibility scoring, keyword alignment, and optimization guidance.",
    highlights: ["Compatibility score", "Keyword gap map", "Section-wise ATS tips"],
    statLabel: "Score uplift",
    statValue: "28%",
  },
  {
    id: "tutors",
    kicker: "Module 02",
    title: "Volunteer Tutor Connect",
    summary:
      "Match learners with quality volunteer tutors using profile fit, availability, learning goals, and live mentoring access.",
    highlights: ["Tutor discovery", "Session booking", "Mentor matching"],
    statLabel: "Active tutors",
    statValue: "180+",
  },
  {
    id: "whiteboard",
    kicker: "Module 03",
    title: "Collaborative Whiteboard",
    summary:
      "Enable interactive online learning through a shared real-time board for diagrams, problem solving, annotations, and tutor sessions.",
    highlights: ["Live drawing", "Shared notes", "Collab rooms"],
    statLabel: "Live boards",
    statValue: "42",
  },
  {
    id: "summarizer",
    kicker: "Module 04",
    title: "NLP Document Summarizer",
    summary:
      "Turn lengthy academic or career materials into concise, structured summaries with key points, action items, and revision notes.",
    highlights: ["Smart summaries", "Key takeaways", "Revision notes"],
    statLabel: "Avg. time saved",
    statValue: "3.5h",
  },
  {
    id: "career",
    kicker: "Module 05",
    title: "Career Recommendation Platform",
    summary:
      "Guide students toward the right roles based on interests, academic history, strengths, and evolving market-oriented skills.",
    highlights: ["Role matches", "Interest mapping", "Path suggestions"],
    statLabel: "Career paths",
    statValue: "120+",
  },
  {
    id: "parser",
    kicker: "Module 06",
    title: "Resume Parser",
    summary:
      "Extract skills, education, experience, projects, and certifications from PDF or DOCX resumes into structured profile data.",
    highlights: ["Skill extraction", "Structured data", "Resume profile"],
    statLabel: "Parse accuracy",
    statValue: "94%",
  },
  {
    id: "roles",
    kicker: "Module 07",
    title: "Job Role Recommendation Model",
    summary:
      "Recommend suitable job roles using candidate skills, project history, and academic background to surface the strongest matches.",
    highlights: ["Role fit score", "Skill-role mapping", "Project impact"],
    statLabel: "Top match",
    statValue: "92%",
  },
  {
    id: "prediction",
    kicker: "Module 08",
    title: "Performance Prediction",
    summary:
      "Identify at-risk students early through attendance, assignments, and exam trends, then surface intervention recommendations.",
    highlights: ["Risk scoring", "Trend detection", "Intervention alerts"],
    statLabel: "Risk signals",
    statValue: "16",
  },
  {
    id: "adaptive",
    kicker: "Module 09",
    title: "Adaptive Learning Platform",
    summary:
      "Personalize content based on learner pace, weak areas, and progress to create a more effective and engaging study experience.",
    highlights: ["Custom pace", "Adaptive modules", "Learning roadmap"],
    statLabel: "Weekly progress",
    statValue: "74%",
  },
];

const workflowSteps = [
  "Resume Upload",
  "Resume Parsing",
  "ATS + NLP Matching",
  "Career Mapping",
  "Skill Gap Detection",
  "Adaptive Learning",
  "Dashboard + Chatbot",
];

const chatbotPrompts = [
  "Compare ATS score for two resumes",
  "Suggest next skills for a data analyst path",
  "Summarize this semester report",
  "Find tutors for DBMS and DSA",
];

export default function CareerWorkspace() {
  return (
    <div className="workspacePage">
      <div className="fireGlow workspaceGlow" />
      <div className="pageParticles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} className="pageParticle" />
        ))}
      </div>

      <header className="workspaceNav">
        <div className="workspaceBrand">
          <div className="workspaceBrandMark">L</div>
          <div>
            <div className="workspaceBrandTitle">LevelUp Intelligence</div>
            <div className="workspaceBrandSub">Career + Learning Workspace</div>
          </div>
        </div>

        <nav className="workspaceNavLinks">
          <a href="#workspace-overview">Overview</a>
          <a href="#workspace-modules">Modules</a>
          <a href="#workspace-workflow">Workflow</a>
          <a href="#workspace-chatbot">Chatbot</a>
        </nav>

        <button className="workspaceLogout" type="button" onClick={() => (window.location.hash = "#/")}>
          Exit
        </button>
      </header>

      <main className="workspaceMain">
        <section className="workspaceHero" id="workspace-overview">
          <div className="workspaceHeroCopy">
            <div className="workspaceKicker">Post-login workspace</div>
            <h1 className="workspaceTitle">One intelligent frontend for career growth, tutoring, learning, and student success.</h1>
            <p className="workspaceLead">
              The landing page, login, chatbot, and 3D identity stay intact. After login, users enter this unified workspace with
              separate sectors for ATS analysis, resume parsing, career guidance, tutoring, adaptive learning, student performance,
              and more.
            </p>

            <div className="workspaceHeroStats">
              <div className="workspaceHeroStat">
                <span>Modules</span>
                <strong>9</strong>
              </div>
              <div className="workspaceHeroStat">
                <span>Interactive sectors</span>
                <strong>12</strong>
              </div>
              <div className="workspaceHeroStat">
                <span>3D accents</span>
                <strong>Live</strong>
              </div>
            </div>
          </div>

          <div className="workspaceHeroVisual">
            <div className="workspace3DCard">
              <DinoLogin mood="excited" typing />
            </div>
            <div className="workspaceFloatingCard workspaceFloatingTop">
              <span>Readiness</span>
              <strong>82%</strong>
            </div>
            <div className="workspaceFloatingCard workspaceFloatingBottom">
              <span>AI Mentor</span>
              <strong>Online</strong>
            </div>
          </div>
        </section>

        <section className="workspaceStrip">
          <div className="workspaceStripCard">
            <span>Resume Intelligence</span>
            <strong>Parser + ATS + Role Match</strong>
          </div>
          <div className="workspaceStripCard">
            <span>Learning Experience</span>
            <strong>Tutor Connect + Whiteboard + Adaptive Roadmap</strong>
          </div>
          <div className="workspaceStripCard">
            <span>Student Outcomes</span>
            <strong>Prediction + Summaries + Mentor Guidance</strong>
          </div>
        </section>

        <section className="workspaceModulesSection" id="workspace-modules">
          <div className="workspaceSectionHeading">
            <div className="workspaceKicker">Separate sectors</div>
            <h2>All requested modules placed as distinct 3D-enhanced sections</h2>
          </div>

          <div className="workspaceModulesGrid">
            {solutionCards.map((card, index) => (
              <article key={card.id} className={`workspaceModuleCard workspaceModuleAccent${(index % 4) + 1}`}>
                <div className="workspaceModuleGlow" />
                <div className="workspaceModuleTop">
                  <div>
                    <div className="workspaceModuleKicker">{card.kicker}</div>
                    <h3>{card.title}</h3>
                  </div>
                  <div className="workspaceModuleStat">
                    <span>{card.statLabel}</span>
                    <strong>{card.statValue}</strong>
                  </div>
                </div>

                <p>{card.summary}</p>

                <div className="workspaceTagRow">
                  {card.highlights.map((item) => (
                    <span key={item} className="workspaceTag">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="workspaceModuleFooter">
                  <button className="workspacePrimaryAction" type="button">
                    Open module
                  </button>
                  <div className="workspaceDepthBadge">3D panel</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="workspaceWorkflow" id="workspace-workflow">
          <div className="workspaceSectionHeading">
            <div className="workspaceKicker">Unified flow</div>
            <h2>Career intelligence workflow after login</h2>
          </div>

          <div className="workspaceTimeline">
            {workflowSteps.map((step, index) => (
              <div key={step} className="workspaceTimelineStep">
                <div className="workspaceTimelineIndex">0{index + 1}</div>
                <div className="workspaceTimelineCard">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="workspaceLowerGrid">
          <div className="workspaceInsightPanel">
            <div className="workspaceSectionHeading">
              <div className="workspaceKicker">Quick intelligence</div>
              <h2>What the frontend now emphasizes</h2>
            </div>
            <ul className="workspaceInsightList">
              <li>Separate cards for each requested idea instead of student/teacher LMS screens.</li>
              <li>Persistent futuristic visual style with glowing panels and depth-based hover motion.</li>
              <li>A dedicated chatbot sector for career and learning guidance inside the app workspace.</li>
              <li>Existing landing page, login experience, chatbot behavior, and 3D identity remain untouched.</li>
            </ul>
          </div>

          <div className="workspaceChatPanel" id="workspace-chatbot">
            <div className="workspaceChatHeader">
              <div>
                <div className="workspaceKicker">Chatbot sector</div>
                <h2>AI mentor and support panel</h2>
              </div>
              <div className="workspacePresence">Live</div>
            </div>

            <div className="workspaceChatMessages">
              <div className="workspaceChatBubble workspaceChatBubbleBot">
                I can explain ATS scores, suggest tutors, summarize materials, recommend job roles, and update learning paths.
              </div>
              <div className="workspaceChatBubble workspaceChatBubbleUser">
                Suggest the next step after resume parsing and ATS scoring.
              </div>
              <div className="workspaceChatBubble workspaceChatBubbleBot">
                Next, I would map missing skills to target roles and push them into an adaptive weekly roadmap.
              </div>
            </div>

            <div className="workspacePromptList">
              {chatbotPrompts.map((prompt) => (
                <button key={prompt} className="workspacePromptChip" type="button">
                  {prompt}
                </button>
              ))}
            </div>

            <div className="workspaceChatInputRow">
              <input className="workspaceChatInput" type="text" placeholder="Ask the AI mentor about careers, tutors, roadmaps..." />
              <button className="workspacePrimaryAction" type="button">
                Send
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
