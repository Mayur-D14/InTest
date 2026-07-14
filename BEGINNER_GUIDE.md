# SDET Platform - Beginner's Guide to Project Structure

## 🎯 What is this project?

This is a **Software Development Engineer in Test (SDET) Platform** - a local-first testing platform built with Docker that helps you:
- Manage test cases (Projects → Test Suites → Test Cases)
- Run automated test scripts (Python/pytest/Selenium)
- Track bug reports
- Integrate with GitHub Actions for CI/CD
- Execute tests in parallel

---

## 🏗️ High-Level Architecture

The project follows a **classic 3-tier architecture**:

```
┌─────────────────┐
│   Frontend      │  (React + TypeScript + Vite)
│   (User UI)     │  Port: 5173
└────────┬────────┘
         │ HTTP API calls
         ↓
┌─────────────────┐
│   Backend       │  (FastAPI + Python)
│   (API Server)  │  Port: 8000
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Database      │  (PostgreSQL)
│   (Data Store)  │  Port: 5432
└─────────────────┘
```

**Additional Services:**
- **Runner Service** (FastAPI) - Executes test scripts
- **Selenium Grid** - Runs browser automation
- **Redis** - Message broker for parallel execution
- **Celery Worker** - Background task processor

---

## 📁 Complete Project Structure

```
sdet-platform/
├── docker-compose.yml          # 🚀 START HERE - Orchestrates all services
├── .env.example                # Environment variables template
├── README.md                   # Main project documentation
│
├── backend/                    # 🐍 Python Backend (FastAPI)
│   ├── Dockerfile              # Builds backend container
│   ├── requirements.txt        # Python dependencies
│   └── app/
│       ├── main.py             # ⚡ ENTRY POINT - FastAPI app initialization
│       ├── database.py         # Database connection setup
│       ├── models.py           # 📊 Database models (tables structure)
│       ├── schemas.py          # 🔄 API request/response models
│       ├── crud.py             # 📝 Database operations (CRUD)
│       ├── celery_app.py       # Celery configuration for background tasks
│       ├── tasks.py            # Celery task definitions
│       ├── execution.py        # Test execution logic
│       ├── github_integration.py # GitHub Actions integration
│       ├── seed.py             # Sample data generator
│       └── routers/            # 🛣️ API route handlers
│           ├── projects.py     # Project endpoints
│           ├── suites.py       # Test suite endpoints
│           ├── testcases.py    # Test case endpoints
│           ├── scripts.py      # Automation script endpoints
│           ├── bugs.py         # Bug report endpoints
│           ├── pipelines.py    # CI/CD pipeline endpoints
│           └── runs.py         # Execution run endpoints
│
├── frontend/                   # ⚛️ React Frontend
│   ├── Dockerfile              # Builds frontend container
│   ├── package.json            # Node.js dependencies
│   └── src/
│       ├── main.tsx            # ⚡ ENTRY POINT - React app initialization
│       ├── App.tsx             # 🎨 Main app component with routing
│       ├── index.css           # Global styles (Tailwind CSS)
│       ├── pages/              # 📄 Page components
│       │   ├── ProjectsPage.tsx
│       │   ├── SuitesPage.tsx
│       │   ├── TestCasesPage.tsx
│       │   ├── TestCaseDetailPage.tsx
│       │   ├── ScriptsPage.tsx
│       │   ├── ScriptDetailPage.tsx
│       │   ├── BugsPage.tsx
│       │   ├── BugDetailPage.tsx
│       │   ├── PipelinesPage.tsx
│       │   └── PipelineDetailPage.tsx
│       ├── components/         # 🧩 Reusable UI components
│       │   ├── TestCaseForm.tsx
│       │   ├── BugForm.tsx
│       │   └── Badges.tsx
│       └── lib/
│           └── api.ts          # 🌐 API client functions
│
├── runner/                     # 🏃 Test Execution Service
│   ├── Dockerfile              # Builds runner container
│   ├── requirements.txt        # Python dependencies
│   ├── app.py                  # ⚡ ENTRY POINT - FastAPI runner agent
│   └── templates/
│       ├── conftest_template.py # Pytest configuration for test reporting
│       └── sdet_selenium.py     # Selenium WebDriver fixture
│
└── ci-integration/             # 🔗 GitHub Actions Integration
    ├── sdet-tests.yml          # GitHub Actions workflow template
    └── README.md               # CI/CD setup guide
```

