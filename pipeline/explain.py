import time

from openai import OpenAI

from extract import ExtractedQuestion

EXPLANATION_SYSTEM = """
You are an expert NCLEX nursing educator.

Given a question, the correct answer, and optionally a source rationale,
write a clear, educational explanation (3-5 sentences) suitable for a nursing student.

Rules:
- Explain WHY the correct answer is right using clinical reasoning
- Briefly explain why each wrong answer is incorrect
- Use plain language — no jargon without explanation
- Do NOT restate the question
- Output plain text only, no markdown
"""


def generate_explanation(
    client: OpenAI,
    question: ExtractedQuestion,
    retries: int = 3,
) -> str:
    options_text = "\n".join(f"{k}. {v}" for k, v in sorted(question.options.items()))
    user_content = f"""Question: {question.question}

Options:
{options_text}

Correct answer: {question.correct_answer}
"""
    if question.source_verbatim:
        user_content += f"\nSource rationale: {question.source_verbatim}"
    if question.source_fact:
        user_content += f"\nSource fact: {question.source_fact}"

    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": EXPLANATION_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Explanation failed after {retries} attempts: {last_error}")
