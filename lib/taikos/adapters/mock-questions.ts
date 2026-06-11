import { contractAction } from "@/lib/taikos/actions/action-registry";
import type { AiosAction, AiosContextPacket, AiosResponse } from "@/lib/taikos/types";

const FALLBACK_CONTACTS = [
  { clientName: "Sample Client A", reason: "Connect your book for real names", estimatedValue: 0 },
];

function normalizeQuestion(q: string): string {
  return q.trim().toLowerCase();
}

function stubActions(ctx: AiosContextPacket): AiosAction[] {
  return [
    { id: "preview-invite", label: "Preview Invite", kind: "open_invites", href: "/vmb/invites" },
    { id: "view-clients", label: "View Clients", kind: "open_clients", href: "/vmb/clients" },
    {
      id: "open-calendar",
      label: "Open Calendar",
      kind: "navigate",
      href: "/vmb/appointments",
    },
    { id: "continue-pcn", label: "Continue PCN", kind: "open_network", href: "/vmb/network" },
  ];
}

function candidateCards(
  ctx: AiosContextPacket,
  candidates: typeof ctx.contactCandidates,
  title: string,
  message: string,
): AiosResponse {
  const list = candidates.length > 0 ? candidates : FALLBACK_CONTACTS;
  return {
    mode: "question",
    layout: "center-panel",
    message,
    summary: message,
    pageContextLine: ctx.currentPage.assistantIntro,
    pageContext: ctx.currentPage,
    showQuestionInput: true,
    cards: list.slice(0, 4).map((c, i) => ({
      id: `candidate-${i}`,
      title: c.clientName,
      body: c.reason,
      meta: c.estimatedValue > 0 ? `+$${c.estimatedValue.toLocaleString()}` : undefined,
      actions: [
        contractAction(`preview-${i}`, "CREATE_INVITE_DRAFT", "Preview Invite"),
        contractAction(`reactivation-${i}`, "PREVIEW_REACTIVATION_MESSAGE", "Preview Reactivation"),
      ],
    })),
    opportunities: ctx.opportunities.slice(0, 3),
    recommendations: [],
    recommendedActions: stubActions(ctx).slice(0, 3),
    estimatedValue: list.reduce((s, c) => s + c.estimatedValue, 0),
    followUpPrompt: "Anything else you want to work on?",
  };
}

