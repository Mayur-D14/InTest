import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, TestCase, TestSuite } from "../lib/api";
import { PriorityBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import TestCaseForm, { TestCaseFormValue } from "../components/TestCaseForm";

export default function TestCasesPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test case?")) return;
    await api.deleteTestCase(id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/suites" className="text-xs font-mono text-muted hover:text-accent">&larr; all suites</Link>
          <h1 className="text-xl font-semibold mt-1">{suite?.name || "Test Cases"}</h1>
          {suite?.description && <p className="text-sm text-muted mt-1">{suite.description}</p>}
        </div>
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
