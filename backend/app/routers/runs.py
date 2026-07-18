import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from app import crud, schemas, reports
from app.database import get_db

router = APIRouter(prefix="/runs", tags=["execution-runs"])


@router.get("/{run_id}", response_model=schemas.ExecutionRunOut)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/{run_id}/report", response_class=PlainTextResponse)
def view_report(run_id: str, db: Session = Depends(get_db)):
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return reports.build_report_text(run)


@router.get("/{run_id}/download")
def download_report_bundle(run_id: str, db: Session = Depends(get_db)):
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    content = reports.build_report_zip(run)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=run-{run_id[:8]}-report.zip"},
    )
