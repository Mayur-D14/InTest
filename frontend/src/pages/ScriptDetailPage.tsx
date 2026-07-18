import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, AutomationScript, EXECUTABLE_LANGUAGES, ExecutionRun, RunStatus, SCRIPT_LANGUAGE_LABELS, TestCase, TestOutcome } from "../lib/api";
import ScriptForm, { ScriptFormValue } from "../components/ScriptForm";

const runStatusColor: Record<RunStatus, string> = {
  queued: "bg-panel2 text-muted border-border",
  running: "bg-info/10 text-info border-info/30",
  passed: "bg-pass/10 text-pass border-pass/30",
  failed: "bg-fail/10 text-fail border-fail/30",
  error: "bg-fail/20 text-fail border-fail/50",
};

const outcomeColor: Record<TestOutcome, string> = {
  passed: "bg-pass/10 text-pass border-pass/30",
  failed: "bg-fail/10 text-fail border-fail/30",
  skipped: "bg-panel2 text-muted border-border",
};

const isActive = (status: RunStatus) => status === "queued" || status === "running";

export default function ScriptDetailPage() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const [script, setScript] = useState<AutomationScript | null>(null);
  const [suiteTestCases, setSuiteTestCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportText, setReportText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!scriptId) return;
    api.getScript(scriptId).then((s) => {
      setScript(s);
      setSelectedTestCaseIds(s.test_cases?.map((tc) => tc.id) || []);
      if (s.test_suite_id) {
        api.listTestCases(s.test_suite_id).then(setSuiteTestCases);
      }
    });
    api.listRuns(scriptId).then(setRuns);
  };

  useEffect(() => {
    if (!scriptId) return;
    setLoading(true);
    load();
    setLoading(false);
  }, [scriptId]);

  useEffect(() => {
    if (!runs.some((r) => isActive(r.status))) return;
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [runs, scriptId]);

  const handleRun = async () => {
    if (!scriptId) return;
    setTriggering(true);
    setError(null);
    try {
      await api.runScript(scriptId);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleUpdate = async (value: ScriptFormValue) => {
    if (!scriptId) return;
    await api.updateScript(scriptId, {
      name: value.name,
      description: value.description,
      language: value.language,
      source_type: value.source_type,
      script_content: value.source_type === "upload" ? value.script_content : undefined,
      git_repo_url: value.source_type === "git" ? value.git_repo_url : undefined,
      git_branch: value.source_type === "git" ? value.git_branch : undefined,
      git_path: value.source_type === "git" ? value.git_path : undefined,
    });
    await api.linkTestCases(scriptId, selectedTestCaseIds);
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!scriptId) return;
    if (!confirm("Delete this script and its run history?")) return;
    await api.deleteScript(scriptId);
    navigate("/scripts");
  };

  const handleFileBug = (testCaseId: string, runId: string, detail: string) => {
    navigate("/bugs", {
      state: {
        prefill: {
          title: `Failed: ${titleFor(testCaseId)}`,
          description: detail || "Automation run failed. See linked run for full logs.",
          test_case_id: testCaseId,
          execution_run_id: runId,
        },
      },
    });
  };

  const toggleReport = async (runId: string) => {
    if (expandedReport === runId) {
      setExpandedReport(null);
      return;
    }
    setExpandedReport(runId);
    if (!reportText[runId]) {
      const text = await api.getRunReport(runId);
      setReportText((prev) => ({ ...prev, [runId]: text }));
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Loading...</div>;
  if (!script) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Script not found.</div>;

  const titleFor = (testCaseId: string) =>
    script.test_cases?.find((tc) => tc.id === testCaseId)?.title || testCaseId.slice(0, 8);

  const canExecute = EXECUTABLE_LANGUAGES.includes(script.language);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <Link to={script.test_suite_id ? `/suites/${script.test_suite_id}/scripts` : "/scripts"} className="text-xs font-mono text-muted hover:text-accent">
        &larr; back to scripts
      </Link>

      {editing ? (
        <div className="mt-4">
          <ScriptForm
            submitLabel="Save changes"
            initial={{
              name: script.name,
              description: script.description,
              language: script.language,
              source_type: script.source_type,
              script_content: script.script_content || "",
              git_repo_url: script.git_repo_url || "",
              git_branch: script.git_branch || "main",
              git_path: script.git_path || "",
            }}
            suiteTestCases={suiteTestCases}
            selectedTestCaseIds={selectedTestCaseIds}
            onSelectedTestCaseIdsChange={setSelectedTestCaseIds}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mt-4 mb-2 gap-4">
            <h1 className="text-xl font-semibold">{script.name}</h1>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text">
                Edit
              </button>
              <button
                onClick={handleRun}
                disabled={triggering}
                className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium"
              >
                {triggering ? "Queuing..." : "▶ Run now"}
              </button>
              <button onClick={handleDelete} className="px-3 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-fail">
                Delete
              </button>
            </div>
          </div>
          {script.description && <p className="text-sm text-muted mb-4">{script.description}</p>}

          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-[11px] font-mono text-muted border border-border rounded px-2 py-0.5">{script.source_type}</span>
            <span className="text-[11px] font-mono text-accent border border-accent/30 bg-accent/10 rounded px-2 py-0.5">{SCRIPT_LANGUAGE_LABELS[script.language]}</span>
            {script.git_repo_url && <span className="text-[11px] font-mono text-muted">{script.git_repo_url} @ {script.git_branch}</span>}
          </div>

          {!canExecute && (
            <div className="mb-6 text-sm text-warn bg-warn/10 border border-warn/30 rounded-md p-3">
              Execution isn't wired up yet for {SCRIPT_LANGUAGE_LABELS[script.language]} — "Run now" will record the attempt but won't actually execute anything until that runner is built.
            </div>
          )}

          {error && <div className="text-fail text-sm mb-4 bg-fail/10 border border-fail/30 rounded-md p-3">{error}</div>}

          <div className="mb-6">
            <div className="text-xs font-mono text-muted mb-2">Linked test cases ({script.test_cases?.length || 0})</div>
            <div className="space-y-1.5">
              {script.test_cases?.map((tc) => (
                <Link key={tc.id} to={`/test-cases/${tc.id}`} className="flex items-center justify-between px-3 py-1.5 rounded bg-panel2 border border-border hover:border-accent/50 hover:text-accent transition-colors text-sm">
                  <span>{tc.title}</span>
                  <span className="text-[10px] font-mono text-muted">{tc.id}</span>
                </Link>
              ))}
              {(!script.test_cases || script.test_cases.length === 0) && (
                <div className="text-sm text-muted">No test cases linked — click Edit to link some.</div>
              )}
            </div>
          </div>

          {script.source_type === "upload" && script.script_content && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-2">Script content</div>
              <pre className="bg-panel border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{script.script_content}</pre>
            </div>
          )}

          <div>
            <div className="text-xs font-mono text-muted mb-2">Run history ({runs.length})</div>
            {runs.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted">No runs yet. Click "Run now" to execute this script.</div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div key={run.id} className="bg-panel border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-panel2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${runStatusColor[run.status]}`}>
                          {run.status}
                        </span>
                        <span className="text-[11px] text-muted font-mono">{new Date(run.started_at).toLocaleString()}</span>
                      </div>
                      <span className="text-[11px] text-muted font-mono">{run.results.length} result{run.results.length !== 1 ? "s" : ""}</span>
                    </button>
                    {expandedRun === run.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {run.error_message && (
                          <div className="text-sm text-fail bg-fail/10 border border-fail/30 rounded-md p-2">{run.error_message}</div>
                        )}
                        {run.results.map((r) => (
                          <div key={r.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <div>{titleFor(r.test_case_id)}</div>
                                <div className="text-[10px] font-mono text-muted">{r.test_case_id}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                {r.outcome === "failed" && (
                                  <button
                                    onClick={() => handleFileBug(r.test_case_id, run.id, r.detail)}
                                    className="text-[11px] font-mono text-fail hover:underline"
                                  >
                                    File bug
                                  </button>
                                )}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${outcomeColor[r.outcome]}`}>
                                  {r.outcome}
                                </span>
                              </div>
                            </div>
                            {r.screenshot_url && (
                              <a href={api.attachmentUrl(r.screenshot_url)} target="_blank" rel="noreferrer">
                                <img src={api.attachmentUrl(r.screenshot_url)} alt="Failure screenshot" className="h-24 rounded border border-border hover:border-accent/50 transition-colors" />
                              </a>
                            )}
                          </div>
                        ))}

                        <div className="flex gap-3 pt-1">
                          <button onClick={() => toggleReport(run.id)} className="text-xs font-mono text-accent hover:underline">
                            {expandedReport === run.id ? "Hide report" : "View report"}
                          </button>
                          <button onClick={() => api.downloadRunReportZip(run.id)} className="text-xs font-mono text-accent hover:underline">
                            Download report (.zip)
                          </button>
                        </div>

                        {expandedReport === run.id && (
                          <pre className="bg-base border border-border rounded-md p-3 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {reportText[run.id] || "Loading..."}
                          </pre>
                        )}

                        {run.raw_logs && (
                          <details>
                            <summary className="text-xs font-mono text-accent cursor-pointer">View raw logs</summary>
                            <pre className="mt-2 bg-base border border-border rounded-md p-3 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">{run.raw_logs}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
