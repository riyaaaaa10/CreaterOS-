import { db } from '../firebaseAdmin.js';
import { ROLE_TAXONOMY } from '../config/constants.js';
import { getContentRecommendation } from '../services/claudeService.js';

const VALID_ROLES = ['creator', 'collaborator'];

function validateProfilePayload(body) {
  const { roles, creator_profile, collaborator_profile } = body;

  if (!Array.isArray(roles) || roles.length === 0 || !roles.every((r) => VALID_ROLES.includes(r))) {
    return 'roles must be a non-empty array containing "creator" and/or "collaborator"';
  }

  if (roles.includes('creator') && !creator_profile) {
    return 'creator_profile is required when roles includes "creator"';
  }

  if (roles.includes('collaborator')) {
    if (!collaborator_profile) {
      return 'collaborator_profile is required when roles includes "collaborator"';
    }
    const { skills, location, availability, budget_range } = collaborator_profile;
    if (!location || !availability || !budget_range || !Array.isArray(skills) || skills.length === 0) {
      return 'collaborator_profile requires location, availability, budget_range, and at least one skill';
    }
    if (!skills.every((s) => ROLE_TAXONOMY.includes(s))) {
      return `collaborator_profile.skills must only contain values from: ${ROLE_TAXONOMY.join(', ')}`;
    }
  }

  return null;
}

export async function getMyProfile(req, res) {
  try {
    const doc = await db.collection('users').doc(req.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Profile not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function upsertMyProfile(req, res) {
  const validationError = validateProfilePayload(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { roles, creator_profile, collaborator_profile } = req.body;

  const profile = {
    email: req.userEmail || null,
    roles,
    creator_profile: roles.includes('creator') ? creator_profile : null,
    collaborator_profile: roles.includes('collaborator') ? collaborator_profile : null,
  };

  try {
    await db.collection('users').doc(req.uid).set(profile);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRecommendation(req, res) {
  try {
    const doc = await db.collection('users').doc(req.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Profile not found' });

    const profile = doc.data();
    const creatorProfile = profile.creator_profile;
    if (!creatorProfile) {
      return res.status(400).json({ error: 'No creator profile found — set up your profile first' });
    }

    const result = await getContentRecommendation(creatorProfile);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `Recommendation failed: ${err.message}` });
  }
}
