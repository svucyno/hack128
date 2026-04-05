import StudentNavbar from "../../components/StudentNavbar";
import { courses } from "../../data/courses";

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

export default function CourseDetail({ courseId }) {
  const course = courses.find((item) => item.id === courseId);

  if (!course) {
    return (
      <div className="studentPage">
        <StudentNavbar />
        <main className="studentMain">
          <div className="studentEmpty">Course not found.</div>
        </main>
      </div>
    );
  }

  const handleAdd = () => {
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
        <section className="detailHero">
          <div>
            <div className="studentKicker">{course.category}</div>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            <div className="detailMeta">
              <span>Level: {course.level}</span>
              <span>Duration: {course.duration}</span>
              <span>⭐ {course.rating} rating</span>
              <span>{course.students}+ learners</span>
            </div>
            <div className="detailActions">
              <button className="studentPrimary" onClick={handleAdd}>Add to Cart</button>
              <button className="studentGhost" onClick={() => (window.location.hash = "#/student")}>
                Back to Catalog
              </button>
            </div>
          </div>
          <div className="detailCard">
            <div className="detailPrice">₹{course.price}</div>
            <div className="detailInfo">One-time purchase • Lifetime access</div>
            <ul className="detailList">
              <li>Full syllabus coverage</li>
              <li>Quiz + assignments</li>
              <li>Certificate on completion</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
