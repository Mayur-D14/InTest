import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, AutomationScript, ScriptSourceType, TestCase, TestSuite } from "../lib/api";

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [allTestCases, setAllTestCases] = useState<(TestCase & { suiteName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<ScriptSourceType>("upload");
  const [scriptContent, setScriptContent] = useState(SAMPLE_SCRIPT);
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [gitPath, setGitPath] = useState("");
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [runAllMessage, setRunAllMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.listScripts(), api.listSuites()])
      .then(async ([scriptsRes, suites]) => {
        setScripts(scriptsRes);
        const perSuite = await Promise.all(
          suites.map(async (s: TestSuite) => {
            const cases = await api.listTestCases(s.id);
            return cases.map((c) => ({ ...c, suiteName: s.name }));
          })
        );
        setAllTestCases(perSuite.flat());
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleTestCase = (id: string) =>
    setSelectedTestCaseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createScript({
      name,
      description,
      source_type: sourceType,
      script_content: sourceType === "upload" ? scriptContent : undefined,
      git_repo_url: sourceType === "git" ? gitRepoUrl : undefined,
      git_branch: sourceType === "git" ? gitBranch : undefined,
      git_path: sourceType === "git" ? gitPath : undefined,
      test_case_ids: selectedTestCaseIds,
    });
    setName(""); setDescription(""); setSelectedTestCaseIds([]);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this automation script and its run history?")) return;
    await api.deleteScript(id);
    load();
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    setRunAllMessage(null);
    try {
      const runs = await api.runAllScripts();
      setRunAllMessage(`Queued ${runs.length} run${runs.length !== 1 ? "s" : ""} — they'll execute concurrently. Open a script to watch its status.`);
    } catch (e: any) {
      setRunAllMessage(e.message);
    } finally {
      setRunningAll(false);
    }
  };

  const inputClass = "w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent";
  const labelClass = "block text-xs font-mono text-muted mb-1";

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Automation Scripts</h1>
          <p className="text-sm text-muted mt-1">Python + pytest + Selenium, executed against the built-in Grid.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleRunAll}
            disabled={runningAll || scripts.length === 0}
            className="px-3 py-2 rounded-md bg-panel2 border border-border hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {runningAll ? "Queuing..." : "▶▶ Run all"}
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors"
          >
            {showForm ? "Cancel" : "+ New Script"}
          </button>
        </div>
      </div>

      {runAllMessage && (
        <div className="mb-6 text-sm bg-info/10 border border-info/30 rounded-md p-3 text-muted">{runAllMessage}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-panel border border-border rounded-lg p-5 space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Checkout regression suite" />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Source</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSourceType("upload")} className={`px-3 py-1.5 rounded-md text-sm border ${sourceType === "upload" ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted"}`}>Paste code</button>
              <button type="button" onClick={() => setSourceType("git")} className={`px-3 py-1.5 rounded-md text-sm border ${sourceType === "git" ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted"}`}>Git repo</button>
            </div>
          </div>

          {sourceType === "upload" ? (
            <div>
              <label className={labelClass}>Script content (pytest + your test functions)</label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={12}
                className={inputClass + " font-mono text-xs"}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className={labelClass}>Git repo URL</label>
                <input value={gitRepoUrl} onChange={(e) => setGitRepoUrl(e.target.value)} className={inputClass} placeholder="https://github.com/you/repo.git" />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <input value={gitBranch} onChange={(e) => setGitBranch(e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Path to script in repo</label>
                <input value={gitPath} onChange={(e) => setGitPath(e.target.value)} className={inputClass} placeholder="tests/test_checkout.py" />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Link test cases (use @pytest.mark.test_case("id") in your script)</label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {allTestCases.length === 0 && <div className="p-3 text-sm text-muted">No test cases yet — create some first.</div>}
              {allTestCases.map((tc) => (
                <label key={tc.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-panel2 cursor-pointer">
                  <input type="checkbox" checked={selectedTestCaseIds.includes(tc.id)} onChange={() => toggleTestCase(tc.id)} />
                  <span className="flex-1">{tc.current_version?.title}</span>
                  <span className="text-[10px] font-mono text-muted">{tc.suiteName}</span>
                  <span className="text-[10px] font-mono text-muted/60">{tc.id.slice(0, 8)}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">
            Create script
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : scripts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No automation scripts yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((s) => (
            <Link key={s.id} to={`/scripts/${s.id}`} className="flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group">
              <div>
                <div className="font-medium group-hover:text-accent transition-colors">{s.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-muted">{s.source_type === "git" ? "git" : "upload"}</span>
                  <span className="text-[11px] font-mono text-muted">{s.language}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(s.id); }}
                className="text-muted hover:text-fail text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
              >
                delete
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const SAMPLE_SCRIPT = `import pytest
from sdet_selenium import driver  # noqa: F401

# Replace "PASTE-TEST-CASE-ID" with the ID shown next to a linked test case below
@pytest.mark.test_case("PASTE-TEST-CASE-ID")
def test_example(driver):
    driver.get("https://example.com")
    assert "Example Domain" in driver.title
`;
