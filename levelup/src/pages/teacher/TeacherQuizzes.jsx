import TeacherNavbar from "../../components/TeacherNavbar";

export default function TeacherQuizzes() {
  return (
    <div className="teacherPage">
      <TeacherNavbar />
      <main className="teacherMain">
        <section className="teacherHero teacherHeroCompact">
          <div className="teacherHeroGlow" />
          <div className="teacherHeroContent">
            <div className="teacherKicker">Quizzes</div>
            <h1>Build timed MCQ quizzes with auto grading.</h1>
            <p>Question bank reuse, difficulty levels, and randomized questions.</p>
          </div>
        </section>
        <section className="teacherGrid">
          <div className="teacherCard">
            <div className="teacherCardTitle">Quiz Builder</div>
            <p>Create a new quiz in minutes with templates.</p>
            <button className="teacherPrimary">Create quiz</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Question Bank</div>
            <p>Reuse your best questions across courses.</p>
            <button className="teacherGhost">Open bank</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Results Analytics</div>
            <p>View scores, accuracy, and difficulty breakdown.</p>
            <button className="teacherGhost">View results</button>
          </div>
        </section>
      </main>
    </div>
  );
}
