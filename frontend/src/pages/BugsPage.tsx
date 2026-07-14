import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api, Bug, BugStatus, TestCase, TestSuite } from "../lib/api";
import { PriorityBadge, SeverityBadge } from "../components/Badges";
import BugForm, { BugFormValue } from "../components/BugForm";

const statusColor: Record<BugStatus, string> = {
  Open: "bg-fail/10 text-fail border-fail/30",
  "In Progress": "bg-warn/10 text-warn border-warn/30",
  Resolved: "bg-pass/10 text-pass border-pass/30",
  Closed: "bg-panel2 text-muted border-border",
  Reopened: "bg-fail/20 text-fail border-fail/50",
};

export default function BugsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill as Partial<BugFormValue> | undefined;

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [testCaseOptions, setTestCaseOptions] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!prefill);

  const statusFilter = params.get("status") || "";

  const load = () => {
    setLoading(true);
    Promise.all([api.listBugs(statusFilter || undefined), api.listSuites()])
      .then(async ([bugsRes, suites]) => {
        setBugs(bugsRes);
        const perSuite = await Promise.all(
          suites.map(async (s: TestSuite) => (await api.listTestCases(s.id)).map((c: TestCase) => ({ id: c.id, title: c.current_version?.title || "(untitled)" })))
        );
        setTestCaseOptions(perSuite.flat());
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleCreate = async (value: BugFormValue) => {
    await api.createBug(value);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bug report?")) return;
    await api.deleteBug(id);
    load();
  };

  const filterButtons: (BugStatus | "")[] = ["", "Open", "In Progress", "Resolved", "Closed", "Reopened"];

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Bug Reports</h1>
          <p className="text-sm text-muted mt-1">File manually, or from a failed automation result.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors shrink-0"
        >
          {showForm ? "Cancel" : "+ New Bug"}
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filterButtons.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setParams(s ? { status: s } : {})}
            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              statusFilter === s ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted hover:text-text"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-6">
          <BugForm submitLabel="Create bug" testCaseOptions={testCaseOptions} initial={prefill} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : bugs.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No bug reports {statusFilter ? `with status "${statusFilter}"` : "yet"}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bugs.map((b) => (
            <Link key={b.id} to={`/bugs/${b.id}`} className="block bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium group-hover:text-accent transition-colors truncate">{b.title}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${statusColor[b.status]}`}>{b.status}</span>
                    <SeverityBadge value={b.severity} />
                    <PriorityBadge value={b.priority} />
                    {b.assignee && <span className="text-[11px] font-mono text-muted">@{b.assignee}</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(b.id); }}
                  className="text-muted hover:text-fail text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
