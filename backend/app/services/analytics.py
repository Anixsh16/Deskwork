"""Deterministic analytics. Unchecked questions are missing data, never zero scores."""

from collections import defaultdict


def summarise(rows, papers, courses):
    groups = defaultdict(list)
    course_scores = defaultdict(list)
    student_scores = defaultdict(list)
    for r in rows:
        if r["final_marks"] is None or float(r["max_marks"]) <= 0:
            continue
        key = (str(r["exam_id"]), r["question_number"], r["part_label"])
        groups[key].append(r)
    questions = []
    for key, rs in groups.items():
        r = rs[0]
        values = [100 * float(x["final_marks"]) / float(x["max_marks"]) for x in rs]
        questions.append(
            {
                "exam_id": key[0],
                "exam_title": r["exam_title"],
                "course_id": str(r["course_id"]),
                "course_name": r["course_name"],
                "question_number": key[1],
                "part_label": key[2],
                "topic": r.get("topic") or f"Q{key[1]} (topic not tagged)",
                "text": r["text"],
                "count": len(rs),
                "average_pct": round(sum(values) / len(values), 1),
                "flagged": sum(bool(x["flagged"]) for x in rs),
                "unattempted": sum(not x["attempted"] for x in rs),
            }
        )
    checked = [
        p
        for p in papers
        if p["status"] == "checked"
        and p["total_marks"] is not None
        and float(p["max_marks"] or 0) > 0
    ]
    bins = [{"label": l, "count": 0} for l in ("0-39%", "40-59%", "60-79%", "80-100%")]
    for p in checked:
        pct = 100 * float(p["total_marks"]) / float(p["max_marks"])
        course_scores[str(p["course_id"])].append(pct)
        bins[0 if pct < 40 else 1 if pct < 60 else 2 if pct < 80 else 3]["count"] += 1
        # Identity is scoped to a course; absent enrollment numbers are never merged by name.
        student_scores[
            (str(p["course_id"]), p["enrollment_no"] or str(p["id"]))
        ].append((p, pct))
    students = [
        {
            "course_id": cid,
            "name": vals[0][0]["student_name"] or "Unnamed",
            "enrollment_no": vals[0][0]["enrollment_no"],
            "exams": len(vals),
            "average_pct": round(sum(x[1] for x in vals) / len(vals), 1),
        }
        for (cid, _), vals in student_scores.items()
    ]
    topic_groups = defaultdict(list)
    for q in questions:
        topic_groups[(q["course_id"], q["topic"])].append(q)
    topics = []
    for (cid, topic), qs in topic_groups.items():
        count = sum(q["count"] for q in qs)
        topics.append(
            {
                "course_id": cid,
                "course_name": qs[0]["course_name"],
                "topic": topic,
                "count": count,
                "average_pct": round(
                    sum(q["average_pct"] * q["count"] for q in qs) / count, 1
                ),
            }
        )
    all_scores = [x for vs in course_scores.values() for x in vs]
    return {
        "paper_count": len(papers),
        "checked_count": len(checked),
        "pending_count": len(papers) - len(checked),
        "average_pct": round(sum(all_scores) / len(all_scores), 1)
        if all_scores
        else None,
        "sample_count": sum(bool(p.get("is_sample")) for p in papers),
        "distribution": bins,
        "questions": sorted(
            questions,
            key=lambda q: (q["average_pct"], q["exam_title"], q["question_number"]),
        ),
        "topics": sorted(topics, key=lambda x: x["average_pct"]),
        "courses": [
            {
                "id": str(c["id"]),
                "name": c["name"],
                "count": len(course_scores[str(c["id"])]),
                "average_pct": round(
                    sum(course_scores[str(c["id"])]) / len(course_scores[str(c["id"])]),
                    1,
                )
                if course_scores[str(c["id"])]
                else None,
            }
            for c in courses
        ],
        "students": sorted(students, key=lambda s: s["average_pct"]),
    }
