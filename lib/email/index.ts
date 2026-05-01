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

const FROM = process.env.EMAIL_FROM ?? "AMIHUMAN.NET <noreply@AMIHUMAN.NET.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  await resend.emails.send({
    from: FROM,
    to: invite.recipientEmail,
    subject: `🌳 Someone invited you to their family tree — do you know who?`,
    html,
  });
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
  await resend.emails.send({
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
}

// ─── Admin → member private message notification ─────────────
export async function sendAdminMessageEmail(
  recipient: { email: string; firstName: string },
  sender: { firstName: string; lastName: string },
): Promise<void> {
  const inboxUrl = `${APP_URL}/family-vault/private`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] admin-msg → ${recipient.email}`); return; }
  await resend.emails.send({
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
}

// ─── Welcome email (after identity verified) ─────────────────
export async function sendWelcomeEmail(user: User): Promise<void> {
  const loginUrl = `${APP_URL}/login`;

  const resend = getResend();
  if (!resend) { console.log(`[email:skip] welcome → ${user.email}`); return; }
  await resend.emails.send({
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
}

