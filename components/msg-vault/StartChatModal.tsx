"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, MessageCirclePlus, Search } from "lucide-react";
import {
  fetchAllowedChatContacts,
  startDirectConversation,
  MsgVaultApiError,
  type AllowedChatContact,
} from "@/lib/msg-vault/api-client";
import type { MsgConversationDTO } from "@/types/msg-vault";

interface Props {
  open: boolean;
  onClose: () => void;
  onStarted: (conversation: MsgConversationDTO) => void;
}

export function StartChatModal({ open, onClose, onStarted }: Props) {
  const [contacts, setContacts] = useState<AllowedChatContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAllowedChatContacts();
      setContacts(list);
    } catch (err) {
      setContacts([]);
      setError(
        err instanceof MsgVaultApiError
          ? err.message
          : "Could not load your trusted contacts.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setFilter("");
      void load();
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q),
    );
  }, [contacts, filter]);

  async function handlePick(contact: AllowedChatContact) {
    setStartingId(contact.userId);
    setError("");
    try {
      const conversation = await startDirectConversation(contact.userId);
      onStarted(conversation);
      onClose();
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : "Could not start chat.");
    } finally {
      setStartingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-chat-title"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         50,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        16,
        background:     "rgba(0,0,0,0.45)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:         "100%",
          maxWidth:      440,
          maxHeight:     "80vh",
          background:    "#fff",
          borderRadius:  18,
          border:        "1px solid #ece9e3",
          boxShadow:     "0 12px 40px rgba(0,0,0,0.15)",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "18px 20px",
            borderBottom:   "1px solid #f5f4f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCirclePlus style={{ width: 20, height: 20, color: "#6366f1" }} />
            <h2 id="start-chat-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Start a chat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    4,
              color:      "#78716c",
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: "12px 20px 0" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#57534e", lineHeight: 1.5 }}>
            Only people already in your family trust network appear here. There is no public
            search or stranger messaging.
          </p>
          <div style={{ position: "relative" }}>
            <Search
              style={{
                position:  "absolute",
                left:      12,
                top:       "50%",
                transform: "translateY(-50%)",
                width:     16,
                height:    16,
                color:     "#a8a29e",
              }}
            />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter your trusted contacts…"
              style={{
                width:        "100%",
                padding:      "10px 12px 10px 36px",
                borderRadius: 12,
                border:       "1px solid #e7e5e4",
                fontSize:     14,
              }}
            />
          </div>
        </div>

        {error && (
          <p style={{ margin: "10px 20px 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "12px 12px 16px" }}>
          {loading ? (
            <p style={{ padding: 12, fontSize: 13, color: "#a8a29e" }}>Loading trusted contacts…</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1c1917" }}>
                {contacts.length === 0 ? "No one to message yet" : "No matches"}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c", lineHeight: 1.5 }}>
                {contacts.length === 0
                  ? "Invite family or join a trust unit first. Messaging opens only after a governed relationship exists."
                  : "Try a different name from your trusted list."}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {filtered.map((c) => (
                <li key={c.userId} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    disabled={startingId !== null}
                    onClick={() => void handlePick(c)}
                    style={{
                      width:        "100%",
                      textAlign:    "left",
                      padding:      "12px 14px",
                      borderRadius: 12,
                      border:       "1px solid #ece9e3",
                      background:   "#fafaf9",
                      cursor:       startingId ? "wait" : "pointer",
                      opacity:      startingId && startingId !== c.userId ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>
                      {c.firstName} {c.lastName}
                      {c.existingConversationId && (
                        <span style={{ fontWeight: 500, color: "#6366f1", marginLeft: 6 }}>
                          · open chat
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>
                      {c.reasons[0]}
                      {startingId === c.userId ? " · opening…" : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
