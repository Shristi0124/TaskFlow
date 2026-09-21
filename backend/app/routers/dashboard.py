from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tasks = (
        db.query(models.Task)
        .join(models.Project)
        .options(joinedload(models.Task.assignee))
        .filter(models.Project.owner_id == current_user.id)
        .all()
    )

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == models.TaskStatus.COMPLETED)
    in_progress = sum(1 for t in tasks if t.status == models.TaskStatus.IN_PROGRESS)
    todo = sum(1 for t in tasks if t.status == models.TaskStatus.TODO)
    overdue = sum(
        1 for t in tasks
        if t.due_date and t.due_date < date.today() and t.status != models.TaskStatus.COMPLETED
    )
    by_priority = {
        "LOW": sum(1 for t in tasks if t.priority == models.TaskPriority.LOW),
        "MEDIUM": sum(1 for t in tasks if t.priority == models.TaskPriority.MEDIUM),
        "HIGH": sum(1 for t in tasks if t.priority == models.TaskPriority.HIGH),
    }
    recent = sorted(tasks, key=lambda t: t.created_at, reverse=True)[:5]

    def to_out(t):
        data = schemas.TaskOut.model_validate(t).model_dump()
        data["assignee_name"] = t.assignee.name if t.assignee else None
        return schemas.TaskOut(**data)

    return schemas.DashboardStats(
        total_tasks=total,
        completed=completed,
        in_progress=in_progress,
        todo=todo,
        completion_percent=round((completed / total) * 100, 1) if total else 0.0,
        overdue=overdue,
        by_priority=by_priority,
        recent_tasks=[to_out(t) for t in recent],
    )
