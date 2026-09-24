"""Shapes the AI must return (validated with Pydantic, sent to Gemini as JSON schema)."""

from pydantic import BaseModel, Field


class ParsedPart(BaseModel):
    label: str = Field(description="Sub-part label exactly as printed, lowercase letter or roman numeral, e.g. 'a'.")
    text: str = Field(description="Full sub-part text.")
    marks: float = Field(description="Marks printed for this sub-part.")


class ParsedQuestion(BaseModel):
    number: int = Field(description="Question number as printed, e.g. 1 for Q1.")
    text: str = Field(description="Full question stem text, including given data, tables written as text.")
    marks: float = Field(description="Total marks printed for the whole question.")
    co: str | None = Field(default=None, description="Course outcome tag printed next to the question, e.g. 'CO3'.")
    has_figure: bool = Field(description="True if the question relies on a figure, diagram or image.")
    parts: list[ParsedPart] = Field(description="Sub-parts in order; empty if the question has none.")


class ParsedPaper(BaseModel):
    exam_title: str | None = Field(default=None, description="Exam name as printed, e.g. 'T2 Examination, Even 2026'.")
    course_title: str | None = None
    course_code: str | None = None
    max_marks: float | None = None
    duration: str | None = Field(default=None, description="Maximum time as printed, e.g. '1 hr'.")
    questions: list[ParsedQuestion]


class MarkingPoint(BaseModel):
    point: str = Field(description="What the student must show to earn these marks.")
    marks: float


class KeyItem(BaseModel):
    question_number: int
    part_label: str = Field(description="Sub-part label, or empty string if the question has no sub-parts.")
    answer: str = Field(description="The full model answer from the key, in Markdown (tables as Markdown tables).")
    final_answer: str | None = Field(default=None, description="The short final result, if the answer has one.")
    marking_points: list[MarkingPoint] = Field(description="Marking scheme; marks must add up to the item's maximum.")


class ParsedKey(BaseModel):
    items: list[KeyItem]


class StudentIdentity(BaseModel):
    student_name: str | None = Field(default=None, description="Student's name as written; null if not visible.")
    enrollment_no: str | None = Field(default=None, description="Enrollment or roll number as written.")
    batch: str | None = None


class GradedItem(BaseModel):
    question_number: int
    part_label: str
    attempted: bool
    pages: list[int] = Field(description="Page numbers (1-based) where this answer appears.")
    student_answer: str = Field(description="Short faithful summary of what the student actually wrote, errors kept.")
    reasoning: str = Field(description="Compare with the key point by point, BEFORE deciding marks.")
    mistakes: list[str] = Field(description="Specific errors or omissions; empty if none.")
    marks_awarded: float
    confidence: float = Field(description="0 to 1: how sure you are an expert examiner would give the same marks.")


class GradedPaper(BaseModel):
    student_name: str | None = None
    enrollment_no: str | None = None
    items: list[GradedItem]
    overall_feedback: str = Field(description="Two or three sentences of feedback for the student.")


class TopicPlan(BaseModel):
    topics: list[str] = Field(description="Specific topics to cover, taken from the course outline.")
