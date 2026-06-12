import logging
from datetime import datetime, timezone
from typing import Any

from supabase import create_client

from env_config import require_env
from extract import ExtractedQuestion

logger = logging.getLogger(__name__)

# None = not checked yet, True/False after probe
_schema_v2: bool | None = None


def get_supabase():
    env = require_env("SUPABASE_URL", "SUPABASE_SERVICE_KEY")
    return create_client(env["SUPABASE_URL"], env["SUPABASE_SERVICE_KEY"])


def _is_missing_column_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "pgrst204" in msg or "could not find" in msg and "column" in msg


def has_v2_schema(client) -> bool:
    """True if migration 003 columns exist (content_origin, is_custom, etc.)."""
    global _schema_v2
    if _schema_v2 is not None:
        return _schema_v2
    try:
        client.table("questions").select("content_origin").limit(1).execute()
        _schema_v2 = True
    except Exception as exc:
        if _is_missing_column_error(exc):
            _schema_v2 = False
        else:
            raise
    return _schema_v2


def warn_if_legacy_schema(client) -> None:
    if not has_v2_schema(client):
        logger.warning(
            "Migration 003 not applied — saving without content_origin / is_custom.\n"
            "  Run this in Supabase → SQL Editor:\n"
            "  supabase/migrations/003_content_origin_custom.sql"
        )


def _base_row(
    question: ExtractedQuestion,
    source_id: str,
    explanation: str,
) -> dict[str, Any]:
    return {
        "question": question.question,
        "options": question.options,
        "correct_answer": question.correct_answer,
        "category": question.category,
        "subcategory": question.subcategory,
        "difficulty": question.difficulty,
        "is_ngn": question.is_ngn,
        "ngn_type": question.ngn_type,
        "explanation": explanation,
        "explanation_generated_at": datetime.now(timezone.utc).isoformat(),
        "source_id": source_id,
        "source_verbatim": question.source_verbatim,
    }


def upsert_question(
    client,
    question: ExtractedQuestion,
    source_id: str,
    explanation: str,
    *,
    is_custom: bool = False,
    custom_owner_id: str | None = None,
) -> bool:
    row = _base_row(question, source_id, explanation)

    if has_v2_schema(client):
        row["content_origin"] = question.content_origin
        row["source_fact"] = question.source_fact
        row["is_custom"] = is_custom
        row["custom_owner_id"] = custom_owner_id

    try:
        result = client.table("questions").upsert(row, on_conflict="question_hash").execute()
        return bool(result.data)
    except Exception as exc:
        if has_v2_schema(client) and _is_missing_column_error(exc):
            global _schema_v2
            _schema_v2 = False
            logger.warning("Schema cache stale — retrying insert without v2 columns")
            legacy = _base_row(question, source_id, explanation)
            result = client.table("questions").upsert(legacy, on_conflict="question_hash").execute()
            return bool(result.data)
        raise
