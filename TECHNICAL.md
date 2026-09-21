# TaskFlow — Technical Documentation

## Architecture

Standard three-tier setup, deployed as two separate services in front of a managed database:

```
Browser (Next.js frontend)
        │  HTTPS, JSON
        ▼
FastAPI backend (REST API, /api/*)
        │  SQLAlchemy ORM
        ▼
MySQL database
```

- The frontend is a Next.js App Router app. Every page that needs data is a client component that calls the backend through a small `fetch` wrapper (`src/lib/api.ts`), which attaches the JWT from `localStorage` and normalizes error responses into a single `ApiError` type the UI can render consistently.
- The backend is a single FastAPI app. Routers are split by resource (`auth`, `projects`, `tasks`, `dashboard`). Each request goes through: routing → Pydantic validation → an auth dependency that resolves the current user from the JWT → a SQLAlchemy query scoped to that user → a Pydantic response model.
- The two services communicate only over the documented REST API — the frontend never talks to the database directly. CORS on the backend is restricted to the configured frontend origin.

## Database Design

Three tables, matching the three domain entities:

```
users                    projects                  tasks
─────                    ────────                  ─────
id (PK)                  id (PK)                    id (PK)
name                      name                      title
email (unique, indexed)   description               description
password_hash             start_date                status (enum)
created_at                end_date                  priority (enum)
                          owner_id (FK → users.id)   due_date
                          created_at                 project_id (FK → projects.id)
                          updated_at                 assigned_to_id (FK → users.id, nullable)
                                                      created_at
                                                      updated_at
```

Relationships:
- `users 1—* projects` (`projects.owner_id`). A project always has exactly one owner; deleting a user cascades to delete their projects (`ondelete="CASCADE"`).
- `projects 1—* tasks` (`tasks.project_id`). Deleting a project cascades to delete its tasks — a task can't exist without a project.
- `users 1—* tasks` as **assignee** (`tasks.assigned_to_id`), separate from ownership. This is nullable and `ondelete="SET NULL"`: deleting a user un-assigns their tasks instead of deleting the tasks, since the task and its history still belong to the project.

