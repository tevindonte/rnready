import type OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai";

export const TUTOR_MAX_MESSAGES = 10;

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const TUTOR_SYSTEM = `You are an NCLEX nursing tutor helping a student understand ONE practice question they just answered.

You receive the question, all answer options, what the student selected, whether they were correct, and the official explanation.

Rules:
- Answer follow-up questions clearly in 2-4 sentences unless they ask for more detail
- Reference specific options by letter when relevant
- Do not reveal answers to other questions
- Do not invent clinical facts not supported by the question or explanation
- Be encouraging and precise — this is exam prep, not casual chat
- Never proactively teach unrelated topics`;

export type TutorContext = {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  answerGiven: string;
  isCorrect: boolean;
  explanation: string | null;
};

function formatOptions(options: Record<string, string>): string {
  return Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, text]) => `${letter}. ${text}`)
    .join("\n");
}

function buildContextBlock(ctx: TutorContext): string {
  return [
    `Question: ${ctx.question}`,
    `Options:\n${formatOptions(ctx.options)}`,
    `Student's answer: ${ctx.answerGiven}`,
    `Correct answer: ${ctx.correctAnswer}`,
    `Result: ${ctx.isCorrect ? "Correct" : "Incorrect"}`,
    ctx.explanation ? `Official explanation: ${ctx.explanation}` : "Official explanation: (none)",
  ].join("\n\n");
}

export async function generateTutorReply(
  ctx: TutorContext,
  history: TutorMessage[],
  userMessage: string
): Promise<string> {
  const client = getOpenAIClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: TUTOR_SYSTEM },
    {
      role: "user",
      content: `${buildContextBlock(ctx)}\n\nThe student may now ask follow-up questions about this question only.`,
    },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3,
    max_tokens: 350,
  });

  return (response.choices[0].message.content ?? "").trim();
}
