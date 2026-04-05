export default function TeacherNavbar() {
  const navTo = (hash) => {
    window.location.hash = hash;
  };

  return (
    <header className="teacherHeader">
      <div className="teacherBrand" onClick={() => navTo("#/teacher")} role="button" tabIndex={0}>
        <div className="teacherBadge">▲</div>
        <div>
          <div className="teacherTitle">LevelUp LMS</div>
          <div className="teacherSub">Teacher Portal</div>
        </div>
      </div>
      <nav className="teacherNav">
        <button className="teacherLink" onClick={() => navTo("#/teacher")}>Dashboard</button>
        <button className="teacherLink" onClick={() => navTo("#/teacher-courses")}>Courses</button>
        <button className="teacherLink" onClick={() => navTo("#/teacher-assignments")}>Assignments</button>
        <button className="teacherLink" onClick={() => navTo("#/teacher-quizzes")}>Quizzes</button>
        <button className="teacherLink" onClick={() => navTo("#/teacher-analytics")}>Analytics</button>
        <button className="teacherLink" onClick={() => navTo("#/teacher-profile")}>Profile</button>
      </nav>
    </header>
  );
}
