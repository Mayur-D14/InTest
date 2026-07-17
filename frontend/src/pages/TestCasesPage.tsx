<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, TestCase, TestSuite } from "../lib/api";
import { PriorityBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import TestCaseForm, { TestCaseFormValue } from "../components/TestCaseForm";
=======
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ExcelUploadResult, TestCase, TestCaseVersionInput, TestSuite } from "../lib/api";
import { PriorityBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import TestCaseForm, { TestCaseFormValue } from "../components/TestCaseForm";
import BulkAddTable from "../components/BulkAddTable";

type Mode = "none" | "single" | "bulk" | "excel";
>>>>>>> spreadsheet_add_data

export default function TestCasesPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [showForm, setShowForm] = useState(false);
=======
  const [mode, setMode] = useState<Mode>("none");
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelUploadResult | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
>>>>>>> spreadsheet_add_data

  const load = () => {
    if (!suiteId) return;
    setLoading(true);
    Promise.all([api.listSuites(), api.listTestCases(suiteId)])
      .then(([suites, tc]) => {
        setSuite(suites.find((s) => s.id === suiteId) || null);
        setCases(tc);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [suiteId]);

  const handleCreate = async (value: TestCaseFormValue) => {
    if (!suiteId) return;
    await api.createTestCase({ test_suite_id: suiteId, version: value });
<<<<<<< HEAD
    setShowForm(false);
=======
    setMode("none");
    load();
  };

  const handleBulkSave = async (rows: TestCaseVersionInput[]) => {
    if (!suiteId) return;
    await api.bulkCreateTestCases(suiteId, rows);
    setMode("none");
>>>>>>> spreadsheet_add_data
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test case?")) return;
    await api.deleteTestCase(id);
    load();
  };

<<<<<<< HEAD
  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
=======
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!suiteId || !e.target.files?.length) return;
    const file = e.target.files[0];
    setExcelUploading(true);
    setExcelResult(null);
    setExcelError(null);
    try {
      const result = await api.uploadExcelTestCases(suiteId, file);
      setExcelResult(result);
      load();
    } catch (err: any) {
      setExcelError(err.message);
    } finally {
      setExcelUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const modeButtonClass = (m: Mode) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
      mode === m ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted hover:text-text"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="flex items-start justify-between mb-6 gap-4">
>>>>>>> spreadsheet_add_data
        <div>
          <Link to="/suites" className="text-xs font-mono text-muted hover:text-accent">&larr; all suites</Link>
          <h1 className="text-xl font-semibold mt-1">{suite?.name || "Test Cases"}</h1>
          {suite?.description && <p className="text-sm text-muted mt-1">{suite.description}</p>}
        </div>
<<<<<<< HEAD
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors shrink-0"
        >
          {showForm ? "Cancel" : "+ New Test Case"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <TestCaseForm submitLabel="Create test case" onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
=======
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <button onClick={() => setMode(mode === "single" ? "none" : "single")} className={modeButtonClass("single")}>
            + New Test Case
          </button>
          <button onClick={() => setMode(mode === "bulk" ? "none" : "bulk")} className={modeButtonClass("bulk")}>
            ⊞ Bulk Add
          </button>
          <button onClick={() => setMode(mode === "excel" ? "none" : "excel")} className={modeButtonClass("excel")}>
            ⇪ Upload Excel
          </button>
        </div>
      </div>

      {mode === "single" && (
        <div className="mb-6">
          <TestCaseForm submitLabel="Create test case" onSubmit={handleCreate} onCancel={() => setMode("none")} />
        </div>
      )}

      {mode === "bulk" && (
        <div className="mb-6">
          <BulkAddTable onSave={handleBulkSave} onCancel={() => setMode("none")} />
        </div>
      )}

      {mode === "excel" && (
        <div className="mb-6 bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Upload test cases from Excel</div>
            <button onClick={() => api.downloadExcelTemplate()} className="text-xs font-mono text-accent hover:underline">
              Download template
            </button>
          </div>
          <p className="text-sm text-muted mb-3">
            Expected columns: <span className="font-mono text-[11px]">Test Title | Description | Priority | Severity | Test Scripts | Test Data | Expected Result | Actual Result</span>.
            An optional <span className="font-mono text-[11px]">Linked Script</span> column matches an existing automation script by exact name.
          </p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFileSelect} disabled={excelUploading} className="text-sm" />
          {excelUploading && <div className="text-sm text-muted mt-2">Uploading and parsing...</div>}
          {excelError && <div className="text-sm text-fail bg-fail/10 border border-fail/30 rounded-md p-2 mt-3">{excelError}</div>}
          {excelResult && (
            <div className="mt-3 text-sm">
              <div className="text-pass bg-pass/10 border border-pass/30 rounded-md p-2">
                {excelResult.created} test case{excelResult.created !== 1 ? "s" : ""} created.
              </div>
              {excelResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {excelResult.errors.map((e, i) => (
                    <div key={i} className="text-warn bg-warn/10 border border-warn/30 rounded-md p-2 text-xs font-mono">
                      Row {e.row_number}: {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
>>>>>>> spreadsheet_add_data
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No test cases yet in this suite.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((tc) => (
            <Link
              key={tc.id}
              to={`/test-cases/${tc.id}`}
              className="block bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium group-hover:text-accent transition-colors truncate">
                    {tc.current_version?.title}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {tc.current_version && (
                      <>
                        <PriorityBadge value={tc.current_version.priority} />
                        <SeverityBadge value={tc.current_version.severity} />
                        <StatusBadge value={tc.current_version.status} />
                        {tc.current_version.tags.map((t) => (
                          <span key={t} className="text-[11px] font-mono text-muted">#{t}</span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-muted font-mono">v{tc.current_version?.version_number}</div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(tc.id);
                    }}
                    className="text-muted hover:text-fail text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                  >
                    delete
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
