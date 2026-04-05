import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import StudentNavbar from "../../components/StudentNavbar";
import { courses } from "../../data/courses";
import { auth, db } from "../../firebase";

function getCart() {
  try {
    return JSON.parse(sessionStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function setCart(items) {
  sessionStorage.setItem("cart", JSON.stringify(items));
}

export default function StudentHome() {
  const [activeTab, setActiveTab] = useState("overview");
  const [todayTasks, setTodayTasks] = useState([
    { label: "Watch 1 video (DBMS Normalization)", time: "12 min" },
    { label: "Solve 5 MCQs (CN Routing)", time: "10 min" },
    { label: "Revise notes (OS Scheduling)", time: "8 min" },
  ]);
  const [progressSnapshot, setProgressSnapshot] = useState([
    { name: "DSA Mastery", percent: 72, timeLeft: "2h 40m" },
    { name: "DBMS Prime", percent: 54, timeLeft: "1h 20m" },
    { name: "CN Networking", percent: 31, timeLeft: "3h 10m" },
  ]);
  const [notifications, setNotifications] = useState([
    "You are 1 day away from a 7-day streak.",
    "Assignment 3 due in 6 hours.",
    "Revise DBMS joins today for +20 XP.",
  ]);
  const [stats, setStats] = useState({
    streak: 6,
    xp: 1280,
    accuracy: 92,
    course: "DSA Mastery",
    lesson: "Arrays",
    duration: "12 min",
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const base = `users/${user.uid}/dashboard`;
      const tasksRef = ref(db, `${base}/todayTasks`);
      const progressRef = ref(db, `${base}/progressSnapshot`);
      const notificationsRef = ref(db, `${base}/notifications`);
      const statsRef = ref(db, `${base}/stats`);

      const unsubTasks = onValue(tasksRef, (snap) => {
        if (snap.exists()) setTodayTasks(snap.val());
      });
      const unsubProgress = onValue(progressRef, (snap) => {
        if (snap.exists()) setProgressSnapshot(snap.val());
      });
      const unsubNotifications = onValue(notificationsRef, (snap) => {
        if (snap.exists()) setNotifications(snap.val());
      });
      const unsubStats = onValue(statsRef, (snap) => {
        if (snap.exists()) setStats((prev) => ({ ...prev, ...snap.val() }));
      });

      return () => {
        unsubTasks();
        unsubProgress();
        unsubNotifications();
        unsubStats();
      };
    });

    return () => {
      unsubAuth();
    };
  }, []);

  const handleAddToCart = (course) => {
    const cart = getCart();
    if (!cart.find((item) => item.id === course.id)) {
      cart.push(course);
      setCart(cart);
    }
    window.location.hash = "#/cart";
  };

  return (
    <div className="studentPage">
      <StudentNavbar />
      <main className="studentMain">
        <section className="studentDash">
          <div className="studentDashHead">
            <div>
              <div className="studentKicker">Student dashboard</div>
              <h1>Welcome back, keep your momentum alive.</h1>
              <p>Next actions, streaks, and progress — everything you need in one glance.</p>
            </div>
            <button className="studentPrimary" onClick={() => (window.location.hash = "#/my-courses")}>
              Continue Learning
            </button>
          </div>
          <div className="studentTabs">
            <button
              className={`studentTab ${activeTab === "overview" ? "is-active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`studentTab ${activeTab === "courses" ? "is-active" : ""}`}
              onClick={() => setActiveTab("courses")}
            >
              Courses
            </button>
            <button
              className={`studentTab ${activeTab === "practice" ? "is-active" : ""}`}
              onClick={() => setActiveTab("practice")}
            >
              Practice
            </button>
            <button
              className={`studentTab ${activeTab === "analytics" ? "is-active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
          </div>
        </section>

        {activeTab === "overview" && (
          <section className="studentOverview">
            <div className="studentOverviewGlow" />
            <div className="studentOverviewParticles" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={`particle-${index}`} />
              ))}
            </div>
            <div className="studentOverviewGrid">
              <div className="studentHeroCard">
                <div className="studentHeroOrb" />
                <div>
                  <div className="studentDashTitle">Continue learning</div>
                  <div className="studentHeroTitle">{stats.course}</div>
                  <div className="studentDashMeta">Last lesson: {stats.lesson} • {stats.duration}</div>
                  <div className="studentDashRow">
                    <button className="studentPrimary">Resume Lesson</button>
                    <button className="studentGhost">View Notes</button>
                  </div>
                </div>
                <div className="studentHeroRing">
                  <div className="studentHeroRingInner">
                    <span>{stats.accuracy}%</span>
                    <small>accuracy</small>
                  </div>
                </div>
              </div>

              <div className="studentOverviewCard studentSplit">
                <div className="studentDashTitle">Today’s plan</div>
                <div className="studentSplitBody">
                  <div className="studentList">
                    {todayTasks.map((task) => (
                      <div key={task.label} className="studentListItem">
                        <span>{task.label}</span>
                        <span>{task.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="studentSplitPanel">
                    <div className="studentSplitMetric">3 tasks</div>
                    <div className="studentSplitMeta">Complete for +45 XP</div>
                    <button className="studentSecondary">Start Plan</button>
                  </div>
                </div>
              </div>

              <div className="studentOverviewCard studentPulse">
                <div className="studentDashTitle">Streak + XP</div>
                <div className="studentStatRow">
                  <div>
                    <div className="studentStatValue">{stats.streak}</div>
                    <div className="studentStatLabel">Day streak</div>
                  </div>
                  <div>
                    <div className="studentStatValue">{stats.xp}</div>
                    <div className="studentStatLabel">Total XP</div>
                  </div>
                </div>
                <div className="studentStreakFire">
                  <span>🔥</span>
                  <div>
                    <div className="studentDashMeta">Streak protected</div>
                    <div className="studentDashHint">Complete 1 task to keep it alive</div>
                  </div>
                </div>
                <div className="studentXpTrack">
                  <span style={{ width: "72%" }} />
                </div>
                <div className="studentXpTicker">
                  <span>+12 XP</span>
                  <span>+8 XP</span>
                  <span>+5 XP</span>
                </div>
                <div className="studentDashHint">Complete one task today to extend your streak.</div>
              </div>

              <div className="studentOverviewCard">
                <div className="studentDashTitle">Progress snapshot</div>
                <div className="studentMiniChart">
                  <span style={{ height: "60%" }} />
                  <span style={{ height: "85%" }} />
                  <span style={{ height: "45%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "65%" }} />
                  <span style={{ height: "90%" }} />
                </div>
                <div className="studentRingGrid">
                  {progressSnapshot.map((item) => (
                    <div key={item.name} className="studentRingCard">
                      <div
                        className="studentRing"
                        style={{ background: `conic-gradient(#78FFA0 ${item.percent}%, rgba(255,255,255,0.08) 0)` }}
                      >
                        <span>{item.percent}%</span>
                      </div>
                      <div className="studentRingInfo">
                        <div>{item.name}</div>
                        <span>{item.timeLeft} left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="studentOverviewCard">
                <div className="studentDashTitle">Notifications</div>
                <div className="studentList">
                  {notifications.map((note) => (
                    <div key={note} className="studentListItem">
                      <span>{note}</span>
                      <span>Now</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="studentOverviewCard studentTimeline">
                <div className="studentDashTitle">Momentum</div>
                <div className="studentTimelineItem">Watch DBMS lecture · +20 XP</div>
                <div className="studentTimelineItem">Quiz: CN Routing · +35 XP</div>
                <div className="studentTimelineItem">Revision sprint · +10 XP</div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "courses" && (
          <>
            <section className="studentHero">
              <div className="studentHeroGlow" />
              <div className="studentHeroContent">
                <div className="studentKicker">Student catalog</div>
                <h1>Learn what matters. Buy only what you need.</h1>
                <p>
                  Explore Udemy-style courses built for campus success. Choose a track, pay once, learn forever.
                </p>
                <div className="studentHeroActions">
                  <button className="studentPrimary" onClick={() => document.getElementById("catalog")?.scrollIntoView()}>
                    Browse Courses
                  </button>
                  <button className="studentSecondary" onClick={() => (window.location.hash = "#/my-courses")}>
                    My Courses
                  </button>
                </div>
              </div>
              <div className="studentHeroPanel">
                <div className="studentPanelTitle">Smart Picks</div>
                <div className="studentPanelList">
                  <div className="studentPanelItem">
                    <span>DSA Mastery</span>
                    <span>₹499</span>
                  </div>
                  <div className="studentPanelItem">
                    <span>DBMS Prime</span>
                    <span>₹449</span>
                  </div>
                  <div className="studentPanelItem">
                    <span>CN Networking</span>
                    <span>₹399</span>
                  </div>
                </div>
              </div>
            </section>

            <section id="catalog" className="studentSection">
              <div className="studentSectionHead">
                <h2>Course Catalog</h2>
                <div className="studentFilterRow">
                  <button className="studentChip">All</button>
                  <button className="studentChip">Core CS</button>
                  <button className="studentChip">Programming</button>
                  <button className="studentChip">Placement</button>
                </div>
              </div>
              <div className="studentGrid">
                {courses.map((course) => (
                  <div key={course.id} className="studentCard">
                    <div className="studentCardTop">
                      <span className="studentTag">{course.category}</span>
                      <span className="studentLevel">{course.level}</span>
                    </div>
                    <div className="studentCardTitle">{course.title}</div>
                    <div className="studentCardMeta">
                      <span>{course.duration}</span>
                      <span>⭐ {course.rating}</span>
                      <span>{course.students}+ learners</span>
                    </div>
                    <p className="studentCardDesc">{course.description}</p>
                    <div className="studentCardFooter">
                      <div className="studentPrice">₹{course.price}</div>
                      <div className="studentCardActions">
                        <button
                          className="studentGhost"
                          onClick={() => (window.location.hash = `#/course/${course.id}`)}
                        >
                          View
                        </button>
                        <button className="studentPrimary" onClick={() => handleAddToCart(course)}>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "practice" && (
          <>
            <section className="studentSection">
              <div className="studentSectionHead">
                <h2>Practice zone</h2>
                <button className="studentSecondary">Open daily quiz</button>
              </div>
              <div className="studentGrid">
                <div className="studentCard">
                  <div className="studentCardTitle">Topic-wise question bank</div>
                  <p className="studentCardDesc">Pick a topic and drill with instant explanations.</p>
                  <button className="studentGhost">Start practice</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">Mistake diary</div>
                  <p className="studentCardDesc">Auto-saves wrong answers with the fix.</p>
                  <button className="studentGhost">Review mistakes</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">Weak-area trainer</div>
                  <p className="studentCardDesc">Auto-generates questions from low-score topics.</p>
                  <button className="studentGhost">Train now</button>
                </div>
              </div>
            </section>

            <section className="studentSection">
              <div className="studentSectionHead">
                <h2>AI Tutor</h2>
                <button className="studentPrimary">Ask LevelUp AI</button>
              </div>
              <div className="studentAiPanel">
                <div>
                  <div className="studentAiTitle">Explain it my way</div>
                  <p className="studentCardDesc">
                    Get explanations for exams, interviews, or like you’re 10. Turn any topic into notes,
                    flashcards, or mini-quizzes instantly.
                  </p>
                  <div className="studentAiActions">
                    <button className="studentGhost">Explain topic</button>
                    <button className="studentGhost">Make short notes</button>
                    <button className="studentGhost">Generate quiz</button>
                  </div>
                </div>
                <div className="studentAiHighlight">
                  <div className="studentAiMetric">AI Response</div>
                  <div className="studentAiValue">2.1s</div>
                  <div className="studentAiMeta">Avg response time</div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "analytics" && (
          <>
            <section className="studentSection">
              <div className="studentSectionHead">
                <h2>Assignments & submissions</h2>
                <button className="studentSecondary">View all</button>
              </div>
              <div className="studentGrid">
                <div className="studentCard">
                  <div className="studentCardTitle">DBMS Assignment 3</div>
                  <p className="studentCardDesc">Due in 6 hours • 40 marks</p>
                  <button className="studentPrimary">Upload now</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">CN Lab Report</div>
                  <p className="studentCardDesc">Submitted • Feedback pending</p>
                  <button className="studentGhost">View status</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">OS Mini Project</div>
                  <p className="studentCardDesc">Needs correction • 2 comments</p>
                  <button className="studentGhost">Fix & resubmit</button>
                </div>
              </div>
            </section>

            <section className="studentSection">
              <div className="studentSectionHead">
                <h2>Community & doubts</h2>
                <button className="studentSecondary">Ask a question</button>
              </div>
              <div className="studentGrid">
                <div className="studentCard">
                  <div className="studentCardTitle">DSA - Sliding Window</div>
                  <p className="studentCardDesc">5 replies • last activity 2h ago</p>
                  <button className="studentGhost">Open thread</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">DBMS Normalization Doubt</div>
                  <p className="studentCardDesc">Accepted answer by Mentor</p>
                  <button className="studentGhost">View answer</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">Placement Prep Group</div>
                  <p className="studentCardDesc">Daily tips + mock tests</p>
                  <button className="studentGhost">Join now</button>
                </div>
              </div>
            </section>

            <section className="studentSection">
              <div className="studentSectionHead">
                <h2>Progress analytics</h2>
                <button className="studentSecondary">Weekly report</button>
              </div>
              <div className="studentGrid">
                <div className="studentCard">
                  <div className="studentCardTitle">Weekly learning</div>
                  <p className="studentCardDesc">6h 20m • 4 courses • 88% accuracy</p>
                  <button className="studentGhost">View insights</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">Goal: Finish DBMS in 14 days</div>
                  <p className="studentCardDesc">On track • 5 lessons left</p>
                  <button className="studentGhost">Update goal</button>
                </div>
                <div className="studentCard">
                  <div className="studentCardTitle">Badges unlocked</div>
                  <p className="studentCardDesc">7-day streak • 100 MCQs • 5 quizzes</p>
                  <button className="studentGhost">View badges</button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
