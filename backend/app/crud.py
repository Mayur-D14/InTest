from datetime import datetime
from sqlalchemy.orm import Session
from app import models, schemas


# ---------- Project ----------
def create_project(db: Session, data: schemas.ProjectCreate) -> models.Project:
    project = models.Project(name=data.name, description=data.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_projects(db: Session):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


def get_project(db: Session, project_id: str):
    return db.query(models.Project).filter(models.Project.id == project_id).first()


def delete_project(db: Session, project_id: str):
    project = get_project(db, project_id)
    if project:
        db.delete(project)
        db.commit()
    return project


# ---------- Test Suite ----------
def create_suite(db: Session, data: schemas.TestSuiteCreate) -> models.TestSuite:
    suite = models.TestSuite(project_id=data.project_id, name=data.name, description=data.description)
    db.add(suite)
    db.commit()
    db.refresh(suite)
    return suite


def list_suites(db: Session, project_id: str = None):
    q = db.query(models.TestSuite)
    if project_id:
        q = q.filter(models.TestSuite.project_id == project_id)
    return q.order_by(models.TestSuite.created_at.desc()).all()


def get_suite(db: Session, suite_id: str):
    return db.query(models.TestSuite).filter(models.TestSuite.id == suite_id).first()


def delete_suite(db: Session, suite_id: str):
    suite = get_suite(db, suite_id)
    if suite:
        db.delete(suite)
        db.commit()
    return suite


# ---------- Test Case (with versioning) ----------
def _build_version(db: Session, test_case_id: str, version_number: int, v: schemas.TestCaseVersionIn) -> models.TestCaseVersion:
    version = models.TestCaseVersion(
        test_case_id=test_case_id,
        version_number=version_number,
        title=v.title,
        preconditions=v.preconditions,
        priority=v.priority,
        severity=v.severity,
        status=v.status,
        tags=v.tags,
        changed_by=v.changed_by,
        change_summary=v.change_summary,
    )
    db.add(version)
    db.flush()  # get version.id without committing
    for step in v.steps:
        db.add(models.TestCaseStep(
            test_case_version_id=version.id,
            step_number=step.step_number,
            action=step.action,
            expected_result=step.expected_result,
        ))
    return version


def create_test_case(db: Session, data: schemas.TestCaseCreate) -> models.TestCase:
    test_case = models.TestCase(test_suite_id=data.test_suite_id)
    db.add(test_case)
    db.flush()  # get test_case.id

    version = _build_version(db, test_case.id, 1, data.version)
    db.flush()

    test_case.current_version_id = version.id
    db.commit()
    db.refresh(test_case)
    return test_case


def list_test_cases(db: Session, test_suite_id: str = None):
    q = db.query(models.TestCase)
    if test_suite_id:
        q = q.filter(models.TestCase.test_suite_id == test_suite_id)
    return q.order_by(models.TestCase.created_at.desc()).all()


def get_test_case(db: Session, test_case_id: str):
    return db.query(models.TestCase).filter(models.TestCase.id == test_case_id).first()


def update_test_case(db: Session, test_case_id: str, data: schemas.TestCaseUpdate):
    test_case = get_test_case(db, test_case_id)
    if not test_case:
        return None

    latest_version_number = (
        db.query(models.TestCaseVersion)
        .filter(models.TestCaseVersion.test_case_id == test_case_id)
        .count()
    )
    new_version = _build_version(db, test_case_id, latest_version_number + 1, data.version)
    db.flush()

    test_case.current_version_id = new_version.id
    db.commit()
    db.refresh(test_case)
    return test_case


def get_test_case_history(db: Session, test_case_id: str):
    return (
        db.query(models.TestCaseVersion)
        .filter(models.TestCaseVersion.test_case_id == test_case_id)
        .order_by(models.TestCaseVersion.version_number.desc())
        .all()
    )


def delete_test_case(db: Session, test_case_id: str):
    test_case = get_test_case(db, test_case_id)
    if test_case:
        db.delete(test_case)
        db.commit()
    return test_case


# ---------- Phase 2: Automation Scripts ----------

def create_script(db: Session, data: schemas.ScriptCreate) -> models.AutomationScript:
    script = models.AutomationScript(
        test_suite_id=data.test_suite_id,
        name=data.name,
        description=data.description,
        language=data.language,
        source_type=data.source_type,
        script_content=data.script_content,
        git_repo_url=data.git_repo_url,
        git_branch=data.git_branch,
        git_path=data.git_path,
    )
    if data.test_case_ids:
        script.test_cases = (
            db.query(models.TestCase).filter(models.TestCase.id.in_(data.test_case_ids)).all()
        )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script


def list_scripts(db: Session, test_suite_id: str = None):
    q = db.query(models.AutomationScript)
    if test_suite_id:
        q = q.filter(models.AutomationScript.test_suite_id == test_suite_id)
    return q.order_by(models.AutomationScript.created_at.desc()).all()


def get_script(db: Session, script_id: str):
    return db.query(models.AutomationScript).filter(models.AutomationScript.id == script_id).first()


def update_script(db: Session, script_id: str, data: schemas.ScriptUpdate):
    script = get_script(db, script_id)
    if not script:
        return None
    script.name = data.name
    script.description = data.description
    script.language = data.language
    script.source_type = data.source_type
    script.script_content = data.script_content
    script.git_repo_url = data.git_repo_url
    script.git_branch = data.git_branch
    script.git_path = data.git_path
    db.commit()
    db.refresh(script)
    return script


def link_test_cases(db: Session, script_id: str, test_case_ids: list[str]):
    script = get_script(db, script_id)
    if not script:
        return None
    script.test_cases = db.query(models.TestCase).filter(models.TestCase.id.in_(test_case_ids)).all()
    db.commit()
    db.refresh(script)
    return script


def delete_script(db: Session, script_id: str):
    script = get_script(db, script_id)
    if script:
        db.delete(script)
        db.commit()
    return script


# ---------- Phase 2: Execution Runs ----------

def create_run(db: Session, script_id: str = None, pipeline_id: str = None,
                source: models.RunSource = models.RunSource.MANUAL,
                external_run_id: str = None, external_run_url: str = None,
                status: models.RunStatus = models.RunStatus.RUNNING) -> models.ExecutionRun:
    run = models.ExecutionRun(
        script_id=script_id,
        pipeline_id=pipeline_id,
        source=source,
        external_run_id=external_run_id,
        external_run_url=external_run_url,
        status=status,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_run_by_external_id(db: Session, pipeline_id: str, external_run_id: str):
    return (
        db.query(models.ExecutionRun)
        .filter(models.ExecutionRun.pipeline_id == pipeline_id, models.ExecutionRun.external_run_id == external_run_id)
        .first()
    )


def finalize_run(db: Session, run_id: str, status: models.RunStatus, raw_logs: str,
                  results: dict, error_message: str = None):
    run = db.query(models.ExecutionRun).filter(models.ExecutionRun.id == run_id).first()
    if not run:
        return None
    run.status = status
    run.raw_logs = raw_logs
    run.error_message = error_message
    run.finished_at = datetime.utcnow()
    for test_case_id, info in results.items():
        db.add(models.ExecutionResult(
            execution_run_id=run.id,
            test_case_id=test_case_id,
            outcome=info["outcome"],
            detail=info.get("detail", ""),
            screenshot_url=info.get("screenshot_url"),
        ))
    db.commit()
    db.refresh(run)
    return run


def list_runs(db: Session, script_id: str = None, pipeline_id: str = None):
    q = db.query(models.ExecutionRun)
    if script_id:
        q = q.filter(models.ExecutionRun.script_id == script_id)
    if pipeline_id:
        q = q.filter(models.ExecutionRun.pipeline_id == pipeline_id)
    return q.order_by(models.ExecutionRun.started_at.desc()).all()


def get_run(db: Session, run_id: str):
    return db.query(models.ExecutionRun).filter(models.ExecutionRun.id == run_id).first()


# ---------- Phase 3: Bug Reports ----------

def create_bug(db: Session, data: schemas.BugCreate) -> models.Bug:
    bug = models.Bug(
        title=data.title,
        description=data.description,
        severity=data.severity,
        priority=data.priority,
        status=data.status,
        environment=data.environment,
        assignee=data.assignee,
        reported_by=data.reported_by,
        custom_fields=data.custom_fields,
        test_case_id=data.test_case_id,
        execution_run_id=data.execution_run_id,
    )
    db.add(bug)
    db.flush()
    for step in data.steps:
        db.add(models.BugStep(bug_id=bug.id, step_number=step.step_number, description=step.description))
    db.commit()
    db.refresh(bug)
    return bug


def list_bugs(db: Session, status: str = None, severity: str = None):
    q = db.query(models.Bug)
    if status:
        q = q.filter(models.Bug.status == status)
    if severity:
        q = q.filter(models.Bug.severity == severity)
    return q.order_by(models.Bug.created_at.desc()).all()


def get_bug(db: Session, bug_id: str):
    return db.query(models.Bug).filter(models.Bug.id == bug_id).first()


def update_bug(db: Session, bug_id: str, data: schemas.BugUpdate):
    bug = get_bug(db, bug_id)
    if not bug:
        return None
    bug.title = data.title
    bug.description = data.description
    bug.severity = data.severity
    bug.priority = data.priority
    bug.status = data.status
    bug.environment = data.environment
    bug.assignee = data.assignee
    bug.custom_fields = data.custom_fields
    bug.test_case_id = data.test_case_id
    bug.execution_run_id = data.execution_run_id

    db.query(models.BugStep).filter(models.BugStep.bug_id == bug_id).delete()
    for step in data.steps:
        db.add(models.BugStep(bug_id=bug.id, step_number=step.step_number, description=step.description))

    db.commit()
    db.refresh(bug)
    return bug


def delete_bug(db: Session, bug_id: str):
    bug = get_bug(db, bug_id)
    if bug:
        db.delete(bug)
        db.commit()
    return bug


def add_attachment(db: Session, bug_id: str, filename: str, content_type: str, url: str):
    attachment = models.BugAttachment(bug_id=bug_id, filename=filename, content_type=content_type, url=url)
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def delete_attachment(db: Session, attachment_id: str):
    att = db.query(models.BugAttachment).filter(models.BugAttachment.id == attachment_id).first()
    if att:
        db.delete(att)
        db.commit()
    return att


# ---------- Phase 4: Pipelines (GitHub Actions) ----------

def create_pipeline(db: Session, data: schemas.PipelineCreate) -> models.Pipeline:
    pipeline = models.Pipeline(
        name=data.name,
        github_repo=data.github_repo,
        workflow_file=data.workflow_file,
        branch=data.branch,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


def list_pipelines(db: Session):
    return db.query(models.Pipeline).order_by(models.Pipeline.created_at.desc()).all()


def get_pipeline(db: Session, pipeline_id: str):
    return db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()


def delete_pipeline(db: Session, pipeline_id: str):
    pipeline = get_pipeline(db, pipeline_id)
    if pipeline:
        db.delete(pipeline)
        db.commit()
    return pipeline
