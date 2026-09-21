def _create_project(client, headers):
    res = client.post("/api/projects", json={
        "name": "Website Revamp",
        "description": "Redesign the marketing site",
        "start_date": "2026-01-01",
        "end_date": "2026-03-01",
    }, headers=headers)
    assert res.status_code == 201
    return res.json()["id"]


def test_create_task_under_project(client, auth_headers):
    project_id = _create_project(client, auth_headers)
    res = client.post(f"/api/projects/{project_id}/tasks", json={
        "title": "Design homepage",
        "description": "New hero section",
        "priority": "HIGH",
        "status": "TODO",
    }, headers=auth_headers)
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Design homepage"
    assert body["status"] == "TODO"
    assert body["priority"] == "HIGH"


def test_create_task_requires_title(client, auth_headers):
    project_id = _create_project(client, auth_headers)
    res = client.post(f"/api/projects/{project_id}/tasks", json={
        "title": "",
    }, headers=auth_headers)
    assert res.status_code == 422


def test_create_task_on_missing_project_returns_404(client, auth_headers):
    res = client.post("/api/projects/9999/tasks", json={"title": "Ghost task"}, headers=auth_headers)
    assert res.status_code == 404


def test_update_task_status(client, auth_headers):
    project_id = _create_project(client, auth_headers)
    create_res = client.post(f"/api/projects/{project_id}/tasks", json={"title": "Fix bug"}, headers=auth_headers)
    task_id = create_res.json()["id"]

    res = client.put(f"/api/tasks/{task_id}", json={"status": "IN_PROGRESS"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"


def test_delete_task(client, auth_headers):
    project_id = _create_project(client, auth_headers)
    create_res = client.post(f"/api/projects/{project_id}/tasks", json={"title": "Temp task"}, headers=auth_headers)
    task_id = create_res.json()["id"]

    res = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res.status_code == 204

    res = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res.status_code == 404


def test_search_and_filter_tasks(client, auth_headers):
    project_id = _create_project(client, auth_headers)
    client.post(f"/api/projects/{project_id}/tasks", json={"title": "Write tests", "priority": "HIGH"}, headers=auth_headers)
    client.post(f"/api/projects/{project_id}/tasks", json={"title": "Deploy app", "priority": "LOW"}, headers=auth_headers)

    res = client.get(f"/api/projects/{project_id}/tasks?search=deploy", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Deploy app"

    res = client.get(f"/api/projects/{project_id}/tasks?priority=HIGH", headers=auth_headers)
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Write tests"


def test_cannot_access_another_users_project(client, auth_headers):
    project_id = _create_project(client, auth_headers)

    client.post("/api/auth/register", json={
        "name": "Other User", "email": "other@example.com", "password": "Str0ngPass!",
    })
    other_login = client.post("/api/auth/login", json={
        "email": "other@example.com", "password": "Str0ngPass!",
    })
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    res = client.get(f"/api/projects/{project_id}", headers=other_headers)
    assert res.status_code == 404
