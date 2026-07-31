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

export async function listMyProjects() {
  const res = await fetch(`${API_URL}/api/projects`, { headers: await authHeader() });
  return handle(res);
}

export async function createProject(rawIdea) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ rawIdea }),
  });
  return handle(res);
}

export async function getProject(id) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, { headers: await authHeader() });
  return handle(res);
}

export async function replyToProject(id, message) {
  const res = await fetch(`${API_URL}/api/projects/${id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ message }),
  });
  return handle(res);
}

export async function updateWorkflowStage(id, workflow_stage) {
  const res = await fetch(`${API_URL}/api/projects/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ workflow_stage }),
  });
  return handle(res);
}

export async function replyFollowUp(id, message) {
  const res = await fetch(`${API_URL}/api/projects/${id}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ message }),
  });
  return handle(res);
}
