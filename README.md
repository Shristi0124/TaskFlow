# TaskFlow

An internal project and task management tool. Users can register, log in, create projects, create and assign tasks within those projects, track task status, search and filter tasks, and see a dashboard of overall progress. 
Built as a technical evaluation assignment for the Full Stack Developer Intern role.

## Project Overview

TaskFlow lets a logged-in user:
- Create projects with a name, description, and start/end dates
- Create tasks inside a project, assign them to any registered user, set priority and due date
- Move tasks through `TODO → IN_PROGRESS → COMPLETED`
- Search and filter tasks by status/priority within a project
- See a dashboard with total/completed/in-progress/overdue task counts and recent activity

Each user only sees and manages their own projects (and the tasks inside them) — there's no cross-account visibility.

## Technology Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | MySQL 8, via SQLAlchemy ORM (PyMySQL driver) |
| Auth | JWT (python-jose) + bcrypt password hashing (passlib) |
| Backend tests | pytest, against an in-memory SQLite DB |
| Frontend tests | Vitest + React Testing Library |

See `TECHNICAL.md` for *why* these were chosen.

## Project Structure

```
taskflow/
├── backend/            FastAPI app, tests, Dockerfile
│   ├── app/
│   │   ├── routers/    auth, projects, tasks, dashboard
│   │   ├── models.py   SQLAlchemy models
│   │   ├── schemas.py  Pydantic request/response schemas
│   │   └── main.py     app entrypoint, CORS, error handlers
│   ├── tests/
│   └── seed.py         creates a demo user + sample data
├── frontend/            Next.js app
│   └── src/
│       ├── app/         routes (login, register, dashboard, projects/[id])
│       ├── components/  reusable UI (forms, badges, modal, etc.)
│       └── lib/         API client, auth context, shared types
└── docker-compose.yml   MySQL + backend, for local development
```

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 20+
- A MySQL 8 server (local install, or use the provided `docker-compose.yml`)

### 1. Database (MySQL)

Easiest path — start MySQL with Docker:

```bash
docker compose up -d mysql
```

This creates a database `taskflow` with user `taskflow_user` / `taskflow_pass` (see `docker-compose.yml`).

If you'd rather use an existing MySQL install, just create a database and user yourself and point `DATABASE_URL` at it (step 2).

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env if your DATABASE_URL, SECRET_KEY, etc. differ from the defaults

uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on startup (`Base.metadata.create_all`). To also load a demo user and sample project/tasks:

```bash
python seed.py
```

API docs (Swagger UI) are then available at `http://localhost:8000/docs`.

Run the backend test suite:

```bash
pytest -v
```

### 3. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL should point at your running backend, e.g. http://localhost:8000

npm run dev
```

The app runs at `http://localhost:3000`.

Run frontend tests / lint / build:

```bash
npm test
npm run lint
npm run build
```

## Environment Variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string, e.g. `mysql+pymysql://user:pass@host:3306/taskflow` |
| `SECRET_KEY` | Secret used to sign JWTs. Use a long random string in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime in minutes (default `60`) |
| `FRONTEND_ORIGIN` | Origin allowed by CORS, e.g. `http://localhost:3000` |

### Frontend (`frontend/.env.local`, see `frontend/.env.local.example`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

No secrets are committed to this repository.

## API Documentation

Base URL: `/api`. All endpoints below except register/login require an `Authorization: Bearer <token>` header.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Current user's profile |
| GET | `/api/auth/users` | List users (used to populate the "assign task" dropdown) |
| POST | `/api/auth/logout` | No-op confirmation (JWT logout is client-side) |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List the current user's projects, with task counts/progress |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/{id}` | Get one project |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Delete a project (cascades to its tasks) |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/tasks` | List tasks in a project. Supports `?search=`, `?status=`, `?priority=`, `?assigned_to_id=` |
| POST | `/api/projects/{id}/tasks` | Create a task in a project |
| GET | `/api/tasks/{id}` | Get one task |
| PUT | `/api/tasks/{id}` | Update a task (status, assignee, etc.) |
| DELETE | `/api/tasks/{id}` | Delete a task |
| GET | `/api/tasks/overdue/me` | Overdue tasks assigned to the current user, across all their projects |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard` | Totals, completion %, overdue count, tasks by priority, recent tasks |

Full interactive documentation (with request/response schemas) is auto-generated by FastAPI at `/docs`.

## Database

Three tables: `users`, `projects`, `tasks`.

- A `user` owns many `projects` (1‑to‑many).
- A `project` has many `tasks` (1‑to‑many, cascades on delete).
- A `task` optionally belongs to one `user` as its assignee (many‑to‑one, nullable — deleting a user un-assigns their tasks rather than deleting them).

See `TECHNICAL.md` for the full schema, indexes, and reasoning.

## Deployment

Suggested setup: frontend on **Vercel**, backend on **Render/Railway**, database as a managed MySQL instance (Railway, PlanetScale, or similar).

1. Deploy MySQL first, note its connection string.
2. Deploy the backend (`backend/`), setting `DATABASE_URL`, `SECRET_KEY`, and `FRONTEND_ORIGIN` (your deployed frontend URL) as environment variables.
3. Deploy the frontend (`frontend/`), setting `NEXT_PUBLIC_API_URL` to your deployed backend URL.
4. Run `python seed.py` against the production database once if you want a demo account, or just register a new account through the UI.

**Deployed URL:** _add your deployed URL here before submitting_

## Test Credentials

If you ran `python seed.py`, you can log in with:

```
Email: test@example.com
Password: Test@123
```

Otherwise, just register a new account through the UI — registration is open.



Root@12345