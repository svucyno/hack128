export default function RoleSelectPage() {
  const handleSelect = (role) => {
    sessionStorage.setItem("signupRole", role);
    window.location.hash = "#/signup";
  };

  return (
    <div className="authPage authPageSignup">
      <div className="fireGlow" />
      <div className="fireParticles" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="fireParticle" />
        ))}
      </div>
      <main className="authMain">
        <div className="roleSelectCard">
          <div className="authKicker">Get started</div>
          <h1 className="authTitle">Select your role</h1>
          <p className="authSub">We’ll personalize your signup experience based on your role.</p>

          <div className="roleGrid">
            <button className="roleCard" type="button" onClick={() => handleSelect("student")}>
              <div className="roleTitle">Student</div>
              <div className="roleSub">Track courses, quizzes, and streaks</div>
            </button>
            <button className="roleCard" type="button" onClick={() => handleSelect("teacher")}>
              <div className="roleTitle">Teacher</div>
              <div className="roleSub">Create courses, grade, and manage learners</div>
            </button>
          </div>

          <div className="authFooter">
            Already have an account?{" "}
            <button className="authLink" type="button" onClick={() => (window.location.hash = "#/login")}>
              Sign in
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
