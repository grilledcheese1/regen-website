// The three curated Next Move customers and the result the product gives each one. Copied from
// regenerative-analysis main: src/fixtures/personas.ts (who they are) and the demo facts that
// tests/compare.test.ts enforces (what Next Move recommends). Update both together. All SIMULATED.

export type PersonaPreview = {
  id: string;
  name: string;
  situation: string;
  status: string;
  result: string;
  nextStep: string;
};

export const PERSONAS: PersonaPreview[] = [
  {
    id: "maria",
    name: "Maria",
    situation: "Camry Hybrid lease ending in 4 months",
    status: "Leading",
    result: "Buying out the lease comes out ahead, once a quote confirms the price.",
    nextStep: "Request a buyout quote",
  },
  {
    id: "devon",
    name: "Devon",
    situation: "Paid-off 2016 Corolla, modest driving",
    status: "Recommended",
    result: "Keeping the Corolla beats every replacement on cost.",
    nextStep: "Keep the current car",
  },
  {
    id: "kai",
    name: "Kai",
    situation: "Financed RAV4, tight budget",
    status: "No option fits",
    result: "Nothing fits the budget and cash reserve yet, so the plan starts with the budget.",
    nextStep: "Review the budget",
  },
];
