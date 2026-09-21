"use client";

import { useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { Button, Field, Input, Textarea, Select, ErrorBanner, Modal, Spinner } from "@/components/ui";

export function TaskForm({
  projectId,
  task,
  users,
  onClose,
  onSaved,
}: {
  projectId: number;
  task?: Task;
  users: User[];
  onClose: () => void;
  onSaved: (task: Task) => void;
}) {
  const isEdit = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [assignedTo, setAssignedTo] = useState<string>(
    task?.assigned_to_id ? String(task.assigned_to_id) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      assigned_to_id: assignedTo ? Number(assignedTo) : null,
    };

    try {
      const saved = isEdit
        ? await api.put<Task>(`/api/tasks/${task!.id}`, payload)
        : await api.post<Task>(`/api/projects/${projectId}/tasks`, payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorBanner message={error} />}

        <Field label="Title" htmlFor="task-title">
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Design the login screen" />
        </Field>

        <Field label="Description" htmlFor="task-description">
          <Textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any useful detail for whoever picks this up"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="task-status">
            <Select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date" htmlFor="task-due">
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Assigned to" htmlFor="task-assignee">
            <Select id="task-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner />}
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
