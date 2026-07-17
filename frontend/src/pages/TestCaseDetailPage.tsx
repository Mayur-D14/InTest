import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, TestCase, TestCaseVersion } from "../lib/api";
import { PriorityBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import TestCaseForm, { TestCaseFormValue } from "../components/TestCaseForm";

export default function TestCaseDetailPage() {
  const { testCaseId } = useParams<{ testCaseId: string }>();
  const navigate = useNavigate();
  const [tc, setTc] = useState<TestCase | null>(null);
  const [history, setHistory] = useState<TestCaseVersion[]>([]);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!testCaseId) return;
    setLoading(true);
    Promise.all([api.getTestCase(testCaseId), api.getHistory(testCaseId)])
      .then(([t, h]) => {
        setTc(t);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [testCaseId]);

  const handleUpdate = async (value: TestCaseFormValue) => {
    if (!testCaseId) return;
    await api.updateTestCase(testCaseId, { version: value });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!testCaseId) return;
    if (!confirm("Delete this test case permanently?")) return;
    await api.deleteTestCase(testCaseId);
    navigate(-1);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Loading...</div>;
  if (!tc || !tc.current_version) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Test case not found.</div>;

  const v = tc.current_version;

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <Link to={`/suites/${tc.test_suite_id}/test-cases`} className="text-xs font-mono text-muted hover:text-accent">
        &larr; back to suite
      </Link>

      {editing ? (
        <div className="mt-4">
          <TestCaseForm
            submitLabel="Save new version"
            initial={{
              title: v.title,
              preconditions: v.preconditions,
              priority: v.priority,
              severity: v.severity,
              status: v.status,
              tags: v.tags,
              change_summary: "",
              changed_by: v.changed_by,
              steps: v.steps.map((s) => ({ step_number: s.step_number, action: s.action, expected_result: s.expected_result })),
<<<<<<< HEAD
=======
              description: v.description,
              test_scripts: v.test_scripts,
              test_data: v.test_data,
              expected_result: v.expected_result,
              actual_result: v.actual_result,
              linked_script_name: null,
>>>>>>> spreadsheet_add_data
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mt-4 mb-4 gap-4">
            <h1 className="text-xl font-semibold">{v.title}</h1>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">
                Edit
              </button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-fail">
                Delete
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-6">
            <PriorityBadge value={v.priority} />
            <SeverityBadge value={v.severity} />
            <StatusBadge value={v.status} />
            <span className="text-[11px] font-mono text-muted">v{v.version_number}</span>
            {v.tags.map((t) => (
              <span key={t} className="text-[11px] font-mono text-muted">#{t}</span>
            ))}
          </div>

          {v.preconditions && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-1">Preconditions</div>
              <p className="text-sm bg-panel border border-border rounded-lg p-3">{v.preconditions}</p>
            </div>
          )}

<<<<<<< HEAD
=======
          {v.description && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-1">Description</div>
              <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{v.description}</p>
            </div>
          )}

          {(v.test_scripts || v.test_data || v.expected_result || v.actual_result) && (
            <div className="mb-6 space-y-3">
              {v.test_scripts && (
                <div>
                  <div className="text-xs font-mono text-muted mb-1">Test Scripts</div>
                  <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{v.test_scripts}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {v.test_data && (
                  <div>
                    <div className="text-xs font-mono text-muted mb-1">Test Data</div>
                    <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{v.test_data}</p>
                  </div>
                )}
                {v.expected_result && (
                  <div>
                    <div className="text-xs font-mono text-muted mb-1">Expected Result</div>
                    <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{v.expected_result}</p>
                  </div>
                )}
              </div>
              {v.actual_result && (
                <div>
                  <div className="text-xs font-mono text-muted mb-1">Actual Result</div>
                  <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{v.actual_result}</p>
                </div>
              )}
            </div>
          )}

>>>>>>> spreadsheet_add_data
          <div className="mb-6">
            <div className="text-xs font-mono text-muted mb-2">Steps</div>
            <div className="space-y-2">
              {v.steps.map((s) => (
                <div key={s.id} className="bg-panel border border-border rounded-lg p-3 flex gap-3">
                  <div className="w-6 h-6 rounded bg-panel2 border border-border flex items-center justify-center text-xs font-mono text-muted shrink-0">
                    {s.step_number}
                  </div>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted">Action: </span>{s.action}</div>
                    <div><span className="text-muted">Expected: </span>{s.expected_result}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowHistory((s) => !s)}
            className="text-xs font-mono text-accent hover:underline mb-3"
          >
            {showHistory ? "Hide version history" : `View version history (${history.length})`}
          </button>

          {showHistory && (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="bg-panel border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-accent">v{h.version_number}</span>
                    <span className="text-[11px] text-muted font-mono">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1">{h.title}</div>
                  <div className="text-xs text-muted mt-1">{h.change_summary} — by {h.changed_by}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
