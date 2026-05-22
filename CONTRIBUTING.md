# Contributing (release discipline)

Agents and collaborators should read **`.cursor/rules/production-carveouts.mdc`** (Cursor pulls it automatically) and **`.cursor/rules/security-git-push-gate.mdc`** (forces a chat review pause before commit/push on security-sensitive paths). Together they capture:

1. **Default:** routine fixes/features are expected to **commit + ship** toward production `.net` when ready.
2. **Carve-outs** (currently **TaiKos** security-class work): no prod-bound push until full test plus dogfood + explicit approval.
3. **Site-wide or build-critical** changes—styles that touch the entire shell, new global scripts/tags, CSP/auth/middleware, major deps—must be considered **before** merge/build/deploy.

Updating carve-outs / new subsystems belongs in **that Cursor rule first** so pre-build planning stays centralized.
