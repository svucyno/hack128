import TeacherNavbar from "../../components/TeacherNavbar";

export default function TeacherAssignments() {
  return (
    <div className="teacherPage">
      <TeacherNavbar />
      <main className="teacherMain">
        <section className="teacherHero teacherHeroCompact">
          <div className="teacherHeroGlow" />
          <div className="teacherHeroContent">
            <div className="teacherKicker">Assignments</div>
            <h1>Grade, return, and track submissions.</h1>
            <p>Deadlines, rubric, resubmissions, and comments in one place.</p>
          </div>
        </section>
        <section className="teacherGrid">
          <div className="teacherCard">
            <div className="teacherCardTitle">Pending grading</div>
            <p>DBMS Assignment 3 · 6 submissions</p>
            <button className="teacherPrimary">Open queue</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Rubric templates</div>
            <p>Create rubric-based grading to save time.</p>
            <button className="teacherGhost">Manage rubric</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Plagiarism check</div>
            <p>Run similarity check for new submissions.</p>
            <button className="teacherGhost">Run scan</button>
          </div>
        </section>
      </main>
    </div>
  );
}
