"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildNailTemplateDrafts,
  type NailTemplateDraft,
} from "@/lib/vmb/admin/nail-template-library";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";

export function useNailTemplateInventory(salonId?: string) {
  const [drafts, setDrafts] = useState<NailTemplateDraft[]>([]);
  const [services, setServices] = useState<VmbService[]>([]);
  const [serviceOptions, setServiceOptions] = useState<VmbServiceOption[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    const [offerRes, serviceRes] = await Promise.all([
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/services"),
    ]);
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const serviceData = (await serviceRes.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    if (offerData.ok && offerData.offers) {
      setDrafts(buildNailTemplateDrafts(salonId, offerData.offers));
    }
    if (serviceData.ok && serviceData.services) {
      setServices(serviceData.services);
    }
    if (serviceData.ok && serviceData.options) {
      setServiceOptions(serviceData.options);
    }
    setLoading(false);
  }, [salonId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const serviceFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const service of services) {
      map[service.id] = service.name;
    }
    return map;
  }, [services]);

  const optionFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const option of serviceOptions) {
      map[option.id] = option.name;
    }
    return map;
  }, [serviceOptions]);

  return {
    drafts,
    services,
    serviceOptions,
    loading,
    reload,
    serviceFallbackById,
    optionFallbackById,
  };
}
