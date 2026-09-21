"""
Seeds the database with a demo user, a project, and a handful of tasks.

Usage:
    python seed.py

Safe to re-run: it skips creation if the demo user already exists.
"""
from datetime import date, timedelta

from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_password

DEMO_EMAIL = "test@example.com"
DEMO_PASSWORD = "Test@123"


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Demo user already exists: {DEMO_EMAIL}")
            return

        user = models.User(
            name="Test User",
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        project = models.Project(
            name="Website Revamp",
            description="Redesign the marketing site and improve page speed.",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=45),
            owner_id=user.id,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        sample_tasks = [
            ("Audit current homepage", models.TaskStatus.COMPLETED, models.TaskPriority.MEDIUM, -5),
            ("Design new hero section", models.TaskStatus.IN_PROGRESS, models.TaskPriority.HIGH, 3),
            ("Set up analytics tracking", models.TaskStatus.TODO, models.TaskPriority.LOW, 10),
            ("Migrate blog content", models.TaskStatus.TODO, models.TaskPriority.MEDIUM, -2),  # overdue
        ]
        for title, status, priority, offset in sample_tasks:
            db.add(models.Task(
                title=title,
                status=status,
                priority=priority,
                due_date=date.today() + timedelta(days=offset),
                project_id=project.id,
                assigned_to_id=user.id,
            ))
        db.commit()

        print(f"Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
