/** Safe fingerprint for “which Postgres am I talking to?” — host:port only, no credentials. */
export function getDatabaseHostHint(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || raw.length < 8) return "not-set";
  const at = raw.indexOf("@");
  if (at === -1) return "unparsed";
  let rest = raw.slice(at + 1);
  const slash = rest.indexOf("/");
  if (slash !== -1) rest = rest.slice(0, slash);
  return rest.split("?")[0] || "unparsed";
}
