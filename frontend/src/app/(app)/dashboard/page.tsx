"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { DashboardStats, Project } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Button, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { ProjectForm } from "@/components/ProjectForm";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setError(null);
    try {
      const [statsRes, projectsRes] = await Promise.all([
        api.get<DashboardStats>("/api/dashboard"),
        api.get<Project[]>("/api/projects"),
      ]);
      setStats(statsRes);
      setProjects(projectsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your dashboard.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time data load on mount
    load();
  }, []);

  const loading = stats === null && projects === null && !error;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-[var(--color-accent)]" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          An overview of your projects and tasks.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total tasks" value={stats.total_tasks} />
          <StatCard label="Completed" value={stats.completed} tone="accent" />
          <StatCard label="In progress" value={stats.in_progress} tone="warning" />
          <StatCard label="Overdue" value={stats.overdue} tone="danger" />
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Projects</h2>
          <Button onClick={() => setShowForm(true)}>New project</Button>
        </div>

        {projects && projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start organizing tasks."
            action={<Button onClick={() => setShowForm(true)}>New project</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-lg border border-[var(--color-line)] bg-white p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                <p className="font-medium text-[var(--color-ink)]">{p.name}</p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-soft)]">{p.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
                  <span>{p.task_count} task{p.task_count === 1 ? "" : "s"}</span>
                  <span>{p.progress_percent}% complete</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                  <div
                    className="h-full bg-[var(--color-accent)]"
                    style={{ width: `${p.progress_percent}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Recent tasks</h2>
        {stats && stats.recent_tasks.length === 0 ? (
          <EmptyState title="No tasks yet" description="Tasks you create will show up here." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-white">
            {stats?.recent_tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{t.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {t.assignee_name ? `Assigned to ${t.assignee_name}` : "Unassigned"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
