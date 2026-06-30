// lib/email/index.ts
// Sends transactional emails via Resend

import { Resend } from "resend";
import type { User, Invite } from "@prisma/client";

// Lazy — never instantiated at build/import time, only when actually sending
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_skip") return null;
  return new Resend(key);
}

export type VmbOfferInviteEmailStatus = "sent" | "stubbed" | "disabled";

export type VmbOfferInviteEmailResult = {
  status: VmbOfferInviteEmailStatus;
  transport: "resend" | "stub" | "off";
};

function resolveVmbInviteEmailTransport(resendAvailable: boolean): "resend" | "stub" | "off" {
  const mode = (process.env.VMB_INVITE_EMAIL_TRANSPORT ?? "auto").trim().toLowerCase();
  if (mode === "off" || mode === "disabled") return "off";
  if (mode === "stub" || mode === "log" || mode === "test") return "stub";
  if (mode === "send" || mode === "resend") {
    if (!resendAvailable) throw new Error("VMB invite email transport is set to send, but RESEND_API_KEY is not configured.");
    return "resend";
  }
  return resendAvailable ? "resend" : "stub";
}

const FROM = process.env.EMAIL_FROM ?? "AMIHUMAN.NET <noreply@AMIHUMAN.NET.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Resend Node SDK returns `{ data, error }` and does not throw on HTTP/API failure — route handlers must treat `error` as failure. */
function assertResendOk(
  result: { error?: { message?: string; name?: string } | null },
  context: string,
): void {
  if (!result.error) return;
  console.error(`[resend:${context}]`, result.error);
  const msg =
    typeof result.error.message === "string" && result.error.message.length > 0
      ? result.error.message
      : "Email provider rejected the send";
  throw new Error(msg);
}

