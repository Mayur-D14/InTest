import { useRef, useState } from "react";

export default function FileDropzone({
  accept,
  onFileSelect,
  disabled,
  hint,
}: {
  accept: string;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setFileName(files[0].name);
    onFileSelect(files[0]);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed border-border" :
        dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-panel2"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-panel2 border border-border flex items-center justify-center text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        {fileName ? (
          <div className="text-sm text-text font-medium">{fileName}</div>
        ) : (
          <>
            <div className="text-sm text-text">Click to upload or drag and drop</div>
            <div className="text-xs text-muted">{hint}</div>
          </>
        )}
      </div>
    </div>
  );
}
