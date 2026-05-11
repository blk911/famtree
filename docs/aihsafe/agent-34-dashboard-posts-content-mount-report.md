# Agent 34 — Dashboard Posts Content Mount

**Branch:** `aihsafe-agent-31-dashboard-vault-consolidation`
**Date:** 2026-05-11
**Scope:** Replace CTA-only placeholders in the Posts and Pvt Feeds tab panels with the actual existing feed components (`FamilyFeedClient`, `PrivateFeedClient`). Create a self-fetching `MyPostsMount` component for the My Posts tab. No new APIs, schema, or backend changes.

---

## 1. Files Modified / Created

| File | Change |
|---|---|
| `components/dashboard/MyPostsMount.tsx` | **Created** — self-fetching client component; calls `/api/profile`, renders posts with `PostCard`; loading skeleton + empty state |
| `components/dashboard/DashboardVaultTabs.tsx` | Rewrote Props interface; imports + mounts `FamilyFeedClient`, `PrivateFeedClient`, `MyPostsMount` in respective panels |
| `app/(app)/dashboard/page.tsx` | New imports, `serializeFeedPost` helper, 3 new parallel fetches, derived `privateMembers`, dead `vaultNewCount` removed, new props passed to `DashboardVaultTabs` |

---

## 2. Tab Panel — Before / After

### Posts (was: CTA buttons only)
**Before:**
```
🔥 N new posts from your family
[  See what's happening →  ]
[  ✏️ Share something       ]
```

**After:**
```
<FamilyFeedClient currentUserId posts={feedPosts} />
```
Full live feed rendered inline — the same component used at `/family-vault/posts`.

---

### Pvt Feeds (was: CTA button only)
**Before:**
```
💬 N new conversations in your circles
[  Open private feeds →  ]
trust units · family circles · governed pods
```

**After:**
```
<PrivateFeedClient currentUserId trustUnits posts members bondPeers />
```
Full thread-based private feed inline — the same component used at `/family-vault/private`.

---

### My Posts (was: link to `/profile`)
**Before:**
```
[User] View My Posts →  (link to /profile)
```

**After:**
```
<MyPostsMount currentUserId />
```
Self-fetching component that calls `/api/profile`, extracts `data.posts ?? data.profile?.posts`, renders each with `PostCard` (canDelete=true). Loading skeleton while fetching.

---

## 3. Data Flow

### `page.tsx` parallel fetch additions

```ts
// Added to Promise.all
getFeedPosts(user.id),          // feedRawPosts
getPrivateFeedPosts(user.id),   // privateRawPosts
getAcceptedBondPeersSafe(user.id), // bondPeers
```

### Serialization

```ts
function serializeFeedPost(post: Awaited<ReturnType<typeof getFeedPosts>>[number]) {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    profile: {
      ...post.profile,
      createdAt: post.profile.createdAt.toISOString(),
      updatedAt: post.profile.updatedAt.toISOString(),
      user: post.profile.user,
    },
  };
}
```
Mirrors the pattern used in `/family-vault/posts/page.tsx` and `/family-vault/private/page.tsx`.

### `privateMembers` derivation
Derived from the already-fetched `members` array (no extra DB query):
```ts
const privateMembers = members.map(m => ({
  id: m.id, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl,
}));
```

### Dead code removed
- `vaultNewCount` variable (was `newPosts.length + newComments.length`, never used after Agent 33's tab simplification)

---

## 4. What Didn't Change

| Item | Reason |
|---|---|
| Invites tab panel | Already renders full activity list — no change needed |
| Family Safe tab panel | Feature bullets + CTA still correct — no change needed |
| `/api/profile` endpoint | Already returns `posts` array — used as-is by `MyPostsMount` |
| Backend / schema / APIs | Mission prohibits changes |
| `DashboardContextRail` | Not in scope |

---

## 5. Validation Results

```
npx tsc --noEmit  →  0 errors
npx next build    →  ✓ Compiled successfully
```
