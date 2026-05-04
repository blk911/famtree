"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StudioDraftData } from "@/lib/studio/studioDraft";
import { draftToPublicPayload } from "@/lib/studio/studioDraft";
import { StudioLaunchRail, type LaunchStepId, type LaunchStepStatus } from "@/components/studios/StudioLaunchRail";
import { StudioPublicPage } from "@/components/studios/StudioPublicPage";

export type StudioBuilderUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
} | null;

function slugPublishReady(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2;
}

function computeStepStatus(draft: StudioDraftData, activeStep: LaunchStepId): Record<LaunchStepId, LaunchStepStatus> {
  const idOk =
    Boolean(draft.identity.creatorName.trim()) &&
    Boolean(draft.identity.studioName.trim()) &&
    Boolean(draft.identity.location.trim()) &&
    (Boolean(draft.identity.email.trim()) || Boolean(draft.identity.phoneRaw.trim()));

  const storyOk =
    Boolean(draft.story.headline.trim()) &&
    draft.story.whyBookBullets.some((b) => b.trim().length > 0);

  const offersOk = draft.offers.some((o) => o.title.trim().length > 0);

  const proofOk = true;

  const slugReady = slugPublishReady(draft.launch.slug);
  const launchPublishedOk = draft.launch.status === "published" && slugReady;

  const row = (
    id: LaunchStepId,
    ok: boolean,
    needsAttentionWhenIncomplete: boolean,
  ): LaunchStepStatus => {
    if (activeStep === id) return "active";
    if (ok) return "complete";
    return needsAttentionWhenIncomplete ? "needs-attention" : "incomplete";
  };

  const launchAttention =
    draft.launch.slug.trim().length > 0 && !slugReady ? true : false;

  return {
    identity: row("identity", idOk, false),
    story: row("story", storyOk, false),
    offers: row("offers", offersOk, true),
    proof: row("proof", proofOk, false),
    launch: row("launch", launchPublishedOk, launchAttention),
  };
}

function validatePublish(draft: StudioDraftData): string[] {
  const errs: string[] = [];
  if (!draft.identity.studioName.trim()) errs.push("Studio name is required.");
  if (!draft.identity.creatorName.trim()) errs.push("Creator name is required.");
  if (!draft.identity.email.trim() && !draft.identity.phoneRaw.trim()) errs.push("Email or phone is required.");
  if (!draft.identity.location.trim()) errs.push("Location is required.");
  if (!draft.offers.some((o) => o.title.trim())) errs.push("At least one offer is required.");
  if (!slugPublishReady(draft.launch.slug)) errs.push("Publish slug must be lowercase letters, numbers, and hyphens.");
  return errs;
}

