// lib/studios/creator-lab/hashtag-harvest/education-config.ts
// Canonical education hashtag preset and type mappings for Hashtag Harvest.
// Education is the primary vertical. Homeschool is one type within it.

// ─── Hashtag clusters ─────────────────────────────────────────────────────────

export const EDUCATION_HASHTAG_CLUSTERS: Record<string, string[]> = {
  "HOMESCHOOL CORE": [
    "homeschool", "homeschooling", "homeschoolmom", "homeschoollife",
    "homeschoolcommunity", "homeschoolcurriculum", "homeschoolfamily",
  ],
  "MICROSCHOOL / PODS": [
    "microschool", "microschools", "learningpod", "learningpods",
    "educationpod", "homeschoolpod",
  ],
  "TUTORING": [
    "tutor", "tutoring", "privatetutor", "onlinetutor",
    "mathtutor", "sciencetutor", "readingtutor", "writingtutor",
    "satprep", "actprep", "testprep",
  ],
  "SUBJECT SPECIALISTS": [
    "homeschoolmath", "homeschoolscience", "stemforkids", "stemlearning",
    "kidsstem", "mathteacher", "scienceteacher", "readingteacher", "literacyteacher",
  ],
  "SPECIAL NEEDS / LEARNING DIFFERENCES": [
    "dyslexia", "dyslexiatutor", "specialneedshomeschool",
    "adhdlearning", "neurodivergentlearning", "autismeducation",
  ],
  "EDUCATION PHILOSOPHY / VALUES": [
    "classicaleducation", "classicalhomeschool", "charlottemason",
    "montessoriathome", "waldorfeducation", "unschooling",
    "christianhomeschool", "faithbasededucation",
  ],
  "PARENT COMMUNITY": [
    "parenting", "parentcommunity", "momlife", "denvermoms",
    "coloradomoms", "homeschoolmoms", "learningathome",
  ],
  "LOCAL DISCOVERY": [
    "denverhomeschool", "coloradohomeschool", "denvertutor", "coloradotutor",
    "denvermicroschool", "coloradomicroschool", "denverstem",
    "denvermath", "denverparents",
  ],
};

/** Flat ordered list for the preset textarea */
export const EDUCATION_HASHTAG_PRESET: string[] = Object.values(EDUCATION_HASHTAG_CLUSTERS).flat();

// ─── Education type ───────────────────────────────────────────────────────────

export type EducationType =
  | "homeschool"
  | "microschool"
  | "learning_pod"
  | "tutor"
  | "subject_tutor"
  | "classical_education"
  | "montessori"
  | "stem_science"
  | "math"
  | "reading_literacy"
  | "dyslexia_special_needs"
  | "test_prep"
  | "curriculum"
  | "parent_community"
  | "co_op"
  | "library_community_learning"
  | "unknown";

export const EDUCATION_TYPE_LABELS: Record<EducationType, string> = {
  homeschool:                "Homeschool",
  microschool:               "Microschool",
  learning_pod:              "Learning Pod",
  tutor:                     "Tutor",
  subject_tutor:             "Subject Tutor",
  classical_education:       "Classical Education",
  montessori:                "Montessori",
  stem_science:              "STEM / Science",
  math:                      "Math",
  reading_literacy:          "Reading / Literacy",
  dyslexia_special_needs:    "Dyslexia / Special Needs",
  test_prep:                 "Test Prep",
  curriculum:                "Curriculum",
  parent_community:          "Parent Community",
  co_op:                     "Co-op",
  library_community_learning:"Library / Community Learning",
  unknown:                   "Unknown",
};

// ─── Audience type ────────────────────────────────────────────────────────────

export type AudienceType =
  | "parent"
  | "student"
  | "educator"
  | "institution"
  | "mixed"
  | "unknown";

export const AUDIENCE_TYPE_LABELS: Record<AudienceType, string> = {
  parent:      "Parent",
  student:     "Student",
  educator:    "Educator",
  institution: "Institution",
  mixed:       "Mixed",
  unknown:     "Unknown",
};

