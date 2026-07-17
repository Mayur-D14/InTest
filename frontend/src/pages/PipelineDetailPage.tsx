import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ExecutionRun, Pipeline, RunStatus, TestOutcome } from "../lib/api";

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

export default function PipelineDetailPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const load = () => {
    if (!pipelineId) return;
    setLoading(true);
    Promise.all([api.getPipeline(pipelineId), api.listPipelineRuns(pipelineId)])
      .then(([p, r]) => { setPipeline(p); setRuns(r); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [pipelineId]);

  const handleSync = async () => {
    if (!pipelineId) return;
    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const result = await api.syncPipeline(pipelineId);
      setSyncMessage(result.message);
      load();
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Loading...</div>;
  if (!pipeline) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Pipeline not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <Link to="/pipelines" className="text-xs font-mono text-muted hover:text-accent">&larr; all pipelines</Link>

      <div className="flex items-start justify-between mt-4 mb-2 gap-4">
        <h1 className="text-xl font-semibold">{pipeline.name}</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium shrink-0"
        >
          {syncing ? "Syncing..." : "⟳ Sync now"}
        </button>
      </div>

      <div className="text-[11px] text-muted font-mono mb-4">
        {pipeline.github_repo} · {pipeline.workflow_file} · branch: {pipeline.branch}
      </div>

      {syncMessage && <div className="text-sm text-pass bg-pass/10 border border-pass/30 rounded-md p-3 mb-4">{syncMessage}</div>}
      {syncError && <div className="text-sm text-fail bg-fail/10 border border-fail/30 rounded-md p-3 mb-4">{syncError}</div>}

      <div>
        <div className="text-xs font-mono text-muted mb-2">Imported runs ({runs.length})</div>
        {runs.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted">
            No runs imported yet. Click "Sync now" after your GitHub Actions workflow has completed at least once.
          </div>
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
                    {run.external_run_url && (
                      <a
                        href={run.external_run_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-mono text-accent hover:underline"
                      >
                        view on GitHub &rarr;
                      </a>
                    )}
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
                        <Link to={`/test-cases/${r.test_case_id}`} className="hover:text-accent">{r.test_case_id.slice(0, 8)}...</Link>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${outcomeColor[r.outcome]}`}>
                          {r.outcome}
                        </span>
                      </div>
                    ))}
                    {run.raw_logs && <div className="text-xs text-muted font-mono">{run.raw_logs}</div>}
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
