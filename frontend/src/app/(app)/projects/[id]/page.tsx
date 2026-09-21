"use client";

import { useEffect, useState, useCallback, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Project, Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Button, EmptyState, ErrorBanner, Input, Select, Spinner } from "@/components/ui";
import { TaskForm } from "@/components/TaskForm";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const projectId = Number(id);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([
        api.get<Project>(`/api/projects/${projectId}`),
        api.get<User[]>("/api/auth/users"),
      ]);
      setProject(p);
      setUsers(u);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not load this project.");
      }
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (statusFilter) query.set("status", statusFilter);
    if (priorityFilter) query.set("priority", priorityFilter);

    try {
      const t = await api.get<Task[]>(`/api/projects/${projectId}/tasks?${query.toString()}`);
      setTasks(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load tasks.");
    }
  }, [projectId, search, statusFilter, priorityFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load triggered by route param change
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    const timeout = setTimeout(loadTasks, 250); // debounce search typing
    return () => clearTimeout(timeout);
  }, [loadTasks]);

  async function handleDeleteTask(task: Task) {
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    try {
      await api.del(`/api/tasks/${task.id}`);
      loadTasks();
      loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the task.");
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await api.put<Task>(`/api/tasks/${task.id}`, { status });
      loadTasks();
      loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the task.");
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}" and all of its tasks? This can't be undone.`)) return;
    try {
      await api.del(`/api/projects/${project.id}`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the project.");
    }
  }

  if (notFound) {
    return (
      <EmptyState
        title="Project not found"
        description="It may have been deleted, or it doesn't belong to your account."
        action={<Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>}
      />
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-xl text-sm text-[var(--color-ink-soft)]">{project.description}</p>
          )}
          <div className="mt-2 flex gap-4 text-xs text-[var(--color-ink-soft)]">
            {project.start_date && <span>Starts {project.start_date}</span>}
            {project.end_date && <span>Ends {project.end_date}</span>}
            <span>{project.task_count} tasks · {project.progress_percent}% complete</span>
          </div>
        </div>
        <Button variant="danger" onClick={handleDeleteProject}>
          Delete project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")} className="w-auto">
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")} className="w-auto">
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
        <Button className="ml-auto" onClick={() => setShowNewTask(true)}>
          New task
        </Button>
      </div>

      {tasks === null ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="text-[var(--color-accent)]" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks match"
          description="Try a different search or filter, or create a new task."
          action={<Button onClick={() => setShowNewTask(true)}>New task</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-white">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-[180px] flex-1">
                <button
                  onClick={() => setEditingTask(t)}
                  className="text-left text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                >
                  {t.title}
                </button>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {t.assignee_name ? t.assignee_name : "Unassigned"}
                  {t.due_date ? ` · Due ${t.due_date}` : ""}
                </p>
              </div>

              <PriorityBadge priority={t.priority} />

              <Select
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                className="w-auto"
                aria-label={`Status for ${t.title}`}
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </Select>

              <StatusBadge status={t.status} />

              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setEditingTask(t)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => handleDeleteTask(t)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewTask && (
        <TaskForm
          projectId={projectId}
          users={users}
          onClose={() => setShowNewTask(false)}
          onSaved={() => {
            setShowNewTask(false);
            loadTasks();
            loadProject();
          }}
        />
      )}

      {editingTask && (
        <TaskForm
          projectId={projectId}
          task={editingTask}
          users={users}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            loadTasks();
            loadProject();
          }}
        />
      )}
    </div>
  );
}
