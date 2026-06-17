"use client";

import {
  resolveAdminNailInviteCardContent,
  type AdminNailInviteCardTemplate,
} from "@/lib/vmb/invite-templates/admin-nail-invite-card-content";
import { applyInviteTemplateTokens } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  selectedTemplateId: string;
  template: AdminNailInviteCardTemplate;
  tokenContext: InviteTemplateTokenContext;
};

function preview80(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function AdminNailInvitePreviewDebugPanel({
  selectedTemplateId,
  template,
  tokenContext,
}: Props) {
  if (process.env.NODE_ENV === "production") return null;

  const rendered = resolveAdminNailInviteCardContent(template, tokenContext);
  const expectedBody = template.body.trim()
    ? applyInviteTemplateTokens(template.body, tokenContext)
    : `Template body missing for ${template.id}`;
  const bodyMismatch = rendered.body !== expectedBody;

  return (
    <aside className="vmb-admin-nail-invite-debug" aria-label="Invite preview debug">
      <p className="vmb-admin-nail-invite-debug__title">Invite preview debug</p>
      <dl className="vmb-admin-nail-invite-debug__list">
        <div>
          <dt>selectedTemplateId</dt>
          <dd>{selectedTemplateId}</dd>
        </div>
        <div>
          <dt>template.subject</dt>
          <dd>{template.subject}</dd>
        </div>
        <div>
          <dt>template.headline</dt>
          <dd>{template.headline}</dd>
        </div>
        <div>
          <dt>template.body (first 80)</dt>
          <dd>{preview80(template.body)}</dd>
        </div>
        <div>
          <dt>template.ctaLabel</dt>
          <dd>{template.ctaLabel}</dd>
        </div>
        <div>
          <dt>rendered.body (first 80)</dt>
          <dd>{preview80(rendered.body)}</dd>
        </div>
        <div>
          <dt>rendered.ctaLabel</dt>
          <dd>{rendered.ctaLabel}</dd>
        </div>
        <div>
          <dt>source</dt>
          <dd>VmbInviteTemplate</dd>
        </div>
      </dl>
      {bodyMismatch ? (
        <p className="vmb-admin-nail-invite-debug__warning" role="alert">
          Preview body does not match selected invite template.
        </p>
      ) : null}
    </aside>
  );
}
