import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";

export const metadata: Metadata = {
  title: "Service Offers",
};

export default function VmbOffersPage() {
  return (
    <VmbPlaceholderPage
      title="Service Offers"
      description="Standard offers and salon promotions will be managed here. Preview offers from Home for now."
    />
  );
}
