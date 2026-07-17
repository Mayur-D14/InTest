from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/suites", tags=["test-suites"])


@router.post("", response_model=schemas.TestSuiteOut)
def create_suite(data: schemas.TestSuiteCreate, db: Session = Depends(get_db)):
    return crud.create_suite(db, data)


@router.get("", response_model=list[schemas.TestSuiteOut])
def list_suites(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.list_suites(db, project_id)


@router.get("/{suite_id}", response_model=schemas.TestSuiteOut)
def get_suite(suite_id: str, db: Session = Depends(get_db)):
    suite = crud.get_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return suite


@router.delete("/{suite_id}")
def delete_suite(suite_id: str, db: Session = Depends(get_db)):
    suite = crud.delete_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return {"deleted": True}
