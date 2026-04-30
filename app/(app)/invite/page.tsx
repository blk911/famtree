// app/(app)/invite/page.tsx — server component
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import InviteClient from "./InviteClient";

export default async function InvitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <InviteClient
      me={{
        firstName: user.firstName,
        lastName:  user.lastName,
        photoUrl:  user.photoUrl ?? null,
        email:     user.email,
        id:        user.id,
      }}
    />
  );
}