// ─── Validation status ────────────────────────────────────────────────────────

export type ValidationStatus =
  | "new"
  | "needs_review"
  | "valid"
  | "active"
  | "education_relevant"
  | "not_education"
  | "dead_link"
  | "duplicate"
  | "priority"
  | "archive";

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  new:                "New",
  needs_review:       "Needs Review",
  valid:              "Valid",
  active:             "Active",
  education_relevant: "Education Relevant",
  not_education:      "Not Education",
  dead_link:          "Dead Link",
  duplicate:          "Duplicate",
  priority:           "Priority",
  archive:            "Archive",
};

export const VALIDATION_STATUS_COLORS: Record<ValidationStatus, { bg: string; fg: string }> = {
  new:                { bg: "#f5f5f4", fg: "#78716c" },
  needs_review:       { bg: "#fef3c7", fg: "#b45309" },
  valid:              { bg: "#dcfce7", fg: "#15803d" },
  active:             { bg: "#dbeafe", fg: "#1d4ed8" },
  education_relevant: { bg: "#ede9fe", fg: "#6d28d9" },
  not_education:      { bg: "#fee2e2", fg: "#b91c1c" },
  dead_link:          { bg: "#fce7f3", fg: "#9d174d" },
  duplicate:          { bg: "#f0fdf4", fg: "#166534" },
  priority:           { bg: "#14532d", fg: "#bbf7d0" },
  archive:            { bg: "#f5f5f4", fg: "#a8a29e" },
};

export const ARCHIVE_REASONS = [
  "not_education",
  "dead_link",
  "duplicate",
  "too_generic",
  "low_confidence",
  "institutional_not_operator",
  "no_action_now",
] as const;

export type ArchiveReason = typeof ARCHIVE_REASONS[number];

// ─── Hashtag → education type mapping ────────────────────────────────────────

export const HASHTAG_TO_EDUCATION_TYPE: Record<string, EducationType> = {
  // Homeschool core
  homeschool:          "homeschool",
  homeschooling:       "homeschool",
  homeschoolmom:       "homeschool",
  homeschoollife:      "homeschool",
  homeschoolcommunity: "homeschool",
  homeschoolcurriculum:"curriculum",
  homeschoolfamily:    "homeschool",
  homeschoolmoms:      "parent_community",
  learningathome:      "homeschool",
  // Microschool / pods
  microschool:         "microschool",
  microschools:        "microschool",
  learningpod:         "learning_pod",
  learningpods:        "learning_pod",
  educationpod:        "learning_pod",
  homeschoolpod:       "learning_pod",
  // Tutoring
  tutor:               "tutor",
  tutoring:            "tutor",
  privatetutor:        "tutor",
  onlinetutor:         "tutor",
  mathtutor:           "math",
  sciencetutor:        "subject_tutor",
  readingtutor:        "reading_literacy",
  writingtutor:        "subject_tutor",
  satprep:             "test_prep",
  actprep:             "test_prep",
  testprep:            "test_prep",
  // Subject specialists
  homeschoolmath:      "math",
  homeschoolscience:   "stem_science",
  stemforkids:         "stem_science",
  stemlearning:        "stem_science",
  kidsstem:            "stem_science",
  mathteacher:         "math",
  scienceteacher:      "stem_science",
  readingteacher:      "reading_literacy",
  literacyteacher:     "reading_literacy",
  // Special needs
  dyslexia:            "dyslexia_special_needs",
  dyslexiatutor:       "dyslexia_special_needs",
  specialneedshomeschool:"dyslexia_special_needs",
  adhdlearning:        "dyslexia_special_needs",
  neurodivergentlearning:"dyslexia_special_needs",
  autismeducation:     "dyslexia_special_needs",
  // Philosophy
  classicaleducation:  "classical_education",
  classicalhomeschool: "classical_education",
  charlottemason:      "classical_education",
  montessoriathome:    "montessori",
  waldorfeducation:    "classical_education",
  unschooling:         "homeschool",
  christianhomeschool: "homeschool",
  faithbasededucation: "homeschool",
  // Parent community
  parenting:           "parent_community",
  parentcommunity:     "parent_community",
  momlife:             "parent_community",
  denvermoms:          "parent_community",
  coloradomoms:        "parent_community",
  // Local
  denverhomeschool:    "homeschool",
  coloradohomeschool:  "homeschool",
  denvertutor:         "tutor",
  coloradotutor:       "tutor",
  denvermicroschool:   "microschool",
  coloradomicroschool: "microschool",
  denverstem:          "stem_science",
  denvermath:          "math",
  denverparents:       "parent_community",
};

