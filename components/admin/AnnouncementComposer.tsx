"use client";

import { useState, useEffect } from "react";
import { Megaphone, X, CheckCircle } from "lucide-react";

type Announcement = { id: string; title: string; body: string; isActive: boolean; createdAt: string };

export function AnnouncementComposer() {
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((data) => { if (data.announcement) setCurrent(data.announcement); });
  }, []);

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and body are both required."); return; }
    setSaving(true); setError("");

    const res = await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();

    if (res.ok) {
      setCurrent(data.announcement);
      setTitle(""); setBody("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(data.error ?? "Could not publish.");
    }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!current) return;
    await fetch("/api/admin/announcement", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, isActive: false }),
    });
    setCurrent(null);
  };

  return (
    <div style={{
      background: "white", borderRadius: "16px",
      border: "1px solid #ece9e3", overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {/* Section header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #f5f4f0",
        display: "flex", alignItems: "center", gap: "8px",
        background: "linear-gradient(90deg, #fffbeb, #fff)",
      }}>
        <Megaphone style={{ width: 15, height: 15, color: "#d97706" }} />
        <span style={{ fontWeight: 700, fontSize: "13px", color: "#92400e" }}>
          Site Announcement
        </span>
        <span style={{ fontSize: "12px", color: "#a8a29e", marginLeft: "4px" }}>
          — shown to all members on login &amp; vault pages
        </span>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Active announcement preview */}
        {current && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: "12px", padding: "14px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                  ● Live now
                </p>
                <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "14px", marginBottom: "4px" }}>
                  {current.title}
                </p>
                <p style={{ color: "#57534e", fontSize: "13px", lineHeight: 1.5 }}>
                  {current.body}
                </p>
              </div>
              <button
                onClick={handleDeactivate}
                title="Deactivate announcement"
                style={{
                  padding: "5px", background: "none", border: "1px solid #fde68a",
                  borderRadius: "8px", cursor: "pointer", color: "#92400e", flexShrink: 0, lineHeight: 0,
                }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>
        )}

        {/* Compose form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "12px", color: "#78716c", margin: 0 }}>
            {current ? "Replace with a new announcement:" : "Compose a new announcement:"}
          </p>

          {error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short headline…"
            maxLength={80}
            style={{
              padding: "9px 12px", borderRadius: "10px", border: "1px solid #e7e5e4",
              fontSize: "14px", fontWeight: 600, outline: "none", width: "100%", boxSizing: "border-box",
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full message body shown in the modal…"
            rows={4}
            maxLength={800}
            style={{
              padding: "9px 12px", borderRadius: "10px", border: "1px solid #e7e5e4",
              fontSize: "13px", resize: "vertical", outline: "none", width: "100%", boxSizing: "border-box",
              lineHeight: 1.6,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handlePublish}
              disabled={saving}
              style={{
                padding: "9px 20px", borderRadius: "10px",
                background: "#1c1917", color: "white",
                fontSize: "13px", fontWeight: 700, border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Publishing…" : current ? "Replace & Publish" : "Publish"}
            </button>
            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#16a34a", fontSize: "13px", fontWeight: 600 }}>
                <CheckCircle style={{ width: 14, height: 14 }} /> Published
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
