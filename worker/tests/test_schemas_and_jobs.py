"""Unit tests for Deskwork worker AI schemas and job contracts."""

import unittest
from deskwork_worker.ai.schemas import (
    ExtractedQuestion,
    PaperExtractionResult,
    RubricCriterion,
    RubricQuestion,
    RubricDraft,
)


class TestAISchemas(unittest.TestCase):
    def test_extracted_question_validation(self):
        q = ExtractedQuestion(
            label="1a",
            text="Define asymptotic notations.",
            max_marks=3.5,
            answer_type="theory",
            bloom="understand",
            printed_co="CO1",
        )
        self.assertEqual(q.label, "1a")
        self.assertEqual(q.max_marks, 3.5)
        self.assertEqual(q.answer_type, "theory")
        self.assertEqual(q.printed_co, "CO1")

    def test_paper_extraction_result(self):
        data = {
            "exam_title": "T1 Mid Semester Exam",
            "total_marks": 20.0,
            "questions": [
                {
                    "label": "1",
                    "text": "Prove master theorem case 1.",
                    "max_marks": 5.0,
                    "answer_type": "theory",
                    "bloom": "understand",
                    "printed_co": "CO1",
                },
                {
                    "label": "2",
                    "text": "Implement AVL tree insert.",
                    "max_marks": 5.0,
                    "answer_type": "code",
                    "bloom": "apply",
                    "printed_co": None,
                },
            ],
        }
        result = PaperExtractionResult.model_validate(data)
        self.assertEqual(len(result.questions), 2)
        self.assertEqual(result.total_marks, 20.0)

    def test_rubric_criterion_validation(self):
        c = RubricCriterion(
            key="q1.c1",
            description="Clear definition of O(n) notation.",
            marks=1.5,
            accept_alternatives=["Limit definition"],
            common_errors=["Confusing big-O with little-o"],
        )
        self.assertEqual(c.marks, 1.5)
        self.assertEqual(len(c.accept_alternatives), 1)

    def test_rubric_draft_validation(self):
        draft_data = {
            "key_transcript": "1a. Formal definition with constants c and n0.",
            "questions": [
                {
                    "label": "1a",
                    "criteria": [
                        {
                            "key": "q1a.c1",
                            "description": "Definition stating c and n0",
                            "marks": 1.5,
                        },
                        {
                            "key": "q1a.c2",
                            "description": "Proof inequality",
                            "marks": 1.5,
                        },
                    ],
                    "final_answer": "c=4, n0=2",
                    "tolerance_pct": 2.0,
                    "units": None,
                }
            ],
        }
        draft = RubricDraft.model_validate(draft_data)
        self.assertEqual(draft.questions[0].label, "1a")
        self.assertEqual(len(draft.questions[0].criteria), 2)
        self.assertEqual(draft.questions[0].final_answer, "c=4, n0=2")


if __name__ == "__main__":
    unittest.main()
