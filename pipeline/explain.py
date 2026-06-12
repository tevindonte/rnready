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

REFORMAT_SYSTEM = """
You are an expert NCLEX nursing educator.

You will receive an existing rationale from a Saunders or Kaplan NCLEX prep book.
Clean it up for readability while preserving ALL clinical content.

Rules:
- Keep every clinically important fact — do not shorten or omit details
- Use 1-3 short paragraphs, plain language, no markdown
- You may remove publisher boilerplate or redundant headers
- Do NOT change the medical meaning or correct answer reasoning
- Output plain text only
"""

MIN_RATIONALE_CHARS = 50


def reformat_explanation(
    client: OpenAI,
    source_rationale: str,
    retries: int = 2,
) -> str:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": REFORMAT_SYSTEM},
                    {"role": "user", "content": source_rationale.strip()},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            text = (response.choices[0].message.content or "").strip()
            if text:
                return text
        except Exception as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    if last_error:
        raise RuntimeError(f"Reformat failed: {last_error}")
    return source_rationale.strip()


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


def get_or_generate_explanation(client: OpenAI, question: ExtractedQuestion) -> tuple[str, str]:
    """Returns (explanation_text, method) where method is 'reformat' or 'generate'."""
    rationale = (question.source_verbatim or "").strip()
    if len(rationale) >= MIN_RATIONALE_CHARS:
        return reformat_explanation(client, rationale), "reformat"
    return generate_explanation(client, question), "generate"
