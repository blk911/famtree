"use client";



import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<SalonFacingServiceOffer[]>([]);

  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);

  const [resolvedOwnerName, setResolvedOwnerName] = useState(ownerName ?? "");
  const [findInviteOpen, setFindInviteOpen] = useState(false);
  const [findInviteEmail, setFindInviteEmail] = useState("");
  const [findInviteBusy, setFindInviteBusy] = useState(false);
  const [findInviteError, setFindInviteError] = useState<string | null>(null);



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
      let inviteCopies = invitesJson.ok && invitesJson.copies ? invitesJson.copies : [];
      if (invitesJson.ok && inviteCopies.length === 0) {
        const syncRes = await fetch("/api/vmb/salon-invites/sync", {
          method: "POST",
          credentials: "include",
        });
        const syncJson = (await syncRes.json()) as {
          ok?: boolean;
          copies?: SalonInviteLocalCopy[];
        };
        if (syncRes.ok && syncJson.ok && syncJson.copies) {
          inviteCopies = syncJson.copies;
        }
      }



      if (!servicesJson.ok || !servicesJson.services) {

        throw new Error("Could not load services");

      }



      setServices(servicesJson.services);

      setPublishedCopies(

        publishedCopiesForMatching(inviteCopies),

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

    const refreshOnFocus = () => void load();

    window.addEventListener("focus", refreshOnFocus);

    return () => window.removeEventListener("focus", refreshOnFocus);

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

  async function submitFindInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFindInviteBusy(true);
    setFindInviteError(null);
    try {
      const response = await fetch("/api/vmb/client-invites/lookup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: findInviteEmail }),
      });
      const json = (await response.json()) as { ok?: boolean; invite?: { id: string }; error?: string };
      if (!response.ok || !json.ok || !json.invite?.id) {
        throw new Error(json.error ?? "No active invite found.");
      }
      router.push(
        `/vmb/client?inviteId=${encodeURIComponent(json.invite.id)}&contact=${encodeURIComponent(findInviteEmail.trim())}`,
      );
    } catch (err) {
      setFindInviteError(err instanceof Error ? err.message : "No active invite found.");
    } finally {
      setFindInviteBusy(false);
    }
  }



  return (

    <VmbPageFrame width="full" headerless>

      <div
        className="vmb-salon-landing vmb-salon-landing--botanical"
        data-vmb-page="salon-page"
        data-vmb-style="botanical-stationery"
      >

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

            <section className="vmb-salon-landing__hero" data-vmb-region="salon-hero" aria-label="Salon welcome">

              <div className="vmb-salon-landing__hero-media" data-vmb-element="hero-image">
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

              <div className="vmb-salon-landing__hero-copy" data-vmb-element="hero-copy">

                {resolvedOwnerName ? (

                  <p className="vmb-salon-landing__owner">With {resolvedOwnerName}</p>

                ) : null}

                <h1 className="vmb-salon-landing__salon-name">{salonName}</h1>

                <p className="vmb-salon-landing__headline">{headline}</p>

                <p className="vmb-salon-landing__intro">{heroIntro()}</p>

                <div className="vmb-salon-landing__cta-row">
                  <button type="button" className="vmb-salon-landing__cta vmb-salon-landing__cta--hero" disabled>

                    {networkCta}

                  </button>
                  <button
                    type="button"
                    className="vmb-salon-landing__cta vmb-salon-landing__cta--find"
                    onClick={() => {
                      setFindInviteOpen(true);
                      setFindInviteError(null);
                    }}
                  >
                    Find My Invite
                  </button>
                </div>

              </div>

            </section>



            <section className="vmb-salon-landing__section" data-vmb-region="featured-services" aria-label="Featured services">

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

                      <li key={service.serviceOfferId} className="vmb-salon-landing__service-card" data-vmb-element="service-card">
                        <div className="vmb-salon-landing__service-copy" data-vmb-element="service-copy">
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

                          <button type="button" className="vmb-salon-landing__service-cta" disabled>
                            Request this service
                          </button>
                        </div>

                        <div className="vmb-salon-landing__service-photo" data-vmb-element="service-image">
                          <ServicePhotoImage
                            resolved={serviceImage}
                            alt={serviceImage.title || service.displayName}
                            sizes="(max-width: 768px) 100vw, 200px"
                          />
                        </div>

                      </li>

                    );

                  })}

                </ul>

              )}

            </section>



            <section className="vmb-salon-landing__section" data-vmb-region="private-offers" aria-label="Private offers">

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

                      <li key={copy.id} className="vmb-salon-landing__offer-card" data-vmb-element="invite-card">

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



            <section className="vmb-salon-landing__section vmb-salon-landing__pcn" data-vmb-region="private-client-network" aria-label="Private Client Network">

              <h2 className="vmb-salon-landing__section-title">Stay on My Private Client List</h2>

              <p className="vmb-salon-landing__section-desc">

                Keep your invite connection open for future openings, private offers, birthday notes, referral

                gifts, and trusted provider recommendations.

              </p>

              <button type="button" className="vmb-salon-landing__cta" disabled>

                Join for Updates

              </button>

            </section>



            <section className="vmb-salon-landing__section vmb-salon-landing__providers" data-vmb-region="favorite-providers" aria-label="Favorite providers">

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

        {findInviteOpen ? (
          <div className="vmb-client-lookup-modal" role="dialog" aria-modal="true" aria-label="Find my invite">
            <div className="vmb-client-lookup-modal__dialog">
              <div className="vmb-client-lookup-modal__header">
                <div>
                  <p className="vmb-client-lookup-modal__eyebrow">Private invite lookup</p>
                  <h2>Find My Invite</h2>
                </div>
                <button
                  type="button"
                  className="vmb-client-lookup-modal__close"
                  onClick={() => setFindInviteOpen(false)}
                >
                  Close
                </button>
              </div>
              <p className="vmb-client-lookup-modal__copy">
                Enter the email your salon used for the invite. If an active invite is waiting, we will open your
                private offer page.
              </p>
              <form onSubmit={(event) => void submitFindInvite(event)} className="vmb-client-lookup-modal__form">
                <label>
                  Email
                  <input
                    type="email"
                    value={findInviteEmail}
                    onChange={(event) => setFindInviteEmail(event.target.value)}
                    placeholder="vanessa@test.com"
                    required
                  />
                </label>
                {findInviteError ? <p className="vmb-client-lookup-modal__error">{findInviteError}</p> : null}
                <div className="vmb-client-lookup-modal__actions">
                  <button type="button" onClick={() => setFindInviteOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={findInviteBusy}>
                    {findInviteBusy ? "Finding..." : "Open Invite"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

      </div>

    </VmbPageFrame>

  );

}
