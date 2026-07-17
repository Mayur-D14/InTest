from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models import Priority, Severity, TestCaseStatus, ScriptSourceType, RunStatus, TestOutcome, BugStatus


# ---------- Project ----------
class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


# ---------- Test Suite ----------
class TestSuiteCreate(BaseModel):
    project_id: str
    name: str
    description: str = ""


class TestSuiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


# ---------- Test Case Step ----------
class TestCaseStepIn(BaseModel):
    step_number: int
    action: str
    expected_result: str


class TestCaseStepOut(TestCaseStepIn):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------- Test Case Version ----------
class TestCaseVersionIn(BaseModel):
    title: str
    preconditions: str = ""
    priority: Priority = Priority.MEDIUM
    severity: Severity = Severity.MAJOR
    status: TestCaseStatus = TestCaseStatus.DRAFT
    tags: List[str] = []
    change_summary: str = "Initial version"
    changed_by: str = "solo-sdet"
    steps: List[TestCaseStepIn] = []


class TestCaseVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    test_case_id: str
    version_number: int
    title: str
    preconditions: str
    priority: Priority
    severity: Severity
    status: TestCaseStatus
    tags: List[str]
    changed_by: str
    change_summary: str
    created_at: datetime
    steps: List[TestCaseStepOut] = []


# ---------- Test Case ----------
class TestCaseCreate(BaseModel):
    test_suite_id: str
    version: TestCaseVersionIn


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    test_suite_id: str
    created_at: datetime
    updated_at: datetime
    current_version: Optional[TestCaseVersionOut] = None


class TestCaseUpdate(BaseModel):
    version: TestCaseVersionIn


# ---------- Phase 2: Automation ----------

class ScriptCreate(BaseModel):
    name: str
    description: str = ""
    language: str = "python-selenium"
    source_type: ScriptSourceType
    script_content: Optional[str] = None       # required if source_type == upload
    git_repo_url: Optional[str] = None         # required if source_type == git
    git_branch: Optional[str] = "main"
    git_path: Optional[str] = None
    test_case_ids: List[str] = []              # link at creation time (optional)


class ScriptTestCaseLinkIn(BaseModel):
    test_case_ids: List[str]


class LinkedTestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str


class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str
    language: str
    source_type: ScriptSourceType
    script_content: Optional[str] = None
    git_repo_url: Optional[str] = None
    git_branch: Optional[str] = None
    git_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ExecutionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    test_case_id: str
    outcome: TestOutcome
    detail: str


class ExecutionRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    script_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    source: str
    external_run_id: Optional[str] = None
    external_run_url: Optional[str] = None
    status: RunStatus
    raw_logs: str
    error_message: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    results: List[ExecutionResultOut] = []


# ---------- Phase 3: Bug Reports ----------

class BugStepIn(BaseModel):
    step_number: int
    description: str


class BugStepOut(BugStepIn):
    model_config = ConfigDict(from_attributes=True)
    id: str


class BugAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    content_type: str
    url: str
    uploaded_at: datetime


class BugCreate(BaseModel):
    title: str
    description: str = ""
    severity: Severity = Severity.MAJOR
    priority: Priority = Priority.MEDIUM
    status: BugStatus = BugStatus.OPEN
    environment: str = ""
    assignee: str = ""
    reported_by: str = "solo-sdet"
    custom_fields: dict = {}
    test_case_id: Optional[str] = None
    execution_run_id: Optional[str] = None
    steps: List[BugStepIn] = []


class BugUpdate(BugCreate):
    pass


class BugOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str
    severity: Severity
    priority: Priority
    status: BugStatus
    environment: str
    assignee: str
    reported_by: str
    custom_fields: dict
    test_case_id: Optional[str] = None
    execution_run_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List[BugStepOut] = []
    attachments: List[BugAttachmentOut] = []


# ---------- Phase 4: Pipelines (GitHub Actions) ----------

class PipelineCreate(BaseModel):
    name: str
    github_repo: str    # "owner/repo"
    workflow_file: str  # "sdet-tests.yml"
    branch: str = "main"


class PipelineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    github_repo: str
    workflow_file: str
    branch: str
    created_at: datetime
    updated_at: datetime


class SyncResult(BaseModel):
    new_runs_imported: int
    message: str
