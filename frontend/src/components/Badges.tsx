import { TaskPriority, TaskStatus } from "@/lib/types";

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const statusStyles: Record<TaskStatus, string> = {
  TODO: "bg-[var(--color-status-todo-bg)] text-[var(--color-status-todo)]",
  IN_PROGRESS: "bg-[var(--color-status-progress-bg)] text-[var(--color-status-progress)]",
  COMPLETED: "bg-[var(--color-status-done-bg)] text-[var(--color-status-done)]",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const priorityDot: Record<TaskPriority, string> = {
  LOW: "bg-[var(--color-priority-low)]",
  MEDIUM: "bg-[var(--color-priority-medium)]",
  HIGH: "bg-[var(--color-priority-high)]",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
      <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[priority]}`} />
      {priorityLabels[priority]}
    </span>
  );
}
