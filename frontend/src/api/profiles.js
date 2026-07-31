import { auth } from '../firebase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function getMyProfile() {
  const res = await fetch(`${API_URL}/api/profiles/me`, {
    headers: await authHeader(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function getRecommendation() {
  const res = await fetch(`${API_URL}/api/profiles/recommendation`, {
    headers: await authHeader(),
  });
  if (!res.ok) return null; // graceful — dashboard silently hides card on error
  return res.json();
}

export async function saveMyProfile(profile) {
  const res = await fetch(`${API_URL}/api/profiles/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save profile');
  }
  return res.json();
}
