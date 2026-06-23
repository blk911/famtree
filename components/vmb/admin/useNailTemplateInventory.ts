"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildNailTemplateDrafts,
  type NailTemplateDraft,
} from "@/lib/vmb/admin/nail-template-library";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";
import type { ServicePresetCard } from "@/lib/vmb/services/service-preset-types";

export function useNailTemplateInventory(salonId?: string, salonToken?: string) {
  const [drafts, setDrafts] = useState<NailTemplateDraft[]>([]);
  const [services, setServices] = useState<VmbService[]>([]);
  const [serviceOptions, setServiceOptions] = useState<VmbServiceOption[]>([]);
  const [servicePresets, setServicePresets] = useState<ServicePresetCard[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    const scopeParams = new URLSearchParams();
    if (salonToken) {
      scopeParams.set("salonToken", salonToken);
    } else {
      scopeParams.set("salonId", salonId);
    }
    const scopedQuery = scopeParams.toString();
    const scopedPath = (path: string) => `${path}?${scopedQuery}`;
    const [offerRes, serviceRes, presetRes, templateRes] = await Promise.all([
      fetch(scopedPath("/api/vmb/offers")),
      fetch(scopedPath("/api/vmb/services")),
      fetch("/api/vmb/service-presets?categoryId=nails&includeInactive=1"),
      fetch("/api/vmb/invite-templates?categoryId=nails&includeInactive=1"),
    ]);
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const serviceData = (await serviceRes.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    const presetData = (await presetRes.json()) as { ok?: boolean; presets?: ServicePresetCard[] };
    const templateData = (await templateRes.json()) as {
      ok?: boolean;
      templates?: VmbInviteTemplate[];
    };
    if (offerData.ok && offerData.offers) {
      setDrafts(buildNailTemplateDrafts(salonId, offerData.offers, templateData.templates));
    }
    if (serviceData.ok && serviceData.services) {
      setServices(serviceData.services);
    }
    if (serviceData.ok && serviceData.options) {
      setServiceOptions(serviceData.options);
    }
    if (presetData.ok && presetData.presets) {
      setServicePresets(presetData.presets);
    }
    setLoading(false);
  }, [salonId, salonToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const serviceFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const service of services) {
      map[service.id] = service.name;
    }
    for (const preset of servicePresets) {
      map[preset.serviceOfferId] = preset.displayName;
    }
    return map;
  }, [servicePresets, services]);

  const optionFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const option of serviceOptions) {
      map[option.id] = option.name;
    }
    for (const preset of servicePresets) {
      for (const addon of preset.addonPresets) {
        map[addon.addonId] = addon.label;
      }
    }
    return map;
  }, [serviceOptions, servicePresets]);

  const servicePriceById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const preset of servicePresets) {
      map[preset.serviceOfferId] = preset.basePriceCents / 100;
    }
    return map;
  }, [servicePresets]);

  const addonPriceByServiceId = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const preset of servicePresets) {
      map[preset.serviceOfferId] = Object.fromEntries(
        preset.addonPresets.map((addon) => [addon.addonId, addon.priceCents / 100]),
      );
    }
    return map;
  }, [servicePresets]);

  return {
    drafts,
    services,
    serviceOptions,
    loading,
    reload,
    serviceFallbackById,
    optionFallbackById,
    servicePriceById,
    addonPriceByServiceId,
  };
}
