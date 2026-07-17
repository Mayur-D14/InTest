import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/bugs", tags=["bugs"])

ATTACHMENTS_DIR = Path(os.getenv("ATTACHMENTS_DIR", "/data/attachments"))


@router.post("", response_model=schemas.BugOut)
def create_bug(data: schemas.BugCreate, db: Session = Depends(get_db)):
    return crud.create_bug(db, data)


@router.get("", response_model=list[schemas.BugOut])
def list_bugs(status: Optional[str] = None, severity: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.list_bugs(db, status, severity)


@router.get("/{bug_id}", response_model=schemas.BugOut)
def get_bug(bug_id: str, db: Session = Depends(get_db)):
    bug = crud.get_bug(db, bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    return bug


@router.put("/{bug_id}", response_model=schemas.BugOut)
def update_bug(bug_id: str, data: schemas.BugUpdate, db: Session = Depends(get_db)):
    bug = crud.update_bug(db, bug_id, data)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    return bug


@router.delete("/{bug_id}")
def delete_bug(bug_id: str, db: Session = Depends(get_db)):
    bug = crud.delete_bug(db, bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    return {"deleted": True}


@router.post("/{bug_id}/attachments", response_model=schemas.BugAttachmentOut)
async def upload_attachment(bug_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    bug = crud.get_bug(db, bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    bug_dir = ATTACHMENTS_DIR / bug_id
    bug_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    stored_name = f"{uuid.uuid4()}{ext}"
    dest = bug_dir / stored_name

    content = await file.read()
    dest.write_bytes(content)

    url = f"/attachments/{bug_id}/{stored_name}"
    return crud.add_attachment(db, bug_id, file.filename, file.content_type or "application/octet-stream", url)


@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: str, db: Session = Depends(get_db)):
    att = crud.delete_attachment(db, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"deleted": True}
