# Studios Builder — Manual QA Checklist

## Entry (Agent 97)

- [ ] Log in → sidebar **AIH Studios** → `/studios`
- [ ] See **Create Studio** banner and **Build your private Studio** in hero
- [ ] With existing draft → **Continue draft** links to `?draftId=`

## Builder

- [ ] `/studios/create` — pick template, add URL source, invalid URL rejected
- [ ] **Generate draft** — AI label shown
- [ ] Edit hero/benefits; **Mark ready to publish**
- [ ] **Publish** — redirects to public slug
- [ ] Re-publish same draft — idempotent (no duplicate studio)

## Public

- [ ] `/studios/[slug]` shows published sections
- [ ] Logged out → **Request access** modal works
- [ ] Member → **Open member Space** → aihsafe

## Security

- [ ] No password fields in source intake
- [ ] Non-member cannot open private messaging from studio page
