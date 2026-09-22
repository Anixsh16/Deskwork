"""Stub handlers for Persons 2, 3, and 4 jobs."""


def run_extract_material(payload: dict, progress=None, db_cursor=None):
    """Person 4: Slide ingestion and text extraction."""
    raise NotImplementedError("extract_material belongs to Person 4 (Course Materials & Generator)")


def run_ingest_scripts(payload: dict, progress=None, db_cursor=None):
    """Person 2: Script ingestion, local name masking, blur check."""
    raise NotImplementedError("ingest_scripts belongs to Person 2 (Grading Engine)")


def run_grade_booklet(payload: dict, progress=None, db_cursor=None):
    """Person 2: Dual-model grading call per booklet."""
    raise NotImplementedError("grade_booklet belongs to Person 2 (Grading Engine)")


def run_finalize_flags(payload: dict, progress=None, db_cursor=None):
    """Person 2: Agreement comparison and flag determination."""
    raise NotImplementedError("finalize_flags belongs to Person 2 (Grading Engine)")


def run_generate_set(payload: dict, progress=None, db_cursor=None):
    """Person 4: Assignment and paper generation."""
    raise NotImplementedError("generate_set belongs to Person 4 (Generator & Assistant)")


def run_export_results(payload: dict, progress=None, db_cursor=None):
    """Person 3: Excel results export generation."""
    raise NotImplementedError("export_results belongs to Person 3 (Review & Results)")
