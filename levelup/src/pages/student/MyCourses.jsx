import StudentNavbar from "../../components/StudentNavbar";

function getPurchased() {
  try {
    return JSON.parse(sessionStorage.getItem("purchased") || "[]");
  } catch {
    return [];
  }
}

export default function MyCourses() {
  const courses = getPurchased();

  return (
    <div className="studentPage">
      <StudentNavbar />
      <main className="studentMain">
        <section className="studentSection">
          <h2>My Courses</h2>
          {!courses.length ? (
            <div className="studentEmpty">No courses yet. Purchase from the catalog.</div>
          ) : (
            <div className="studentGrid">
              {courses.map((course) => (
                <div key={course.id} className="studentCard">
                  <div className="studentCardTop">
                    <span className="studentTag">{course.category}</span>
                    <span className="studentLevel">{course.level}</span>
                  </div>
                  <div className="studentCardTitle">{course.title}</div>
                  <p className="studentCardDesc">{course.description}</p>
                  <div className="studentCardFooter">
                    <button
                      className="studentPrimary"
                      onClick={() => (window.location.hash = `#/course/${course.id}`)}
                    >
                      Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
