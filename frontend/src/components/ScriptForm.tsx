import { useState } from "react";
import { SCRIPT_LANGUAGE_LABELS, ScriptLanguage, ScriptSourceType, TestCase } from "../lib/api";
import FileDropzone from "./FileDropzone";

export interface ScriptFormValue {
  name: string;
  description: string;
  language: ScriptLanguage;
  source_type: ScriptSourceType;
  script_content: string;
  git_repo_url: string;
  git_branch: string;
  git_path: string;
}

const defaultValue: ScriptFormValue = {
  name: "",
  description: "",
  language: "pytest-python",
  source_type: "upload",
  script_content: SAMPLE_SCRIPT_PLACEHOLDER(),
  git_repo_url: "",
  git_branch: "main",
  git_path: "",
};

function SAMPLE_SCRIPT_PLACEHOLDER() {
  return `import pytest
from sdet_selenium import driver  # noqa: F401

# Replace "PASTE-TEST-CASE-ID" with an ID shown next to a linked test case below
@pytest.mark.test_case("PASTE-TEST-CASE-ID")
def test_example(driver):
    driver.get("https://example.com")
    assert "Example Domain" in driver.title
`;
}

export default function ScriptForm({
  initial,
  submitLabel,
  suiteTestCases,
  selectedTestCaseIds,
  onSelectedTestCaseIdsChange,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ScriptFormValue>;
  submitLabel: string;
  suiteTestCases: TestCase[];
  selectedTestCaseIds: string[];
  onSelectedTestCaseIdsChange: (ids: string[]) => void;
  onSubmit: (value: ScriptFormValue) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<ScriptFormValue>({ ...defaultValue, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ScriptFormValue>(key: K, v: ScriptFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const toggleTestCase = (id: string) =>
    onSelectedTestCaseIdsChange(
      selectedTestCaseIds.includes(id) ? selectedTestCaseIds.filter((x) => x !== id) : [...selectedTestCaseIds, id]
    );

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => set("script_content", String(reader.result || ""));
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await onSubmit(value);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent";
  const labelClass = "block text-xs font-mono text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-panel border border-border rounded-lg p-5">
      {error && <div className="text-sm text-fail bg-fail/10 border border-fail/30 rounded-md p-2">{error}</div>}

      <div>
        <label className={labelClass}>Name</label>
        <input autoFocus value={value.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="e.g. Checkout regression suite" />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Scripting language</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(SCRIPT_LANGUAGE_LABELS) as ScriptLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => set("language", lang)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                value.language === lang ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted hover:text-text"
              }`}
            >
              {SCRIPT_LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
        {value.language !== "pytest-python" && (
          <p className="text-xs text-warn mt-2">
            Execution isn't wired up yet for {SCRIPT_LANGUAGE_LABELS[value.language]} — the script saves fine for organization,
            but "Run now" won't execute it until that runner is built.
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Source</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => set("source_type", "upload")} className={`px-3 py-1.5 rounded-md text-sm border ${value.source_type === "upload" ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted"}`}>Paste / upload code</button>
          <button type="button" onClick={() => set("source_type", "git")} className={`px-3 py-1.5 rounded-md text-sm border ${value.source_type === "git" ? "bg-accent/15 border-accent text-accent" : "bg-panel2 border-border text-muted"}`}>Git repo</button>
        </div>
      </div>

      {value.source_type === "upload" ? (
        <div className="space-y-3">
          <FileDropzone
            accept=".py,.js,.ts,.cs,.java,.txt"
            hint="Or paste code directly into the editor below"
            onFileSelect={handleFileUpload}
          />
          <div>
            <label className={labelClass}>Script content</label>
            <textarea
              value={value.script_content}
              onChange={(e) => set("script_content", e.target.value)}
              rows={12}
              className={inputClass + " font-mono text-xs"}
              spellCheck={false}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className={labelClass}>Git repo URL</label>
            <input value={value.git_repo_url} onChange={(e) => set("git_repo_url", e.target.value)} className={inputClass} placeholder="https://github.com/you/repo.git" />
          </div>
          <div>
            <label className={labelClass}>Branch</label>
            <input value={value.git_branch} onChange={(e) => set("git_branch", e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Path to script in repo</label>
            <input value={value.git_path} onChange={(e) => set("git_path", e.target.value)} className={inputClass} placeholder="tests/test_checkout.py" />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Link test cases from this suite (use @pytest.mark.test_case("id"))</label>
        <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
          {suiteTestCases.length === 0 && <div className="p-3 text-sm text-muted">No test cases in this suite yet — create some first.</div>}
          {suiteTestCases.map((tc) => (
            <label key={tc.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-panel2 cursor-pointer">
              <input type="checkbox" checked={selectedTestCaseIds.includes(tc.id)} onChange={() => toggleTestCase(tc.id)} />
              <span className="flex-1">{tc.current_version?.title}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(tc.id); }}
                className="text-[10px] font-mono text-muted hover:text-accent"
                title="Copy test case ID"
              >
                {tc.id.slice(0, 8)}… ⧉
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium">
          {saving ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text">
          Cancel
        </button>
      </div>
    </form>
  );
}
