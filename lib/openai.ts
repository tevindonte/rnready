import OpenAI from "openai";

export function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const EXPLANATION_SYSTEM = `You are an expert NCLEX nursing educator.

Given a question, the correct answer, and optionally a source rationale,
write a clear, educational explanation (3-5 sentences) suitable for a nursing student.

Rules:
- Explain WHY the correct answer is right using clinical reasoning
- Briefly explain why each wrong answer is incorrect
- Use plain language — no jargon without explanation
- Do NOT restate the question
- Output plain text only, no markdown`;

export async function generateExplanation(
  question: string,
  options: Record<string, string>,
  correctAnswer: string,
  sourceVerbatim?: string | null,
  sourceFact?: string | null
): Promise<string> {
  const client = getOpenAIClient();
  const optionsText = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}. ${v}`)
    .join("\n");

  let userContent = `Question: ${question}\n\nOptions:\n${optionsText}\n\nCorrect answer: ${correctAnswer}`;
  if (sourceVerbatim) userContent += `\n\nSource rationale: ${sourceVerbatim}`;
  if (sourceFact) userContent += `\n\nSource fact: ${sourceFact}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXPLANATION_SYSTEM },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
  });

  return (response.choices[0].message.content ?? "").trim();
}
