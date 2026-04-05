export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.top}>
          {/* Left */}
          <div style={styles.brand}>
            <div style={styles.logo}>▲</div>
            <div>
              <div style={styles.title}>LevelUp LMS</div>
              <div style={styles.sub}>Learn. Grow. Dominate.</div>
            </div>
          </div>

          {/* Links */}
          <div style={styles.cols}>
            <div>
              <div style={styles.colTitle}>Product</div>
              <a style={styles.link} href="#features">Features</a>
              <a style={styles.link} href="#courses">Courses</a>
              <a style={styles.link} href="#pricing">Pricing</a>
            </div>

            <div>
              <div style={styles.colTitle}>Company</div>
              <a style={styles.link} href="#team">Team</a>
              <a style={styles.link} href="#contact">Contact</a>
              <a style={styles.link} href="#about">About</a>
            </div>

            <div>
              <div style={styles.colTitle}>Legal</div>
              <a style={styles.link} href="#privacy">Privacy</a>
              <a style={styles.link} href="#terms">Terms</a>
              <a style={styles.link} href="#refund">Refund</a>
            </div>
          </div>
        </div>

        <div style={styles.bottom}>
          <div style={styles.copy}>© {year} LevelUp LMS — Built by Dino Devs</div>

          <div style={styles.social}>
            <a style={styles.socialBtn} href="#linkedin" aria-label="LinkedIn">in</a>
            <a style={styles.socialBtn} href="#github" aria-label="GitHub">⌂</a>
            <a style={styles.socialBtn} href="#youtube" aria-label="YouTube">▶</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    marginTop: 80,
    padding: "38px 18px",
    background: "radial-gradient(circle at 20% 0%, rgba(120,255,160,0.10), transparent 40%), #050A10",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
    paddingBottom: 22,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  brand: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 260,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(120,255,160,0.14)",
    border: "1px solid rgba(120,255,160,0.25)",
    color: "rgba(120,255,160,0.95)",
    fontWeight: 900,
  },
  title: {
    color: "white",
    fontWeight: 900,
    letterSpacing: 0.2,
    lineHeight: 1,
  },
  sub: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    fontSize: 13,
  },
  cols: {
    display: "flex",
    gap: 48,
    flexWrap: "wrap",
  },
  colTitle: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    marginBottom: 10,
  },
  link: {
    display: "block",
    color: "rgba(255,255,255,0.70)",
    textDecoration: "none",
    margin: "8px 0",
    fontSize: 14,
  },
  bottom: {
    paddingTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  copy: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 13,
  },
  social: {
    display: "flex",
    gap: 10,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.85)",
    textDecoration: "none",
    fontWeight: 800,
  },
};
