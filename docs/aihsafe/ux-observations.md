# AIH Safe — UX Observations

Non-bug UX notes from Agent 12 pass. These are design suggestions, not defects.

---

## 1. TrustUnitCreatePanel — success message shows kind but not name

After creating a space, the success message reads `"peer space created."` even when the user named it `"Summer pod"`. The data (`r.data`) has the name; showing it would be more confirming.

**Current:** `${r.data.kind} space created.`
**Suggested:** `${r.data.name ?? `${r.data.kind} space`} created.`

Low priority — name is visible immediately in "Your spaces" list below.

---

## 2. GuardianInbox — no context shown for the pending action

The inbox card shows the action label ("Create a trusted space") and requestor name, but does not show any action details from `contextJson` (e.g., space name or kind). A guardian approving a "Create a trusted space" request has no way to know what name or kind the child chose.

**Suggested:** Show a context summary line below the label (e.g., "Name: Summer pod · Type: peer"). The `ApprovalRequestDTO` does not currently carry `contextJson` — this would require a DTO extension.

Phase 4 enhancement; not a current bug.

---

## 3. MembershipPanel — "Leave space" is always visible even for sole-member units

The DELETE guard (last-member 409) is server-enforced, and the UI correctly surfaces the error. However, if a user is the only member, the "Leave space" button is still shown. A pre-check (`unit.members.filter(m => !m.exitedAt).length <= 1`) could disable the button with a tooltip instead.

Low priority — server guard is correct; UX is functional.

---

## 4. FamilyCreatePanel — no inline list of existing units

`TrustUnitCreatePanel` shows a "Your spaces" list below the form. `FamilyCreatePanel` does not show existing family units after creation. The GET /api/aihsafe/family endpoint exists and would support this.

Not a bug; feature parity note for Phase 4.

---

## 5. InvitePanel — `targetAgeTier` selector visible but not authoritative

The invite form exposes a relationship picker, and the API accepts `targetAgeTier` as a hint. The server derives the actual age tier from the target user's profile and ignores the client hint for adults/elders. The UI never explains this.

This is correct behavior (prevents spoofing) but could confuse a sender who picks the wrong relationship. Consider either removing the field or adding a note that guardian consent is determined by the recipient's actual account settings.

---

## 6. DecisionNotice — dismiss button has no ARIA label

The `×` dismiss button renders without an `aria-label`. Screen readers would read "times" or nothing useful.

**Suggested:** `aria-label="Dismiss"`

Low priority — component is functional; this is a polish item.
