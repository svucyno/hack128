import "./introLogo.css";
import logoImage from "../assets/images/intro.png";

export default function IntroLogo() {
  return (
    <div className="introWrap">
      <div className="introGlow" />
      <div className="introParticles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} className={`particle particle-${index + 1}`} />
        ))}
      </div>
      <div className="introCenter">
        <div className="mark">
          <img className="introImage" src={logoImage} alt="LevelUp Dino logo" />
        </div>
      </div>
    </div>
  );
}
