import type { CSSProperties } from "react";
import { prisma } from "@/lib/db/prisma";

const td: CSSProperties = {
  padding: "14px 20px",
  fontSize: "14px",
  color: "#44403c",
  verticalAlign: "top",
};

const th: CSSProperties = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 600,
  color: "#78716c",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

/** Live rows from StudiosGatewayAccessRequest (public /amihuman/studios intake). */
export async function StudiosGatewayAccessRequestsSection() {
  const rows = await prisma.studiosGatewayAccessRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      interestType: true,
      sourceRoute: true,
      attemptedAction: true,
      intendedHref: true,
      visitorType: true,
      note: true,
      referrer: true,
    },
  });

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid #ece9e3",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #f5f4f0",
          background: "#fafaf9",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 600, color: "#1c1917" }}>
          Gateway access requests (/amihuman/studios)
        </span>
        <span style={{ fontSize: "12px", color: "#a8a29e" }}>{rows.length} shown</span>
      </div>

      {rows.length === 0 ? (
        <p style={{ padding: "20px 24px", margin: 0, fontSize: "14px", color: "#78716c" }}>
          No studios access requests recorded yet — submissions appear here via{" "}
          <code>/api/studios/gateway/access-request</code>.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafaf9" }}>
              <th style={th}>When</th>
              <th style={th}>Contact</th>
              <th style={th}>Intent</th>
              <th style={th}>Interest</th>
              <th style={{ ...th, textAlign: "left" }}>Note</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f5f4f0" }}>
                <td style={td}>
                  {r.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                  <div style={{ fontSize: "12px", color: "#a8a29e" }}>{r.email}</div>
                  {r.phone ? <div style={{ fontSize: "12px", marginTop: "4px" }}>{r.phone}</div> : null}
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{r.attemptedAction ?? "—"}</div>
                  {r.intendedHref ? (
                    <div style={{ fontSize: "11px", color: "#a8a29e", wordBreak: "break-all", marginTop: "4px" }}>{r.intendedHref}</div>
                  ) : null}
                  <div style={{ fontSize: "10px", color: "#a8a29e", marginTop: "6px" }}>
                    {r.sourceRoute} · visitor: {r.visitorType}
                  </div>
                </td>
                <td style={td}>{r.interestType}</td>
                <td style={{ ...td, maxWidth: "220px", fontSize: "13px", lineHeight: 1.45 }}>{r.note ?? "—"}</td>
                <td style={td}>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
