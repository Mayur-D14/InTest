import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, AutomationScript, ExecutionRun, RunStatus, TestOutcome } from "../lib/api";

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
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!scriptId) return;
    Promise.all([api.getScript(scriptId), api.listRuns(scriptId)]).then(([s, r]) => {
      setScript(s);
      setRuns(r);
    });
  };

  useEffect(() => {
    if (!scriptId) return;
    setLoading(true);
    load();
    setLoading(false);
  }, [scriptId]);

  // Poll while any run is still queued/running — this is how the dashboard reflects
  // work happening asynchronously on the Celery worker instead of blocking the UI.
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

  if (loading) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Loading...</div>;
  if (!script) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Script not found.</div>;

  const titleFor = (testCaseId: string) =>
    script.test_cases?.find((tc) => tc.id === testCaseId)?.title || testCaseId.slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <Link to="/scripts" className="text-xs font-mono text-muted hover:text-accent">&larr; all scripts</Link>

      <div className="flex items-start justify-between mt-4 mb-2 gap-4">
        <h1 className="text-xl font-semibold">{script.name}</h1>
        <button
          onClick={handleRun}
          disabled={triggering}
          className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium shrink-0"
        >
          {triggering ? "Queuing..." : "▶ Run now"}
        </button>
      </div>
      {script.description && <p className="text-sm text-muted mb-4">{script.description}</p>}

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-[11px] font-mono text-muted border border-border rounded px-2 py-0.5">{script.source_type}</span>
        <span className="text-[11px] font-mono text-muted border border-border rounded px-2 py-0.5">{script.language}</span>
        {script.git_repo_url && <span className="text-[11px] font-mono text-muted">{script.git_repo_url} @ {script.git_branch}</span>}
      </div>

      {error && <div className="text-fail text-sm mb-4 bg-fail/10 border border-fail/30 rounded-md p-3">{error}</div>}

      <div className="mb-6">
        <div className="text-xs font-mono text-muted mb-2">Linked test cases ({script.test_cases?.length || 0})</div>
        <div className="flex flex-wrap gap-2">
          {script.test_cases?.map((tc) => (
            <Link key={tc.id} to={`/test-cases/${tc.id}`} className="text-xs font-mono px-2 py-1 rounded bg-panel2 border border-border hover:border-accent/50 hover:text-accent transition-colors">
              {tc.title}
            </Link>
          ))}
          {(!script.test_cases || script.test_cases.length === 0) && (
            <div className="text-sm text-muted">No test cases linked — go to Test Suites and link this script, or recreate it with linked cases.</div>
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
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span>{titleFor(r.test_case_id)}</span>
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
                    ))}
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
    </div>
  );
}