---

## 🔄 How the Application Starts (Step-by-Step)

### 1. **Docker Compose Orchestration** (`docker-compose.yml`)

When you run `docker compose up --build`, here's what happens:

#### **Phase 1: Infrastructure Services Start First**
```
postgres → redis → selenium-hub → chrome-node
```

- **PostgreSQL**: Database starts, creates tables on first run
- **Redis**: Message broker for Celery tasks
- **Selenium Hub**: Central hub for browser automation
- **Chrome Node**: Browser instances for running tests

#### **Phase 2: Application Services Start**
```
runner → backend → worker → frontend
```

Each service depends on the previous ones being ready.

---

### 2. **Backend Startup Sequence** (`backend/app/main.py`)

```python
# File: backend/app/main.py

# Step 1: Import dependencies
from app.database import Base, engine, SessionLocal
from app.routers import projects, suites, testcases, scripts, bugs, pipelines, runs

# Step 2: Create FastAPI app
app = FastAPI(title="SDET Platform API", version="0.1.0")

# Step 3: Add CORS middleware (allows frontend to call backend)
app.add_middleware(CORSMiddleware, ...)

# Step 4: Register API routes (endpoints)
app.include_router(projects.router)    # /api/projects
app.include_router(suites.router)      # /api/suites
app.include_router(testcases.router)   # /api/testcases
app.include_router(scripts.router)     # /api/scripts
app.include_router(bugs.router)        # /api/bugs
app.include_router(pipelines.router)   # /api/pipelines
app.include_router(runs.router)        # /api/runs

# Step 5: Mount static files for bug attachments
app.mount("/attachments", StaticFiles(directory=ATTACHMENTS_DIR), ...)

# Step 6: Startup event - Create database tables & seed data
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)  # Creates all tables
    if os.getenv("SEED_ON_START") == "true":
        seed_if_empty(db)  # Adds sample data
```

**Key Files Loaded:**
- `database.py` → Database connection
- `models.py` → Table definitions (Project, TestSuite, TestCase, etc.)
- `routers/*.py` → API endpoints
- `crud.py` → Database operations
- `schemas.py` → API data validation

---

### 3. **Frontend Startup Sequence** (`frontend/src/main.tsx`)

