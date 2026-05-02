import { STUDIOS_FOOTER_COLUMNS } from "@/lib/studios/footerColumns";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

export function StudiosFooter() {
  return (
    <footer
      style={{
        padding: "72px 24px 40px",
        background: "#fff",
        borderTop: `1px solid ${STUDIOS_LINE}`,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "36px",
            marginBottom: "52px",
          }}
        >
          {STUDIOS_FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: STUDIOS_INK,
                  marginBottom: "16px",
                }}
              >
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.items.map((item) => (
                  <li key={item}>
                    <span style={{ fontSize: "14px", color: STUDIOS_MUTED }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: "28px",
            borderTop: `1px solid ${STUDIOS_LINE}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "13px", color: STUDIOS_MUTED }}>
            © {new Date().getFullYear()} AIH Studios — A surface of AmIHuman.NET
          </div>
          <div style={{ fontSize: "13px", color: STUDIOS_MUTED }}>Made in Denver, Colorado</div>
        </div>
      </div>
    </footer>
  );
}
