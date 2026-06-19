"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { SalonServiceEditor, type SalonServiceEditorDraft } from "@/components/vmb/salon/SalonServiceEditor";

import { SalonServiceListItem } from "@/components/vmb/salon/SalonServiceListItem";

import { ViewSalonPageLink } from "@/components/vmb/salon/ViewSalonPageLink";

import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";

import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";

import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";

import {

  buildServiceTemplateParticipation,

  participatingTemplatesForService,

} from "@/lib/vmb/invites/service-template-participation";

import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

import {

  applyDraftToSalonService,

  draftFromSalonService,

} from "@/lib/vmb/services/salon-service-summary";

import type { SalonServiceLifecycleAction } from "@/lib/vmb/services/salon-service-lifecycle";

import { activeSalonServiceIdSet } from "@/lib/vmb/services/salon-service-lifecycle";

import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";



function syncDraftsFromServices(items: SalonFacingServiceOffer[]): Record<string, SalonServiceEditorDraft> {

  const next: Record<string, SalonServiceEditorDraft> = {};

  for (const svc of items) {

    next[svc.serviceOfferId] = draftFromSalonService(svc);

  }

  return next;

}



export function SalonServicesClient({

  salonId,

  salonName,

}: {

  salonId?: string;

  salonName: string;

}) {

  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [services, setServices] = useState<SalonFacingServiceOffer[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, SalonServiceEditorDraft>>({});

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);



  const applyServices = useCallback((items: SalonFacingServiceOffer[]) => {

    setServices(items);

    setDrafts(syncDraftsFromServices(items));

  }, []);



  const load = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const [servicesRes, invitesRes] = await Promise.all([

        fetch("/api/vmb/salon-services", { cache: "no-store", credentials: "include" }),

        fetch("/api/vmb/salon-invites", { cache: "no-store", credentials: "include" }),

      ]);

      if (!servicesRes.ok) throw new Error("Could not load services");

      const servicesJson = (await servicesRes.json()) as {

        ok?: boolean;

        categoryId?: string;

        services?: SalonFacingServiceOffer[];

      };

      if (!servicesJson.ok || !servicesJson.services) throw new Error("Could not load services");

      setCategoryId(servicesJson.categoryId ?? null);

      applyServices(servicesJson.services);

      setSelectedServiceId((current) => {

        if (current && servicesJson.services!.some((row) => row.serviceOfferId === current)) {

          return current;

        }

        return servicesJson.services![0]?.serviceOfferId ?? null;

      });



      if (invitesRes.ok) {

        const invitesJson = (await invitesRes.json()) as { ok?: boolean; copies?: SalonInviteLocalCopy[] };

        setPublishedCopies(invitesJson.ok && invitesJson.copies ? invitesJson.copies : []);

      } else {

        setPublishedCopies([]);

      }

    } catch (e) {

      setError(e instanceof Error ? e.message : "Load failed");

    } finally {

      setLoading(false);

    }

  }, [applyServices]);



  useEffect(() => {

    if (!salonId) {

      setLoading(false);

      return;

    }

    void load();

  }, [load, salonId]);



  async function persist(serviceOfferId: string, lifecycleAction: SalonServiceLifecycleAction) {

    const draft = drafts[serviceOfferId];

    const service = services.find((row) => row.serviceOfferId === serviceOfferId);

    if (!draft || !service) return;

    setSavingId(serviceOfferId);

    setError(null);

    try {

      const res = await fetch("/api/vmb/salon-services", {

        method: "PUT",

        headers: { "Content-Type": "application/json" },

        credentials: "include",

        body: JSON.stringify({

          catalogServiceId: serviceOfferId,

          lifecycleAction,

          priceCents: draft.priceCents,

          durationMinutes: draft.durationMinutes,

          enabledAddonIds: draft.addonIds,

          addonPriceCentsById: Object.fromEntries(

            draft.addonIds

              .map((addonId) => [addonId, draft.addonPrices[addonId]] as const)

              .filter((entry): entry is [string, number] => typeof entry[1] === "number"),

          ),

        }),

      });

      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed");



      const nextStatus =

        lifecycleAction === "activate"

          ? "active"

          : lifecycleAction === "deactivate"

            ? "configured"

            : draft.status === "active"

              ? "active"

              : "configured";

      const savedService = applyDraftToSalonService(service, draft, nextStatus);

      const nextServices = services.map((row) =>

        row.serviceOfferId === serviceOfferId ? savedService : row,

      );

      applyServices(nextServices);

    } catch (e) {

      setError(e instanceof Error ? e.message : "Could not save changes");

    } finally {

      setSavingId(null);

    }

  }



  function updateDraft(serviceOfferId: string, patch: Partial<SalonServiceEditorDraft>) {

    setDrafts((prev) => ({

      ...prev,

      [serviceOfferId]: { ...prev[serviceOfferId]!, ...patch },

    }));

  }



  function toggleAddon(serviceOfferId: string, addonId: string) {

    const current = drafts[serviceOfferId]?.addonIds ?? [];

    const next = current.includes(addonId)

      ? current.filter((id) => id !== addonId)

      : [...current, addonId];

    updateDraft(serviceOfferId, { addonIds: next });

  }



  function updateAddonPrice(serviceOfferId: string, addonId: string, priceCents: number) {

    const current = drafts[serviceOfferId]?.addonPrices ?? {};

    updateDraft(serviceOfferId, {

      addonPrices: { ...current, [addonId]: priceCents },

    });

  }



  function listDraftForService(service: SalonFacingServiceOffer): SalonServiceEditorDraft {

    const savedDraft = draftFromSalonService(service);

    if (service.serviceOfferId !== selectedServiceId) {

      return savedDraft;

    }

    return drafts[service.serviceOfferId] ?? savedDraft;

  }



  const categoryLabel = categoryId

    ? getServiceCategoryLabel(categoryId as ServiceCategoryId)

    : null;



  const activeServiceIds = useMemo(

    () => activeSalonServiceIdSet(services.filter((row) => row.status === "active").map((row) => row.serviceOfferId)),

    [services],

  );



  const templateParticipation = useMemo(

    () => buildServiceTemplateParticipation(publishedCopies, { activeServiceIds }),

    [publishedCopies, activeServiceIds],

  );



  const selectedService = services.find((row) => row.serviceOfferId === selectedServiceId) ?? null;

  const selectedDraft = selectedServiceId ? drafts[selectedServiceId] : null;



  return (

    <VmbPageFrame
      title="Services"
      subtitle="Build your menu, set pricing and upgrades, then go live when you're ready to sell."
      width="full"
      headerAction={<ViewSalonPageLink />}
    >

      <div className="vmb-salon-services">

        {salonName ? <p className="vmb-salon-services__context">{salonName}</p> : null}



        {loading ? (

          <p className="vmb-salon-services__state">Loading services…</p>

        ) : !salonId ? (

          <p className="vmb-salon-services__empty">

            Sign in to your salon workspace to configure services.

          </p>

        ) : error ? (

          <p className="vmb-salon-services__state vmb-salon-services__state--error">{error}</p>

        ) : services.length === 0 ? (

          <p className="vmb-salon-services__empty">

            No services loaded yet. Choose a category in your salon profile or ask VMB to load

            your starter menu.

          </p>

        ) : (

          <>

            {categoryLabel ? <p className="vmb-salon-services__category">{categoryLabel}</p> : null}

            <div className="vmb-salon-services__layout">

              <aside className="vmb-salon-services__list-panel">

                <p className="vmb-salon-services__panel-label">Service Collection</p>

                <ul className="vmb-salon-services__list">

                  {services.map((svc) => {

                    const cardDraft = listDraftForService(svc);

                    return (

                      <SalonServiceListItem

                        key={svc.serviceOfferId}

                        name={svc.displayName}

                        service={svc}

                        draft={cardDraft}

                        selected={selectedServiceId === svc.serviceOfferId}

                        onSelect={() => setSelectedServiceId(svc.serviceOfferId)}

                      />

                    );

                  })}

                </ul>

              </aside>



              <div className="vmb-salon-services__editor-panel">
                <p className="vmb-salon-services__panel-label vmb-salon-services__panel-label--studio">Service Studio</p>

                {selectedService && selectedDraft ? (

                  <SalonServiceEditor

                    service={selectedService}

                    draft={selectedDraft}

                    saving={savingId === selectedService.serviceOfferId}

                    participatingTemplates={participatingTemplatesForService(

                      templateParticipation,

                      selectedService.serviceOfferId,

                      selectedDraft.status,

                    ).map((row) => row.templateName)}

                    onDraftChange={(patch) => updateDraft(selectedService.serviceOfferId, patch)}

                    onToggleAddon={(addonId) => toggleAddon(selectedService.serviceOfferId, addonId)}

                    onAddonPriceChange={(addonId, priceCents) =>

                      updateAddonPrice(selectedService.serviceOfferId, addonId, priceCents)

                    }

                    onLifecycleAction={(action) => void persist(selectedService.serviceOfferId, action)}

                  />

                ) : (

                  <p className="vmb-salon-services__empty">Select a service from your collection to open the studio.</p>

                )}

              </div>

            </div>

          </>

        )}

      </div>

    </VmbPageFrame>

  );

}


