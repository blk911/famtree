// lib/discovery/types.ts
// Core type definitions for the AIH Discovery Channel.

export type AgeTier = "K-2" | "3-5" | "6-8" | "9-12" | "All Ages";
export type ItemType =
  | "Investigation"
  | "Project"
  | "Trail"
  | "Collection"
  | "Mini-Doc"
  | "Interactive"
  | "Workshop";
export type Difficulty = "Easy" | "Intermediate" | "Advanced";

export interface Subtopic {
  id: string;
  label: string;
}

export interface DiscoveryItem {
  id: string;
  title: string;
  description: string;
  ageTier: AgeTier;
  itemType: ItemType;
  /** CSS gradient string for placeholder thumbnail */
  thumbGradient: string;
  duration: string;
  difficulty?: Difficulty;
  /** Human-readable build time for projects, e.g. "2 hours" */
  buildTime?: string;
  episodes?: number;
}

export interface DiscoveryTrail {
  id: string;
  title: string;
  description: string;
  /** Ordered steps shown as a breadcrumb path, e.g. ["Atoms", "Elements", "Molecules"] */
  steps: string[];
  ageTier: AgeTier;
  itemCount: number;
  thumbGradient: string;
}

export interface Subject {
  id: string;
  slug: string;
  title: string;
  /** Short subhead shown on the home subject card */
  subhead: string;
  /** Longer subhead shown on the subject page hero */
  heroSubhead: string;
  icon: string;
  accentColor: string;
  thumbGradient: string;
  subtopics: Subtopic[];
  featuredItems: DiscoveryItem[];
  projects: DiscoveryItem[];
  trails: DiscoveryTrail[];
}
