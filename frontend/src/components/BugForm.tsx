import { useState } from "react";
import { BugStatus, BugStep, Priority, Severity } from "../lib/api";

export interface BugFormValue {
  title: string;
  description: string;
  severity: Severity;
  priority: Priority;
  status: BugStatus;
  environment: string;
  assignee: string;
  custom_fields: Record<string, string>;
  test_case_id: string | null;
  execution_run_id: string | null;
  steps: BugStep[];
}

const defaultValue: BugFormValue = {
  title: "",
  description: "",
  severity: "Major",
  priority: "Medium",
  status: "Open",
  environment: "",
  assignee: "",
  custom_fields: {},
  test_case_id: null,
  execution_run_id: null,
  steps: [],
};

export default function BugForm({
  initial,
  submitLabel,
  testCaseOptions,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<BugFormValue>;
  submitLabel: string;
  testCaseOptions?: { id: string; title: string }[];
  onSubmit: (value: BugFormValue) => Promise<void>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<BugFormValue>({ ...defaultValue, ...initial });
  const [saving, setSaving] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customVal, setCustomVal] = useState("");

  const set = <K extends keyof BugFormValue>(key: K, v: BugFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const addStep = () => set("steps", [...value.steps, { step_number: value.steps.length + 1, description: "" }]);
  const removeStep = (idx: number) =>
    set("steps", value.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));
  const updateStep = (idx: number, description: string) =>
    set("steps", value.steps.map((s, i) => (i === idx ? { ...s, description } : s)));

  const addCustomField = () => {
    if (!customKey.trim()) return;
    set("custom_fields", { ...value.custom_fields, [customKey.trim()]: customVal });
    setCustomKey(""); setCustomVal("");
  };
  const removeCustomField = (key: string) => {
    const next = { ...value.custom_fields };
    delete next[key];
    set("custom_fields", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit(value);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent";
  const labelClass = "block text-xs font-mono text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-panel border border-border rounded-lg p-5">
      <div>
        <label className={labelClass}>Title</label>
        <input autoFocus value={value.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="e.g. Checkout fails with 500 error on promo code" />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputClass} placeholder="What's happening? What did you expect?" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Severity</label>
          <select value={value.severity} onChange={(e) => set("severity", e.target.value as Severity)} className={inputClass}>
            {["Minor", "Major", "Critical", "Blocker"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={value.priority} onChange={(e) => set("priority", e.target.value as Priority)} className={inputClass}>
            {["Low", "Medium", "High", "Critical"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={value.status} onChange={(e) => set("status", e.target.value as BugStatus)} className={inputClass}>
            {["Open", "In Progress", "Resolved", "Closed", "Reopened"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Environment</label>
          <input value={value.environment} onChange={(e) => set("environment", e.target.value)} className={inputClass} placeholder="Chrome 126, macOS, staging build 1.4.2" />
        </div>
        <div>
          <label className={labelClass}>Assignee</label>
          <input value={value.assignee} onChange={(e) => set("assignee", e.target.value)} className={inputClass} placeholder="who's fixing this?" />
        </div>
      </div>

      {testCaseOptions && (
        <div>
          <label className={labelClass}>Linked test case (optional)</label>
          <select value={value.test_case_id || ""} onChange={(e) => set("test_case_id", e.target.value || null)} className={inputClass}>
            <option value="">None</option>
            {testCaseOptions.map((tc) => <option key={tc.id} value={tc.id}>{tc.title}</option>)}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass + " mb-0"}>Steps to reproduce</label>
          <button type="button" onClick={addStep} className="text-xs font-mono text-accent hover:underline">+ add step</button>
        </div>
        <div className="space-y-2">
          {value.steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded bg-panel2 border border-border flex items-center justify-center text-xs font-mono text-muted shrink-0">{step.step_number}</div>
              <input value={step.description} onChange={(e) => updateStep(idx, e.target.value)} className={inputClass} placeholder="e.g. Apply promo code SAVE10 at checkout" />
              <button type="button" onClick={() => removeStep(idx)} className="text-muted hover:text-fail text-xs font-mono shrink-0">remove</button>
            </div>
          ))}
          {value.steps.length === 0 && <div className="text-sm text-muted">No steps added yet.</div>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Custom fields</label>
        <div className="space-y-2 mb-2">
          {Object.entries(value.custom_fields).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm bg-panel2 border border-border rounded-md px-3 py-1.5">
              <span className="font-mono text-accent">{k}:</span>
              <span className="flex-1">{v}</span>
              <button type="button" onClick={() => removeCustomField(k)} className="text-muted hover:text-fail text-xs font-mono">remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="field name" className={inputClass} />
          <input value={customVal} onChange={(e) => setCustomVal(e.target.value)} placeholder="value" className={inputClass} />
          <button type="button" onClick={addCustomField} className="px-3 py-2 rounded-md bg-panel2 border border-border text-sm text-muted hover:text-text shrink-0">Add</button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium">
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
