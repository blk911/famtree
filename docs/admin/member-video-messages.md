# Member video messages (admin repository)

Lightweight **watch-once** intro slot for members on `/dashboard`, managed from admin without redeploying code.

## How it works

1. **Repository** — `member_video_messages` table stores versions (title, caption, MP4 URL, admin notes).
2. **Enable one** — Only one row per slug (`dashboard-intro`) can be `isEnabled` at a time.
3. **Watch once** — `member_video_completions` records `(userId, messageId)` when the video ends.
4. **New version** — Add a row, paste new HeyGen MP4 URL, enable it; members who finished the old ID see the new one.

## Toggles (both required for members to see the gate)

| Switch | Where |
|--------|--------|
| `MEMBER_VIDEO_GATE_ENABLED=true` | Server env (Vercel / `.env`) — master off by default |
| Row **Enabled** + **video URL** set | Admin → `/admin/tools` → Member video messages |

Placeholder rows (no URL) are safe in the repo; members never see them.

## Admin UI

**Settings → Tools & foundation** (`/admin/tools`) — collapsible **Member video messages** panel.

- Add to repository (starts disabled)
- Enable / disable per row
- Internal notes for offline HeyGen exports

## Member UX

- Full-screen modal on dashboard
- Badge from `caption` (default **Watch Once**)
- No dismiss until `<video>` fires `ended`
- Seek-forward is lightly restricted (must watch through)

Founders/admins use `/admin` — they do not get this gate.

## Deploy checklist (test prod)

```bash
npm run db:push
npm run db:generate
```

Set on the environment:

```env
MEMBER_VIDEO_GATE_ENABLED=true
```

Paste HeyGen **direct MP4 URL** (iframe embed completion is unreliable for “must finish”).

## Future slots

Add slugs in `lib/admin/memberVideoMessages.ts` (`MEMBER_VIDEO_SLUGS`) and wire a new surface the same way.
