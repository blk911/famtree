// types/index.ts

export type FamilyRole =
  | "grandparent"
  | "parent"
  | "sibling"
  | "child"
  | "cousin"
  | "aunt_uncle"
  | "niece_nephew"
  | "spouse"
  | "other";

export const FAMILY_ROLE_LABELS: Record<FamilyRole, string> = {
  grandparent:  "Grandparent",
  parent:       "Parent",
  sibling:      "Sibling",
  child:        "Child",
  cousin:       "Cousin",
  aunt_uncle:   "Aunt / Uncle",
  niece_nephew: "Niece / Nephew",
  spouse:       "Spouse / Partner",
  other:        "Other",
};

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface ProfileWithUser {
  id: string;
  userId: string;
  bio: string | null;
  familyRole: string | null;
  location: string | null;
  coverUrl: string | null;
  isPublicInTree: boolean;
  showDob: boolean;
  user: SafeUser;
  posts: PostData[];
  photos: PhotoData[];
}

export interface PostData {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
}

export interface PhotoData {
  id: string;
  url: string;
  caption: string | null;
  takenAt: Date | null;
}
