from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.post("", response_model=schemas.TestCaseOut)
def create_test_case(data: schemas.TestCaseCreate, db: Session = Depends(get_db)):
    return crud.create_test_case(db, data)


@router.get("", response_model=list[schemas.TestCaseOut])
def list_test_cases(test_suite_id: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.list_test_cases(db, test_suite_id)


@router.get("/{test_case_id}", response_model=schemas.TestCaseOut)
def get_test_case(test_case_id: str, db: Session = Depends(get_db)):
    tc = crud.get_test_case(db, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


@router.put("/{test_case_id}", response_model=schemas.TestCaseOut)
def update_test_case(test_case_id: str, data: schemas.TestCaseUpdate, db: Session = Depends(get_db)):
    tc = crud.update_test_case(db, test_case_id, data)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


@router.get("/{test_case_id}/history", response_model=list[schemas.TestCaseVersionOut])
def get_history(test_case_id: str, db: Session = Depends(get_db)):
    return crud.get_test_case_history(db, test_case_id)


@router.delete("/{test_case_id}")
def delete_test_case(test_case_id: str, db: Session = Depends(get_db)):
    tc = crud.delete_test_case(db, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"deleted": True}
