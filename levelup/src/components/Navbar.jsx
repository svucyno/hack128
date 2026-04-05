import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openContact = () => scrollToId("contact");
  const openFeatures = () => scrollToId("features");

  return (
    <header style={{ ...styles.header, ...(scrolled ? styles.headerScrolled : {}) }}>
      <nav style={styles.nav}>
        <div style={styles.brand} onClick={() => scrollToId("home")} role="button" tabIndex={0}>
          <div style={styles.badge}>▲</div>
          <div>
            <div style={styles.brandTitle}>LevelUp</div>
            <div style={styles.brandSub}>LMS • Dino Devs</div>
          </div>
        </div>

        <div style={styles.links}>
          <button style={styles.linkBtn} onClick={() => scrollToId("features")}>Features</button>
          <button style={styles.linkBtn} onClick={() => scrollToId("how")}>How It Works</button>
          <button style={styles.linkBtn} onClick={() => scrollToId("faq")}>FAQ</button>
          <button style={styles.linkBtn} onClick={() => scrollToId("team")}>Team</button>
        </div>

        <div style={styles.actions}>
          <button style={styles.secondaryBtn} className="btn-secondary" onClick={openFeatures}>
            Explore
          </button>
          <button style={styles.primaryBtn} className="btn-primary" onClick={openContact}>
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    padding: "14px 18px",
    transition: "all 180ms ease",
    background: "rgba(5, 10, 16, 0.35)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  headerScrolled: {
    background: "rgba(5, 10, 16, 0.72)",
    borderBottom: "1px solid rgba(120,255,160,0.12)",
  },
  nav: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "rgba(120,255,160,0.14)",
    border: "1px solid rgba(120,255,160,0.25)",
    color: "rgba(120,255,160,0.95)",
    fontWeight: 900,
  },
  brandTitle: { color: "white", fontWeight: 800, letterSpacing: 0.2, lineHeight: 1 },
  brandSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  links: { display: "flex", gap: 10, alignItems: "center" },
  linkBtn: {
    background: "transparent",
    border: "1px solid transparent",
    color: "rgba(255,255,255,0.80)",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 160ms ease",
  },
  actions: { display: "flex", gap: 10, alignItems: "center" },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 160ms ease",
  },
  primaryBtn: {
    background: "linear-gradient(90deg, rgba(120,255,160,0.95), rgba(120,255,160,0.65))",
    border: "1px solid rgba(120,255,160,0.35)",
    color: "#071018",
    padding: "9px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
    transition: "all 160ms ease",
  },
};
