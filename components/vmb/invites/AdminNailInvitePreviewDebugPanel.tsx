"use client";

import {
  resolveAdminNailInviteCardContent,
  type AdminNailInviteCardTemplate,
} from "@/lib/vmb/invite-templates/admin-nail-invite-card-content";
import { inviteSelectionStateIsSynced } from "@/lib/vmb/invite-templates/admin-invite-template-selection";
import { applyInviteTemplateTokens } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  selectedTemplateId: string;
  dropdownValue: string;
  pillSelectedId: string;
  template: AdminNailInviteCardTemplate;
  tokenContext: InviteTemplateTokenContext;
  serverTemplateCount?: number;
  serverUniqueBodyCount?: number;
};

function preview80(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function AdminNailInvitePreviewDebugPanel({
  selectedTemplateId,
  dropdownValue,
  pillSelectedId,
  template,
  tokenContext,
  serverTemplateCount,
  serverUniqueBodyCount,
}: Props) {
  if (process.env.NODE_ENV === "production") return null;

  const rendered = resolveAdminNailInviteCardContent(template, tokenContext);
  const selectionSynced = inviteSelectionStateIsSynced({
    selectedTemplateId,
    dropdownValue,
    pillSelectedId,
    draftTemplateId: template.id,
  });

  return (
    <aside className="vmb-admin-nail-invite-debug" aria-label="Invite preview debug">
      <p className="vmb-admin-nail-invite-debug__title">Invite preview debug</p>
      <dl className="vmb-admin-nail-invite-debug__list">
        <div>
          <dt>selectedTemplateId</dt>
          <dd>{selectedTemplateId}</dd>
        </div>
        <div>
          <dt>dropdown value</dt>
          <dd>{dropdownValue}</dd>
        </div>
        <div>
          <dt>pill selected id</dt>
          <dd>{pillSelectedId}</dd>
        </div>
        <div>
          <dt>draft template id</dt>
          <dd>{template.id}</dd>
        </div>
        <div>
          <dt>draft body (first 80)</dt>
          <dd>{preview80(template.body)}</dd>
        </div>
        <div>
          <dt>rendered body (first 80)</dt>
          <dd>{preview80(rendered.body)}</dd>
        </div>
        <div>
          <dt>rendered.ctaLabel</dt>
          <dd>{rendered.ctaLabel}</dd>
        </div>
        <div>
          <dt>source</dt>
          <dd>inviteDrafts[selectedTemplateId]</dd>
        </div>
        {serverTemplateCount != null ? (
          <div>
            <dt>server template count</dt>
            <dd>{serverTemplateCount}</dd>
          </div>
        ) : null}
        {serverUniqueBodyCount != null ? (
          <div>
            <dt>server unique bodies</dt>
            <dd>{serverUniqueBodyCount}</dd>
          </div>
        ) : null}
      </dl>
      {!selectionSynced ? (
        <p className="vmb-admin-nail-invite-debug__warning" role="alert">
          Editor, pill, and preview are not using the same selected template.
        </p>
      ) : null}
      {template.body.trim() &&
      rendered.body !== applyInviteTemplateTokens(template.body, tokenContext) ? (
        <p className="vmb-admin-nail-invite-debug__warning" role="alert">
          Preview body does not match selected invite template.
        </p>
      ) : null}
    </aside>
  );
}
