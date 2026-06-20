"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { SalonInvitationThumbnail } from "@/components/vmb/salon/SalonInvitationThumbnail";
import { ServicePhotoImage } from "@/components/vmb/salon/ServicePhotoImage";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { buildServiceImageInput, getFallbackServiceAsset, getServiceImage } from "@/lib/vmb/assets";

import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

import { resolveInvitationPricing } from "@/lib/vmb/invites/invitation-pricing-display";

import {

  resolveSnapshotRewardLabels,

  resolveSnapshotServiceLabels,

} from "@/lib/vmb/invites/invite-template-snapshot";

import { publishedCopiesForMatching } from "@/lib/vmb/invites/salon-invite-inventory";

import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

import {

  formatSalonDuration,

  formatSalonPrice,

  listSelectedUpgradeLines,

} from "@/lib/vmb/services/salon-service-summary";

import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";



const PROVIDER_CATEGORIES = ["Hair", "Skin", "Waxing", "Brows", "Lashes", "Massage"] as const;



function ownerFirstName(name: string): string {

  return name.trim().split(/\s+/)[0] ?? "";

}



function possessiveLabel(name: string): string {

  const first = ownerFirstName(name);

  if (!first) return "My";

  return first.endsWith("s") ? `${first}'` : `${first}'s`;

}



function heroHeadline(ownerName: string): string {

  const label = possessiveLabel(ownerName);

  if (label === "My") return "Welcome to my private client salon page.";

  return `Welcome to ${label} private client salon page.`;

}



function heroIntro(): string {

  return "Favorite services, private offers, and trusted recommendations live here.";

}



function pcnCtaLabel(ownerName: string): string {

  const label = possessiveLabel(ownerName);

  if (label === "My") return "Join My Private Client Network";

  return `Join ${label} Private Client Network`;

}



function favoriteProvidersTitle(ownerName: string): string {

  const first = ownerFirstName(ownerName);

  if (!first) return "Favorite Providers";

  return `${first}'s Favorite Providers`;

}



