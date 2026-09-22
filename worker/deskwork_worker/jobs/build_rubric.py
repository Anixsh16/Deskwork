"""Job handler: build_rubric (Call C2).

Generates draft rubric criteria (0.5 to 3 marks each) from teacher's typed or handwritten answer key.
"""

from pathlib import Path
from typing import Callable
from ..ai.client import ai_client, MODEL_35_FLASH_LITE
from ..ai.schemas import RubricDraft

PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "build_rubric.md"


def run_build_rubric(payload: dict, progress: Callable[[dict], None] | None = None, db_cursor=None):
    """Execute rubric generation and populate draft rubric_versions and rubric_items.

    Payload requires:
      - exam_id: UUID of the exam
      - source: 'typed_key' or 'handwritten_key'
      - key_content: text or representation of the key
      - questions: list of { id, label, max_marks, text }
    """
    exam_id = payload.get("exam_id")
    source = payload.get("source", "typed_key")
    key_content = payload.get("key_content", "")
    questions = payload.get("questions", [])

    if not exam_id:
        raise ValueError("Missing exam_id in build_rubric payload")

    if progress:
        progress({"pct": 10, "message": "Reading answer key..."})

    # Read prompt
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    formatted_context = f"QUESTIONS:\n{questions}\n\nTEACHER ANSWER KEY:\n{key_content}"

    if progress:
        progress({"pct": 40, "message": "Generating draft criteria with Gemini 3.5 Flash-Lite..."})

    result: RubricDraft = ai_client.call_structured(
        model=MODEL_35_FLASH_LITE,
        system_instruction=system_prompt,
        contents=[formatted_context],
        schema_cls=RubricDraft,
        thinking_level="medium",
    )

    if progress:
        progress({"pct": 80, "message": "Saving draft rubric and criteria..."})

    rubric_version_id = None
    if db_cursor:
        # Determine next version number for this exam
        db_cursor.execute("SELECT coalesce(max(version), 0) + 1 FROM rubric_versions WHERE exam_id = %s", (exam_id,))
        next_ver = db_cursor.fetchone()[0]

        # Insert new draft rubric version
        db_cursor.execute(
            """
            INSERT INTO rubric_versions (exam_id, version, status, source)
            VALUES (%s, %s, 'draft', %s)
            RETURNING id
            """,
            (exam_id, next_ver, source),
        )
        rubric_version_id = db_cursor.fetchone()[0]

        # Create mapping of label to question_id
        db_cursor.execute("SELECT id, label FROM questions WHERE exam_id = %s", (exam_id,))
        q_map = {row[1]: row[0] for row in db_cursor.fetchall()}

        criterion_ord = 1
        for rq in result.questions:
            q_id = q_map.get(rq.label)
            if not q_id:
                continue

            for crit in rq.criteria:
                db_cursor.execute(
                    """
                    INSERT INTO rubric_items (
                        rubric_version_id, question_id, criterion_key, description,
                        marks, accept_alternatives, common_errors, final_answer,
                        tolerance_pct, units, ord
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        rubric_version_id,
                        q_id,
                        crit.key,
                        crit.description,
                        crit.marks,
                        crit.accept_alternatives,
                        crit.common_errors,
                        rq.final_answer,
                        rq.tolerance_pct,
                        rq.units,
                        criterion_ord,
                    ),
                )
                criterion_ord += 1

    if progress:
        progress({"pct": 100, "message": "Draft rubric ready for teacher review."})

    return {
        "rubric_version_id": str(rubric_version_id) if rubric_version_id else None,
        "key_transcript": result.key_transcript,
        "question_count": len(result.questions),
    }
