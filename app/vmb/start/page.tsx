import type { Metadata } from "next";
import { VmbStartFlow } from "@/components/vmb/VmbStartFlow";

export const metadata: Metadata = {
  title: "Find The Money",
};

type Props = {
  searchParams?: { mode?: string };
};

export default function VmbStartPage({ searchParams }: Props) {
  const refreshMode = searchParams?.mode === "refresh";
  return <VmbStartFlow refreshMode={refreshMode} />;
}
