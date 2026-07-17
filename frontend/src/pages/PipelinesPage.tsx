import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Pipeline } from "../lib/api";

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [workflowFile, setWorkflowFile] = useState("sdet-tests.yml");
  const [branch, setBranch] = useState("main");

  const load = () => {
    setLoading(true);
    api.listPipelines().then(setPipelines).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !githubRepo.trim() || !workflowFile.trim()) return;
    await api.createPipeline({ name, github_repo: githubRepo, workflow_file: workflowFile, branch });
    setName(""); setGithubRepo(""); setWorkflowFile("sdet-tests.yml"); setBranch("main");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this pipeline and its imported run history?")) return;
    await api.deletePipeline(id);
    load();
  };

  const inputClass = "w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent";
  const labelClass = "block text-xs font-mono text-muted mb-1";

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">CI/CD Pipelines</h1>
          <p className="text-sm text-muted mt-1">Pulls results from GitHub Actions workflow runs — push, PR, schedule, or manual dispatch, all covered.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors shrink-0"
        >
          {showForm ? "Cancel" : "+ New Pipeline"}
        </button>
      </div>

      <div className="mb-6 bg-info/10 border border-info/30 rounded-lg p-3 text-sm text-muted">
        Your GitHub Actions workflow needs to run pytest with the same reporting contract as local scripts,
        then upload the results file as an artifact named <code className="font-mono text-info">sdet-results</code>.
        A ready-to-copy workflow file and setup notes are in <code className="font-mono text-info">ci-integration/</code> in this project.
        You'll also need a <code className="font-mono text-info">GITHUB_TOKEN</code> set in a <code className="font-mono text-info">.env</code> file
        next to <code className="font-mono text-info">docker-compose.yml</code> (see <code className="font-mono text-info">.env.example</code>).
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-panel border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className={labelClass}>Pipeline name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Main regression CI" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>GitHub repo (owner/repo)</label>
              <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className={inputClass} placeholder="yourname/your-repo" />
            </div>
            <div>
              <label className={labelClass}>Branch</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Workflow filename</label>
            <input value={workflowFile} onChange={(e) => setWorkflowFile(e.target.value)} className={inputClass} placeholder="sdet-tests.yml" />
          </div>
          <button type="submit" className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">
            Create pipeline
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : pipelines.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No pipelines yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pipelines.map((p) => (
            <Link key={p.id} to={`/pipelines/${p.id}`} className="flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group">
              <div>
                <div className="font-medium group-hover:text-accent transition-colors">{p.name}</div>
                <div className="text-[11px] text-muted font-mono mt-1">{p.github_repo} · {p.workflow_file} · {p.branch}</div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(p.id); }}
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
