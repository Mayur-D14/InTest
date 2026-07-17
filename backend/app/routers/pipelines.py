from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, github_integration
from app.database import get_db

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.post("", response_model=schemas.PipelineOut)
def create_pipeline(data: schemas.PipelineCreate, db: Session = Depends(get_db)):
    return crud.create_pipeline(db, data)


@router.get("", response_model=list[schemas.PipelineOut])
def list_pipelines(db: Session = Depends(get_db)):
    return crud.list_pipelines(db)


@router.get("/{pipeline_id}", response_model=schemas.PipelineOut)
def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = crud.get_pipeline(db, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.delete("/{pipeline_id}")
def delete_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = crud.delete_pipeline(db, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"deleted": True}


@router.post("/{pipeline_id}/sync", response_model=schemas.SyncResult)
def sync_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = crud.get_pipeline(db, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    try:
        count = github_integration.sync_pipeline(db, pipeline)
    except github_integration.GitHubSyncError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return schemas.SyncResult(
        new_runs_imported=count,
        message=f"Imported {count} new run(s) from GitHub Actions." if count else "No new completed runs found.",
    )


@router.get("/{pipeline_id}/runs", response_model=list[schemas.ExecutionRunOut])
def list_pipeline_runs(pipeline_id: str, db: Session = Depends(get_db)):
    return crud.list_runs(db, pipeline_id=pipeline_id)
