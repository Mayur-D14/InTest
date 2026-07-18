import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, AutomationScript, SCRIPT_LANGUAGE_LABELS, TestCase, TestSuite } from "../lib/api";
import ScriptForm, { ScriptFormValue } from "../components/ScriptForm";

export default function SuiteScriptsPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);

  const load = () => {
    if (!suiteId) return;
    setLoading(true);
    Promise.all([api.listSuites(), api.listScripts(suiteId), api.listTestCases(suiteId)])
      .then(([suites, s, tc]) => {
        setSuite(suites.find((x) => x.id === suiteId) || null);
        setScripts(s);
        setTestCases(tc);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [suiteId]);

  const handleCreate = async (value: ScriptFormValue) => {
    if (!suiteId) return;
    await api.createScript({
      test_suite_id: suiteId,
      name: value.name,
      description: value.description,
      language: value.language,
      source_type: value.source_type,
      script_content: value.source_type === "upload" ? value.script_content : undefined,
      git_repo_url: value.source_type === "git" ? value.git_repo_url : undefined,
      git_branch: value.source_type === "git" ? value.git_branch : undefined,
      git_path: value.source_type === "git" ? value.git_path : undefined,
      test_case_ids: selectedTestCaseIds,
    });
    setSelectedTestCaseIds([]);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this automation script and its run history?")) return;
    await api.deleteScript(id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-4">
        <Link to={`/suites/${suiteId}/test-cases`} className="text-xs font-mono text-muted hover:text-accent">&larr; test cases in this suite</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-xl font-semibold">{suite?.name ? `${suite.name} — Scripts` : "Scripts"}</h1>
            <p className="text-sm text-muted mt-1">Automation scripts scoped to this suite. Linking test cases only shows cases from here — no cross-suite mix-ups.</p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors shrink-0"
          >
            {showForm ? "Cancel" : "+ New Script"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ScriptForm
            submitLabel="Create script"
            suiteTestCases={testCases}
            selectedTestCaseIds={selectedTestCaseIds}
            onSelectedTestCaseIdsChange={setSelectedTestCaseIds}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : scripts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No scripts yet in this suite.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((s) => (
            <Link key={s.id} to={`/scripts/${s.id}`} className="flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group">
              <div>
                <div className="font-medium group-hover:text-accent transition-colors">{s.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-muted">{s.source_type === "git" ? "git" : "upload"}</span>
                  <span className="text-[11px] font-mono text-accent">{SCRIPT_LANGUAGE_LABELS[s.language]}</span>
                  <span className="text-[11px] font-mono text-muted">{s.test_cases?.length || 0} linked test case{s.test_cases?.length !== 1 ? "s" : ""}</span>
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
