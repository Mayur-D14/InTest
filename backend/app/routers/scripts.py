from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models, execution
from app.database import get_db
from app.tasks import execute_script_run_task

router = APIRouter(prefix="/scripts", tags=["automation-scripts"])


def _script_test_cases_out(script: models.AutomationScript):
    return [
        {"id": tc.id, "title": tc.current_version.title if tc.current_version else "(untitled)"}
        for tc in script.test_cases
    ]


@router.post("", response_model=schemas.ScriptOut)
def create_script(data: schemas.ScriptCreate, db: Session = Depends(get_db)):
    if data.source_type == models.ScriptSourceType.UPLOAD and not data.script_content:
        raise HTTPException(status_code=400, detail="script_content is required for upload source_type")
    if data.source_type == models.ScriptSourceType.GIT and not (data.git_repo_url and data.git_path):
        raise HTTPException(status_code=400, detail="git_repo_url and git_path are required for git source_type")
    return crud.create_script(db, data)


@router.get("", response_model=list[schemas.ScriptOut])
def list_scripts(db: Session = Depends(get_db)):
    return crud.list_scripts(db)


@router.get("/{script_id}")
def get_script(script_id: str, db: Session = Depends(get_db)):
    script = crud.get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    out = schemas.ScriptOut.model_validate(script).model_dump()
    out["test_cases"] = _script_test_cases_out(script)
    return out


@router.put("/{script_id}/link-test-cases")
def link_test_cases(script_id: str, data: schemas.ScriptTestCaseLinkIn, db: Session = Depends(get_db)):
    script = crud.link_test_cases(db, script_id, data.test_case_ids)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"linked": _script_test_cases_out(script)}


@router.delete("/{script_id}")
def delete_script(script_id: str, db: Session = Depends(get_db)):
    script = crud.delete_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"deleted": True}


@router.post("/{script_id}/run", response_model=schemas.ExecutionRunOut)
def trigger_run(script_id: str, db: Session = Depends(get_db)):
    script = crud.get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if not script.test_cases:
        raise HTTPException(status_code=400, detail="Link at least one test case to this script before running it")
    run = execution.enqueue_run(db, script)
    execute_script_run_task.delay(run.id)
    return run


@router.post("/run-all", response_model=list[schemas.ExecutionRunOut])
def trigger_all(db: Session = Depends(get_db)):
    """Enqueues every script with at least one linked test case. They execute concurrently
    across whatever Celery worker concurrency / runner replicas you have running."""
    scripts = [s for s in crud.list_scripts(db) if s.test_cases]
    if not scripts:
        raise HTTPException(status_code=400, detail="No scripts with linked test cases to run")
    runs = []
    for script in scripts:
        run = execution.enqueue_run(db, script)
        execute_script_run_task.delay(run.id)
        runs.append(run)
    return runs


@router.get("/{script_id}/runs", response_model=list[schemas.ExecutionRunOut])
def list_runs(script_id: str, db: Session = Depends(get_db)):
    return crud.list_runs(db, script_id)
