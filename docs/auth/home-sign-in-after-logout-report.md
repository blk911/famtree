# Home page sign-in after logout — debug report

**Date:** 2026-05-20  
**Scenario:** Invite sent → Spencer logs out → `/` home Sign In does not work

## Root causes

### 1. Stale session cookie after logout
`router.push("/")` + `router.refresh()` after logout could leave an orphaned `amihuman_session` JWT in the browser (session row deleted, cookie still present). Home login then set a new session while the old cookie confused edge middleware on later navigations.

**Fix:** Logout uses `credentials: "include"` and `window.location.assign("/")` for a full navigation (`AppSidebar`, `TopBarUser`). Home mounts a cleanup that calls `POST /api/auth/logout` when `GET /api/auth/me` returns 401.

### 2. Sign-in modal stacking / visibility
Home modals rendered deep inside `<main>` with `z-index: 50`, which could sit under other layers on long pages. Portal delay also meant the modal was not immediately interactive.

**Fix:** `HomeModalShell` now portals to `document.body` with `z-index: 200`, `role="dialog"`, and body scroll lock while open.

### 3. Password autofill vs React state
Controlled inputs could submit empty `password` when the browser autofilled without firing `onChange`.

**Fix:** `handleLogin` reads `FormData` from the form (`name="email"`, `name="password"`) with `autoComplete` attributes.

### 4. Login API body safety
`withApiTrace` can interfere with `req.json()` on some Next.js stacks.

**Fix:** `/api/auth/login` uses `withApiTraceLite`.

## Files changed

- `components/HomeClient.tsx`
- `components/AppSidebar.tsx`
- `components/TopBarUser.tsx`
- `app/api/auth/login/route.ts`

## Verification (local)

1. Log in → Invite → Log out → lands on `/`
2. Click **Sign In** → modal opens (portal)
3. Submit credentials → redirects to `/admin` or `/dashboard`
4. `POST /api/auth/login` returns `Set-Cookie: amihuman_session=...`

Fallback link added: **Use the full sign-in page** → `/login`