export function StudioBuilder({
  initialDraft,
  currentUser,
  mode,
  fromSlug,
}: {
  initialDraft: StudioDraftData;
  currentUser: StudioBuilderUser;
  mode: "builder" | "admin-template";
  fromSlug?: string | null;
}) {
  const storageKey =
    mode === "admin-template" ? "amih_studios_builder_admin_template_v1" : "amih_studios_builder_start_v1";

  const [draft, setDraft] = useState<StudioDraftData>(initialDraft);
  const [activeStep, setActiveStep] = useState<LaunchStepId>("identity");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [publishNote, setPublishNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as StudioDraftData;
      if (parsed && typeof parsed === "object") setDraft(parsed);
    } catch {
      /* ignore corrupt drafts */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!fromSlug?.trim()) return;
    setDraft((d) => ({
      ...d,
      launch: { ...d.launch, slug: fromSlug.trim().toLowerCase() },
    }));
  }, [fromSlug]);

  const stepStatus = useMemo(() => computeStepStatus(draft, activeStep), [draft, activeStep]);

  const previewPayload = useMemo(() => draftToPublicPayload(draft), [draft]);
  const previewSlug = previewPayload.provider.slug || "preview";

  const scrollToStep = useCallback((id: LaunchStepId) => {
    setActiveStep(id);
    const el = typeof document !== "undefined" ? document.getElementById(`builder-section-${id}`) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /** Save Draft — browser persistence only; never writes canonical template file or Prisma. */
  const handleSaveDraft = useCallback(() => {
    const next = { ...draft, launch: { ...draft.launch, updatedAt: new Date().toISOString() } };
    setDraft(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      console.info("[studio-builder] draft saved (local only)", { storageKey });
      setPublishNote("Draft saved in this browser.");
      setTimeout(() => setPublishNote(null), 2800);
    } catch (e) {
      console.error("[studio-builder] save draft failed", e);
      setPublishNote("Could not save draft (storage blocked?).");
    }
  }, [draft, storageKey]);

  /** Publish — validates locally and marks draft published; server/API activation is future work. */
  const handlePublish = useCallback(() => {
    const errs = validatePublish(draft);
    if (errs.length > 0) {
      setPublishNote(errs.join(" "));
      return;
    }
    const next: StudioDraftData = {
      ...draft,
      launch: {
        ...draft.launch,
        status: "published",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publicUrlHint: `${typeof window !== "undefined" ? window.location.origin : ""}/studios/${draft.launch.slug.trim().toLowerCase()}`,
      },
    };
    setDraft(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      console.info("[studio-builder] marked published (local only)", { storageKey });
    } catch {
      /* ignore */
    }
    setPublishNote("Marked published locally — hook API to activate live URL.");
  }, [draft, storageKey]);

  const barButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setViewMode((v) => (v === "edit" ? "preview" : "edit"))}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
      >
        {viewMode === "edit" ? "Preview" : "Back to edit"}
      </button>
      <button
        type="button"
        onClick={handleSaveDraft}
        className="rounded-full border border-stone-900 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-900 hover:bg-stone-100"
      >
        Save draft
      </button>
      <button
        type="button"
        onClick={handlePublish}
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
      >
        Publish
      </button>
    </div>
  );

  if (viewMode === "preview") {
    return (
      <div className="min-h-screen bg-[#f3f1ec] pb-16">
        <div className="sticky top-0 z-[70] border-b border-stone-200 bg-[#fafaf8]/98 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/studios" className="text-xs font-bold uppercase tracking-wide text-stone-600 underline">
                Return to AIH
              </Link>
              <span className="text-xs font-semibold text-stone-500">Live preview (draft data)</span>
            </div>
            {barButtons}
          </div>
        </div>
        <StudioPublicPage
          provider={previewPayload.provider}
          offers={previewPayload.offers}
          storyIntro={previewPayload.storyIntro}
          accentHex={previewPayload.accentHex}
          navItems={previewPayload.navItems}
          viewerRole="public"
          showEditControls={false}
          studioSlug={previewSlug}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f1ec] pb-24">
      <StudioLaunchRail activeStep={activeStep} stepStatus={stepStatus} onStepClick={scrollToStep} />

      <div className="sticky top-[52px] z-40 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:top-[56px]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-wide text-stone-700 underline">
              Return to AIH
            </Link>
            {currentUser ? (
              <span className="truncate text-xs text-stone-600">
                Logged in as{" "}
                <span className="font-semibold text-stone-900">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
              </span>
            ) : null}
          </div>
          {barButtons}
        </div>
      </div>

      {mode === "admin-template" ? (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            Admin template editor — edits stay in this browser until an API exists. Does not overwrite{" "}
            <code className="rounded bg-violet-100 px-1">DEB_DAZZLE_STUDIO_TEMPLATE</code>.
          </p>
        </div>
      ) : null}

      {publishNote ? (
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <p className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800">{publishNote}</p>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <section id="builder-section-identity" className="scroll-mt-40 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">1 · Identity</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-stone-500">
              Creator name
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                value={draft.identity.creatorName}
                onChange={(e) => setDraft((d) => ({ ...d, identity: { ...d.identity, creatorName: e.target.value } }))}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-stone-500">
              Studio name
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                value={draft.identity.studioName}
                onChange={(e) => setDraft((d) => ({ ...d, identity: { ...d.identity, studioName: e.target.value } }))}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-stone-500">
              Email
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                type="email"
                value={draft.identity.email}
                onChange={(e) => setDraft((d) => ({ ...d, identity: { ...d.identity, email: e.target.value } }))}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-stone-500">
              Phone (exactly as shown — no auto +1)
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                type="text"
                inputMode="tel"
                value={draft.identity.phoneRaw}
                onChange={(e) => setDraft((d) => ({ ...d, identity: { ...d.identity, phoneRaw: e.target.value } }))}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-stone-500 md:col-span-2">
              Location
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                value={draft.identity.location}
                onChange={(e) => setDraft((d) => ({ ...d, identity: { ...d.identity, location: e.target.value } }))}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-stone-500 md:col-span-2">
              Profile image URL
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                value={draft.identity.profileImageUrl}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, identity: { ...d.identity, profileImageUrl: e.target.value } }))
                }
              />
            </label>
          </div>
        </section>

        <section id="builder-section-story" className="scroll-mt-40 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">2 · Story</h2>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Headline
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.story.headline}
              onChange={(e) => setDraft((d) => ({ ...d, story: { ...d.story, headline: e.target.value } }))}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Intro media URL (optional)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.story.introMediaUrl}
              onChange={(e) => setDraft((d) => ({ ...d, story: { ...d.story, introMediaUrl: e.target.value } }))}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Why book bullets (one per line)
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.story.whyBookBullets.join("\n")}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  story: {
                    ...d.story,
                    whyBookBullets: e.target.value.split("\n"),
                  },
                }))
              }
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Style statement / long description
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.story.styleStatement}
              onChange={(e) => setDraft((d) => ({ ...d, story: { ...d.story, styleStatement: e.target.value } }))}
            />
          </label>
        </section>

        <section id="builder-section-offers" className="scroll-mt-40 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">3 · Offers</h2>
          <div className="mt-4 flex flex-col gap-4">
            {draft.offers.map((o, idx) => (
              <div key={o.id} className="grid gap-3 rounded-xl border border-stone-100 p-4 md:grid-cols-4">
                <label className="text-xs font-bold uppercase text-stone-500 md:col-span-2">
                  Title
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                    value={o.title}
                    onChange={(e) =>
                      setDraft((d) => {
                        const offers = [...d.offers];
                        offers[idx] = { ...offers[idx], title: e.target.value };
                        return { ...d, offers };
                      })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase text-stone-500">
                  Price (USD cents, blank = custom)
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                    inputMode="numeric"
                    value={o.priceCents ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const offers = [...d.offers];
                        const raw = e.target.value.trim();
                        offers[idx] = {
                          ...offers[idx],
                          priceCents: raw === "" ? undefined : Number(raw),
                        };
                        return { ...d, offers };
                      })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase text-stone-500">
                  Minutes
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
                    inputMode="numeric"
                    value={o.durationMinutes}
                    onChange={(e) =>
                      setDraft((d) => {
                        const offers = [...d.offers];
                        offers[idx] = { ...offers[idx], durationMinutes: Number(e.target.value) || 60 };
                        return { ...d, offers };
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section id="builder-section-proof" className="scroll-mt-40 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">4 · Proof</h2>
          <p className="mt-2 text-sm text-stone-600">
            Portfolio & testimonials are optional for first publish — expand here when media uploads ship.
          </p>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Portfolio image URLs (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.proof.portfolioImages.map((p) => p.imageUrl).filter(Boolean).join(", ")}
              onChange={(e) => {
                const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                setDraft((d) => ({
                  ...d,
                  proof: {
                    ...d.proof,
                    portfolioImages: parts.map((url, i) => ({
                      id: `pf_${i}`,
                      caption: "",
                      imageUrl: url,
                    })),
                  },
                }));
              }}
            />
          </label>
        </section>

        <section id="builder-section-launch" className="scroll-mt-40 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">5 · Launch</h2>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            Public slug (lowercase, hyphens)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-base"
              value={draft.launch.slug}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  launch: { ...d.launch, slug: e.target.value.trim().toLowerCase() },
                }))
              }
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            QR / share note
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.launch.qrOrShareNote}
              onChange={(e) => setDraft((d) => ({ ...d, launch: { ...d.launch, qrOrShareNote: e.target.value } }))}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase text-stone-500">
            First invite copy
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-lg border border-stone-200 px-3 py-2 text-base"
              value={draft.launch.firstInviteCopy}
              onChange={(e) =>
                setDraft((d) => ({ ...d, launch: { ...d.launch, firstInviteCopy: e.target.value } }))
              }
            />
          </label>
          <p className="mt-4 text-sm text-stone-600">
            Status: <strong>{draft.launch.status}</strong>
            {draft.launch.publicUrlHint ? (
              <>
                {" "}
                · Public URL: <strong>{draft.launch.publicUrlHint}</strong>
              </>
            ) : null}
          </p>
        </section>

        <div className="sticky bottom-0 z-30 flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-[#fafaf8]/98 px-2 py-4 backdrop-blur">
          {barButtons}
        </div>
      </div>
    </div>
  );
}