export function answerMockQuestion(ctx: AiosContextPacket, question: string): AiosResponse {
  const q = normalizeQuestion(question);

  if (q.includes("who should i contact") || q.includes("contact today")) {
    const candidates = ctx.hasRealBookData
      ? ctx.contactCandidates
      : FALLBACK_CONTACTS;
    return candidateCards(
      ctx,
      candidates,
      "Today's contacts",
      ctx.hasRealBookData
        ? "These clients are your strongest moves for today."
        : "Connect your book to see real client names. Showing placeholder until ingest completes.",
    );
  }

  if (q.includes("saturday") || q.includes("likely to book")) {
    const candidates = ctx.hasRealBookData ? ctx.saturdayCandidates : FALLBACK_CONTACTS;
    const slots = ctx.calendarSummary.slots.join(" · ");
    return {
      ...candidateCards(
        ctx,
        candidates,
        "Saturday bookings",
        ctx.hasRealBookData
          ? `Likely Saturday fills from your book${slots ? ` · Openings: ${slots}` : ""}.`
          : "Upload your client book to see likely Saturday bookings.",
      ),
      recommendedActions: [
        { id: "open-calendar", label: "Open Calendar", kind: "navigate", href: "/vmb/appointments" },
        { id: "view-clients", label: "View Clients", kind: "open_clients", href: "/vmb/clients" },
      ],
    };
  }

  if (q.includes("overdue")) {
    const overdue = ctx.hasRealBookData ? ctx.overdueClients : FALLBACK_CONTACTS;
    return {
      mode: "question",
      layout: "center-panel",
      message: ctx.hasRealBookData
        ? `${ctx.clientSummary.overdueClients} overdue clients in your book.`
        : "Connect your book to see overdue clients.",
      summary: ctx.hasRealBookData
        ? `Top overdue segments ready for a revenue touch.`
        : "No book analysis connected yet.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: overdue.slice(0, 4).map((c, i) => ({
        id: `overdue-${i}`,
        title: c.clientName,
        body: c.reason,
        meta: c.estimatedValue > 0 ? `+$${c.estimatedValue.toLocaleString()}` : undefined,
      })),
      opportunities: ctx.opportunities.filter((o) => o.sourceRule === "reactivation").slice(0, 3),
      recommendations: ["Review revenue touches for overdue clients."],
      recommendedActions: [
        contractAction("view-clients", "VIEW_CLIENT_SEGMENT", "Show overdue clients"),
        contractAction("reactivation", "PREVIEW_REACTIVATION_MESSAGE", "Preview Reactivation"),
      ],
      estimatedValue: overdue.reduce((s, c) => s + c.estimatedValue, 0),
      followUpPrompt: "Want me to draft touches for these clients?",
    };
  }

  if (q.includes("referral")) {
    const referralOpps = ctx.opportunities.filter((o) => o.sourceRule === "referral");
    return {
      mode: "question",
      layout: "center-panel",
      message: referralOpps.length
        ? "Your strongest referral sources from this week's book."
        : "No referral signals yet — refresh your book for updated matches.",
      summary: referralOpps[0]?.description ?? ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: referralOpps.slice(0, 3).map((o) => ({
        id: o.id,
        title: o.title,
        body: o.description,
        meta: o.estimatedValue > 0 ? `+$${o.estimatedValue.toLocaleString()}` : undefined,
      })),
      opportunities: referralOpps,
      recommendations: [],
      recommendedActions: [
        contractAction("referral-ask", "PREVIEW_REFERRAL_ASK", "Preview Referral Ask"),
        ...stubActions(ctx).slice(0, 1),
      ],
      estimatedValue: referralOpps.reduce((s, o) => s + o.estimatedValue, 0),
      pageContextLine: ctx.currentPage.assistantIntro,
    };
  }

  if (q.includes("what goals") || q.includes("my goals")) {
    const goals = ctx.goalSummary.goals;
    return {
      mode: "question",
      layout: "center-panel",
      message: goals.length
        ? `You have ${ctx.goalSummary.activeGoals} active goal${ctx.goalSummary.activeGoals === 1 ? "" : "s"}.`
        : "No active goals yet.",
      summary: goals.map((g) => `${g.title}: ${g.progressPercent}%`).join(" · ") || "Goals track outcomes, not tools.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: goals.slice(0, 4).map((g) => ({
        id: g.goalId,
        title: g.title,
        body: `${g.currentValue} / ${g.targetValue}`,
        meta: `${g.progressPercent}%`,
      })),
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: [],
      recommendedActions: stubActions(ctx).slice(0, 2),
      estimatedValue: 0,
      followUpPrompt: "Ask about opportunities or your queue.",
    };
  }

  if (q.includes("biggest opportunity") || q.includes("top opportunity")) {
    const top = ctx.opportunitySummary.topOpportunity;
    return {
      mode: "question",
      layout: "center-panel",
      message: top ? top.title : "No ranked opportunities yet.",
      summary: top
        ? `${top.recommendation} · $${top.estimatedValue.toLocaleString()} · ${top.priority} priority`
        : "Connect your book for ranked opportunities.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: ctx.opportunitySummary.opportunities.slice(0, 3).map((o) => ({
        id: o.opportunityId,
        title: o.title,
        body: o.recommendation,
        meta: `$${o.estimatedValue.toLocaleString()} · ${o.priority}`,
      })),
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: [],
      recommendedActions: top
        ? [contractAction("create-from-opp", top.suggestedAction, "Create Draft")]
        : stubActions(ctx).slice(0, 1),
      estimatedValue: top?.estimatedValue ?? 0,
      followUpPrompt: "Want me to draft this move?",
    };
  }

  if (q.includes("in my queue") || q.includes("what is in my queue") || q.includes("execution queue")) {
    const items = ctx.queueSummary.recentItems;
    return {
      mode: "question",
      layout: "center-panel",
      message: items.length
        ? `${ctx.queueSummary.queuedItems} item${ctx.queueSummary.queuedItems === 1 ? "" : "s"} in your queue.`
        : "Your queue is empty.",
      summary: "Queued work is approved and ready for a future send — nothing goes out yet.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: items.slice(0, 4).map((i) => ({
        id: i.queueId,
        title: i.draftTitle,
        body: `${i.status} · ${i.draftType.replace(/_/g, " ")}`,
        meta: i.goalTitle,
      })),
      opportunities: [],
      recommendations: [],
      recommendedActions: [{ id: "today", label: "Open Today", kind: "navigate", href: "/vmb/today" }],
      estimatedValue: items.reduce((s, i) => s + i.estimatedValue, 0),
      followUpPrompt: "Approve drafts from your workspace to add more queue items.",
    };
  }

  if (q.includes("revenue goal") || (q.includes("how close") && q.includes("revenue"))) {
    const revenueGoal = ctx.goalSummary.goals.find((g) => g.category === "REVENUE");
    return {
      mode: "question",
      layout: "center-panel",
      message: revenueGoal
        ? `Revenue goal: $${revenueGoal.currentValue.toLocaleString()} of $${revenueGoal.targetValue.toLocaleString()}.`
        : "No revenue goal set yet.",
      summary: revenueGoal
        ? `${revenueGoal.progressPercent}% toward your revenue target.`
        : "Goals are created automatically when your book connects.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: revenueGoal
        ? [{ id: "rev", title: revenueGoal.title, body: `${revenueGoal.progressPercent}% complete` }]
        : [],
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: [],
      recommendedActions: [contractAction("build-campaign", "CREATE_CAMPAIGN_DRAFT", "Build Campaign")],
      estimatedValue: revenueGoal?.currentValue ?? 0,
      followUpPrompt: "Want to queue a campaign draft?",
    };
  }

  if (q.includes("what should i do today") || (q.includes("today") && q.includes("what should"))) {
    const top = ctx.opportunitySummary.topOpportunity;
    return {
      mode: "question",
      layout: "center-panel",
      message: "Here's your best move for today.",
      summary: [
        `${ctx.goalSummary.activeGoals} active goals`,
        `${ctx.opportunitySummary.totalOpportunities} opportunities`,
        `${ctx.queueSummary.queuedItems} queued actions`,
      ].join(" · "),
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: [
        ...ctx.goalSummary.goals.slice(0, 2).map((g) => ({
          id: g.goalId,
          title: g.title,
          body: `${g.progressPercent}% progress`,
        })),
        ...(top
          ? [{ id: top.opportunityId, title: top.title, body: top.recommendation, meta: top.priority }]
          : []),
      ],
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: [],
      recommendedActions: top
        ? [contractAction("today-top", top.suggestedAction, "Create Draft")]
        : stubActions(ctx).slice(0, 2),
      estimatedValue: top?.estimatedValue ?? 0,
      followUpPrompt: "Open Today for your full operating view.",
    };
  }

  if (q.includes("what drafts") || q.includes("my drafts") || q.includes("saved drafts")) {
    const recent = ctx.draftSummary.recentDrafts;
    return {
      mode: "question",
      layout: "center-panel",
      message: recent.length
        ? `You have ${ctx.draftSummary.openDrafts} open draft${ctx.draftSummary.openDrafts === 1 ? "" : "s"}.`
        : "No saved drafts yet — confirm a tAIkOS preview to save one.",
      summary: recent.length
        ? recent.map((d) => d.title).join(" · ")
        : "Preview a move in tAIkOS, then confirm to save a draft.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: recent.slice(0, 4).map((d) => ({
        id: d.draftId,
        title: d.title,
        body: `${d.draftType.replace(/_/g, " ")} · ${d.status}`,
        meta: d.estimatedValue > 0 ? `+$${d.estimatedValue.toLocaleString()}` : undefined,
      })),
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: [],
      recommendedActions: stubActions(ctx).slice(0, 2),
      estimatedValue: recent.reduce((s, d) => s + d.estimatedValue, 0),
      followUpPrompt: "Open Invites, Campaigns, or Service Cards to review saved drafts.",
    };
  }

  if (q.includes("invite draft")) {
    const inviteDrafts = ctx.draftSummary.recentDrafts.filter(
      (d) => d.draftType === "pcn_invite" || d.draftType === "referral_ask",
    );
    return {
      mode: "question",
      layout: "center-panel",
      message: inviteDrafts.length
        ? `${inviteDrafts.length} invite draft${inviteDrafts.length === 1 ? "" : "s"} saved.`
        : "No invite drafts saved yet.",
      summary: "Review invite drafts from the Invites page.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: inviteDrafts.slice(0, 4).map((d) => ({
        id: d.draftId,
        title: d.title,
        body: d.status,
      })),
      opportunities: [],
      recommendations: [],
      recommendedActions: [
        contractAction("preview-invite", "CREATE_INVITE_DRAFT", "Preview Invite"),
      ],
      estimatedValue: 0,
      followUpPrompt: "Review this invite later from Invites.",
    };
  }

  if (q.includes("ready to send") || q.includes("anything ready")) {
    const ready = ctx.draftSummary.recentDrafts.filter((d) => d.status === "ready_to_send");
    return {
      mode: "question",
      layout: "center-panel",
      message: ready.length
        ? `${ready.length} draft${ready.length === 1 ? "" : "s"} marked ready to send.`
        : "No drafts are marked ready to send yet.",
      summary: "Sending is not enabled yet — drafts can be reviewed and edited, but no messages will go out.",
      pageContextLine: ctx.currentPage.assistantIntro,
      pageContext: ctx.currentPage,
      showQuestionInput: true,
      cards: ready.slice(0, 4).map((d) => ({
        id: d.draftId,
        title: d.title,
        body: "Ready to send (send coming later)",
      })),
      opportunities: [],
      recommendations: ["Mark drafts ready when you're happy with the copy."],
      recommendedActions: stubActions(ctx).slice(0, 2),
      estimatedValue: 0,
      followUpPrompt: "When send is available, ready drafts will be first in line.",
    };
  }

  if (q.includes("what should i do") || q.includes("what's next") || q.includes("next")) {
    const top = ctx.opportunities.slice(0, 3);
    return {
      mode: "question",
      layout: "center-panel",
      message: "Your top three moves right now.",
      summary: top.map((o) => o.title).join(" · ") || "Start from Home to see weekly moves.",
      pageContext: ctx.currentPage,
      pageContextLine: ctx.currentPage.assistantIntro,
      showQuestionInput: true,
      cards: top.map((o) => ({
        id: o.id,
        title: o.title,
        body: o.description,
        meta: o.estimatedValue > 0 ? `+$${o.estimatedValue.toLocaleString()}` : undefined,
        actions: stubActions(ctx).slice(0, 1),
      })),
      opportunities: top,
      recommendations: ctx.recommendations.slice(0, 3).map((r) => r.message),
      recommendedActions: stubActions(ctx),
      estimatedValue: top.reduce((s, o) => s + o.estimatedValue, 0),
      followUpPrompt: "Pick a move or ask another question.",
    };
  }

  return {
    mode: "question",
    layout: "center-panel",
    message: `I can help from ${ctx.currentPage.title}.`,
    summary: ctx.currentPage.assistantIntro,
    pageContextLine: ctx.currentPage.assistantIntro,
    pageContext: ctx.currentPage,
    showQuestionInput: true,
    cards: [
      {
        id: "fallback-help",
        title: "Try asking",
        body: "Who should I contact today? · Show overdue clients · What should I do next?",
      },
    ],
    opportunities: ctx.opportunities.slice(0, 2),
    recommendations: [],
    recommendedActions: ctx.currentPage.availableActions.slice(0, 3),
    estimatedValue: ctx.revenueSummary.potentialRevenue,
    followUpPrompt: "Ask tAIkOS anything about this page.",
  };
}
