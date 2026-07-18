import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, AutomationScript, Project, SCRIPT_LANGUAGE_LABELS, TestSuite } from "../lib/api";

interface SuiteGroup {
  suite: TestSuite;
  projectName: string;
  scripts: AutomationScript[];
}

export default function ScriptsIndexPage() {
  const [groups, setGroups] = useState<SuiteGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listProjects(), api.listSuites(), api.listScripts()])
      .then(([projects, suites, scripts]) => {
        const projectName = (id: string) => projects.find((p: Project) => p.id === id)?.name || "Unknown project";
        const bySuite = new Map<string, AutomationScript[]>();
        for (const s of scripts) {
          if (!s.test_suite_id) continue;
          if (!bySuite.has(s.test_suite_id)) bySuite.set(s.test_suite_id, []);
          bySuite.get(s.test_suite_id)!.push(s);
        }
        const result: SuiteGroup[] = suites
          .filter((s: TestSuite) => bySuite.has(s.id))
          .map((s: TestSuite) => ({ suite: s, projectName: projectName(s.project_id), scripts: bySuite.get(s.id)! }));
        setGroups(result);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">All Scripts</h1>
        <p className="text-sm text-muted mt-1">
          Browse across every suite. To create a new script, open a suite's Scripts tab —
          scripts always belong to a suite so linking test cases never gets ambiguous.
        </p>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No scripts yet anywhere. Go to a Test Suite and open its Scripts tab to create one.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ suite, projectName, scripts }) => (
            <div key={suite.id}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-mono text-muted">{projectName}</span>
                  <span className="text-[11px] font-mono text-muted"> / </span>
                  <Link to={`/suites/${suite.id}/scripts`} className="text-sm font-medium hover:text-accent">{suite.name}</Link>
                </div>
                <Link to={`/suites/${suite.id}/scripts`} className="text-[11px] font-mono text-accent hover:underline">open suite &rarr;</Link>
              </div>
              <div className="space-y-2">
                {scripts.map((s) => (
                  <Link key={s.id} to={`/scripts/${s.id}`} className="flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group">
                    <div className="font-medium group-hover:text-accent transition-colors">{s.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-accent">{SCRIPT_LANGUAGE_LABELS[s.language]}</span>
                      <span className="text-[11px] font-mono text-muted">{s.test_cases?.length || 0} test cases</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