function favoriteProvidersCopy(ownerName: string): string {

  const first = ownerFirstName(ownerName);

  if (!first) return "Trusted providers will appear here.";

  return `Trusted providers ${first} recommends will appear here.`;

}



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

        throw new Error("Could not load your salon page");

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



  const providersTitle = favoriteProvidersTitle(resolvedOwnerName);

  const headline = heroHeadline(resolvedOwnerName);

  const networkCta = pcnCtaLabel(resolvedOwnerName);
  const heroImage = getFallbackServiceAsset();



  return (

    <VmbPageFrame width="full" headerless>

      <div className="vmb-salon-landing">

        {loading ? (

          <p className="vmb-salon-landing__state">Loading…</p>

        ) : !salonId ? (

          <p className="vmb-salon-landing__state">

            Sign in to your salon workspace to preview your page.

          </p>

        ) : error ? (

          <p className="vmb-salon-landing__state vmb-salon-landing__state--error">{error}</p>

        ) : (

          <>

            <section className="vmb-salon-landing__hero" aria-label="Salon welcome">

              <div className="vmb-salon-landing__hero-media">
                <ServicePhotoImage
                  resolved={{
                    imageUrl: heroImage.imageUrl,
                    title: heroImage.title,
                    source: "fallback",
                    assetId: heroImage.id,
                    category: heroImage.category,
                  }}
                  alt={heroImage.title || "Salon atmosphere"}
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="vmb-salon-landing__hero-media-image"
                />
              </div>

              <div className="vmb-salon-landing__hero-copy">

                {resolvedOwnerName ? (

                  <p className="vmb-salon-landing__owner">With {resolvedOwnerName}</p>

                ) : null}

                <h1 className="vmb-salon-landing__salon-name">{salonName}</h1>

                <p className="vmb-salon-landing__headline">{headline}</p>

                <p className="vmb-salon-landing__intro">{heroIntro()}</p>

                <button type="button" className="vmb-salon-landing__cta vmb-salon-landing__cta--hero" disabled>

                  {networkCta}

                </button>

              </div>

            </section>



            <section className="vmb-salon-landing__section" aria-label="Featured services">

              <header className="vmb-salon-landing__section-head">

                <h2 className="vmb-salon-landing__section-title">Featured Services</h2>

              </header>

              {activeServices.length === 0 ? (

                <div className="vmb-salon-landing__empty">

                  <p className="vmb-salon-landing__empty-title">Featured services coming soon.</p>

                  <p className="vmb-salon-landing__empty-help">

                    Signature treatments and favorites will appear here.

                  </p>

                </div>

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
                    const serviceImage = getServiceImage(buildServiceImageInput(service, salonId));

                    return (

                      <li key={service.serviceOfferId} className="vmb-salon-landing__service-card">
                        <div className="vmb-salon-landing__service-photo">
                          <ServicePhotoImage
                            resolved={serviceImage}
                            alt={serviceImage.title || service.displayName}
                            sizes="(max-width: 768px) 100vw, 420px"
                          />
                        </div>
                        <h3 className="vmb-salon-landing__service-name">{service.displayName}</h3>

                        <p className="vmb-salon-landing__service-meta">

                          {formatSalonPrice(service.priceCents)} &bull;{" "}

                          {formatSalonDuration(service.durationMinutes)}

                        </p>

                        {service.shortDescription ? (

                          <p className="vmb-salon-landing__service-desc">{service.shortDescription}</p>

                        ) : null}

                        {upgrades.length > 0 ? (

                          <div className="vmb-salon-landing__service-upgrades">

                            <p className="vmb-salon-landing__service-upgrades-label">Top upgrades</p>

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



            <section className="vmb-salon-landing__section" aria-label="Private offers">

              <header className="vmb-salon-landing__section-head">

                <h2 className="vmb-salon-landing__section-title">Private Offers &amp; Invitations</h2>

              </header>

              {publishedCopies.length === 0 ? (

                <div className="vmb-salon-landing__empty">

                  <p className="vmb-salon-landing__empty-title">Private offers coming soon.</p>

                  <p className="vmb-salon-landing__empty-help">

                    Exclusive invitations and seasonal surprises will appear here.

                  </p>

                </div>

              ) : (

                <ul className="vmb-salon-landing__offer-grid">

                  {publishedCopies.map((copy) => {

                    const pricing = resolveInvitationPricing(copy.snapshot);

                    const serviceLabels = resolveSnapshotServiceLabels(copy.snapshot);

                    const rewardLabels = resolveSnapshotRewardLabels(copy.snapshot);

                    return (

                      <li key={copy.id} className="vmb-salon-landing__offer-card">

                        <SalonInvitationThumbnail
                          snapshot={copy.snapshot}
                          tokenContext={tokenContext}
                          salonId={salonId}
                          compact
                        />

                        <div className="vmb-salon-landing__offer-details">

                          <p className="vmb-salon-landing__offer-name">{copy.snapshot.templateName}</p>

                          {rewardLabels.length > 0 ? (

                            <p className="vmb-salon-landing__offer-reward">{rewardLabels.join(" · ")}</p>

                          ) : null}

                          {serviceLabels.length > 0 ? (

                            <p className="vmb-salon-landing__offer-service">{serviceLabels.join(" · ")}</p>

                          ) : null}

                          {pricing.offerPrice > 0 ? (

                            <p className="vmb-salon-landing__offer-price">

                              {pricing.priceLabel}

                              {pricing.totalValue > pricing.offerPrice ? (

                                <span className="vmb-salon-landing__offer-value">

                                  {" "}

                                  (value {pricing.valueLabel})

                                </span>

                              ) : null}

                            </p>

                          ) : null}

                          <button type="button" className="vmb-salon-landing__offer-cta" disabled>

                            View Offer

                          </button>

                        </div>

                      </li>

                    );

                  })}

                </ul>

              )}

            </section>



            <section className="vmb-salon-landing__section vmb-salon-landing__pcn" aria-label="Private Client Network">

              <h2 className="vmb-salon-landing__section-title">Join My Private Client Network</h2>

              <p className="vmb-salon-landing__section-desc">

                Get first access to openings, private offers, birthday surprises, referral gifts, and trusted

                provider recommendations.

              </p>

              <button type="button" className="vmb-salon-landing__cta" disabled>

                Join My Network

              </button>

            </section>



            <section className="vmb-salon-landing__section vmb-salon-landing__providers" aria-label="Favorite providers">

              <h2 className="vmb-salon-landing__section-title">{providersTitle}</h2>

              <p className="vmb-salon-landing__section-desc">

                {favoriteProvidersCopy(resolvedOwnerName)}

              </p>

              <ul className="vmb-salon-landing__provider-chips">

                {PROVIDER_CATEGORIES.map((category) => (

                  <li key={category}>{category}</li>

                ))}

              </ul>

            </section>

          </>

        )}

      </div>

    </VmbPageFrame>

  );

}

