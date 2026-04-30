// lib/email/index.ts
// Sends transactional emails via Resend

import { Resend } from "resend";
import type { User, Invite } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "FamTree <noreply@famtree.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Invite email ────────────────────────────────────────────
export async function sendInviteEmail(
  invite: Invite,
  sender: User
): Promise<void> {
  const inviteUrl = `${APP_URL}/invite/${invite.token}`;
  const senderPhotoUrl = sender.photoUrl
    ? `${APP_URL}${sender.photoUrl}`
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
          <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.5px;">🌳 FamTree</span>
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
            FamTree &middot; Invite-only family network
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: invite.recipientEmail,
    subject: `🌳 Someone invited you to their family tree — do you know who?`,
    html,
  });
}

// ─── Welcome email (after identity verified) ─────────────────
export async function sendWelcomeEmail(user: User): Promise<void> {
  const loginUrl = `${APP_URL}/login`;

  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Welcome to FamTree, ${user.firstName}!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f5f4f0;margin:0;padding:40px 0;">
  <table width="480" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">
    <tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:600;">🌳 FamTree</span>
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
