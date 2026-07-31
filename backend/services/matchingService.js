import { db } from '../firebaseAdmin.js';
import { scoreCandidate } from './scoring.js';
import { getMatchExplanations } from './claudeService.js';

/**
 * Fetches every registered collaborator once, filters by role in application
 * code (skill scoring is guaranteed by this filter), scores the rest of the
 * formula, and returns the top 3 with a batched one-line explanation each.
 * Firestore can't do the weighted multi-field scoring itself — see
 * scoring.js — so this is the "coarse Firestore filter, score in app code"
 * approach the plan called for.
 */
export async function matchCollaboratorsForRole({ creatorId, creatorProfile, role, projectSummary }) {
  const snapshot = await db.collection('users').where('roles', 'array-contains', 'collaborator').get();

  const scored = [];
  snapshot.forEach((doc) => {
    if (doc.id === creatorId) return;
    const data = doc.data();
    const profile = data.collaborator_profile;
    if (!profile || !Array.isArray(profile.skills) || !profile.skills.includes(role)) return;

    const { total, breakdown } = scoreCandidate(creatorProfile, profile);
    scored.push({ collaboratorId: doc.id, email: data.email, profile, score: total, breakdown });
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  if (top.length === 0) return [];

  const explanationMap = await getMatchExplanations({ role, ...projectSummary }, top);

  return top.map((candidate) => ({
    collaboratorId: candidate.collaboratorId,
    email: candidate.email,
    score: candidate.score,
    breakdown: candidate.breakdown,
    explanation: explanationMap.get(candidate.collaboratorId) || null,
  }));
}
