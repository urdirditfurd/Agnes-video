export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0f14",
        color: "#e8eef5",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480, padding: 24 }}>
        <p style={{ letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6, fontSize: 12 }}>
          Trading Dashboard
        </p>
        <h1 style={{ fontSize: 28, margin: "12px 0" }}>Infrastructure prête</h1>
        <p style={{ opacity: 0.75, lineHeight: 1.5 }}>
          Stub frontend (étape 2). Le dashboard Next.js + Tailwind + Shadcn sera
          généré après validation des étapes 1–2.
        </p>
      </div>
    </main>
  );
}
