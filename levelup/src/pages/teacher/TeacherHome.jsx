const navItems = [
  { label: "Dashboard", hash: "#/teacher" },
  { label: "My Courses", hash: "#/teacher-courses" },
  { label: "Create Course", hash: "#/teacher-courses" },
  { label: "Students", hash: "#/teacher" },
  { label: "Analytics", hash: "#/teacher-analytics" },
  { label: "Assignments", hash: "#/teacher-assignments" },
  { label: "Exams", hash: "#/teacher-quizzes" },
  { label: "Messages", hash: "#/teacher" },
  { label: "Settings", hash: "#/teacher-profile" },
];

export default function TeacherHome() {
  const navTo = (hash) => {
    window.location.hash = hash;
  };

  return (
    <div className="teacherPage">
      <div className="teacherStudio">
        <aside className="teacherSideNav">
          <div className="teacherSideBrand">
            <div className="teacherSideLogo">LU</div>
            <div>
              <div className="teacherSideTitle">LevelUp LMS</div>
              <span>Teacher Studio</span>
            </div>
          </div>
          <div className="teacherSideList">
            {navItems.map((item, index) => (
              <button
                key={item.label}
                className={`teacherSideItem ${index === 0 ? "is-active" : ""}`}
                onClick={() => navTo(item.hash)}
              >
                <span className="teacherSideIcon">{item.label.slice(0, 1)}</span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="teacherStudioMain">
          <header className="teacherTopbar">
            <div className="teacherSearch">
              <span>Search courses, students, or lessons</span>
            </div>
            <div className="teacherTopActions">
              <button className="teacherTopButton">Notifications</button>
              <div className="teacherTopProfile">
                <div className="teacherTopAvatar">TD</div>
                <div>
                  <strong>Teacher</strong>
                  <span>Creative studio</span>
                </div>
              </div>
            </div>
          </header>

          <section className="teacherStudioHero">
            <div className="teacherStudioGlow" />
            <div>
              <span className="teacherStudioKicker">Teacher command center</span>
              <h1>I can manage my entire class from here.</h1>
              <p>Courses, assignments, and analytics — all in one glance.</p>
            </div>
            <div className="teacherStudioCtas">
              <button className="teacherPrimary">Create new course</button>
              <button className="teacherSecondary">View gradebook</button>
            </div>
          </section>

          <section className="teacherStudioMetrics">
            <div className="teacherStudioKpi">
              <span>Courses</span>
              <strong>4</strong>
              <small>+1 this month</small>
            </div>
            <div className="teacherStudioKpi">
              <span>Students</span>
              <strong>186</strong>
              <small>+12 new</small>
            </div>
            <div className="teacherStudioKpi">
              <span>Pending</span>
              <strong>12</strong>
              <small>grading</small>
            </div>
            <div className="teacherStudioKpi">
              <span>Avg score</span>
              <strong>84%</strong>
              <small>↑ 4%</small>
            </div>
          </section>

          <section className="teacherStudioGrid">
            <div className="teacherStudioCenter">
              <div className="teacherStudioCard teacherStudioCardWide">
                <div className="teacherStudioCardHeader">
                  <div>
                    <h2>Advanced Course Builder</h2>
                    <p>Drag modules, upload videos, and design a beautiful learning path.</p>
                  </div>
                  <button className="teacherGhost">Preview</button>
                </div>
                <div className="teacherStudioBuilder">
                  <div className="teacherStudioColumn">
                    <div className="teacherStudioPanel">
                      <div className="teacherStudioPanelTitle">Course structure</div>
                      <div className="teacherTree">
                        <div>
                          <strong>Module 1</strong>
                          <span>Getting started</span>
                        </div>
                        <div>
                          <strong>Lesson 1.1</strong>
                          <span>Intro to DBMS</span>
                        </div>
                        <div>
                          <strong>Lesson 1.2</strong>
                          <span>Normalization</span>
                        </div>
                      </div>
                    </div>
                    <div className="teacherStudioPanel">
                      <div className="teacherStudioPanelTitle">Video upload</div>
                      <div className="teacherUploadProgress">
                        <div>
                          <strong>Uploading</strong>
                          <span>dbms-intro.mp4</span>
                        </div>
                        <div className="teacherProgressBar">
                          <span style={{ width: "72%" }} />
                        </div>
                        <small>72% · 1.2GB / 1.7GB</small>
                      </div>
                    </div>
                    <div className="teacherStudioPanel">
                      <div className="teacherStudioPanelTitle">AI assistant</div>
                      <p>Auto-generate a quiz from this lesson and suggest examples.</p>
                      <button className="teacherPrimary">Generate suggestions</button>
                    </div>
                  </div>
                  <div className="teacherStudioColumn">
                    <div className="teacherStudioPanel teacherStudioEditor">
                      <div className="teacherStudioPanelTitle">Rich text editor</div>
                      <div className="teacherEditorToolbar">
                        <span>B</span>
                        <span>I</span>
                        <span>H2</span>
                        <span>List</span>
                        <span>Link</span>
                      </div>
                      <div className="teacherEditorBody">
                        Write lesson objectives, notes, and key takeaways here...
                      </div>
                    </div>
                    <div className="teacherStudioActions">
                      <button className="teacherStudioActionCard">Add Quiz</button>
                      <button className="teacherStudioActionCard">Add Assignment</button>
                      <button className="teacherStudioActionCard">Add Live Class</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="teacherStudioCard">
                <div className="teacherStudioCardHeader">
                  <div>
                    <h3>Drag & drop modules</h3>
                    <p>Reorder lessons with smooth drag handles.</p>
                  </div>
                  <button className="teacherGhost">Manage modules</button>
                </div>
                <div className="teacherModuleList">
                  <div className="teacherModuleItem">
                    <span>01</span>
                    <div>
                      <strong>Database Basics</strong>
                      <small>4 lessons · 45 mins</small>
                    </div>
                    <button className="teacherGhost">Edit</button>
                  </div>
                  <div className="teacherModuleItem">
                    <span>02</span>
                    <div>
                      <strong>Normalization & ER</strong>
                      <small>6 lessons · 1h 20m</small>
                    </div>
                    <button className="teacherGhost">Edit</button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="teacherStudioRight">
              <div className="teacherStudioCard">
                <div className="teacherStudioCardHeader">
                  <div>
                    <h3>Course performance</h3>
                    <p>Live class stats and engagement.</p>
                  </div>
                </div>
                <div className="teacherChartGlow" />
                <div className="teacherSparkChart">
                  <span style={{ height: "55%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "60%" }} />
                  <span style={{ height: "88%" }} />
                  <span style={{ height: "70%" }} />
                </div>
                <div className="teacherStatRow">
                  <div>
                    <strong>78%</strong>
                    <span>Completion rate</span>
                  </div>
                  <div>
                    <strong>18%</strong>
                    <span>Drop-off</span>
                  </div>
                </div>
              </div>
              <div className="teacherStudioCard">
                <div className="teacherStudioCardHeader">
                  <div>
                    <h3>Student engagement</h3>
                    <p>Realtime interactions this week.</p>
                  </div>
                </div>
                <div className="teacherEngagementList">
                  <div>
                    <strong>312</strong>
                    <span>Questions answered</span>
                  </div>
                  <div>
                    <strong>94%</strong>
                    <span>Lecture watch rate</span>
                  </div>
                  <div>
                    <strong>56</strong>
                    <span>Quiz submissions</span>
                  </div>
                </div>
              </div>
              <div className="teacherStudioCard teacherStudioAction">
                <h3>Launch this course</h3>
                <p>Everything is ready. Publish and start enrolling.</p>
                <button className="teacherPrimary">Publish now</button>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
