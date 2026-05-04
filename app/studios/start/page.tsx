import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { SalonStudioStartContent } from "@/components/studios/salon/SalonStudioStartContent";

export const metadata: Metadata = {
  title: "Start your studio — Salon template | AIH Studios",
  description:
    "Preview your salon studio page — services, profile shell, and client requests. Name placeholder [NAME]; AMIHUMAN profile fills starting copy when you’re signed in.",
};

export default async function StudiosStartPage() {
  console.log("[studios/start] page render");
  try {
    const body = await SalonStudioStartContent();
    return (
      <>
        {body}
        <StudiosFooter />
      </>
    );
  } catch (error) {
    console.error("[studios/start] render failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
