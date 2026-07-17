const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Severity = "Minor" | "Major" | "Critical" | "Blocker";
export type TestCaseStatus = "Draft" | "Active" | "Deprecated";

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TestSuite {
  id: string;
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TestCaseStep {
  id?: string;
  step_number: number;
  action: string;
  expected_result: string;
}

export interface TestCaseVersion {
  id: string;
  test_case_id: string;
  version_number: number;
  title: string;
  preconditions: string;
  priority: Priority;
  severity: Severity;
  status: TestCaseStatus;
  tags: string[];
  changed_by: string;
  change_summary: string;
  created_at: string;
  steps: TestCaseStep[];
<<<<<<< HEAD
=======
  description: string;
  test_scripts: string;
  test_data: string;
  expected_result: string;
  actual_result: string;
}

export type TestCaseVersionInput = Omit<TestCaseVersion, "id" | "test_case_id" | "version_number" | "created_at"> & {
  linked_script_name?: string | null;
};

export interface ExcelUploadRowError {
  row_number: number;
  message: string;
}

export interface ExcelUploadResult {
  created: number;
  errors: ExcelUploadRowError[];
>>>>>>> spreadsheet_add_data
}

export interface TestCase {
  id: string;
  test_suite_id: string;
  created_at: string;
  updated_at: string;
  current_version: TestCaseVersion | null;
}

export type ScriptSourceType = "upload" | "git";
export type RunStatus = "queued" | "running" | "passed" | "failed" | "error";
export type TestOutcome = "passed" | "failed" | "skipped";

export interface LinkedTestCase {
  id: string;
  title: string;
}

export interface AutomationScript {
  id: string;
  name: string;
  description: string;
  language: string;
  source_type: ScriptSourceType;
  script_content: string | null;
  git_repo_url: string | null;
  git_branch: string | null;
  git_path: string | null;
  created_at: string;
  updated_at: string;
  test_cases?: LinkedTestCase[];
}

export interface ExecutionResultItem {
  id: string;
  test_case_id: string;
  outcome: TestOutcome;
  detail: string;
}

export interface ExecutionRun {
  id: string;
  script_id: string | null;
  pipeline_id: string | null;
  source: "manual" | "github_actions";
  external_run_id: string | null;
  external_run_url: string | null;
  status: RunStatus;
  raw_logs: string;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  results: ExecutionResultItem[];
}

export type BugStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Reopened";

export interface BugStep {
  id?: string;
  step_number: number;
  description: string;
}

export interface BugAttachment {
  id: string;
  filename: string;
  content_type: string;
  url: string;
  uploaded_at: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  priority: Priority;
  status: BugStatus;
  environment: string;
  assignee: string;
  reported_by: string;
  custom_fields: Record<string, string>;
  test_case_id: string | null;
  execution_run_id: string | null;
  created_at: string;
  updated_at: string;
  steps: BugStep[];
  attachments: BugAttachment[];
}

export interface Pipeline {
  id: string;
  name: string;
  github_repo: string;
  workflow_file: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  new_runs_imported: number;
  message: string;
}

export const api = {
  // Projects
  listProjects: () => request<Project[]>("/projects"),
  createProject: (data: { name: string; description: string }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  deleteProject: (id: string) => request(`/projects/${id}`, { method: "DELETE" }),

  // Suites
  listSuites: (projectId?: string) =>
    request<TestSuite[]>(`/suites${projectId ? `?project_id=${projectId}` : ""}`),
  createSuite: (data: { project_id: string; name: string; description: string }) =>
    request<TestSuite>("/suites", { method: "POST", body: JSON.stringify(data) }),
  deleteSuite: (id: string) => request(`/suites/${id}`, { method: "DELETE" }),

  // Test Cases
  listTestCases: (suiteId?: string) =>
    request<TestCase[]>(`/test-cases${suiteId ? `?test_suite_id=${suiteId}` : ""}`),
  getTestCase: (id: string) => request<TestCase>(`/test-cases/${id}`),
<<<<<<< HEAD
  createTestCase: (data: { test_suite_id: string; version: Omit<TestCaseVersion, "id" | "test_case_id" | "version_number" | "created_at"> }) =>
    request<TestCase>("/test-cases", { method: "POST", body: JSON.stringify(data) }),
  updateTestCase: (id: string, data: { version: Omit<TestCaseVersion, "id" | "test_case_id" | "version_number" | "created_at"> }) =>
    request<TestCase>(`/test-cases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
=======
  createTestCase: (data: { test_suite_id: string; version: TestCaseVersionInput }) =>
    request<TestCase>("/test-cases", { method: "POST", body: JSON.stringify(data) }),
  updateTestCase: (id: string, data: { version: TestCaseVersionInput }) =>
    request<TestCase>(`/test-cases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  bulkCreateTestCases: (test_suite_id: string, rows: TestCaseVersionInput[]) =>
    request<TestCase[]>("/test-cases/bulk", { method: "POST", body: JSON.stringify({ test_suite_id, rows }) }),
  downloadExcelTemplate: async () => {
    const res = await fetch(`${API_URL}/test-cases/excel-template`);
    if (!res.ok) throw new Error("Failed to download template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases-template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  },
  uploadExcelTestCases: async (testSuiteId: string, file: File): Promise<ExcelUploadResult> => {
    const formData = new FormData();
    formData.append("test_suite_id", testSuiteId);
    formData.append("file", file);
    const res = await fetch(`${API_URL}/test-cases/upload-excel`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || "Upload failed");
    }
    return res.json();
  },
>>>>>>> spreadsheet_add_data
  getHistory: (id: string) => request<TestCaseVersion[]>(`/test-cases/${id}/history`),
  deleteTestCase: (id: string) => request(`/test-cases/${id}`, { method: "DELETE" }),

  // Automation Scripts
  listScripts: () => request<AutomationScript[]>("/scripts"),
  getScript: (id: string) => request<AutomationScript>(`/scripts/${id}`),
  createScript: (data: {
    name: string;
    description: string;
    source_type: ScriptSourceType;
    script_content?: string;
    git_repo_url?: string;
    git_branch?: string;
    git_path?: string;
    test_case_ids: string[];
  }) => request<AutomationScript>("/scripts", { method: "POST", body: JSON.stringify(data) }),
  linkTestCases: (scriptId: string, testCaseIds: string[]) =>
    request(`/scripts/${scriptId}/link-test-cases`, { method: "PUT", body: JSON.stringify({ test_case_ids: testCaseIds }) }),
  deleteScript: (id: string) => request(`/scripts/${id}`, { method: "DELETE" }),
  runScript: (id: string) => request<ExecutionRun>(`/scripts/${id}/run`, { method: "POST" }),
  runAllScripts: () => request<ExecutionRun[]>("/scripts/run-all", { method: "POST" }),
  getRun: (runId: string) => request<ExecutionRun>(`/runs/${runId}`),
  listRuns: (scriptId: string) => request<ExecutionRun[]>(`/scripts/${scriptId}/runs`),

  // Bugs
  listBugs: (status?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    const qs = params.toString();
    return request<Bug[]>(`/bugs${qs ? `?${qs}` : ""}`);
  },
  getBug: (id: string) => request<Bug>(`/bugs/${id}`),
  createBug: (data: Omit<Bug, "id" | "created_at" | "updated_at" | "attachments" | "reported_by"> & { reported_by?: string }) =>
    request<Bug>("/bugs", { method: "POST", body: JSON.stringify(data) }),
  updateBug: (id: string, data: Omit<Bug, "id" | "created_at" | "updated_at" | "attachments" | "reported_by"> & { reported_by?: string }) =>
    request<Bug>(`/bugs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBug: (id: string) => request(`/bugs/${id}`, { method: "DELETE" }),
  uploadAttachment: async (bugId: string, file: File): Promise<BugAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/bugs/${bugId}/attachments`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
    return res.json();
  },
  deleteAttachment: (attachmentId: string) => request(`/bugs/attachments/${attachmentId}`, { method: "DELETE" }),
  attachmentUrl: (path: string) => `${API_URL}${path}`,

  // Pipelines
  listPipelines: () => request<Pipeline[]>("/pipelines"),
  createPipeline: (data: { name: string; github_repo: string; workflow_file: string; branch: string }) =>
    request<Pipeline>("/pipelines", { method: "POST", body: JSON.stringify(data) }),
  getPipeline: (id: string) => request<Pipeline>(`/pipelines/${id}`),
  deletePipeline: (id: string) => request(`/pipelines/${id}`, { method: "DELETE" }),
  syncPipeline: (id: string) => request<SyncResult>(`/pipelines/${id}/sync`, { method: "POST" }),
  listPipelineRuns: (id: string) => request<ExecutionRun[]>(`/pipelines/${id}/runs`),
};