```typescript
// File: frontend/src/main.tsx

// Step 1: Import React and routing
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Step 2: Mount React app to DOM
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>  {/* Enables URL-based routing */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Key Files Loaded:**
- `App.tsx` → Main app with sidebar and routes
- `pages/*.tsx` → Individual page components
- `lib/api.ts` → API client for backend communication
- `components/*.tsx` → Reusable UI components

---

### 4. **Runner Service Startup** (`runner/app.py`)

```python
# File: runner/app.py

# Step 1: Create FastAPI app
app = FastAPI(title="SDET Runner Agent")

# Step 2: Define endpoints
@app.post("/execute")  # Called by backend to run tests
def execute(req: ExecuteRequest):
    # Injects conftest.py and sdet_selenium.py
    # Runs pytest with the test script
    # Returns results and logs
```

---

## 🔗 File Inter-Relationships

### **Backend Data Flow**

```
User Request (HTTP)
    ↓
main.py (FastAPI app)
    ↓
routers/*.py (Route handler)
    ↓
schemas.py (Validate request/response)
    ↓
crud.py (Database operation)
    ↓
models.py (Database table structure)
    ↓
database.py (PostgreSQL connection)
```

**Example: Creating a Project**

1. **Frontend** (`pages/ProjectsPage.tsx`) → User clicks "Create Project"
2. **API Client** (`lib/api.ts`) → `POST /api/projects`
3. **Backend Router** (`routers/projects.py`) → Receives request
4. **Schema** (`schemas.py`) → Validates project data
5. **CRUD** (`crud.py`) → `create_project(db, project_data)`
6. **Model** (`models.py`) → `Project` table row created
7. **Database** (`database.py`) → PostgreSQL saves the data

---

### **Frontend Component Hierarchy**

```
App.tsx (Main Layout)
├── Sidebar (Navigation)
└── Routes (Page Components)
    ├── ProjectsPage
    ├── SuitesPage
    ├── TestCasesPage
    ├── TestCaseDetailPage
    ├── ScriptsPage
    ├── ScriptDetailPage
    ├── BugsPage
    ├── BugDetailPage
    ├── PipelinesPage
    └── PipelineDetailPage
```

**Component Communication:**
- Pages use `lib/api.ts` to call backend
- Pages use `components/` for reusable UI elements
- Navigation handled by React Router in `App.tsx`

---

### **Test Execution Flow**

```
User clicks "Run Script" (ScriptDetailPage)
    ↓
Frontend: POST /api/scripts/{id}/run
    ↓
Backend: scripts.py router
    ↓
Backend: execution.py → enqueue_run()
    ↓
Celery: tasks.py → execute_run_task()
    ↓
Backend: HTTP POST to runner /execute
    ↓
Runner: app.py → Runs pytest
    ↓
Runner: Injects conftest_template.py + sdet_selenium.py
    ↓
Selenium: Executes browser automation
    ↓
Runner: Returns results.json + logs
    ↓
Backend: Saves ExecutionResult to database
    ↓
Frontend: Polls for status updates
```

---

## 📊 Database Models (Data Structure)

### **Core Tables** (defined in `backend/app/models.py`)

1. **Project** → Top-level container
2. **TestSuite** → Belongs to a Project
3. **TestCase** → Belongs to a TestSuite
4. **TestCaseVersion** → Version history for test cases
5. **TestCaseStep** → Individual steps in a test case
6. **AutomationScript** → Python/pytest scripts
7. **Pipeline** → CI/CD pipeline configuration
8. **ExecutionRun** → Test execution record
9. **ExecutionResult** → Per-test-case results
10. **Bug** → Bug reports
11. **BugStep** → Steps to reproduce bugs
12. **BugAttachment** → File attachments for bugs

**Relationships:**
```
Project (1) ───< (many) TestSuite (1) ───< (many) TestCase
TestCase (1) ───< (many) TestCaseVersion
TestCase (1) ───< (many) TestCaseStep
AutomationScript (1) ───< (many) ExecutionRun
ExecutionRun (1) ───< (many) ExecutionResult
Bug (1) ───< (many) BugStep
Bug (1) ───< (many) BugAttachment
```

---

## 🛠️ Technology Stack

### **Backend**
- **FastAPI** → Modern Python web framework
- **SQLAlchemy** → ORM for database operations
- **PostgreSQL** → Relational database
- **Pydantic** → Data validation
- **Celery** → Background task processing
- **Redis** → Message broker
- **Uvicorn** → ASGI server

### **Frontend**
- **React** → UI library
- **TypeScript** → Type-safe JavaScript
- **Vite** → Build tool and dev server
- **React Router** → Client-side routing
- **Tailwind CSS** → Utility-first CSS framework

### **Infrastructure**
- **Docker** → Containerization
- **Docker Compose** → Multi-container orchestration
- **Selenium Grid** → Browser automation
- **pytest** → Python testing framework

---

## 🚀 How to Run the Project

### **Prerequisites**
- Docker Desktop installed and running

### **Start the Application**
```bash
cd sdet-platform
docker compose up --build
```

### **Access Points**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Selenium Grid**: http://localhost:4444

---

## 📝 Key Files to Understand First

### **If you want to understand the backend:**
1. `docker-compose.yml` → See how services connect
2. `backend/app/main.py` → Backend entry point
3. `backend/app/models.py` → Database structure
4. `backend/app/routers/projects.py` → Simple API example
5. `backend/app/crud.py` → Database operations

### **If you want to understand the frontend:**
1. `frontend/src/main.tsx` → Frontend entry point
2. `frontend/src/App.tsx` → Routing and layout
3. `frontend/src/lib/api.ts` → How frontend calls backend
4. `frontend/src/pages/ProjectsPage.tsx` → Simple page example

### **If you want to understand test execution:**
1. `runner/app.py` → How tests are executed
2. `runner/templates/conftest_template.py` → Test reporting
3. `runner/templates/sdet_selenium.py` → Selenium setup
4. `backend/app/execution.py` → Execution orchestration

---

## 🎓 Learning Path for Beginners

### **Step 1: Understand Docker**
- Learn what containers are
- Understand `docker-compose.yml` service definitions
- See how volumes and networks work

### **Step 2: Backend Basics**
- FastAPI basics (routes, dependencies)
- SQLAlchemy ORM (models, sessions)
- Pydantic schemas (validation)
- REST API concepts

### **Step 3: Frontend Basics**
- React components and props
- React Router navigation
- TypeScript types
- Fetch API for HTTP requests

### **Step 4: Integration**
- How frontend calls backend via HTTP
- How backend stores data in PostgreSQL
- How runner executes tests
- How Celery handles background tasks

---

## 🔍 Common Patterns in the Codebase

### **Backend API Endpoint Pattern**
```python
# File: backend/app/routers/projects.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ProjectCreate, ProjectResponse
from app.crud import create_project, get_projects

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
def create_project_endpoint(
    project: ProjectCreate,
    db: Session = Depends(get_db)  # Dependency injection
):
    return create_project(db, project)

@router.get("/", response_model=list[ProjectResponse])
def get_projects_endpoint(db: Session = Depends(get_db)):
    return get_projects(db)
```

### **Frontend Page Pattern**
```typescript
// File: frontend/src/pages/ProjectsPage.tsx

import { useState, useEffect } from "react";
import { getProjects, type Project } from "../lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Projects</h1>
      {projects.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

---

## 📚 Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **Docker Docs**: https://docs.docker.com/
- **pytest Docs**: https://docs.pytest.org/

---

## ❓ Frequently Asked Questions

**Q: Why use Docker?**
A: Docker ensures the application runs the same way on any machine. It packages all dependencies (database, Python, Node.js, etc.) into containers.

**Q: How does the frontend know where the backend is?**
A: The `VITE_API_URL` environment variable in `docker-compose.yml` tells the frontend the backend URL (http://localhost:8000).

**Q: What is the difference between backend and runner?**
A: The **backend** handles API requests and database operations. The **runner** is a specialized service that executes test scripts with pytest and Selenium.

**Q: How do parallel test executions work?**
A: When you scale with `--scale runner=3`, Docker creates 3 runner containers. Celery workers distribute test executions across these runners using Redis as a queue.

**Q: Can I add new features?**
A: Yes! The modular structure makes it easy to add new models, routers, and pages. Follow the existing patterns for consistency.

---

## 🎯 Summary

This project is a **full-stack application** with:
- **Frontend**: React/TypeScript for user interface
- **Backend**: FastAPI/Python for API and business logic
- **Database**: PostgreSQL for data persistence
- **Infrastructure**: Docker for containerization
- **Test Execution**: Selenium Grid + pytest for browser automation

The **entry points** are:
- Backend: `backend/app/main.py`
- Frontend: `frontend/src/main.tsx`
- Runner: `runner/app.py`
- Orchestration: `docker-compose.yml`

All services communicate via HTTP APIs or shared Docker volumes, making it a modular and scalable architecture.
