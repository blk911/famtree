"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useRef, useState } from "react";
import type { StudioInstagramProofCard } from "@/lib/studios/studioProofCard";
import { useStudioBuilderNavMode } from "@/components/studios/StudioBuilderNavModeContext";
import { STUDIOS_INK, STUDIOS_MUTED } from "@/lib/studios/visual";
import { StudioProofCard } from "@/components/studios/StudioProofCard";
import { InstagramProofForm, type InstagramProofFormValues } from "@/components/studios/InstagramProofForm";

function nextProofId(prefix: string): string {
  return `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
}

export function StudioProofCardsSection({
  studioSurface,
  proofCards,
  setProofCards,
}: {
  studioSurface: "member" | "admin";
  proofCards: StudioInstagramProofCard[];
  setProofCards: Dispatch<SetStateAction<StudioInstagramProofCard[]>>;
}) {
  const navMode = useStudioBuilderNavMode();
  const replaceTargetId = useRef<string | null>(null);

  const isPublicListing = studioSurface === "member" && navMode !== "edit";

  const sectionMode: "admin-template" | "builder" | "public" = useMemo(() => {
    if (studioSurface === "admin") return "admin-template";
    if (isPublicListing) return "public";
    return "builder";
  }, [studioSurface, isPublicListing]);

  const visibleCards = useMemo(() => {
    if (sectionMode === "public") return proofCards.filter((c) => !c.isSample);
    return proofCards;
  }, [proofCards, sectionMode]);

  const [dialog, setDialog] = useState<"closed" | "new" | "edit">("closed");
  const [editingCard, setEditingCard] = useState<StudioInstagramProofCard | null>(null);

  if (sectionMode === "public" && visibleCards.length === 0) {
    return null;
  }

  const title =
    sectionMode === "admin-template" ? "Sample Proof Cards" : "Private Client Feedback";
  const subcopy =
    sectionMode === "admin-template"
      ? "These examples help creators understand what to replace with their own client posts."
      : sectionMode === "builder"
        ? "Add real client moments, testimonials, or Instagram posts that show how your Studio works."
        : "Notes and moments from people training inside this Studio.";

  const openNew = () => {
    replaceTargetId.current = null;
    setEditingCard(null);
    setDialog("new");
  };

  const openEdit = (card: StudioInstagramProofCard) => {
    replaceTargetId.current = null;
    setEditingCard(card);
    setDialog("edit");
  };

  const openReplace = (card: StudioInstagramProofCard) => {
    replaceTargetId.current = card.id;
    setEditingCard(card);
    setDialog("edit");
  };

  const closeDialog = () => {
    setDialog("closed");
    setEditingCard(null);
    replaceTargetId.current = null;
  };

  const upsertFromForm = (values: InstagramProofFormValues, opts: { templateSample: boolean }) => {
    const base: Omit<StudioInstagramProofCard, "id"> = {
      type: "instagram",
      source: opts.templateSample ? "template" : "member",
      isSample: opts.templateSample,
      name: values.name,
      quote: values.quote,
      instagramUrl: values.instagramUrl,
      category: values.category,
      ...(values.imageUrl?.trim() ? { imageUrl: values.imageUrl.trim() } : {}),
    };

    if (dialog === "new" && studioSurface === "admin") {
      setProofCards((prev) => [...prev, { ...base, id: nextProofId("tpl-proof") }]);
      closeDialog();
      return;
    }

    if (dialog === "edit" && editingCard) {
      const rid = replaceTargetId.current;
      const id = rid ?? editingCard.id;
      const next: StudioInstagramProofCard = {
        ...base,
        id,
        source: rid ? "member" : studioSurface === "admin" ? "template" : "member",
        isSample: rid ? false : studioSurface === "admin",
      };
      setProofCards((prev) => prev.map((c) => (c.id === id ? next : c)));
      closeDialog();
    }
  };

  const handleDelete = (id: string) => {
    setProofCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFormSave = (values: InstagramProofFormValues) => {
    if (studioSurface === "admin") {
      upsertFromForm(values, { templateSample: true });
      return;
    }
    upsertFromForm(values, { templateSample: false });
  };

  const showAddButton = studioSurface === "admin" && sectionMode === "admin-template";

  return (
    <>
      <section id="portfolio" className="scroll-mt-24" style={{ marginBottom: "40px" }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 700,
                color: STUDIOS_INK,
                margin: "0 0 8px",
                letterSpacing: "-0.3px",
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: 0, lineHeight: 1.5 }}>{subcopy}</p>
          </div>
          {showAddButton ? (
            <button
              type="button"
              onClick={openNew}
              className="rounded-full border-2 border-stone-900 bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900 hover:bg-stone-50"
            >
              + Add sample IG post
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map((card) => (
            <StudioProofCard
              key={card.id}
              card={card}
              mode={sectionMode}
              onEdit={sectionMode === "admin-template" ? () => openEdit(card) : undefined}
              onReplace={sectionMode === "builder" && card.isSample ? () => openReplace(card) : undefined}
              onDelete={sectionMode === "admin-template" ? () => handleDelete(card.id) : undefined}
            />
          ))}
        </div>
      </section>

      {dialog !== "closed" ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ig-proof-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl ring-1 ring-black/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ig-proof-form-title" className="text-lg font-bold text-stone-900">
              {dialog === "new" ? "Add sample Instagram proof" : "Edit Instagram proof"}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {studioSurface === "admin"
                ? "Saved locally in this session — link-only cards, no embeds."
                : "Paste your Instagram post URL — we never embed Instagram on this page."}
            </p>
            <div className="mt-5">
              <InstagramProofForm
                key={editingCard?.id ?? "new"}
                initial={
                  editingCard
                    ? {
                        name: editingCard.name,
                        quote: editingCard.quote,
                        instagramUrl: editingCard.instagramUrl,
                        imageUrl: editingCard.imageUrl,
                        category: editingCard.category,
                      }
                    : undefined
                }
                submitLabel={replaceTargetId.current ? "Replace card" : "Save"}
                onSave={handleFormSave}
                onCancel={closeDialog}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
