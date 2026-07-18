import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ExcelUploadResult, Priority, Severity, TestCase, TestCaseVersionInput, TestSuite } from "../lib/api";
import { PriorityBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import FileDropzone from "../components/FileDropzone";

function emptyRow(): TestCaseVersionInput {
  return {
    title: "", preconditions: "", priority: "Medium", severity: "Major", status: "Draft",
    tags: [], change_summary: "Added via table", changed_by: "solo-sdet", steps: [],
    description: "", test_scripts: "", test_data: "", expected_result: "", actual_result: "",
    linked_script_name: null,
  };
}

export default function TestCasesPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [newRows, setNewRows] = useState<TestCaseVersionInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelUploadResult | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);

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

  const addBlankRow = () => setNewRows((prev) => [...prev, emptyRow()]);
  const discardRow = (idx: number) => setNewRows((prev) => prev.filter((_, i) => i !== idx));
  const updateNewRow = (idx: number, field: keyof TestCaseVersionInput, value: string) =>
    setNewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const handleSaveNewRows = async () => {
    if (!suiteId) return;
    const validRows = newRows.filter((r) => r.title.trim());
    if (validRows.length === 0) return;
    setSavingRows(true);
    try {
      await api.bulkCreateTestCases(suiteId, validRows);
      setNewRows([]);
      load();
    } finally {
      setSavingRows(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test case?")) return;
    await api.deleteTestCase(id);
    load();
  };

  const handleExcelFile = async (file: File) => {
    if (!suiteId) return;
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
    }
  };

  const cellInput = "w-full bg-transparent text-sm px-2 py-1.5 outline-none focus:bg-panel2 rounded";
  const cellSelect = "w-full bg-transparent text-sm px-1 py-1.5 outline-none focus:bg-panel2 rounded";
  const thClass = "text-left text-[11px] font-mono text-muted px-3 py-2 whitespace-nowrap";

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-4">
        <Link to="/suites" className="text-xs font-mono text-muted hover:text-accent">&larr; all suites</Link>
        <div className="flex items-start justify-between mt-1 gap-4">
          <div>
            <h1 className="text-xl font-semibold">{suite?.name || "Test Cases"}</h1>
            {suite?.description && <p className="text-sm text-muted mt-1">{suite.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end items-start">
            {suiteId && (
              <Link to={`/suites/${suiteId}/scripts`} className="px-3 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text transition-colors">
                ⚙ Scripts
              </Link>
            )}
            <button onClick={addBlankRow} className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors">
              + New Test Case
            </button>
            <button
              onClick={() => setShowExcel((s) => !s)}
              className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                showExcel ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted hover:text-text"
              }`}
            >
              ⇪ Upload Excel
            </button>
          </div>
        </div>
      </div>

      {showExcel && (
        <div className="mb-6 bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Upload test cases from Excel</div>
            <button onClick={() => api.downloadExcelTemplate()} className="text-xs font-mono text-accent hover:underline">
              Download template
            </button>
          </div>
          <p className="text-sm text-muted mb-3">
            Expected columns: <span className="font-mono text-[11px]">Test Title | Description | Priority | Severity | Test Steps | Test Data | Expected Result | Actual Result</span>.
            An optional <span className="font-mono text-[11px]">Linked Script</span> column matches an existing automation script by exact name.
          </p>
          <FileDropzone accept=".xlsx,.xls" hint=".xlsx or .xls, matching the column format above" disabled={excelUploading} onFileSelect={handleExcelFile} />
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
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : cases.length === 0 && newRows.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No test cases yet. Click "+ New Test Case" to add one, or upload an Excel file.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-lg bg-panel">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-panel2 border-b border-border">
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Test Title</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Priority</th>
                  <th className={thClass}>Severity</th>
                  <th className={thClass}>Test Steps</th>
                  <th className={thClass}>Test Data</th>
                  <th className={thClass}>Expected Result</th>
                  <th className={thClass}>Actual Result</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((tc) => {
                  const v = tc.current_version;
                  return (
                    <tr key={tc.id} className="border-b border-border last:border-0 hover:bg-panel2/50 align-top">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(tc.id)}
                          title="Copy full ID"
                          className="text-[10px] font-mono text-muted hover:text-accent"
                        >
                          {tc.id.slice(0, 8)}…
                        </button>
                      </td>
                      <td className="px-3 py-2 min-w-[160px]">
                        <Link to={`/test-cases/${tc.id}`} className="text-sm font-medium hover:text-accent">{v?.title}</Link>
                        {v && (
                          <div className="mt-1"><StatusBadge value={v.status} /></div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-muted min-w-[140px] max-w-[220px]">{v?.description}</td>
                      <td className="px-3 py-2">{v && <PriorityBadge value={v.priority} />}</td>
                      <td className="px-3 py-2">{v && <SeverityBadge value={v.severity} />}</td>
                      <td className="px-3 py-2 text-sm text-muted min-w-[160px] max-w-[240px] whitespace-pre-wrap">{v?.test_scripts}</td>
                      <td className="px-3 py-2 text-sm text-muted min-w-[120px] max-w-[180px]">{v?.test_data}</td>
                      <td className="px-3 py-2 text-sm text-muted min-w-[140px] max-w-[220px]">{v?.expected_result}</td>
                      <td className="px-3 py-2 text-sm text-muted min-w-[120px] max-w-[180px]">{v?.actual_result}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleDelete(tc.id)} className="text-muted hover:text-fail text-xs">×</button>
                      </td>
                    </tr>
                  );
                })}

                {newRows.map((row, idx) => (
                  <tr key={`new-${idx}`} className="border-b border-border last:border-0 bg-accent/5">
                    <td className="px-3 py-2 text-[10px] font-mono text-muted">new</td>
                    <td className="px-2 py-1"><input value={row.title} onChange={(e) => updateNewRow(idx, "title", e.target.value)} className={cellInput} placeholder="Required" /></td>
                    <td className="px-2 py-1"><input value={row.description} onChange={(e) => updateNewRow(idx, "description", e.target.value)} className={cellInput} /></td>
                    <td className="px-2 py-1">
                      <select value={row.priority} onChange={(e) => updateNewRow(idx, "priority", e.target.value as Priority)} className={cellSelect}>
                        {["Low", "Medium", "High", "Critical"].map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={row.severity} onChange={(e) => updateNewRow(idx, "severity", e.target.value as Severity)} className={cellSelect}>
                        {["Minor", "Major", "Critical", "Blocker"].map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input value={row.test_scripts} onChange={(e) => updateNewRow(idx, "test_scripts", e.target.value)} className={cellInput} /></td>
                    <td className="px-2 py-1"><input value={row.test_data} onChange={(e) => updateNewRow(idx, "test_data", e.target.value)} className={cellInput} /></td>
                    <td className="px-2 py-1"><input value={row.expected_result} onChange={(e) => updateNewRow(idx, "expected_result", e.target.value)} className={cellInput} /></td>
                    <td className="px-2 py-1"><input value={row.actual_result} onChange={(e) => updateNewRow(idx, "actual_result", e.target.value)} className={cellInput} /></td>
                    <td className="px-3 py-2">
                      <button onClick={() => discardRow(idx)} className="text-muted hover:text-fail text-xs">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {newRows.length > 0 && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveNewRows}
                disabled={savingRows}
                className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium"
              >
                {savingRows ? "Saving..." : `Save ${newRows.filter((r) => r.title.trim()).length || ""} new row${newRows.filter((r) => r.title.trim()).length === 1 ? "" : "s"}`}
              </button>
              <button onClick={() => setNewRows([])} className="px-4 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text">
                Discard all
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
