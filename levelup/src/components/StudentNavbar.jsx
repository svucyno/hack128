export default function StudentNavbar() {
  const navTo = (hash) => {
    window.location.hash = hash;
  };

  return (
    <header className="studentHeader">
      <div className="studentBrand" onClick={() => navTo("#/student")} role="button" tabIndex={0}>
        <div className="studentBadge">▲</div>
        <div>
          <div className="studentTitle">LevelUp LMS</div>
          <div className="studentSub">Student Portal</div>
        </div>
      </div>
      <nav className="studentNav">
        <button className="studentLink" onClick={() => navTo("#/student")}>Catalog</button>
        <button className="studentLink" onClick={() => navTo("#/my-courses")}>My Courses</button>
        <button className="studentLink" onClick={() => navTo("#/cart")}>Cart</button>
        <button className="studentLink" onClick={() => navTo("#/profile")}>Profile</button>
      </nav>
    </header>
  );
}
