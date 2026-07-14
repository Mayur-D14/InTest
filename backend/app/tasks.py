from app.celery_app import celery_app
from app.database import SessionLocal
from app import execution


@celery_app.task(name="execute_script_run", bind=True, max_retries=0)
def execute_script_run_task(self, run_id: str):
    """
    Runs in a Celery worker process, independent of the FastAPI request/response cycle.
    Multiple workers (or --concurrency > 1) means multiple runs execute at the same time,
    each hitting the runner service, which Docker's DNS round-robins across runner replicas.
    """
    db = SessionLocal()
    try:
        run = execution.execute_run(db, run_id)
        return {"run_id": run.id, "status": run.status.value}
    finally:
        db.close()
