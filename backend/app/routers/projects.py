from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _get_owned_project_or_404(project_id: int, db: Session, user: models.User) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != user.id:
        # Same 404 as "not found" so we don't leak the existence of other users' projects
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _with_stats(project: models.Project) -> schemas.ProjectWithStats:
    total = len(project.tasks)
    completed = sum(1 for t in project.tasks if t.status == models.TaskStatus.COMPLETED)
    progress = round((completed / total) * 100, 1) if total else 0.0
    data = schemas.ProjectOut.model_validate(project).model_dump()
    return schemas.ProjectWithStats(**data, task_count=total, completed_count=completed, progress_percent=progress)


@router.get("", response_model=list[schemas.ProjectWithStats])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    projects = (
        db.query(models.Project)
        .filter(models.Project.owner_id == current_user.id)
        .order_by(models.Project.created_at.desc())
        .all()
    )
    return [_with_stats(p) for p in projects]


@router.post("", response_model=schemas.ProjectWithStats, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="End date cannot be before start date")

    project = models.Project(**payload.model_dump(), owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _with_stats(project)


@router.get("/{project_id}", response_model=schemas.ProjectWithStats)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = _get_owned_project_or_404(project_id, db, current_user)
    return _with_stats(project)


@router.put("/{project_id}", response_model=schemas.ProjectWithStats)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = _get_owned_project_or_404(project_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)

    start = updates.get("start_date", project.start_date)
    end = updates.get("end_date", project.end_date)
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="End date cannot be before start date")

    for field, value in updates.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return _with_stats(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = _get_owned_project_or_404(project_id, db, current_user)
    db.delete(project)
    db.commit()
    return None
