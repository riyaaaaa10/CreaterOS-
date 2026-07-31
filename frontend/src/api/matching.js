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

export async function runMatching(projectId) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/match`, {
    method: 'POST',
    headers: await authHeader(),
  });
  return handle(res);
}

export async function getMatches(projectId) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/matches`, {
    headers: await authHeader(),
  });
  return handle(res);
}

export async function selectCollaborator(requestId, collaboratorId) {
  const res = await fetch(`${API_URL}/api/collaboration-requests/${requestId}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ collaboratorId }),
  });
  return handle(res);
}

export async function listMyCollaborations() {
  const res = await fetch(`${API_URL}/api/my-collaborations`, { headers: await authHeader() });
  return handle(res);
}
