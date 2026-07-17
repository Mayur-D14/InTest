import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Project } from "../lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.listProjects().then(setProjects).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createProject({ name, description });
    setName("");
    setDescription("");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its suites/test cases?")) return;
    await api.deleteProject(id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted mt-1">Top-level containers for your test suites.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-panel border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile Banking App"
              className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project testing?"
              rows={2}
              className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">
            Create project
          </button>
        </form>
      )}

      {error && <div className="text-fail text-sm mb-4">{error}</div>}
      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/suites?project_id=${p.id}`}
              className="block bg-panel border border-border rounded-lg p-4 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-text group-hover:text-accent transition-colors">{p.name}</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(p.id);
                  }}
                  className="text-muted hover:text-fail text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  delete
                </button>
              </div>
              {p.description && <p className="text-sm text-muted mt-1 line-clamp-2">{p.description}</p>}
              <div className="text-[11px] text-muted font-mono mt-3">
                created {new Date(p.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-lg p-10 text-center">
      <p className="text-muted text-sm">No projects yet. Create your first project to start organizing test suites.</p>
    </div>
  );
}
