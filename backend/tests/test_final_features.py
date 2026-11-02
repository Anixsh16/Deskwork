import asyncio
from decimal import Decimal
from uuid import uuid4
import pytest
from pydantic import ValidationError
from app.services.analytics import summarise
from app.services.bank import BankQuestion, fingerprint
from app.services.planning import PlanConfig, PlanContent, validate_plan
from app.routers.question_checks import has_missing


def test_analytics_excludes_unchecked_and_incomplete_totals():
    cid = str(uuid4())
    pid = str(uuid4())
    eid = str(uuid4())
    papers = [
        dict(
            id=pid,
            course_id=cid,
            status="ready",
            total_marks=None,
            max_marks=10,
            is_sample=True,
        )
    ]
    rows = [
        dict(
            paper_id=pid,
            exam_id=eid,
            question_number=1,
            part_label="",
            course_id=cid,
            course_name="CN",
            exam_title="T2",
            topic="TCP",
            text="Explain",
            final_marks=Decimal("3"),
            max_marks=Decimal("5"),
            flagged=False,
            attempted=True,
        ),
        dict(
            paper_id=pid,
            exam_id=eid,
            question_number=2,
            part_label="",
            course_id=cid,
            course_name="CN",
            exam_title="T2",
            topic="IP",
            text="Explain",
            final_marks=None,
            max_marks=5,
            flagged=False,
            attempted=True,
        ),
    ]
    d = summarise(rows, papers, [dict(id=cid, name="CN")])
    assert (
        d["checked_count"] == 0 and d["average_pct"] is None and d["pending_count"] == 1
    )
    assert len(d["questions"]) == 1 and d["questions"][0]["average_pct"] == 60
    assert d["sample_count"] == 1


def test_score_distribution_and_cross_exam_normalisation():
    papers = [
        dict(
            id=str(i),
            course_id="c",
            status="checked",
            total_marks=m,
            max_marks=maximum,
            is_sample=False,
            enrollment_no=str(i),
            student_name=str(i),
        )
        for i, (m, maximum) in enumerate([(5, 10), (18, 20), (0, 20)])
    ]
    d = summarise([], papers, [dict(id="c", name="CN")])
    assert d["average_pct"] == 46.7
    assert [b["count"] for b in d["distribution"]] == [1, 1, 0, 1]


def test_bank_rejects_invalid_subparts_and_normalises_labels():
    base = dict(text="Explain the topic", topic="TCP", marks=5)
    for parts in [
        [dict(label="a", text="A", marks=-1), dict(label="b", text="B", marks=6)],
        [dict(label="a", text="A", marks=2), dict(label="(A)", text="B", marks=3)],
        [dict(label="", text="A", marks=5)],
    ]:
        with pytest.raises(ValidationError):
            BankQuestion(**base, parts=parts)
    q = BankQuestion(**base, parts=[dict(label="(A)", text="A", marks=5)])
    assert q.parts[0].label == "a"


def test_bank_dedup_ignores_formatting_but_not_question_content():
    a = BankQuestion(text="Explain TCP flow control", topic="TCP", marks=5)
    b = BankQuestion(text=" Explain   tcp flow control ", topic="TCP", marks=4)
    assert fingerprint(a) == fingerprint(b)
    b.text = "Explain TCP congestion control"
    assert fingerprint(a) != fingerprint(b)


def test_question_retry_finds_missing_subpart():
    q = dict(
        number=1,
        marks=5,
        parts=[dict(label="a", text="", marks=2), dict(label="b", text="", marks=3)],
    )
    assert has_missing(q, [dict(question_number=1, part_label="a", final_marks=2)])
    assert not has_missing(
        q,
        [
            dict(question_number=1, part_label="a", final_marks=2),
            dict(question_number=1, part_label="b", final_marks=0),
        ],
    )


def test_plan_requires_exact_time_and_source_ids():
    cfg = PlanConfig(title="CN", lectures=1, minutes=50, examples=0, practice=0)
    content = PlanContent(
        overview="Plan",
        coverage_notes="Review",
        lectures=[
            dict(
                title="TCP",
                topics=["TCP"],
                objectives=["Explain"],
                activities=[dict(activity="Teach", minutes=50, detail="Explain TCP")],
                examples=[],
                practice_questions=[],
                source_numbers=[1],
            )
        ],
    )
    validate_plan(content, cfg, 1)
    content.lectures[0].activities[0].minutes = 51
    with pytest.raises(ValueError):
        validate_plan(content, cfg, 1)
    content.lectures[0].activities[0].minutes = 50
    content.lectures[0].source_numbers = [2]
    with pytest.raises(ValueError):
        validate_plan(content, cfg, 1)


@pytest.mark.asyncio
async def test_pinecone_filters_course_and_model(monkeypatch):
    from app import vectorstore
    from types import SimpleNamespace

    monkeypatch.setattr(
        vectorstore,
        "get_settings",
        lambda: SimpleNamespace(vector_provider="pinecone", pinecone_namespace="test"),
    )
    calls = []

    async def call(path, body):
        calls.append(body)
        return {"matches": [{"id": "a", "score": 0.8, "metadata": {"text": "TCP"}}]}

    monkeypatch.setattr(vectorstore, "pinecone_call", call)
    r = await vectorstore.query("course-a", [[0.1] * 768], 8, "model-a")
    assert calls[0]["filter"] == {
        "$and": [
            {"course_id": {"$eq": "course-a"}},
            {"embed_model": {"$eq": "model-a"}},
        ]
    }
    assert r[0]["distance"] == pytest.approx(0.2)


def test_json_schema_preserves_fields_named_title():
    from app.gemini import inline_schema

    schema = inline_schema(PlanContent)
    item = schema["properties"]["lectures"]["items"]
    assert "title" in item["properties"] and "title" in item["required"]


@pytest.mark.asyncio
async def test_grader_has_a_deadline(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    from app.services import exams

    async def stuck(*args, **kwargs):
        await asyncio.sleep(5)

    monkeypatch.setattr(exams.gemini, "generate_json", stuck)
    monkeypatch.setattr(
        exams, "get_settings", lambda: SimpleNamespace(grading_timeout_seconds=0.01)
    )
    result, meta = await exams._grade_once("unavailable-model", [])
    assert result is None and meta["error"] is not None
