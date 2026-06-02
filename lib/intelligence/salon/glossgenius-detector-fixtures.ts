// lib/intelligence/salon/glossgenius-detector-fixtures.ts
// Internal expected outcomes for GG URL classification (debug + regression).

export type GgFixtureExpectation = {
  id: string;
  url: string;
  expectConfirmed: boolean;
  expectProvider?: "glossgenius";
  expectLabel?: "GlossGenius";
  expectUrlType?: "booking_provider";
  minConfidence?: number;
  expectValidationStatus:
    | "confirmed_client_page"
    | "generic_glossgenius_page"
    | "redirect_home";
};

export const GG_CLIENT_PAGE_FIXTURES: GgFixtureExpectation[] = [
  {
    id: "bris_nailies",
    url: "https://brisnailiesss.glossgenius.com/",
    expectConfirmed: true,
    expectProvider: "glossgenius",
    expectLabel: "GlossGenius",
    expectUrlType: "booking_provider",
    minConfidence: 85,
    expectValidationStatus: "confirmed_client_page",
  },
  {
    id: "nat20hair",
    url: "https://nat20hair.glossgenius.com/",
    expectConfirmed: true,
    expectProvider: "glossgenius",
    expectLabel: "GlossGenius",
    expectUrlType: "booking_provider",
    minConfidence: 85,
    expectValidationStatus: "confirmed_client_page",
  },
  {
    id: "blendedbybrandi",
    url: "https://blendedbybrandi.glossgenius.com/",
    expectConfirmed: true,
    expectProvider: "glossgenius",
    expectLabel: "GlossGenius",
    expectUrlType: "booking_provider",
    minConfidence: 85,
    expectValidationStatus: "confirmed_client_page",
  },
];

export const GG_GENERIC_PAGE_FIXTURES: GgFixtureExpectation[] = [
  {
    id: "apex_www",
    url: "https://www.glossgenius.com/",
    expectConfirmed: false,
    expectValidationStatus: "generic_glossgenius_page",
  },
  {
    id: "apex_root",
    url: "https://glossgenius.com/",
    expectConfirmed: false,
    expectValidationStatus: "generic_glossgenius_page",
  },
  {
    id: "pricing",
    url: "https://glossgenius.com/pricing",
    expectConfirmed: false,
    expectValidationStatus: "generic_glossgenius_page",
  },
];

export const ALL_GG_FIXTURES = [...GG_CLIENT_PAGE_FIXTURES, ...GG_GENERIC_PAGE_FIXTURES];
