import { redirect } from "next/navigation";

/** Canonical entry for logged-in members without a studio slug — forwards to apply preview. */
export default function StudiosStartPage() {
  redirect("/studios/apply");
}
