"use client";

import { useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Project } from "@/lib/types";
import { Button, Field, Input, Textarea, ErrorBanner, Modal, Spinner } from "@/components/ui";

export function ProjectForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const project = await api.post<Project>("/api/projects", {
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      onSaved(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the project.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorBanner message={error} />}

        <Field label="Project name" htmlFor="project-name">
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Website revamp" />
        </Field>

        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" htmlFor="start-date">
            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date" htmlFor="end-date">
            <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner />}
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