Indexes: primary keys are indexed by default; `users.email` is indexed (and unique, since it's the login identifier); `projects.owner_id`, `tasks.project_id`, `tasks.assigned_to_id`, `tasks.status`, and `tasks.priority` are indexed since every list/filter query in the app filters on one of these.

Constraints/integrity: `status` and `priority` are DB-level enums, not free text, so invalid values can't be stored even by a buggy client. `end_date >= start_date` and equivalent for tasks are enforced in the API layer (Pydantic/route validation) rather than the DB, since that's where the more useful error message can be produced. Timestamps (`created_at`, `updated_at`) are set automatically by SQLAlchemy defaults, not by the client.

Schema management: tables are created with `Base.metadata.create_all()` on startup rather than migrations. For a fresh, single-environment project this keeps setup to "run the app," but it's a deliberate simplification — see "What I'd improve in production" below.

## Authentication

- **Passwords** are hashed with bcrypt (via `passlib`) before storage. The plaintext password is never stored or logged. Bcrypt includes a per-password salt automatically.
- **Login** looks up the user by email, verifies the password against the stored hash, and — on success — issues a JWT signed with `HS256` and a server-side `SECRET_KEY`. The token's `sub` claim is the user's id, and it carries a short expiry (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 60 minutes).
- **Protected routes** use a FastAPI dependency (`get_current_user`) that reads the `Authorization: Bearer <token>` header, decodes and verifies the JWT, and loads the corresponding user from the database. Any failure (missing header, invalid/expired token, deleted user) returns `401 Unauthorized`. Routes that need a logged-in user simply declare `current_user: models.User = Depends(get_current_user)` — there's no route that forgets this by accident, since project/task queries are always filtered by the resolved user, not a client-supplied id.
- **Authorization** (as opposed to authentication) is enforced per-resource: every project/task query filters by `owner_id == current_user.id` at the database level. Trying to access another user's project or task returns `404`, not `403` — this avoids confirming to an attacker that a given project id exists at all.
- **Logout** is client-side: the frontend deletes the token from `localStorage`. JWTs here are stateless (no server-side session/blocklist), which is the standard trade-off for this kind of token — it's simple, but a token can't be forcibly invalidated before it expires. The short expiry keeps that window small.
- **Frontend auth state**: `AuthProvider` (`src/lib/auth-context.tsx`) holds the current user in React state, restores it on page load by calling `/api/auth/me` with the stored token, and exposes `login`/`register`/`logout`. Every route under the authenticated app shell checks this state and redirects to `/login` if there's no user, so protected pages never render without a valid session.

## API Design

The API is resource-oriented and closely follows the brief's suggested structure: `/api/auth/*` for authentication, `/api/projects` and `/api/projects/{id}/tasks` for the project→task hierarchy, and top-level `/api/tasks/{id}` for operating on a single task without needing its parent project id. This nesting mirrors the actual data ownership (a task cannot exist outside a project) while keeping single-task operations short.

Design decisions worth calling out:
- **HTTP methods and status codes** follow convention: `POST` returns `201` on creation, `DELETE` returns `204`, validation failures return `422`, missing/foreign resources return `404`, auth failures return `401`, and a project a user doesn't own returns `404` rather than `403` (see Authentication above).
- **Filtering** (`search`, `status`, `priority`, `assigned_to_id` on the tasks list endpoint) is implemented as query parameters handled entirely server-side (SQL `WHERE`/`LIKE` clauses), not by fetching everything and filtering in the frontend. This matters once a project has more than a handful of tasks.
- **Centralized error handling**: FastAPI exception handlers in `main.py` catch validation errors, database connectivity errors (`OperationalError`), integrity errors, and any unhandled exception, and always return a JSON body with a `detail` message. The frontend never has to handle a raw stack trace or a hung connection — it always gets *something* to show the user.
- **`GET /api/auth/users`** exists purely to populate the "assign task to" dropdown in the UI. It's a deliberately small addition beyond the brief's example endpoints, needed because assigning a task requires knowing who can be assigned.

## Important Technical Decisions

**1. Why this technology stack?**
Next.js was chosen for the frontend because the App Router gives file-based routing, easy client/server component separation, and a fast dev loop without extra routing/bundling setup. FastAPI was chosen for the backend because Pydantic gives free request/response validation and auto-generated OpenAPI docs, and its async-first design is a good fit for a small I/O-bound API like this one. Both are frameworks I'm comfortable reading, debugging, and explaining line by line, which is the bar the brief sets.

**2. Why MySQL?**
The data is fundamentally relational — users own projects, projects own tasks, tasks reference an assignee — with real foreign-key constraints that matter (you shouldn't be able to assign a task to a user that doesn't exist, or have a task survive its project's deletion). MySQL enforces that at the database layer instead of trusting application code to get it right every time, and it's a stack most teams can operate without much extra tooling.

**3. Why structure the API this way?**
Nesting tasks under `/api/projects/{id}/tasks` for listing/creating makes the ownership hierarchy explicit in the URL and lets the "list tasks" endpoint apply search/filtering in one query scoped to a single project. Flattening to `/api/tasks/{id}` for read/update/delete avoids forcing every task operation to carry its parent project id once the task is already identified.

**4. How did you handle authentication?**
Stateless JWTs signed with a server secret, bcrypt-hashed passwords, and a single FastAPI dependency that every protected route relies on to resolve "who is making this request" — detailed above.

**5. How did you handle errors?**
Centrally, via FastAPI exception handlers, so every failure mode (bad input, missing resource, unreachable database, unexpected bug) reaches the client as a JSON body with a human-readable `detail`, and the frontend's `ApiError` type surfaces that message directly in the UI instead of a generic crash.

**6. What security considerations did you implement?**
Bcrypt password hashing; JWT auth with expiry; per-resource ownership checks on every project/task query (never trusting a client-supplied id without checking it belongs to the requester); server-side input validation via Pydantic; secrets kept in environment variables and out of git (`.env` is gitignored, `.env.example` has no real values); CORS restricted to the known frontend origin; generic "invalid email or password" on login failure rather than revealing which part was wrong.

**7. What would you improve if this went to production?**
- Replace `Base.metadata.create_all()` with real migrations (Alembic), so schema changes are versioned and reversible.
- Move refresh/session handling from a single long-lived access token to a short-lived access token + refresh token pair, with the ability to revoke a session server-side.
- Add rate limiting on `/api/auth/login` and `/api/auth/register` to slow down credential-stuffing/enumeration attempts.
- Add structured logging and error monitoring (e.g. Sentry) instead of the current bare exception handler.
- Add pagination to `GET /api/projects/{id}/tasks` and `GET /api/projects` instead of always returning the full list.
- Tighten CORS/CSP headers and add HTTPS-only cookie-based token storage as an alternative to `localStorage`, which is vulnerable to XSS-based token theft.

**8. What would you change with 100,000 users?**
- Pagination (mentioned above) becomes mandatory, not optional, once project/task lists can no longer fit comfortably in one response.
- Add a connection pool sized for concurrent load and consider read replicas for MySQL, since dashboard/list queries are read-heavy relative to writes.
- Cache the dashboard aggregation query (or compute it incrementally on task changes) instead of recomputing totals over every task on every request.
- Move from a single-process `uvicorn` deployment to multiple workers behind a load balancer, and make the backend fully stateless (it already is, given JWTs) so it scales horizontally.
- Reconsider the "list tasks with search" endpoint: a `LIKE '%term%'` query doesn't use an index and gets slow at scale — a dedicated search index (e.g. MySQL full-text index, or an external search service) would be needed.
- Revisit the cascading deletes on `projects`/`tasks` — at scale, cascading deletes on large projects can lock rows for a noticeable time; a soft-delete or background-job-based cleanup would be safer.

## What I'd Improve / Known Limitations

- No Alembic migrations (see above) — acceptable for this assignment's scope, called out explicitly rather than hidden.
- No rate limiting or account lockout on login attempts.
- No email verification on registration.
- No pagination on list endpoints yet.
- Users are only assignable to tasks in projects they don't necessarily own themselves (any registered user can be assigned to any project's tasks) — there's no "project members" concept yet, which is listed as an optional feature in the brief. This was a deliberate scope cut: the brief's core requirement is "assign tasks to users," not "assign tasks to project members," and adding a membership model would have meant less polish on the required features.
