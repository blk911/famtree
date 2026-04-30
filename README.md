# 🌳 FamTree — Invite-Only Family Network

A private, invite-only social network for families. Every new member must
correctly identify their inviter from a photo before they can join.

---

## Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| Framework  | Next.js 14 (App Router, TypeScript)   |
| Database   | PostgreSQL + Prisma ORM               |
| Auth       | JWT (jose) + bcryptjs, httpOnly cookie|
| Email      | Resend                                |
| Styling    | Tailwind CSS                          |
| Fuzzy match| Fuse.js (name verification)           |
| Storage    | Local `/public/uploads` (dev) / S3/R2 (prod) |

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd famtree
npm install
```

### 2. Set up environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your DATABASE_URL, JWT_SECRET, and RESEND_API_KEY
```

### 3. Set up the database

```bash
# Push schema to your PostgreSQL instance
npm run db:push

# Generate Prisma client
npm run db:generate

# (Optional) Seed with a founder account
npm run db:seed
# → founder@famtree.test / password123
```

### 4. Run the app

```bash
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
famtree/
├── app/
│   ├── (auth)/               # Login, Register pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                # Authenticated app shell
│   │   ├── layout.tsx        # Sidebar layout
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── invite/page.tsx
│   │   ├── tree/page.tsx
│   │   └── settings/page.tsx
│   ├── invite/[token]/page.tsx  # "Who Am I?" challenge
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── invite/
│   │   │   ├── route.ts          # Send & list invites
│   │   │   └── [token]/route.ts  # Get info + verify name
│   │   └── profile/
│   │       ├── route.ts          # Get & update profile
│   │       ├── photo/route.ts    # Upload profile photo
│   │       └── posts/route.ts    # Timeline posts
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   └── globals.css
├── components/
│   └── AppSidebar.tsx
├── lib/
│   ├── auth/index.ts         # JWT, sessions, hashing
│   ├── db/prisma.ts          # Prisma singleton
│   ├── email/index.ts        # Resend email templates
│   └── invite/index.ts       # Invite logic + fuzzy match
├── middleware.ts             # Route protection
├── prisma/
│   ├── schema.prisma         # Full DB schema
│   └── seed.ts
└── types/index.ts
```

---

## User Flows

### Flow 1: Founder registers
1. Visit `/register` (no invite token required for first user)
2. Upload photo + fill in name/email/password
3. Redirected to `/dashboard`
4. Role is automatically set to `"founder"`

### Flow 2: Sending an invite
1. Go to `/invite`
2. Enter recipient's email address
3. System sends email with **your profile photo** (but not your name)
4. Invite link is valid for **7 days**

### Flow 3: Recipient joins (identity gate)
1. Recipient receives email with sender's photo
2. Clicks link → `/invite/[token]`
3. Must type sender's name correctly (fuzzy matched)
4. **3 attempts max** — invite expires after 3 failures
5. On success → redirected to `/register?token=...&email=...`
6. Fills in password + own details → account created → `/dashboard`

---

## Environment Variables

| Variable              | Description                                    |
|-----------------------|------------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string                   |
| `JWT_SECRET`          | 64-char random secret for signing tokens       |
| `NEXT_PUBLIC_APP_URL` | Full URL of your app (e.g. https://famtree.app)|
| `RESEND_API_KEY`      | API key from resend.com                        |
| `EMAIL_FROM`          | Sender address (e.g. FamTree <noreply@...>)   |

---

## Production Checklist

- [ ] Set `JWT_SECRET` to a strong random value (`openssl rand -base64 64`)
- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL instance (Railway, Supabase, Neon)
- [ ] Switch photo storage from local to Cloudflare R2 or AWS S3
- [ ] Set up a verified sending domain in Resend
- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Set up HTTPS (Vercel handles this automatically)

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
# Set environment variables in Vercel dashboard
```

---

## License
MIT
