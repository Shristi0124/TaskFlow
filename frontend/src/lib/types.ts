export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  task_count: number;
  completed_count: number;
  progress_percent: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: number;
  assigned_to_id: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  todo: number;
  completion_percent: number;
  overdue: number;
  by_priority: Record<TaskPriority, number>;
  recent_tasks: Task[];
}
