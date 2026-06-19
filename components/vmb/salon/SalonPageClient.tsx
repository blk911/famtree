"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SalonInvitationThumbnail } from "@/components/vmb/salon/SalonInvitationThumbnail";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import { publishedCopiesForMatching } from "@/lib/vmb/invites/salon-invite-inventory";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  formatSalonDuration,
  formatSalonPrice,
  listSelectedUpgradeLines,
} from "@/lib/vmb/services/salon-service-summary";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

const HERO_INTRO =
  "Browse our menu, explore featured offers, and discover what makes our salon special.";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
};

export function SalonPageClient({ salonId, salonName, ownerName }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<SalonFacingServiceOffer[]>([]);
  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);
  const [resolvedOwnerName, setResolvedOwnerName] = useState(ownerName ?? "");

  const load = useCallback(async () => {
    if (!salonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, invitesRes, workspaceRes] = await Promise.all([
        fetch("/api/vmb/salon-services", { cache: "no-store", credentials: "include" }),
        fetch("/api/vmb/salon-invites", { cache: "no-store", credentials: "include" }),
        fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" }),
      ]);

      if (!servicesRes.ok || !invitesRes.ok) {
        throw new Error("Could not load salon page");
      }

      const servicesJson = (await servicesRes.json()) as {
        ok?: boolean;
        services?: SalonFacingServiceOffer[];
      };
      const invitesJson = (await invitesRes.json()) as {
        ok?: boolean;
        copies?: SalonInviteLocalCopy[];
      };

      if (!servicesJson.ok || !servicesJson.services) {
        throw new Error("Could not load services");
      }

      setServices(servicesJson.services);
      setPublishedCopies(
        publishedCopiesForMatching(invitesJson.ok && invitesJson.copies ? invitesJson.copies : []),
      );

      if (workspaceRes.ok) {
        const workspaceJson = (await workspaceRes.json()) as {
          ok?: boolean;
          data?: { ownerName?: string };
        };
        const workspaceOwner = workspaceJson.data?.ownerName?.trim();
        if (workspaceOwner) setResolvedOwnerName(workspaceOwner);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (ownerName) setResolvedOwnerName(ownerName);
  }, [ownerName]);

  const activeServices = useMemo(
    () => services.filter((service) => service.status === "active"),
    [services],
  );

  const tokenContext = useMemo<InviteTemplateTokenContext>(
    () => ({
      salonName,
      providerName: resolvedOwnerName || "Your stylist",
      clientName: "Guest",
      claimLink: "#",
    }),
    [resolvedOwnerName, salonName],
  );

  return (
    <VmbPageFrame width="full" headerless>
      <div className="vmb-salon-landing">
        <p className="vmb-salon-landing__preview-note">
          Client destination preview — invitations and outreach will land here.
        </p>

        {loading ? (
          <p className="vmb-salon-landing__state">Loading your salon page…</p>
        ) : !salonId ? (
          <p className="vmb-salon-landing__state">
            Sign in to your salon workspace to preview your landing page.
          </p>
        ) : error ? (
          <p className="vmb-salon-landing__state vmb-salon-landing__state--error">{error}</p>
        ) : (
          <>
            <section className="vmb-salon-landing__hero" aria-label="Salon welcome">
              <div className="vmb-salon-landing__hero-media" aria-hidden="true">
                <span className="vmb-salon-landing__hero-media-icon">✦</span>
                <p className="vmb-salon-landing__hero-media-label">Salon photo coming soon</p>
              </div>
              <div className="vmb-salon-landing__hero-copy">
                {resolvedOwnerName ? (
                  <p className="vmb-salon-landing__owner">{resolvedOwnerName}</p>
                ) : null}
                <h1 className="vmb-salon-landing__salon-name">{salonName}</h1>
                <p className="vmb-salon-landing__headline">Welcome to my salon</p>
                <p className="vmb-salon-landing__intro">{HERO_INTRO}</p>
              </div>
            </section>

            <section className="vmb-salon-landing__section" aria-label="Services">
              <header className="vmb-salon-landing__section-head">
                <h2 className="vmb-salon-landing__section-title">Services</h2>
                <p className="vmb-salon-landing__section-desc">Live services from your active menu.</p>
              </header>
              {activeServices.length === 0 ? (
                <p className="vmb-salon-landing__empty">
                  No live services yet. Go live with services in your Service Collection.
                </p>
              ) : (
                <ul className="vmb-salon-landing__service-list">
                  {activeServices.map((service) => {
                    const draft = {
                      priceCents: service.priceCents,
                      durationMinutes: service.durationMinutes,
                      addonIds: service.addons.filter((addon) => addon.enabled).map((a) => a.addonId),
                      addonPrices: Object.fromEntries(
                        service.addons.map((addon) => [addon.addonId, addon.priceCents]),
                      ),
                      status: service.status,
                    };
                    const upgrades = listSelectedUpgradeLines(service, draft).slice(0, 3);
                    return (
                      <li key={service.serviceOfferId} className="vmb-salon-landing__service-card">
                        <h3 className="vmb-salon-landing__service-name">{service.displayName}</h3>
                        <p className="vmb-salon-landing__service-meta">
                          {formatSalonPrice(service.priceCents)} &bull; {formatSalonDuration(service.durationMinutes)}
                        </p>
                        {upgrades.length > 0 ? (
                          <div className="vmb-salon-landing__service-upgrades">
                            <p className="vmb-salon-landing__service-upgrades-label">Popular upgrades:</p>
                            <ul>
                              {upgrades.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="vmb-salon-landing__section" aria-label="Featured offers">
              <header className="vmb-salon-landing__section-head">
                <h2 className="vmb-salon-landing__section-title">Featured Offers</h2>
                <p className="vmb-salon-landing__section-desc">
                  Published invitations your clients may discover on your salon page.
                </p>
              </header>
              {publishedCopies.length === 0 ? (
                <p className="vmb-salon-landing__empty">
                  Featured offers will appear when invitations are published to your salon.
                </p>
              ) : (
                <ul className="vmb-salon-landing__offer-grid">
                  {publishedCopies.map((copy) => (
                    <li key={copy.id} className="vmb-salon-landing__offer-card">
                      <SalonInvitationThumbnail
                        snapshot={copy.snapshot}
                        tokenContext={tokenContext}
                        compact
                      />
                      <p className="vmb-salon-landing__offer-name">{copy.snapshot.templateName}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="vmb-salon-landing__section vmb-salon-landing__pcn" aria-label="Private Client Network">
              <h2 className="vmb-salon-landing__section-title">Join My Private Client Network</h2>
              <p className="vmb-salon-landing__section-desc">
                Get early access to openings, offers, and special events.
              </p>
              <button type="button" className="vmb-salon-landing__cta" disabled>
                Join My Network
              </button>
            </section>

            <section className="vmb-salon-landing__section vmb-salon-landing__providers" aria-label="Favorite providers">
              <h2 className="vmb-salon-landing__section-title">Favorite Providers</h2>
              <p className="vmb-salon-landing__coming-soon">Coming soon.</p>
              <p className="vmb-salon-landing__providers-future">
                Hair · Wax · Skin · Lashes · Massage
              </p>
            </section>
          </>
        )}
      </div>
    </VmbPageFrame>
  );
}
