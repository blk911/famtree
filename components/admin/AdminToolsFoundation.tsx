import type { OpsLine } from "@/lib/admin/opsCatalog";
import type { RuntimeFoundationSnapshot } from "@/lib/admin/foundationSnapshot";
import { deployIncludesAdminVideoPreview } from "@/lib/admin/buildMarkers";

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  overflow: "hidden" as const,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", fontSize: "12px", lineHeight: 1.45 }}>
      <span style={{ width: "52px", flexShrink: 0, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em", paddingTop: "2px" }}>
        {label}
      </span>
      <span style={{ color: "#292524", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function OpsBlock(item: OpsLine) {
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 800, color: "#0f1729" }}>{item.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Row label="When" value={item.when} />
        <Row label="What" value={item.what} />
        <Row label="Why" value={item.why} />
        <Row label="Where" value={item.where} />
      </div>
    </div>
  );
}

type Props = {
  snapshot: RuntimeFoundationSnapshot;
  userCount: number;
  inviteCount: number;
  pendingInvites: number;
  scriptOps: OpsLine[];
  toolOps: OpsLine[];
};

export function AdminToolsFoundation({
  snapshot,
  userCount,
  inviteCount,
  pendingInvites,
  scriptOps,
  toolOps,
}: Props) {
  const shaDisplay = snapshot.vercelGitCommitSha
    ? `${snapshot.vercelGitCommitSha.slice(0, 7)}…`
    : "(unset — use VERCEL_GIT_COMMIT_SHA / CI_SHAs on hosted builds)";

  const deployUrl = snapshot.vercelUrl ? `https://${snapshot.vercelUrl}` : "—";
  const hasVideoPreview = deployIncludesAdminVideoPreview();

  const svcBlocks: OpsLine[] = [
    {
      title: "App runtime",
      when: "Every page load (snapshot taken server-side).",
      what: `famtree v${snapshot.appVersion} · Next ${snapshot.nextVersion} · Node ${snapshot.nodeVersion}`,
      why: "Confirms which framework/runtime built this response.",
      where: "`package.json` + server process",
    },
    {
      title: "Deployment / Git",
      when: "Compare laptop vs hosted builds.",
      what: `Vercel env: ${snapshot.vercelEnv ?? "—"} · ref: ${snapshot.vercelGitCommitRef ?? "—"} · SHA: ${shaDisplay}${hasVideoPreview ? " · intro preview ✓" : " · intro preview missing (redeploy main)"}`,
      why: hasVideoPreview
        ? "Trace UI behavior to a commit."
        : "Hosted build is behind — member intro preview card and recent fixes may not be live.",
      where: `Deploy URL: ${deployUrl} · full SHA from env VERCEL_GIT_COMMIT_SHA`,
    },
    {
      title: "Postgres (this server)",
      when: "Before destructive SQL or bond fixes.",
      what: `Host: ${snapshot.databaseHost} · users ${userCount}, invites ${inviteCount} (${pendingInvites} pending)`,
      why: "Fingerprint DB without exposing credentials.",
      where: "`DATABASE_URL` host · counts via Prisma",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <p style={{ margin: 0, fontSize: "12px", color: "#78716c", lineHeight: 1.55 }}>
        <strong style={{ color: "#57534e" }}>TOOLS / SCRIPTS / SVC</strong> — reference only. NPM scripts run from a developer shell or CI;
        nothing here executes them. Checked <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{snapshot.checkedAt}</span>
      </p>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#9a3412", letterSpacing: "0.06em" }}>
          SVC · foundation
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {svcBlocks.map((b) => (
            <OpsBlock key={b.title} {...b} />
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#7c3aed", letterSpacing: "0.06em" }}>
          SCRIPTS · CLI
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {scriptOps.map((b) => (
            <OpsBlock key={b.title} {...b} />
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#0369a1", letterSpacing: "0.06em" }}>
          TOOLS · APIs & docs
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {toolOps.map((b) => (
            <OpsBlock key={b.title} {...b} />
          ))}
        </div>
      </section>
    </div>
  );
}
