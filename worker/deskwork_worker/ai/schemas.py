"""Canonical Pydantic models for Deskwork AI structured outputs.

These models define JSON schemas sent to Gemini 3.5 Flash-Lite and Gemini 3.1 Flash-Lite.
"""

from typing import Literal
from pydantic import BaseModel, Field

# Question Extraction Schemas (Call C1: extract_paper)

AnswerType = Literal["theory", "numeric", "code", "diagram", "mcq"]
BloomLevel = Literal["remember", "understand", "apply", "analyze", "evaluate", "create"]


class ExtractedQuestion(BaseModel):
    label: str = Field(description="Question label as printed, such as '1', '2a', or '2b'.")
    text: str = Field(description="Full question text including given data and requirements.")
    max_marks: float = Field(description="Maximum allocated marks for this question or subpart.")
    answer_type: AnswerType = Field(description="Format of the answer: theory, numeric, code, diagram, or mcq.")
    bloom: BloomLevel | None = Field(default=None, description="Inferred Bloom taxonomy level.")
    printed_co: str | None = Field(
        default=None,
        description="Course Outcome identifier printed on the paper (reference text only, never used in grading)."
    )


class PaperExtractionResult(BaseModel):
    exam_title: str | None = Field(default=None, description="Title of the examination extracted from header.")
    total_marks: float | None = Field(default=None, description="Sum of marks printed on the question paper.")
    questions: list[ExtractedQuestion] = Field(description="List of extracted questions in paper order.")


# Rubric Generation Schemas (Call C2: build_rubric)


class RubricCriterion(BaseModel):
    key: str = Field(description="Unique criterion key within the exam, such as 'q1a.c1'.")
    description: str = Field(description="Specific criterion description of what earns points.")
    marks: float = Field(description="Points for this criterion: 0.5 to 3.0 in steps of 0.5.")
    accept_alternatives: list[str] = Field(
        default_factory=list,
        description="List of accepted alternative valid methods or notations."
    )
    common_errors: list[str] = Field(
        default_factory=list,
        description="Common student misconceptions and errors that earn 0 points."
    )


class RubricQuestion(BaseModel):
    label: str = Field(description="Question label matching the extracted question, such as '1' or '2a'.")
    criteria: list[RubricCriterion] = Field(description="List of granular grading criteria for this question.")
    final_answer: str | None = Field(default=None, description="Numerical value or formula of final answer.")
    tolerance_pct: float | None = Field(default=None, description="Acceptable percentage tolerance for numerics.")
    units: str | None = Field(default=None, description="Expected physical units, if applicable.")


class RubricDraft(BaseModel):
    key_transcript: str = Field(
        description="Verbatim transcription of the teacher's answer key for verification."
    )
    questions: list[RubricQuestion] = Field(
        description="List of question rubrics derived from the key."
    )


# Future Schemas for Grading Engine (Person 2 contracts: Calls C3 & C4)


class PageInfo(BaseModel):
    page: int
    questions: list[str]
    legible: Literal["good", "partial", "poor"]


class CriterionScore(BaseModel):
    key: str = Field(description="Rubric criterion key being evaluated.")
    evidence: str = Field(description="Direct quotation or factual description of the student's work.")
    points: float = Field(description="Points awarded, clamped to [0, marks] in steps of 0.5.")


Flag = Literal[
    "cross_page",
    "crossed_out",
    "diagram",
    "code",
    "illegible",
    "unanswered",
    "alt_method",
    "possible_misread",
    "numeric_mismatch",
]


class AnswerGrade(BaseModel):
    label: str
    pages: list[int]
    transcript: str = Field(description="Verbatim transcription preserving errors, [crossed], [illegible].")
    final_answer: str | None = None
    criteria: list[CriterionScore]
    flags: list[Flag] = Field(default_factory=list)
    confidence: float = Field(description="Model confidence score between 0.0 and 1.0.")


class BookletGrade(BaseModel):
    pages: list[PageInfo]
    answers: list[AnswerGrade]
