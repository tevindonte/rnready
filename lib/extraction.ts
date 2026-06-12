import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { NCLEX_CATEGORIES } from "@/lib/constants";
import { formatSubcategoryPrompt, normalizeSubcategory } from "@/lib/subcategories";

export const EXTRACTION_SYSTEM = `
You are an NCLEX content extraction engine. You will be given raw text from
a nursing study source (YouTube transcript, PDF page, or webpage). The text
may contain:

A) Explicit practice questions — a question stem, multiple answer choices,
   and possibly a stated correct answer and/or rationale.

B) Fact-based content with no explicit question — flashcard-style
   prompt/answer pairs, definitions, comparison tables, or plain clinical
   facts.

For TYPE A: copy verbatim, content_origin "extracted", source_fact null.
For TYPE B: source_fact verbatim, generate MCQ around it, content_origin "generated".

For "subcategory", you MUST choose from the controlled list below that
corresponds to the chosen "category". Pick the closest match — do not
invent new subcategory names. If genuinely nothing fits, use "General".

Classify category into one of 8 NCLEX categories. options MUST be object {"A":"...","B":"..."} NEVER array.
Return JSON array. Include: question, options, correct_answer, category, subcategory,
is_ngn, ngn_type, content_origin, source_fact, source_rationale.

NCLEX categories:
${NCLEX_CATEGORIES.map((c) => `- ${c}`).join("\n")}

Controlled subcategories by category:
${formatSubcategoryPrompt()}
`;

const categorySchema = z.enum([
  "Management of Care",
  "Safety and Infection Control",
  "Pharmacological and Parenteral Therapies",
  "Physiological Adaptation",
  "Reduction of Risk Potential",
  "Basic Care and Comfort",
  "Health Promotion and Maintenance",
  "Psychosocial Integrity",
]);

export const extractedQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.record(z.string(), z.string()),
  correct_answer: z.string(),
  category: categorySchema,
  subcategory: z.string().nullable().optional(),
  content_origin: z.enum(["extracted", "generated"]).default("generated"),
  source_fact: z.string().nullable().optional(),
  source_rationale: z.string().nullable().optional(),
  is_ngn: z.boolean().default(false),
  ngn_type: z.string().nullable().optional(),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;

function normalizeOptions(raw: unknown): Record<string, string> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, string>)) {
      out[k.toUpperCase().trim()] = String(v).trim();
    }
    return out;
  }
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {};
    const letters = "ABCDEFGHIJ";
    raw.forEach((item, i) => {
      const text = String(item).trim();
      const match = text.match(/^([A-J])[.\):\s]\s*(.+)$/i);
      if (match) out[match[1].toUpperCase()] = match[2].trim();
      else if (i < letters.length) out[letters[i]] = text;
    });
    return out;
  }
  return {};
}

export function parseQuestionItem(raw: unknown): ExtractedQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = { ...(raw as Record<string, unknown>) };
  item.options = normalizeOptions(item.options);
  if (item.source_rationale && !item.source_verbatim) {
    item.source_verbatim = item.source_rationale;
  }
  if (typeof item.correct_answer === "string") {
    item.correct_answer = item.correct_answer.toUpperCase().replace(/\s/g, "");
  }
  const parsed = extractedQuestionSchema.safeParse(item);
  if (!parsed.success || Object.keys(parsed.data.options).length < 2) return null;
  let data = parsed.data;
  if (data.correct_answer.includes(",")) {
    data = { ...data, is_ngn: true, ngn_type: "sata" };
  }
  if (data.subcategory) {
    data = { ...data, subcategory: normalizeSubcategory(data.category, data.subcategory) };
  }
  return data;
}

function chunkText(text: string, chunkWords = 4000, overlap = 200): string[] {
  const words = text.split(/\s+/);
  if (words.length <= chunkWords) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = end - overlap;
  }
  return chunks;
}

export async function extractQuestionsFromNotes(
  notes: string,
  targetCount: number
): Promise<ExtractedQuestion[]> {
  const client = getOpenAIClient();
  const chunks = chunkText(notes);
  const all: ExtractedQuestion[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const userContent =
      `Generate approximately ${Math.max(1, Math.ceil(targetCount / chunks.length))} questions from this content. ` +
      `Prioritize TYPE B (generated) since user notes are typically fact-dense.\n\n${chunk}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user", content: userContent },
      ],
      temperature: 0,
    });

    const raw = response.choices[0].message.content ?? "[]";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    let items: unknown[];
    try {
      items = JSON.parse(cleaned);
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const q = parseQuestionItem(item);
      if (!q) continue;
      const hash = q.question.slice(0, 80);
      if (seen.has(hash)) continue;
      seen.add(hash);
      all.push(q);
    }
  }

  return all.slice(0, targetCount);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
