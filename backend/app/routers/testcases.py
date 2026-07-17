from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io
from app import crud, schemas, excel_import
from app.database import get_db

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.post("", response_model=schemas.TestCaseOut)
def create_test_case(data: schemas.TestCaseCreate, db: Session = Depends(get_db)):
    return crud.create_test_case(db, data)


@router.post("/bulk", response_model=list[schemas.TestCaseOut])
def bulk_create_test_cases(data: schemas.TestCaseBulkCreate, db: Session = Depends(get_db)):
    if not data.rows:
        raise HTTPException(status_code=400, detail="No rows provided")
    return crud.bulk_create_test_cases(db, data.test_suite_id, data.rows)


@router.get("/excel-template")
def download_excel_template():
    content = excel_import.build_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=test-cases-template.xlsx"},
    )


@router.post("/upload-excel", response_model=schemas.ExcelUploadResult)
async def upload_excel(test_suite_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        rows, errors = excel_import.parse_excel(content)
    except excel_import.ExcelParseError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if rows:
        crud.bulk_create_test_cases(db, test_suite_id, rows)

    return schemas.ExcelUploadResult(created=len(rows), errors=errors)


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
