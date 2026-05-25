"use client";
// components/studios/creator-lab/LabStepper.tsx
// Step-sequence nav for the Creator Lab pipeline.
// Three steps: Resolve (IG stubs) → Assemble (creator lab) → Review (result)

import Link from "next/link";

export type LabStep = 1 | 2 | 3;

interface Step {
  n: LabStep;
  label: string;
  sub: string;
  href: string;
}

const STEPS: Step[] = [
  { n: 1, label: "Resolve",  sub: "IG Stub Resolver",    href: "/admin/studios/creator-lab/ig-stubs" },
  { n: 2, label: "Assemble", sub: "Creator Lab",          href: "/admin/studios/creator-lab" },
  { n: 3, label: "Review",   sub: "Assembled Studio",     href: "#" },
];

export function LabStepper({ active }: { active: LabStep }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        marginBottom: 28,
        userSelect: "none",
      }}
    >
      {STEPS.map((step, i) => {
        const isActive   = step.n === active;
        const isDone     = step.n < active;
        const isUpcoming = step.n > active;
        const isLast     = i === STEPS.length - 1;

        const circleColor  = isActive ? "#1c1917" : isDone ? "#9d174d" : "#d6d3d1";
        const labelColor   = isActive ? "#1c1917" : isDone ? "#9d174d" : "#a8a29e";
        const subColor     = isActive ? "#57534e"  : isDone ? "#c4a0b0" : "#d6d3d1";
        const lineColor    = isDone   ? "#9d174d"  : "#e7e5e4";
        const canNavigate  = isDone || isActive;

        const inner = (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
            {/* Circle */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: isActive ? "#1c1917" : isDone ? "#9d174d" : "#fff",
                border: `2px solid ${circleColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
                boxShadow: isActive ? "0 0 0 4px rgba(28,25,23,0.08)" : "none",
              }}
            >
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isActive ? "#fff" : "#a8a29e",
                    lineHeight: 1,
                  }}
                >
                  {step.n}
                </span>
              )}
            </div>

            {/* Labels */}
            <div
              style={{
                marginTop: 7,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: labelColor,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s",
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: subColor,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {step.sub}
              </div>
            </div>
          </div>
        );

        return (
          <div
            key={step.n}
            style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1 }}
          >
            {/* Step node — clickable if done or active */}
            {canNavigate && step.href !== "#" ? (
              <Link href={step.href} style={{ textDecoration: "none" }}>
                {inner}
              </Link>
            ) : (
              <div style={{ cursor: isUpcoming ? "default" : "pointer" }}>{inner}</div>
            )}

            {/* Connector line + arrow */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  paddingBottom: 28, // align with circle centre
                  paddingTop: 17,
                  minWidth: 32,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: lineColor,
                    transition: "background 0.2s",
                    position: "relative",
                  }}
                >
                  {/* Arrowhead */}
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    style={{
                      position: "absolute",
                      right: -1,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <path
                      d="M1 1l6 3-6 3"
                      stroke={lineColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
