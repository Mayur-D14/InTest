import enum
import uuid
from datetime import datetime

<<<<<<< HEAD
from sqlalchemy import (Column, String, Text, Integer, ForeignKey, DateTime, Enum, JSON, Table)
=======
from sqlalchemy import (
    Column, String, Text, Integer, ForeignKey, DateTime, Enum, JSON, Table,
)
>>>>>>> spreadsheet_add_data
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Priority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class Severity(str, enum.Enum):
    MINOR = "Minor"
    MAJOR = "Major"
    CRITICAL = "Critical"
    BLOCKER = "Blocker"


class TestCaseStatus(str, enum.Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    DEPRECATED = "Deprecated"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    suites = relationship("TestSuite", back_populates="project", cascade="all, delete-orphan")


class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="suites")
    test_cases = relationship("TestCase", back_populates="suite", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    test_suite_id = Column(UUID(as_uuid=False), ForeignKey("test_suites.id", ondelete="CASCADE"), nullable=False)
    current_version_id = Column(UUID(as_uuid=False), ForeignKey("test_case_versions.id"), nullable=True)
    automation_script_id = Column(UUID(as_uuid=False), nullable=True)  # linked in Phase 2
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    suite = relationship("TestSuite", back_populates="test_cases")
    versions = relationship(
        "TestCaseVersion",
        back_populates="test_case",
        cascade="all, delete-orphan",
        foreign_keys="TestCaseVersion.test_case_id",
    )
    current_version = relationship("TestCaseVersion", foreign_keys=[current_version_id], post_update=True)


class TestCaseVersion(Base):
    __tablename__ = "test_case_versions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    test_case_id = Column(UUID(as_uuid=False), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    preconditions = Column(Text, default="")
    priority = Column(Enum(Priority), default=Priority.MEDIUM, nullable=False)
    severity = Column(Enum(Severity), default=Severity.MAJOR, nullable=False)
    status = Column(Enum(TestCaseStatus), default=TestCaseStatus.DRAFT, nullable=False)
    tags = Column(JSON, default=list)
    changed_by = Column(String(255), default="solo-sdet")
    change_summary = Column(String(500), default="Initial version")
    created_at = Column(DateTime, default=datetime.utcnow)

<<<<<<< HEAD
=======
    # Flat spreadsheet-style fields (added alongside preconditions/steps, not replacing them) —
    # matches the Test Title | Description | Priority | Severity | Test Scripts | Test Data |
    # Expected Result | Actual Result format for tabular entry and Excel import/export.
    description = Column(Text, default="")
    test_scripts = Column(Text, default="")     # free text; script linking still goes through
                                                  # the AutomationScript <-> TestCase many-to-many
    test_data = Column(Text, default="")
    expected_result = Column(Text, default="")   # overall expected result (distinct from per-step)
    actual_result = Column(Text, default="")     # filled in manually after execution

>>>>>>> spreadsheet_add_data
    test_case = relationship("TestCase", back_populates="versions", foreign_keys=[test_case_id])
    steps = relationship("TestCaseStep", back_populates="version", cascade="all, delete-orphan", order_by="TestCaseStep.step_number")


class TestCaseStep(Base):
    __tablename__ = "test_case_steps"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    test_case_version_id = Column(UUID(as_uuid=False), ForeignKey("test_case_versions.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    action = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)

    version = relationship("TestCaseVersion", back_populates="steps")


# ---------- Phase 2: Automation ----------

class ScriptSourceType(str, enum.Enum):
    UPLOAD = "upload"
    GIT = "git"


class RunStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PASSED = "passed"       # all linked test cases passed
    FAILED = "failed"       # at least one linked test case failed
    ERROR = "error"         # the run itself errored (timeout, bad script, etc.)


class TestOutcome(str, enum.Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


script_test_case_links = Table(
    "script_test_case_links",
    Base.metadata,
    Column("script_id", UUID(as_uuid=False), ForeignKey("automation_scripts.id", ondelete="CASCADE"), primary_key=True),
    Column("test_case_id", UUID(as_uuid=False), ForeignKey("test_cases.id", ondelete="CASCADE"), primary_key=True),
)


class AutomationScript(Base):
    __tablename__ = "automation_scripts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    language = Column(String(50), default="python-selenium")
    source_type = Column(Enum(ScriptSourceType), nullable=False)

    # populated when source_type == upload
    script_content = Column(Text, nullable=True)

    # populated when source_type == git
    git_repo_url = Column(String(500), nullable=True)
    git_branch = Column(String(255), nullable=True, default="main")
    git_path = Column(String(500), nullable=True)  # path to the .py file within the repo

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    test_cases = relationship("TestCase", secondary=script_test_case_links, backref="scripts")
    runs = relationship("ExecutionRun", back_populates="script", cascade="all, delete-orphan")


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    github_repo = Column(String(255), nullable=False)     # "owner/repo"
    workflow_file = Column(String(255), nullable=False)   # e.g. "sdet-tests.yml"
    branch = Column(String(255), default="main")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    runs = relationship("ExecutionRun", back_populates="pipeline", cascade="all, delete-orphan")


class RunSource(str, enum.Enum):
    MANUAL = "manual"
    GITHUB_ACTIONS = "github_actions"


class ExecutionRun(Base):
    __tablename__ = "execution_runs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    script_id = Column(UUID(as_uuid=False), ForeignKey("automation_scripts.id", ondelete="CASCADE"), nullable=True)
    pipeline_id = Column(UUID(as_uuid=False), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=True)
    source = Column(Enum(RunSource), default=RunSource.MANUAL, nullable=False)
    external_run_id = Column(String(100), nullable=True)   # GitHub Actions run ID
    external_run_url = Column(String(500), nullable=True)  # link to the run on github.com
    status = Column(Enum(RunStatus), default=RunStatus.QUEUED, nullable=False)
    raw_logs = Column(Text, default="")
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    script = relationship("AutomationScript", back_populates="runs")
    pipeline = relationship("Pipeline", back_populates="runs")
    results = relationship("ExecutionResult", back_populates="run", cascade="all, delete-orphan")


class ExecutionResult(Base):
    __tablename__ = "execution_results"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    execution_run_id = Column(UUID(as_uuid=False), ForeignKey("execution_runs.id", ondelete="CASCADE"), nullable=False)
    test_case_id = Column(UUID(as_uuid=False), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    outcome = Column(Enum(TestOutcome), nullable=False)
    detail = Column(Text, default="")

    run = relationship("ExecutionRun", back_populates="results")
    test_case = relationship("TestCase")


# ---------- Phase 3: Bug Reports ----------

class BugStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    REOPENED = "Reopened"


class Bug(Base):
    __tablename__ = "bugs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    severity = Column(Enum(Severity), default=Severity.MAJOR, nullable=False)
    priority = Column(Enum(Priority), default=Priority.MEDIUM, nullable=False)
    status = Column(Enum(BugStatus), default=BugStatus.OPEN, nullable=False)
    environment = Column(String(500), default="")
    assignee = Column(String(255), default="")
    reported_by = Column(String(255), default="solo-sdet")
    custom_fields = Column(JSON, default=dict)

    test_case_id = Column(UUID(as_uuid=False), ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True)
    execution_run_id = Column(UUID(as_uuid=False), ForeignKey("execution_runs.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    test_case = relationship("TestCase")
    execution_run = relationship("ExecutionRun")
    steps = relationship("BugStep", back_populates="bug", cascade="all, delete-orphan", order_by="BugStep.step_number")
    attachments = relationship("BugAttachment", back_populates="bug", cascade="all, delete-orphan")


class BugStep(Base):
    __tablename__ = "bug_steps"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    bug_id = Column(UUID(as_uuid=False), ForeignKey("bugs.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)

    bug = relationship("Bug", back_populates="steps")


class BugAttachment(Base):
    __tablename__ = "bug_attachments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    bug_id = Column(UUID(as_uuid=False), ForeignKey("bugs.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(500), nullable=False)
    content_type = Column(String(100), default="application/octet-stream")
    url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="attachments")

