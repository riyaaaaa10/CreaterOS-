// Seeds demo collaborator profiles so the matching engine has real
// candidates to score against in local dev and demos. Safe to re-run —
// upserts by Firebase Auth uid looked up by email, never creates duplicates.
//
// Run from the repo root:
//   node --env-file=backend/.env firestore/seed/seedCollaborators.js
import { auth, db } from '../../backend/firebaseAdmin.js';

const DEMO_PASSWORD = 'CreatorOSDemo2026!';

// Covers every role in the fixed taxonomy (backend/config/constants.js) at
// least once, spread across different locations/budgets/availability so
// matching results actually vary.
const DEMO_COLLABORATORS = [
  {
    email: 'demo-photographer@creatoros.demo',
    niche: 'lifestyle', platforms: ['instagram_reels'], location: 'San Francisco',
    experience_level: 'experienced', aesthetic_tags: ['moody', 'minimal'], budget_range: '100-500',
    skills: ['photographer'], availability: 'flexible',
  },
  {
    email: 'demo-videographer@creatoros.demo',
    niche: 'travel', platforms: ['instagram_reels', 'tiktok'], location: 'San Francisco',
    experience_level: 'experienced', aesthetic_tags: ['bright', 'cozy'], budget_range: '100-500',
    skills: ['videographer'], availability: 'flexible',
  },
  {
    email: 'demo-editor@creatoros.demo',
    niche: 'comedy', platforms: ['tiktok'], location: 'Los Angeles',
    experience_level: 'intermediate', aesthetic_tags: ['moody', 'cinematic'], budget_range: '0-100',
    skills: ['editor'], availability: 'weekends',
  },
  {
    email: 'demo-video-editor@creatoros.demo',
    niche: 'fitness', platforms: ['youtube_shorts'], location: 'Austin',
    experience_level: 'experienced', aesthetic_tags: ['bright', 'minimal'], budget_range: '500-1000',
    skills: ['videographer', 'editor'], availability: 'weekdays',
  },
  {
    email: 'demo-stylist-mua@creatoros.demo',
    niche: 'beauty', platforms: ['instagram_reels'], location: 'New York',
    experience_level: 'experienced', aesthetic_tags: ['glam', 'bright'], budget_range: '500-1000',
    skills: ['stylist', 'makeup_artist'], availability: 'flexible',
  },
  {
    email: 'demo-sound-scout-model@creatoros.demo',
    niche: 'music', platforms: ['tiktok'], location: 'Chicago',
    experience_level: 'beginner', aesthetic_tags: ['minimal', 'dark'], budget_range: '100-500',
    skills: ['sound_engineer', 'location_scout', 'model'], availability: 'weekdays',
  },
];

async function getOrCreateAuthUser(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    return auth.createUser({ email, password: DEMO_PASSWORD, emailVerified: true });
  }
}

async function seed() {
  for (const demo of DEMO_COLLABORATORS) {
    const { email, ...collaboratorProfile } = demo;
    const user = await getOrCreateAuthUser(email);

    await db.collection('users').doc(user.uid).set({
      email,
      roles: ['collaborator'],
      creator_profile: null,
      collaborator_profile: collaboratorProfile,
    });

    console.log(`Seeded ${email} (${user.uid}) — skills: ${collaboratorProfile.skills.join(', ')}`);
  }
  console.log(`\nDone. Demo login password for all seeded accounts: ${DEMO_PASSWORD}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