function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVmbOfferInviteEmail(input: {
  recipientEmail: string;
  recipientName: string;
  salonName: string;
  providerName?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  services?: string[];
  rewards?: string[];
  expirationLabel?: string;
  priceLabel?: string;
  recipientUrl: string;
}): Promise<VmbOfferInviteEmailResult> {
  const resend = getResend();
  const transport = resolveVmbInviteEmailTransport(Boolean(resend));
  if (transport === "off") {
    console.log(`[email:off] vmb-offer-invite -> ${input.recipientEmail}`);
    return { status: "disabled", transport };
  }
  if (transport === "stub") {
    console.log(`[email:stub] vmb-offer-invite -> ${input.recipientEmail}`);
    console.log(`[email:stub] secure invite url -> ${input.recipientUrl}`);
    return { status: "stubbed", transport };
  }
  if (!resend) throw new Error("VMB invite email transport unavailable.");
  const recipientName = escapeEmailHtml(input.recipientName);
  const salonName = escapeEmailHtml(input.salonName);
  const providerName = escapeEmailHtml(input.providerName?.trim() || input.salonName);
  const headline = escapeEmailHtml(input.headline);
  const body = escapeEmailHtml(input.body);
  const ctaLabel = escapeEmailHtml(input.ctaLabel?.trim() || "Open my gift");
  const priceLabel = input.priceLabel?.trim() ? escapeEmailHtml(input.priceLabel) : "";
  const expirationLabel = input.expirationLabel?.trim() ? escapeEmailHtml(input.expirationLabel) : "";
  const serviceBadges = (input.services ?? [])
    .filter((label) => label.trim())
    .map((label) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 11px;border:1px solid #fed7aa;border-radius:999px;background:#fff7ed;color:#9a3412;font-size:13px;font-weight:700">${escapeEmailHtml(label)}</span>`)
    .join("");
  const rewardBadges = (input.rewards ?? [])
    .filter((label) => label.trim())
    .map((label) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 11px;border:1px solid #fbcfe8;border-radius:999px;background:#fdf2f8;color:#be185d;font-size:13px;font-weight:700">${escapeEmailHtml(label)}</span>`)
    .join("");
  const recipientUrl = escapeEmailHtml(input.recipientUrl);
  const out = await resend.emails.send({
    from: FROM,
    to: input.recipientEmail,
    subject: `${input.recipientName}, a gift from ${input.salonName}`,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f1ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#292524">
<div style="display:none;max-height:0;overflow:hidden">A personal invite from ${salonName} is waiting for you.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ed;padding:34px 14px"><tr><td align="center">
<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:100%;background:#fff;border:1px solid #f1d9e5;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(41,37,36,.12)">
<tr><td style="padding:28px 30px 20px;border-bottom:1px solid #f7e1ea;background:linear-gradient(135deg,#fff 0%,#fff1f7 100%)">
<p style="margin:0 0 7px;color:#9d174d;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">A note from ${providerName}</p>
<h1 style="margin:0;color:#1c1917;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;font-weight:500">${headline}</h1>
</td></tr>
<tr><td style="padding:28px 30px">
<p style="margin:0 0 18px;color:#44403c;font-size:16px;line-height:1.65">Hi ${recipientName},</p>
<p style="margin:0 0 24px;color:#44403c;font-size:16px;line-height:1.65">${body}</p>
<div style="border:1px solid #f5c9da;border-radius:18px;background:#fffafb;padding:18px;margin:0 0 24px">
<p style="margin:0 0 10px;color:#9d174d;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Your gift</p>
${serviceBadges ? `<p style="margin:0 0 6px;color:#9d174d;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Your service</p><div style="margin:0 0 12px">${serviceBadges}</div>` : ""}
${rewardBadges ? `<p style="margin:0 0 6px;color:#9d174d;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Level up with:</p><div style="margin:0 0 12px">${rewardBadges}</div>` : ""}
${priceLabel ? `<p style="margin:0 0 8px;color:#9d174d;font-size:20px;font-weight:800">${priceLabel}</p>` : ""}
${expirationLabel ? `<p style="margin:0;color:#78716c;font-size:13px;font-weight:700">${expirationLabel}</p>` : ""}
</div>
<div style="text-align:center;margin:0 0 22px">
<a href="${recipientUrl}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:#be185d;color:#fff;text-decoration:none;font-size:16px;font-weight:800">🎁 ${ctaLabel}</a>
</div>
<p style="margin:0;color:#78716c;font-size:12px;line-height:1.5;text-align:center">This secure gift link is intended only for you.</p>
</td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #f4e7ee;text-align:center">
<p style="margin:0;color:#a8a29e;font-size:12px">${salonName} &middot; VMB Salons</p>
</td></tr>
</table></td></tr></table></body></html>`,
  });
  assertResendOk(out, "vmb-offer-invite");
  return { status: "sent", transport };
}

export async function sendVmbBookingConfirmationEmail(input: {
  recipientEmail: string;
  recipientName: string;
  salonName: string;
  providerName?: string;
  inviteTypeLabel: string;
  serviceLine: string;
  requestedSlot: string;
  selectedLevelUps?: Array<{ label: string; price: number }>;
  total?: number;
}): Promise<VmbOfferInviteEmailResult> {
  const resend = getResend();
  const transport = resolveVmbInviteEmailTransport(Boolean(resend));
  if (transport === "off") {
    console.log(`[email:off] vmb-booking-confirmation -> ${input.recipientEmail}`);
    return { status: "disabled", transport };
  }
  if (transport === "stub") {
    console.log(`[email:stub] vmb-booking-confirmation -> ${input.recipientEmail}`);
    console.log(`[email:stub] ${input.requestedSlot} · ${input.serviceLine}`);
    return { status: "stubbed", transport };
  }
  if (!resend) throw new Error("VMB invite email transport unavailable.");
  const recipientName = escapeEmailHtml(input.recipientName);
  const salonName = escapeEmailHtml(input.salonName);
  const providerName = escapeEmailHtml(input.providerName?.trim() || input.salonName);
  const inviteTypeLabel = escapeEmailHtml(input.inviteTypeLabel);
  const serviceLine = escapeEmailHtml(input.serviceLine);
  const requestedSlot = escapeEmailHtml(input.requestedSlot);
  const total = typeof input.total === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.total)
    : "";
  const levelUps = (input.selectedLevelUps ?? [])
    .map((item) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 11px;border:1px solid #fbcfe8;border-radius:999px;background:#fdf2f8;color:#be185d;font-size:13px;font-weight:700">${escapeEmailHtml(item.label)}</span>`)
    .join("");
  const out = await resend.emails.send({
    from: FROM,
    to: input.recipientEmail,
    subject: `${input.recipientName}, your ${input.salonName} appointment is confirmed`,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f1ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#292524">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ed;padding:34px 14px"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:100%;background:#fff;border:1px solid #f1d9e5;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(41,37,36,.12)">
<tr><td style="padding:28px 30px;background:linear-gradient(135deg,#fff 0%,#fff1f7 100%);border-bottom:1px solid #f7e1ea">
<p style="margin:0 0 7px;color:#9d174d;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Confirmed by ${providerName}</p>
<h1 style="margin:0;color:#1c1917;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;font-weight:500">Your appointment is booked</h1>
</td></tr>
<tr><td style="padding:28px 30px">
<p style="margin:0 0 18px;color:#44403c;font-size:16px;line-height:1.65">Hi ${recipientName}, ${salonName} confirmed your ${inviteTypeLabel} appointment.</p>
<div style="border:1px solid #f5c9da;border-radius:18px;background:#fffafb;padding:18px;margin:0 0 22px">
<p style="margin:0 0 8px;color:#9d174d;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Appointment</p>
<p style="margin:0 0 8px;color:#1c1917;font-size:22px;font-weight:800">${requestedSlot}</p>
<p style="margin:0 0 12px;color:#44403c;font-size:16px;line-height:1.5">${serviceLine}</p>
${levelUps ? `<div style="margin:0 0 12px">${levelUps}</div>` : ""}
${total ? `<p style="margin:0;color:#9d174d;font-size:18px;font-weight:800">Estimated total ${escapeEmailHtml(total)}</p>` : ""}
</div>
<p style="margin:0;color:#78716c;font-size:13px;line-height:1.5;text-align:center">Your salon can still follow up if anything changes.</p>
</td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #f4e7ee;text-align:center">
<p style="margin:0;color:#a8a29e;font-size:12px">${salonName} &middot; VMB Salons</p>
</td></tr>
</table></td></tr></table></body></html>`,
  });
  assertResendOk(out, "vmb-booking-confirmation");
  return { status: "sent", transport };
}

// ─── Invite email ────────────────────────────────────────────
export async function sendInviteEmail(
  invite: Invite,
  sender: User
): Promise<void> {
  const inviteUrl = `${APP_URL}/invite/${invite.token}`;
  // photoUrl is either a full Blob URL (https://...) or a legacy relative path
  const senderPhotoUrl = sender.photoUrl
    ? (sender.photoUrl.startsWith("http") ? sender.photoUrl : `${APP_URL}${sender.photoUrl}`)
    : `${APP_URL}/default-avatar.png`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">

        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.5px;">🌳 AMIHUMAN.NET</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;font-weight:600;">
            You've been invited to the family tree
          </h1>
          <p style="margin:0 0 32px;color:#666;font-size:15px;line-height:1.6;">
            Someone who knows you personally sent this invite. 
            <strong>Do you know who it is?</strong>
          </p>

          <!-- Mystery photo -->
          <div style="text-align:center;margin:0 0 32px;">
            <div style="display:inline-block;border-radius:50%;overflow:hidden;width:120px;height:120px;border:3px solid #e5e4e0;">
              <img src="${senderPhotoUrl}" width="120" height="120"
                   style="object-fit:cover;display:block;"
                   alt="Do you know this person?" />
            </div>
            <p style="margin:12px 0 0;color:#888;font-size:13px;">
              Who sent you this invite?
            </p>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;font-size:15px;
                      font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
              I know who this is →
            </a>
          </div>

          <div style="background:#f9f8f5;border-radius:8px;padding:16px;margin:0 0 24px;">
            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
              🔒 <strong>Private &amp; invite-only.</strong> This link only works for you 
              and expires in 7 days. You'll need to correctly identify the sender to join.
            </p>
          </div>

          <p style="margin:0;font-size:13px;color:#aaa;text-align:center;">
            If you don't recognise this person, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#bbb;">
            AMIHUMAN.NET &middot; Invite-only family network
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] invite → ${invite.recipientEmail}`); return; }
  const out = await resend.emails.send({
    from: FROM,
    to: invite.recipientEmail,
    subject: `🌳 Someone invited you to their family tree — do you know who?`,
    html,
  });
  assertResendOk(out, "invite");
}

// ─── Password reset email ─────────────────────────────────────
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] password-reset → ${email}`); return; }
  const out = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Reset your AMIHUMAN.NET password`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f5f4f0;margin:0;padding:40px 0;">
  <table width="480" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">
    <tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:600;">🌳 AMIHUMAN.NET</span>
    </td></tr>
    <tr><td style="padding:40px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">Reset your password</h1>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Hi ${firstName}, we received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#fff;
           font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
          Reset my password →
        </a>
      </div>
      <div style="background:#f9f8f5;border-radius:8px;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
          🔒 If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#bbb;">AMIHUMAN.NET &middot; Private family network</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
  assertResendOk(out, "password-reset");
}

// ─── Admin → member private message notification ─────────────
export async function sendAdminMessageEmail(
  recipient: { email: string; firstName: string },
  sender: { firstName: string; lastName: string },
): Promise<void> {
  const inboxUrl = `${APP_URL}/family-vault/private`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] admin-msg → ${recipient.email}`); return; }
  const out = await resend.emails.send({
    from: FROM,
    to: recipient.email,
    subject: `Private message from ${sender.firstName} ${sender.lastName} — AMIHUMAN.NET`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f5f4f0;margin:0;padding:40px 0;">
  <table width="480" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">
    <tr><td style="background:#1a1a2e;padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:600;">🌳 AMIHUMAN.NET</span>
    </td></tr>
    <tr><td style="padding:40px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">
        You have a private message
      </h1>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Hi ${recipient.firstName}, <strong>${sender.firstName} ${sender.lastName}</strong> sent you a private message on AMIHUMAN.NET. Log in to read it in your Private Feed.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${inboxUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;
           font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
          Read message →
        </a>
      </div>
      <div style="background:#f9f8f5;border-radius:8px;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
          🔒 This message is private and visible only to you.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#bbb;">AMIHUMAN.NET &middot; Private family network</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
  assertResendOk(out, "admin-msg");
}

// ─── Welcome email (after identity verified) ─────────────────
export async function sendWelcomeEmail(user: User): Promise<void> {
  const loginUrl = `${APP_URL}/login`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] welcome → ${user.email}`); return; }
  const out = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Welcome to AMIHUMAN.NET, ${user.firstName}!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f5f4f0;margin:0;padding:40px 0;">
  <table width="480" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">
    <tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:600;">🌳 AMIHUMAN.NET</span>
    </td></tr>
    <tr><td style="padding:40px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">
        Welcome to the family, ${user.firstName}! 🎉
      </h1>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Your account is ready. Complete your profile so others in the tree can find and recognise you.
      </p>
      <div style="text-align:center;">
        <a href="${loginUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;
           font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Go to my profile →
        </a>
      </div>
    </td></tr>
  </table>
</body>
</html>`,
  });
  assertResendOk(out, "welcome");
}