// ─── Audience type inference from hashtag ─────────────────────────────────────

export const HASHTAG_TO_AUDIENCE_TYPE: Record<string, AudienceType> = {
  homeschoolmom:   "parent",
  homeschoolfamily:"parent",
  homeschoolmoms:  "parent",
  parenting:       "parent",
  momlife:         "parent",
  denvermoms:      "parent",
  coloradomoms:    "parent",
  denverparents:   "parent",
  parentcommunity: "parent",
  student:         "student",
  tutor:           "educator",
  tutoring:        "educator",
  privatetutor:    "educator",
  onlinetutor:     "educator",
  mathtutor:       "educator",
  sciencetutor:    "educator",
  readingtutor:    "educator",
  writingtutor:    "educator",
  mathteacher:     "educator",
  scienceteacher:  "educator",
  readingteacher:  "educator",
  literacyteacher: "educator",
  dyslexiatutor:   "educator",
};

/**
 * Infer education type from a hashtag string.
 * Falls back to text-based keyword scan if no direct mapping.
 */
export function inferEducationType(hashtag: string, caption = ""): EducationType {
  const clean = hashtag.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9]/g, "");
  if (HASHTAG_TO_EDUCATION_TYPE[clean]) return HASHTAG_TO_EDUCATION_TYPE[clean];

  // Fallback: scan caption/text
  const text = caption.toLowerCase();
  if (text.includes("dyslexia") || text.includes("adhd") || text.includes("special needs")) return "dyslexia_special_needs";
  if (text.includes("microschool") || text.includes("micro school")) return "microschool";
  if (text.includes("learning pod") || text.includes("learningpod")) return "learning_pod";
  if (text.includes("classical") || text.includes("charlotte mason")) return "classical_education";
  if (text.includes("montessori")) return "montessori";
  if (text.includes("waldorf")) return "classical_education";
  if (text.includes("stem") || text.includes("science")) return "stem_science";
  if (text.includes("math") || text.includes("algebra")) return "math";
  if (text.includes("reading") || text.includes("literacy") || text.includes("phonics")) return "reading_literacy";
  if (text.includes("tutor")) return "tutor";
  if (text.includes("test prep") || text.includes("sat") || text.includes("act")) return "test_prep";
  if (text.includes("curriculum")) return "curriculum";
  if (text.includes("homeschool")) return "homeschool";
  if (text.includes("co-op") || text.includes("coop")) return "co_op";

  return "unknown";
}

/**
 * Infer audience type from a hashtag string.
 */
export function inferAudienceType(hashtag: string, caption = ""): AudienceType {
  const clean = hashtag.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9]/g, "");
  if (HASHTAG_TO_AUDIENCE_TYPE[clean]) return HASHTAG_TO_AUDIENCE_TYPE[clean];

  const text = caption.toLowerCase();
  if (text.includes("mom") || text.includes("parent") || text.includes("family")) return "parent";
  if (text.includes("student") || text.includes("kid") || text.includes("child")) return "student";
  if (text.includes("teacher") || text.includes("tutor") || text.includes("educator")) return "educator";

  return "unknown";
}
