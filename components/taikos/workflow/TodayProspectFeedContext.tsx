"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type TodayProspectFeedContextValue = {
  expandedId: string | null;
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
};

const TodayProspectFeedContext = createContext<TodayProspectFeedContextValue | null>(null);

export function TodayProspectFeedProvider({ children }: { children: ReactNode }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const value = useMemo(
    () => ({
      expandedId,
      isExpanded: (id: string) => expandedId === id,
      toggleExpanded,
    }),
    [expandedId, toggleExpanded],
  );

  return (
    <TodayProspectFeedContext.Provider value={value}>{children}</TodayProspectFeedContext.Provider>
  );
}

export function useTodayProspectFeed() {
  return useContext(TodayProspectFeedContext);
}
