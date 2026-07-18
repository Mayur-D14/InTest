import { NavLink, Route, Routes } from "react-router-dom";
import ProjectsPage from "./pages/ProjectsPage";
import SuitesPage from "./pages/SuitesPage";
import TestCasesPage from "./pages/TestCasesPage";
import TestCaseDetailPage from "./pages/TestCaseDetailPage";
import ScriptsIndexPage from "./pages/ScriptsIndexPage";
import SuiteScriptsPage from "./pages/SuiteScriptsPage";
import ScriptDetailPage from "./pages/ScriptDetailPage";
import BugsPage from "./pages/BugsPage";
import BugDetailPage from "./pages/BugDetailPage";
import PipelinesPage from "./pages/PipelinesPage";
import PipelineDetailPage from "./pages/PipelineDetailPage";

function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text hover:bg-panel2"
    }`;

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-panel h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-accent/15 border border-accent/30 flex items-center justify-center">
            <span className="text-accent font-mono text-xs font-bold">SD</span>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">SDET Platform</div>
            <div className="text-[10px] text-muted font-mono">v1.0 · local</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-muted font-mono">Test Management</div>
        <NavLink to="/" end className={linkClass}>Projects</NavLink>
        <NavLink to="/suites" className={linkClass}>Test Suites</NavLink>

        <div className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-wider text-muted font-mono">Automation</div>
        <NavLink to="/scripts" className={linkClass}>All Scripts</NavLink>

        <div className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-wider text-muted font-mono">Quality</div>
        <NavLink to="/bugs" className={linkClass}>Bug Reports</NavLink>

        <div className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-wider text-muted font-mono">CI/CD</div>
        <NavLink to="/pipelines" className={linkClass}>Pipelines</NavLink>
      </nav>
      <div className="px-4 py-3 border-t border-border text-[11px] text-muted font-mono">
        solo-sdet · localhost
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="flex bg-base min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/suites" element={<SuitesPage />} />
          <Route path="/suites/:suiteId/test-cases" element={<TestCasesPage />} />
          <Route path="/suites/:suiteId/scripts" element={<SuiteScriptsPage />} />
          <Route path="/test-cases/:testCaseId" element={<TestCaseDetailPage />} />
          <Route path="/scripts" element={<ScriptsIndexPage />} />
          <Route path="/scripts/:scriptId" element={<ScriptDetailPage />} />
          <Route path="/bugs" element={<BugsPage />} />
          <Route path="/bugs/:bugId" element={<BugDetailPage />} />
          <Route path="/pipelines" element={<PipelinesPage />} />
          <Route path="/pipelines/:pipelineId" element={<PipelineDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
