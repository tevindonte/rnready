export const NCLEX_CATEGORIES = [
  "Management of Care",
  "Safety and Infection Control",
  "Pharmacological and Parenteral Therapies",
  "Physiological Adaptation",
  "Reduction of Risk Potential",
  "Basic Care and Comfort",
  "Health Promotion and Maintenance",
  "Psychosocial Integrity",
] as const;

export type NclexCategory = (typeof NCLEX_CATEGORIES)[number];

export const NCLEX_CATEGORY_SHORT: Record<NclexCategory, string> = {
  "Management of Care": "Mgmt of Care",
  "Safety and Infection Control": "Safety & Infection",
  "Pharmacological and Parenteral Therapies": "Pharmacology",
  "Physiological Adaptation": "Physiological",
  "Reduction of Risk Potential": "Risk Reduction",
  "Basic Care and Comfort": "Basic Care",
  "Health Promotion and Maintenance": "Health Promotion",
  "Psychosocial Integrity": "Psychosocial",
};

export const NCLEX_WEIGHTS: Record<NclexCategory, number> = {
  "Management of Care": 0.18,
  "Safety and Infection Control": 0.13,
  "Pharmacological and Parenteral Therapies": 0.16,
  "Physiological Adaptation": 0.14,
  "Reduction of Risk Potential": 0.12,
  "Basic Care and Comfort": 0.09,
  "Health Promotion and Maintenance": 0.09,
  "Psychosocial Integrity": 0.09,
};

export type QuizMode = "timed" | "review" | "section" | "adaptive" | "custom";

export const QUIZ_MODES: {
  value: QuizMode;
  label: string;
  description: string;
  icon: "clock" | "book-open" | "layers" | "target";
  requiresAuth?: boolean;
}[] = [
  {
    value: "review",
    label: "Review",
    description: "No timer. See explanations after each answer.",
    icon: "book-open",
  },
  {
    value: "timed",
    label: "Timed",
    description: "90 seconds per question. Rationales at end.",
    icon: "clock",
  },
  {
    value: "section",
    label: "Section",
    description: "Drill specific NCLEX categories.",
    icon: "layers",
  },
  {
    value: "adaptive",
    label: "Adaptive",
    description: "Weighted toward your weak areas.",
    icon: "target",
    requiresAuth: true,
  },
];

export const QUESTION_COUNTS = [10, 25, 50] as const;

export const GUEST_QUESTION_COUNTS = [10] as const;

export type Question = {
  id: string;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string | null;
  is_ngn: boolean;
  ngn_type: string | null;
  explanation: string | null;
  content_origin?: "extracted" | "generated" | null;
  source_fact?: string | null;
};

export type Session = {
  id: string;
  user_id: string;
  mode: QuizMode;
  category_filter: string | null;
  total_questions: number | null;
  correct: number;
  duration_secs: number;
  started_at: string;
  ended_at: string | null;
};

export type SessionAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  answer_given: string | null;
  is_correct: boolean | null;
  time_secs: number | null;
  confidence: number | null;
};

export type ReadinessLevel = "Likely" | "Borderline" | "Unlikely";

export function getReadinessLevel(weightedScore: number): ReadinessLevel {
  if (weightedScore >= 72) return "Likely";
  if (weightedScore >= 60) return "Borderline";
  return "Unlikely";
}

export function getModeBadgeVariant(mode: string): "timed" | "review" | "adaptive" | "section" | "custom" {
  if (mode === "timed") return "timed";
  if (mode === "review") return "review";
  if (mode === "adaptive") return "adaptive";
  if (mode === "custom") return "custom";
  return "section";
}
