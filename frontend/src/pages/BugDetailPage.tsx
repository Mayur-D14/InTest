import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, Bug } from "../lib/api";
import { PriorityBadge, SeverityBadge } from "../components/Badges";
import BugForm, { BugFormValue } from "../components/BugForm";

const statusColor: Record<string, string> = {
  Open: "bg-fail/10 text-fail border-fail/30",
  "In Progress": "bg-warn/10 text-warn border-warn/30",
  Resolved: "bg-pass/10 text-pass border-pass/30",
  Closed: "bg-panel2 text-muted border-border",
  Reopened: "bg-fail/20 text-fail border-fail/50",
};

export default function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!bugId) return;
    setLoading(true);
    api.getBug(bugId).then(setBug).finally(() => setLoading(false));
  };

  useEffect(load, [bugId]);

  const handleUpdate = async (value: BugFormValue) => {
    if (!bugId) return;
    await api.updateBug(bugId, value);
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!bugId) return;
    if (!confirm("Delete this bug report permanently?")) return;
    await api.deleteBug(bugId);
    navigate("/bugs");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bugId || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await api.uploadAttachment(bugId, file);
      }
      load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    await api.deleteAttachment(attachmentId);
    load();
  };

  if (loading) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Loading...</div>;
  if (!bug) return <div className="max-w-4xl mx-auto px-8 py-8 text-muted text-sm">Bug not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <Link to="/bugs" className="text-xs font-mono text-muted hover:text-accent">&larr; all bugs</Link>

      {editing ? (
        <div className="mt-4">
          <BugForm
            submitLabel="Save changes"
            initial={{
              title: bug.title,
              description: bug.description,
              severity: bug.severity,
              priority: bug.priority,
              status: bug.status,
              environment: bug.environment,
              assignee: bug.assignee,
              custom_fields: bug.custom_fields,
              test_case_id: bug.test_case_id,
              execution_run_id: bug.execution_run_id,
              steps: bug.steps.map((s) => ({ step_number: s.step_number, description: s.description })),
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mt-4 mb-3 gap-4">
            <h1 className="text-xl font-semibold">{bug.title}</h1>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accentDim text-white text-sm font-medium">Edit</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-fail">Delete</button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${statusColor[bug.status]}`}>{bug.status}</span>
            <SeverityBadge value={bug.severity} />
            <PriorityBadge value={bug.priority} />
            {bug.assignee && <span className="text-[11px] font-mono text-muted">assigned to @{bug.assignee}</span>}
          </div>

          {bug.description && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-1">Description</div>
              <p className="text-sm bg-panel border border-border rounded-lg p-3 whitespace-pre-wrap">{bug.description}</p>
            </div>
          )}

          {bug.environment && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-1">Environment</div>
              <p className="text-sm bg-panel border border-border rounded-lg p-3">{bug.environment}</p>
            </div>
          )}

          {bug.test_case_id && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-1">Linked test case</div>
              <Link to={`/test-cases/${bug.test_case_id}`} className="text-sm text-accent hover:underline">View test case &rarr;</Link>
            </div>
          )}

          {bug.steps.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-2">Steps to reproduce</div>
              <div className="space-y-2">
                {bug.steps.map((s) => (
                  <div key={s.id} className="bg-panel border border-border rounded-lg p-3 flex gap-3 text-sm">
                    <div className="w-6 h-6 rounded bg-panel2 border border-border flex items-center justify-center text-xs font-mono text-muted shrink-0">{s.step_number}</div>
                    <div>{s.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(bug.custom_fields).length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-mono text-muted mb-2">Custom fields</div>
              <div className="space-y-1">
                {Object.entries(bug.custom_fields).map(([k, v]) => (
                  <div key={k} className="text-sm"><span className="font-mono text-accent">{k}:</span> {v}</div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono text-muted">Attachments ({bug.attachments.length})</div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-mono text-accent hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "+ upload"}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            </div>
            {bug.attachments.length === 0 ? (
              <div className="text-sm text-muted">No attachments yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {bug.attachments.map((a) => (
                  <div key={a.id} className="bg-panel border border-border rounded-lg overflow-hidden group relative">
                    {a.content_type.startsWith("image/") ? (
                      <img src={api.attachmentUrl(a.url)} alt={a.filename} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center text-muted text-xs font-mono">{a.filename.split(".").pop()}</div>
                    )}
                    <div className="p-2 text-[11px] font-mono text-muted truncate">{a.filename}</div>
                    <button
                      onClick={() => handleDeleteAttachment(a.id)}
                      className="absolute top-1 right-1 bg-base/80 text-fail text-xs font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
