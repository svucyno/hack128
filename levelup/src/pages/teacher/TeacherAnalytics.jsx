import TeacherNavbar from "../../components/TeacherNavbar";

export default function TeacherAnalytics() {
  return (
    <div className="teacherPage">
      <TeacherNavbar />
      <main className="teacherMain">
        <section className="teacherHero teacherHeroCompact">
          <div className="teacherHeroGlow" />
          <div className="teacherHeroContent">
            <div className="teacherKicker">Analytics</div>
            <h1>Track class performance and weak topics.</h1>
            <p>Weekly reports, attendance, and top performers in one view.</p>
          </div>
        </section>
        <section className="teacherGrid">
          <div className="teacherCard">
            <div className="teacherCardTitle">Class performance</div>
            <p>84% avg · 6 topics need attention</p>
            <button className="teacherGhost">View report</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Engagement</div>
            <p>78% attendance · 4h avg watch time</p>
            <button className="teacherGhost">View engagement</button>
          </div>
          <div className="teacherCard">
            <div className="teacherCardTitle">Top performers</div>
            <p>Top 10 students with 90%+ scores</p>
            <button className="teacherGhost">View list</button>
          </div>
        </section>
      </main>
    </div>
  );
}
