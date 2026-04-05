import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { cn } from "../utils/cn";

const LIGHT_SWATCHES = ["#FF2D8D", "#007BFF", "#8A2BE2", "#FFD60A", "#FF7A00"];

export default function ThemeToggle({ className = "", compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn("theme-toggle", compact && "theme-toggle--compact", className)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>

      {!compact ? (
        <>
          <span className="theme-toggle__copy">
            <span className="theme-toggle__title">{isDark ? "Dark Theme" : "Light Theme"}</span>
            <span className="theme-toggle__hint">
              {isDark ? "Switch to light" : "Switch to dark"}
            </span>
          </span>
          <span className="theme-toggle__swatches" aria-hidden="true">
            {LIGHT_SWATCHES.map((swatch) => (
              <span
                key={swatch}
                className="theme-toggle__swatch"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </span>
        </>
      ) : (
        <span className="theme-toggle__compact-label">{isDark ? "Light" : "Dark"}</span>
      )}
    </button>
  );
}
