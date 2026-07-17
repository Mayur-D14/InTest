import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, Project, TestSuite } from "../lib/api";

export default function SuitesPage() {
  const [params] = useSearchParams();
  const projectIdFilter = params.get("project_id") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState(projectIdFilter);

  const load = () => {
    setLoading(true);
    Promise.all([api.listProjects(), api.listSuites(projectIdFilter || undefined)])
      .then(([p, s]) => {
        setProjects(p);
        setSuites(s);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectIdFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedProject) return;
    await api.createSuite({ project_id: selectedProject, name, description });
    setName("");
    setDescription("");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test suite and all its test cases?")) return;
    await api.deleteSuite(id);
    load();
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || "Unknown project";

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Test Suites</h1>
          <p className="text-sm text-muted mt-1">
            {projectIdFilter ? `Suites in ${projectName(projectIdFilter)}` : "All test suites across projects"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          disabled={projects.length === 0}
          className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ New Suite"}
        </button>
      </div>

      {projects.length === 0 && !loading && (
        <div className="mb-6 text-sm text-muted">
          Create a <Link to="/" className="text-accent hover:underline">project</Link> first before adding test suites.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-panel border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1">Suite name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Login & Authentication"
              className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">
            Create suite
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : suites.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <p className="text-muted text-sm">No test suites yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suites.map((s) => (
            <Link
              key={s.id}
              to={`/suites/${s.id}/test-cases`}
              className="flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors group"
            >
              <div>
                <div className="font-medium group-hover:text-accent transition-colors">{s.name}</div>
                {!projectIdFilter && (
                  <div className="text-[11px] text-muted font-mono mt-0.5">{projectName(s.project_id)}</div>
                )}
                {s.description && <p className="text-sm text-muted mt-1">{s.description}</p>}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(s.id);
                }}
                className="text-muted hover:text-fail text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
