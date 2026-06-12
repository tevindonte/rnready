import type { NclexCategory } from "@/lib/constants";

export const SUBCATEGORIES: Record<NclexCategory, readonly string[]> = {
  "Management of Care": [
    "General",
    "Delegation and Supervision",
    "Prioritization",
    "Legal and Ethical Practice",
    "Advance Directives",
    "Case Management",
    "Continuity of Care",
    "Informed Consent",
  ],
  "Safety and Infection Control": [
    "General",
    "Standard Precautions and PPE",
    "Isolation Precautions",
    "Infection Prevention",
    "Accident and Injury Prevention",
    "Emergency Response",
    "Medical and Surgical Asepsis",
  ],
  "Pharmacological and Parenteral Therapies": [
    "General",
    "Cardiac Glycosides",
    "Diuretics",
    "ACE Inhibitors",
    "Antihypertensives",
    "Calcium Channel Blockers",
    "Anticoagulants and Thrombolytics",
    "Antibiotics",
    "Pain Management and Opioids",
    "Insulin and Antidiabetics",
    "Psychiatric Medications",
    "IV Therapy and Fluids",
    "Dosage Calculation",
    "Adverse Effects and Interactions",
  ],
  "Physiological Adaptation": [
    "General",
    "Cardiac Disorders",
    "Respiratory Disorders",
    "Renal and Urinary Disorders",
    "Neurological Disorders",
    "Endocrine Disorders",
    "Gastrointestinal Disorders",
    "Musculoskeletal Disorders",
    "Hematologic Disorders",
    "Fluid and Electrolyte Imbalances",
    "Shock and Emergencies",
    "Postoperative Care",
  ],
  "Reduction of Risk Potential": [
    "General",
    "Lab Values",
    "Diagnostic Tests",
    "Vital Signs Monitoring",
    "Surgical Risk and Complications",
    "Therapeutic Procedures",
  ],
  "Basic Care and Comfort": [
    "General",
    "Nutrition and Diet",
    "Mobility and Positioning",
    "Hygiene and Personal Care",
    "Elimination",
    "Rest and Sleep",
    "Non-Pharmacological Comfort",
  ],
  "Health Promotion and Maintenance": [
    "General",
    "Growth and Development",
    "Maternal and Newborn Care",
    "Immunizations",
    "Health Screening",
    "Lifestyle and Disease Prevention",
  ],
  "Psychosocial Integrity": [
    "General",
    "Therapeutic Communication",
    "Coping Mechanisms",
    "Mental Health Disorders",
    "Substance Use Disorders",
    "Crisis Intervention",
    "Grief and Loss",
    "Abuse and Neglect",
  ],
};

export function normalizeSubcategory(category: string, raw: string | null | undefined): string {
  const list = SUBCATEGORIES[category as NclexCategory];
  if (!list) return raw ?? "General";
  if (!raw) return "General";
  const match = list.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  const partial = list.find(
    (s) => s.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(s.toLowerCase())
  );
  return partial ?? "General";
}

export function formatSubcategoryPrompt(): string {
  return Object.entries(SUBCATEGORIES)
    .map(([cat, subs]) => `${cat}:\n${subs.map((s) => `  - ${s}`).join("\n")}`)
    .join("\n\n");
}
