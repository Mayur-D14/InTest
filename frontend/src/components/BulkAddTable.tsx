import { useState } from "react";
import { Priority, Severity, TestCaseVersionInput } from "../lib/api";

type BulkRow = TestCaseVersionInput;

function emptyRow(): BulkRow {
  return {
    title: "",
    preconditions: "",
    priority: "Medium",
    severity: "Major",
    status: "Draft",
    tags: [],
    change_summary: "Bulk added",
    changed_by: "solo-sdet",
    steps: [],
    description: "",
    test_scripts: "",
    test_data: "",
    expected_result: "",
    actual_result: "",
    linked_script_name: null,
  };
}

export default function BulkAddTable({
  onSave,
  onCancel,
}: {
  onSave: (rows: BulkRow[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCell = (idx: number, field: keyof BulkRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setError(null);
    const validRows = rows.filter((r) => r.title.trim());
    if (validRows.length === 0) {
      setError("At least one row needs a Test Title.");
      return;
    }
    setSaving(true);
    try {
      await onSave(validRows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const cellInput = "w-full bg-transparent text-sm px-2 py-1.5 outline-none focus:bg-panel2 rounded";
  const cellSelect = "w-full bg-transparent text-sm px-1 py-1.5 outline-none focus:bg-panel2 rounded";

  const columns: { key: keyof BulkRow; label: string; width: string }[] = [
    { key: "title", label: "Test Title", width: "min-w-[160px]" },
    { key: "description", label: "Description", width: "min-w-[160px]" },
    { key: "priority", label: "Priority", width: "min-w-[100px]" },
    { key: "severity", label: "Severity", width: "min-w-[100px]" },
    { key: "test_scripts", label: "Test Scripts", width: "min-w-[180px]" },
    { key: "test_data", label: "Test Data", width: "min-w-[140px]" },
    { key: "expected_result", label: "Expected Result", width: "min-w-[160px]" },
    { key: "actual_result", label: "Actual Result", width: "min-w-[140px]" },
  ];

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Bulk add test cases</div>
        <button onClick={addRow} className="text-xs font-mono text-accent hover:underline">+ add row</button>
      </div>

      {error && <div className="text-sm text-fail bg-fail/10 border border-fail/30 rounded-md p-2 mb-3">{error}</div>}

      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-panel2 border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className={`text-left text-[11px] font-mono text-muted px-2 py-2 ${col.width}`}>
                  {col.label}{col.key === "title" && <span className="text-fail"> *</span>}
                </th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-border last:border-0 hover:bg-panel2/50">
                <td className={columns[0].width}>
                  <input value={row.title} onChange={(e) => updateCell(idx, "title", e.target.value)} className={cellInput} placeholder="Required" />
                </td>
                <td className={columns[1].width}>
                  <input value={row.description} onChange={(e) => updateCell(idx, "description", e.target.value)} className={cellInput} />
                </td>
                <td className={columns[2].width}>
                  <select value={row.priority} onChange={(e) => updateCell(idx, "priority", e.target.value as Priority)} className={cellSelect}>
                    {["Low", "Medium", "High", "Critical"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className={columns[3].width}>
                  <select value={row.severity} onChange={(e) => updateCell(idx, "severity", e.target.value as Severity)} className={cellSelect}>
                    {["Minor", "Major", "Critical", "Blocker"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className={columns[4].width}>
                  <input value={row.test_scripts} onChange={(e) => updateCell(idx, "test_scripts", e.target.value)} className={cellInput} />
                </td>
                <td className={columns[5].width}>
                  <input value={row.test_data} onChange={(e) => updateCell(idx, "test_data", e.target.value)} className={cellInput} />
                </td>
                <td className={columns[6].width}>
                  <input value={row.expected_result} onChange={(e) => updateCell(idx, "expected_result", e.target.value)} className={cellInput} />
                </td>
                <td className={columns[7].width}>
                  <input value={row.actual_result} onChange={(e) => updateCell(idx, "actual_result", e.target.value)} className={cellInput} />
                </td>
                <td className="text-center">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} className="text-muted hover:text-fail text-xs">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-accent hover:bg-accentDim disabled:opacity-50 text-white text-sm font-medium"
        >
          {saving ? "Saving..." : `Save ${rows.filter((r) => r.title.trim()).length || ""} test case${rows.filter((r) => r.title.trim()).length === 1 ? "" : "s"}`}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-md bg-panel2 border border-border text-sm font-medium text-muted hover:text-text">
          Cancel
        </button>
      </div>
    </div>
  );
}
