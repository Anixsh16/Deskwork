"""Job handler: extract_paper (Call C1).

Extracts questions, marks, answer type, Bloom level, and printed reference CO from question paper.
"""

import os
from pathlib import Path
from typing import Callable
from ..ai.client import ai_client, MODEL_35_FLASH_LITE
from ..ai.schemas import PaperExtractionResult

PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "extract_paper.md"


def run_extract_paper(payload: dict, progress: Callable[[dict], None] | None = None, db_cursor=None):
    """Execute paper extraction and populate the questions table.

    Payload requires:
      - exam_id: UUID of the exam
      - paper_text: extracted or provided text of the paper (or file path)
    """
    exam_id = payload.get("exam_id")
    paper_text = payload.get("paper_text", "")
    paper_path = payload.get("paper_path")

    if not exam_id:
        raise ValueError("Missing exam_id in extract_paper payload")

    if progress:
        progress({"pct": 10, "message": "Reading question paper document..."})

    # Read prompt
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    # If text is empty but path exists, extract text with PyMuPDF if available
    if not paper_text and paper_path and os.path.exists(paper_path):
        try:
            import fitz
            doc = fitz.open(paper_path)
            extracted_pages = [page.get_text() for page in doc]
            paper_text = "\n\n".join(extracted_pages)
        except ImportError:
            paper_text = "Sample question paper text (PyMuPDF not available)"

    if progress:
        progress({"pct": 35, "message": "Extracting questions with Gemini 3.5 Flash-Lite..."})

    # Call AI model
    result: PaperExtractionResult = ai_client.call_structured(
        model=MODEL_35_FLASH_LITE,
        system_instruction=system_prompt,
        contents=[paper_text],
        schema_cls=PaperExtractionResult,
        thinking_level="low",
    )

    if progress:
        progress({"pct": 75, "message": "Persisting extracted questions..."})

    # If database cursor is provided, insert extracted questions
    if db_cursor:
        # Idempotent cleanup of prior draft questions for this exam
        db_cursor.execute("DELETE FROM questions WHERE exam_id = %s", (exam_id,))

        for idx, q in enumerate(result.questions):
            db_cursor.execute(
                """
                INSERT INTO questions (exam_id, label, ord, text, max_marks, answer_type, bloom, printed_co)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (exam_id, q.label, idx + 1, q.text, q.max_marks, q.answer_type, q.bloom, q.printed_co),
            )

    if progress:
        progress({"pct": 100, "message": f"Successfully extracted {len(result.questions)} questions."})

    return {
        "exam_title": result.exam_title,
        "total_marks": result.total_marks,
        "question_count": len(result.questions),
    }
