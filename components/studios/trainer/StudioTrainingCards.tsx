"use client";

import { useEffect, useState } from "react";
import { RequestSessionModal, type RequestModalService } from "@/components/studios/RequestSessionModal";

type CategoryId = "run" | "strength" | "cycle" | "recover";

type ServiceItem = RequestModalService;

/** Card imagery must exist under `public/images/` (URLs `/images/...`). */
const TOP_CARDS: readonly {
  id: CategoryId;
  title: string;
  text: string;
  image: string;
}[] = [
  {
    id: "run",
    title: "RUN STRONGER",
    text: "We refine your form, pacing, and endurance so every mile builds real performance—not just fatigue.",
    image: "/images/runner.jpg",
  },
  {
    id: "strength",
    title: "BUILD STRENGTH",
    text: "Structured lifting with clean technique and progressive load—strength that actually translates.",
    image: "/images/strength.jpg",
  },
  {
    id: "cycle",
    title: "RIDE HARD",
    text: "High-intensity cycling sessions designed to push output, stamina, and recovery thresholds.",
    image: "/images/cycling.jpg",
  },
  {
    id: "recover",
    title: "RECOVER RIGHT",
    text: "Mobility, stretch, and recovery work that keeps your body durable, balanced, and ready.",
    image: "/images/stretch.jpg",
  },
] as const;

const services: Record<CategoryId, ServiceItem[]> = {
  strength: [
    {
      title: "Small Group Strength",
      desc: "Coach-led sets with shared racks—accountability and cues without crowding the floor.",
      price: "$45",
      package: "5-pack $200",
      type: "group",
    },
    {
      title: "1:1 Power Hour",
      desc: "Personal programming blocks focused on compound lifts and measurable progression.",
      price: "$95",
      package: "4-pack $340",
      type: "private",
    },
    {
      title: "Technique Lab",
      desc: "Slow-tempo reps and video feedback so positions stay safe under heavier loads.",
      price: "$55",
      package: "Drop-in",
      type: "semi-private",
    },
    {
      title: "Athletic Strength Block",
      desc: "Explosive contrasts and accessory work tailored to court and field demands.",
      price: "$50",
      package: "8-pack $360",
      type: "group",
    },
  ],
  run: [
    {
      title: "Interval Track Session",
      desc: "Measured repeats with pacing targets—build speed without burning out mid-season.",
      price: "$40",
      package: "6-pack $210",
      type: "group",
    },
    {
      title: "Easy Miles & Form",
      desc: "Low-heart-rate volume plus drills that clean up foot strike and posture.",
      price: "$35",
      package: "Drop-in",
      type: "group",
    },
    {
      title: "Long Run Progression",
      desc: "Fuel, pacing, and mental checkpoints for race-week confidence.",
      price: "$48",
      package: "4-pack $175",
      type: "group",
    },
    {
      title: "Video Gait Review",
      desc: "Treadmill capture plus cues you can repeat solo during the week.",
      price: "$65",
      package: "Add-on $45",
      type: "private",
    },
  ],
  cycle: [
    {
      title: "HIIT Spin Lab",
      desc: "Intervals that spike power zones then settle into controlled recovery.",
      price: "$38",
      package: "10-pack $320",
      type: "group",
    },
    {
      title: "Endurance Build",
      desc: "Steady aerobic blocks with cadence prompts for sustainable output.",
      price: "$36",
      package: "5-pack $165",
      type: "group",
    },
    {
      title: "Climb & Sprint Mix",
      desc: "Short surges on resistance to mimic hills without leaving the studio.",
      price: "$38",
      package: "Drop-in",
      type: "group",
    },
    {
      title: "Recovery Ride",
      desc: "Flush rides focused on breath, mobility between sets, and nervous-system reset.",
      price: "$32",
      package: "Monthly unlimited add-on",
      type: "group",
    },
  ],
  recover: [
    {
      title: "Mobility Reset",
      desc: "Joint-by-joint flows that open hips, T-spine, and ankles before heavy training.",
      price: "$42",
      package: "5-pack $185",
      type: "group",
    },
    {
      title: "Guided Stretch Flow",
      desc: "Breath-paced lengthening that pairs static holds with light movement.",
      price: "$38",
      package: "Drop-in",
      type: "group",
    },
    {
      title: "Foam & Release Clinic",
      desc: "Self-myofascial patterns plus coach checkpoints so tissues stay responsive.",
      price: "$44",
      package: "3-pack $115",
      type: "workshop",
    },
    {
      title: "Durability Private",
      desc: "Personalized prep and cooldown scripts mapped to your sport load.",
      price: "$85",
      package: "4-pack $300",
      type: "private",
    },
  ],
};

export function StudioTrainingCards({ className }: { className?: string }) {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [servicesEntered, setServicesEntered] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!activeCategory) {
      setServicesEntered(false);
      return;
    }
    setServicesEntered(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setServicesEntered(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeCategory]);

  return (
    <div className={`min-w-0 space-y-3 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-900">BUILD REAL PERFORMANCE</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOP_CARDS.map((card) => {
          const active = activeCategory === card.id;
          return (
            <button
              key={card.id}
              type="button"
              aria-label={`${card.title}: ${card.text}`}
              onClick={() => setActiveCategory(card.id)}
              className={`overflow-hidden rounded-lg bg-white text-left shadow-sm ring-1 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 ${
                active ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-stone-50/80" : "ring-black/[0.05] hover:ring-black/15"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static assets in /public */}
              <img src={card.image} alt="" className="pointer-events-none aspect-square w-full object-cover" aria-hidden />
              <div className="p-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-900">{card.title}</div>
                <div className="mt-1 text-[11px] leading-tight text-neutral-600">{card.text}</div>
              </div>
            </button>
          );
        })}
      </div>

      {activeCategory ? (
        <div
          key={activeCategory}
          className={`mt-4 grid grid-cols-1 gap-4 transition-all duration-300 ease-out md:grid-cols-2 lg:grid-cols-4 ${
            servicesEntered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          {services[activeCategory].map((svc) => (
            <button
              key={svc.title}
              type="button"
              onClick={() => {
                setSelectedService(svc);
                setModalOpen(true);
              }}
              className="flex flex-col rounded-lg border border-black/[0.08] bg-white p-3 text-left shadow-sm ring-1 ring-black/[0.03] transition hover:border-black/15 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
            >
              <span className="text-sm font-semibold text-stone-900">{svc.title}</span>
              <span className="mt-1 line-clamp-3 text-[12px] leading-snug text-neutral-600">{svc.desc}</span>
              <span className="mt-2 text-sm font-semibold text-stone-900">{svc.price}</span>
              <span className="text-[11px] font-medium text-stone-500">{svc.package}</span>
            </button>
          ))}
        </div>
      ) : null}

      <RequestSessionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedService(null);
        }}
        service={selectedService}
      />
    </div>
  );
}
