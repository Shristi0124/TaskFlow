from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/api", tags=["tasks"])


def _get_owned_project_or_404(project_id: int, db: Session, user: models.User) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_owned_task_or_404(task_id: int, db: Session, user: models.User) -> models.Task:
    task = (
        db.query(models.Task)
        .options(joinedload(models.Task.project))
        .filter(models.Task.id == task_id)
        .first()
    )
    if not task or task.project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _to_out(task: models.Task) -> schemas.TaskOut:
    data = schemas.TaskOut.model_validate(task).model_dump()
    data["assignee_name"] = task.assignee.name if task.assignee else None
    return schemas.TaskOut(**data)


def _validate_assignee(assigned_to_id: Optional[int], db: Session):
    if assigned_to_id is None:
        return
    user = db.query(models.User).filter(models.User.id == assigned_to_id).first()
    if not user:
        raise HTTPException(status_code=422, detail="Assigned user does not exist")


@router.get("/projects/{project_id}/tasks", response_model=list[schemas.TaskOut])
def list_project_tasks(
    project_id: int,
    search: Optional[str] = Query(default=None, description="Search task title/description"),
    status_filter: Optional[models.TaskStatus] = Query(default=None, alias="status"),
    priority: Optional[models.TaskPriority] = Query(default=None),
    assigned_to_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_project_or_404(project_id, db, current_user)

    query = db.query(models.Task).filter(models.Task.project_id == project_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (models.Task.title.ilike(like)) | (models.Task.description.ilike(like))
        )
    if status_filter:
        query = query.filter(models.Task.status == status_filter)
    if priority:
        query = query.filter(models.Task.priority == priority)
    if assigned_to_id:
        query = query.filter(models.Task.assigned_to_id == assigned_to_id)

    tasks = query.order_by(models.Task.created_at.desc()).all()
    return [_to_out(t) for t in tasks]


@router.post("/projects/{project_id}/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_project_or_404(project_id, db, current_user)
    _validate_assignee(payload.assigned_to_id, db)

    task = models.Task(**payload.model_dump(), project_id=project_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_owned_task_or_404(task_id, db, current_user)
    return _to_out(task)


@router.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_owned_task_or_404(task_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)

    if "assigned_to_id" in updates:
        _validate_assignee(updates["assigned_to_id"], db)

    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_owned_task_or_404(task_id, db, current_user)
    db.delete(task)
    db.commit()
    return None


@router.get("/tasks/overdue/me", response_model=list[schemas.TaskOut])
def my_overdue_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Bonus endpoint: overdue tasks assigned to the logged-in user, across all their projects."""
    from datetime import date

    tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(
            models.Project.owner_id == current_user.id,
            models.Task.assigned_to_id == current_user.id,
            models.Task.due_date < date.today(),
            models.Task.status != models.TaskStatus.COMPLETED,
        )
        .order_by(models.Task.due_date.asc())
        .all()
    )
    return [_to_out(t) for t in tasks]
