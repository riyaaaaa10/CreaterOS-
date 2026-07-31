import { auth } from '../firebase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getWorkspace(projectId) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/workspace`, {
    headers: await authHeader(),
  });
  return handle(res);
}

export async function createTask(projectId, { title, assigned_to, due }) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ title, assigned_to, due }),
  });
  return handle(res);
}

export async function updateTask(taskId, updates) {
  const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(updates),
  });
  return handle(res);
}
