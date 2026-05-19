# Msg Vault — API Route Map

**Agent:** 50 — Routes + Services  
**Base path:** `/api/msg-vault`  
**Auth:** Session required (`requireAuth`) on all routes.

All responses use AIH Safe envelopes: `{ ok, data, meta }` or `{ ok: false, error, meta }`.

---

## Conversations

| Method | Path | Description |
|---|---|---|
| `GET` | `/conversations` | List conversations where caller is `ACTIVE` participant. Ordered by `lastMessageAt` / `updatedAt` desc. |
| `POST` | `/conversations` | Create `direct` or `thread` conversation. |
| `GET` | `/conversations/[conversationId]` | Detail + participants + `governanceOverlay`. |
| `GET` | `/conversations/[conversationId]/messages` | Paginated messages (`cursor`, `limit`). |
| `POST` | `/conversations/[conversationId]/messages` | Send message (`bodyText`). |

### POST `/conversations` body

**Direct:**

```json
{ "type": "direct", "targetUserId": "<userId>" }
```

**Thread:**

```json
{
  "type": "thread",
  "trustUnitId": "<trustUnitId>",
  "participantUserIds": ["<userId>", "..."],
  "title": "optional",
  "kind": "THREAD | SPACE_THREAD",
  "visibilityScope": "optional VisibilityScope string"
}
```

---

## Notices

| Method | Path | Description |
|---|---|---|
| `GET` | `/notices` | List caller's notices. Query: `?status=UNREAD|READ|ARCHIVED` (optional). |
| `POST` | `/notices/[noticeId]/read` | Mark notice read (owner only). |

**No public POST** to create notices — use `createNotice()` service internally.

---

## Governance

- Direct create: `canMessage()` + shared trust / guardian / edge rules.
- Thread create: trust unit membership + `enablePrivateThreads` founder flag.
- Send: `assertCanSendMessage()` — minor posting policy proxy, external link rules.
- Detail: `buildGovernanceOverlay()` in GET conversation response.

---

## Error codes

| HTTP | code | When |
|---|---|---|
| 401 | `NOT_AUTHENTICATED` | No session |
| 403 | `FORBIDDEN` | Not a participant / governance deny |
| 404 | `NOT_FOUND` | Missing conversation / notice |
| 422 | `VALIDATION_ERROR` | Invalid body / policy block |
| 500 | `INTERNAL_ERROR` | Unexpected |
