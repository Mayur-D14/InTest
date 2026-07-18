import { useState } from "react";
import { Priority, Severity, TestCaseStatus, TestCaseStep } from "../lib/api";

export interface TestCaseFormValue {
  title: string;
  preconditions: string;
  priority: Priority;
  severity: Severity;
  status: TestCaseStatus;
  tags: string[];
  change_summary: string;
  changed_by: string;
  steps: TestCaseStep[];
  description: string;
  test_scripts: string;
  test_data: string;
  expected_result: string;
  actual_result: string;
  linked_script_name?: string | null;
}

const defaultValue: TestCaseFormValue = {
  title: "",
  preconditions: "",
  priority: "Medium",
  severity: "Major",
  status: "Draft",
  tags: [],
  change_summary: "Initial version",
  changed_by: "solo-sdet",
  steps: [{ step_number: 1, action: "", expected_result: "" }],
  description: "",
  test_scripts: "",
  test_data: "",
  expected_result: "",
  actual_result: "",
  linked_script_name: null,
};

export default function TestCaseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<TestCaseFormValue>;
  submitLabel: string;
  onSubmit: (value: TestCaseFormValue) => Promise<void>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<TestCaseFormValue>({ ...defaultValue, ...initial });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof TestCaseFormValue>(key: K, v: TestCaseFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const addStep = () =>
    set("steps", [...value.steps, { step_number: value.steps.length + 1, action: "", expected_result: "" }]);

  const removeStep = (idx: number) =>
    set(
      "steps",
      value.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }))
    );

  const updateStep = (idx: number, field: "action" | "expected_result", v: string) =>
    set("steps", value.steps.map((s, i) => (i === idx ? { ...s, [field]: v } : s)));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !value.tags.includes(t)) set("tags", [...value.tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", value.tags.filter((x) => x !== t));

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

  const inputClass =
    "w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent";
  const labelClass = "block text-xs font-mono text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-panel border border-border rounded-lg p-5">
      <div>
        <label className={labelClass}>Title</label>
        <input autoFocus value={value.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="e.g. User can reset password via email link" />
      </div>

      <div>
        <label className={labelClass}>Preconditions</label>
        <textarea value={value.preconditions} onChange={(e) => set("preconditions", e.target.value)} rows={2} className={inputClass} placeholder="What must be true before this test runs?" />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputClass} placeholder="Short summary of what this test covers" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Priority</label>
          <select value={value.priority} onChange={(e) => set("priority", e.target.value as Priority)} className={inputClass}>
            {["Low", "Medium", "High", "Critical"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Severity</label>
          <select value={value.severity} onChange={(e) => set("severity", e.target.value as Severity)} className={inputClass}>
            {["Minor", "Major", "Critical", "Blocker"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={value.status} onChange={(e) => set("status", e.target.value as TestCaseStatus)} className={inputClass}>
            {["Draft", "Active", "Deprecated"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {value.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-panel2 border border-border text-xs font-mono">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="text-muted hover:text-fail">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag and press Enter"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass + " mb-0"}>Steps</label>
          <button type="button" onClick={addStep} className="text-xs font-mono text-accent hover:underline">+ add step</button>
        </div>
        <div className="space-y-3">
          {value.steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-panel2 border border-border rounded-md p-3">
              <div className="w-6 h-6 rounded bg-base border border-border flex items-center justify-center text-xs font-mono text-muted shrink-0 mt-1">
                {step.step_number}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={step.action}
                  onChange={(e) => updateStep(idx, "action", e.target.value)}
                  placeholder="Action"
                  className={inputClass}
                />
                <input
                  value={step.expected_result}
                  onChange={(e) => updateStep(idx, "expected_result", e.target.value)}
                  placeholder="Expected result"
                  className={inputClass}
                />
              </div>
              {value.steps.length > 1 && (
                <button type="button" onClick={() => removeStep(idx)} className="text-muted hover:text-fail text-xs font-mono mt-1">
                  remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs font-mono text-muted mb-3">Spreadsheet-style fields (matches Excel import format)</div>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Test Steps</label>
            <textarea value={value.test_scripts} onChange={(e) => set("test_scripts", e.target.value)} rows={3} className={inputClass} placeholder="Free text steps, e.g. 1. Go to login  2. Enter creds  3. Click Sign In" />
          </div>
          <div>
            <label className={labelClass}>Link an automation script (optional)</label>
            <input value={value.linked_script_name || ""} onChange={(e) => set("linked_script_name", e.target.value || null)} className={inputClass} placeholder="Exact script name — leave blank if none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Test Data</label>
              <textarea value={value.test_data} onChange={(e) => set("test_data", e.target.value)} rows={2} className={inputClass} placeholder="Inputs used for this test" />
            </div>
            <div>
              <label className={labelClass}>Expected Result</label>
              <textarea value={value.expected_result} onChange={(e) => set("expected_result", e.target.value)} rows={2} className={inputClass} placeholder="Overall expected outcome" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Actual Result</label>
            <textarea value={value.actual_result} onChange={(e) => set("actual_result", e.target.value)} rows={2} className={inputClass} placeholder="Filled in after execution" />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Change summary (for version history)</label>
        <input value={value.change_summary} onChange={(e) => set("change_summary", e.target.value)} className={inputClass} placeholder="What changed and why?" />
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
