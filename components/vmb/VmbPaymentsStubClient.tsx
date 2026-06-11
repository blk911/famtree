"use client";

import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";

const SECTIONS = [
  { title: "Pending Payments", items: ["No pending payments — execution coming later."] },
  { title: "Completed Payments", items: ["No completed payments recorded yet."] },
  { title: "Gift Credits", items: ["Gift credit balance will appear here."] },
  { title: "Package Credits", items: ["Package credits will appear here."] },
  { title: "Future Processor Status", items: ["Processor not connected.", "Stripe / Square / GlossGenius — stub only."] },
];

export function VmbPaymentsStubClient() {
  return (
    <VmbPageFrame title="Payments" subtitle="Future home for payments and credits — presentation only.">
      <div className="vmb-payments-banner" role="status">
        Execution Coming Later — no processor, no transactions, no charges.
      </div>
      <div className="vmb-payments-stub">
        {SECTIONS.map((section) => (
          <section key={section.title} className="vmb-payments-stub__section">
            <h3 className="taikos-section-title">{section.title}</h3>
            <ul className="vmb-payments-stub__list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </VmbPageFrame>
  );
}
