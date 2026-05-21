import { ThreadSelectorList as UiThreadSelectorList } from "@/components/ui/thread";

export function ThreadSelectorList({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return <UiThreadSelectorList title={title}>{children}</UiThreadSelectorList>;
}
