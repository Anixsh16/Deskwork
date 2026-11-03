"""Keep approved fixtures reproducible without replacing teacher work or inventing scores."""
import hashlib
import json
from unittest.mock import AsyncMock

import pytest
from tools import seed_final_samples as seed


def bundle(tmp_path):
    image = b'approved image fixture'
    pdf = b'approved PDF fixture'
    (tmp_path / 'sheet.png').write_bytes(image)
    (tmp_path / 'sheet.pdf').write_bytes(pdf)
    subjects = [dict(code=c, name=c, question_paper='sheet.pdf', answer_key='sheet.pdf')
                for c in ('CN-SAMPLE', 'DB-SAMPLE')]
    students = [dict(subject_code=c, index=i, name=f'Fixture {i}', enrollment=str(i),
                     image='sheet.png', pdf='sheet.pdf',
                     image_sha256=hashlib.sha256(image).hexdigest(),
                     pdf_sha256=hashlib.sha256(pdf).hexdigest())
                for c in ('CN-SAMPLE', 'DB-SAMPLE') for i in range(1, 15)]
    data = dict(version=2, subjects=subjects, students=students)
    (tmp_path / 'manifest.json').write_text(json.dumps(data))
    return data


@pytest.mark.asyncio
async def test_corrupt_asset_fails_before_remote_access(tmp_path, monkeypatch):
    bundle(tmp_path)
    (tmp_path / 'sheet.png').write_bytes(b'changed file')
    pool = AsyncMock()
    upload = AsyncMock()
    monkeypatch.setattr(seed.db, 'open_pool', pool)
    monkeypatch.setattr(seed.storage, 'upload', upload)
    with pytest.raises(ValueError, match='checksum'):
        await seed.main(tmp_path)
    pool.assert_not_awaited()
    upload.assert_not_awaited()


@pytest.mark.asyncio
async def test_existing_seed_does_not_touch_files_or_marks(tmp_path, monkeypatch):
    bundle(tmp_path)
    monkeypatch.setattr(seed.db, 'open_pool', AsyncMock())
    monkeypatch.setattr(seed.db, 'close_pool', AsyncMock())
    monkeypatch.setattr(seed.db, 'fetch_one', AsyncMock(return_value={'id': 'owner-fixture'}))
    async def existing(sql, ids):
        return [{'id': value} for value in ids]
    monkeypatch.setattr(seed.db, 'fetch_all', existing)
    write = AsyncMock()
    upload = AsyncMock()
    monkeypatch.setattr(seed.db, 'execute', write)
    monkeypatch.setattr(seed.storage, 'upload', upload)
    await seed.main(tmp_path)
    write.assert_not_awaited()
    upload.assert_not_awaited()


def test_same_enrollment_cannot_change_identity_between_subjects(tmp_path):
    data = bundle(tmp_path)
    data['students'][14]['name'] = 'Different person'
    (tmp_path / 'manifest.json').write_text(json.dumps(data))
    with pytest.raises(ValueError, match='identity differs'):
        seed.load_bundle(tmp_path)
