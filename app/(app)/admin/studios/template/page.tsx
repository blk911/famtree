import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioBuilder } from "@/components/studios/StudioBuilder";
import { getCurrentUser } from "@/lib/auth";
import { studioDraftFromDebTemplate } from "@/lib/studio/studioDraft";
import { cloneDebDazzleStudioTemplate } from "@/lib/studio/templates/cloneStudioTemplate";

export const metadata: Metadata = {
  title: "Studio template (admin) — AIH Studios",
  description: "Edit a browser-local snapshot of the Deb Dazzle canonical studio template.",
};

const isAdminRole = (role: string) => role === "founder" || role === "admin";

export default async function AdminStudioTemplatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");

  const draft = studioDraftFromDebTemplate(cloneDebDazzleStudioTemplate());

  return (
    <>
      <StudioBuilder
        initialDraft={draft}
        currentUser={{
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }}
        mode="admin-template"
      />
      <StudiosFooter />
    </>
  );
}
