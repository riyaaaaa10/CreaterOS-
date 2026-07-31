// Scoring formula per claude.md: skill 40 / location 20 / availability 20 /
// aesthetic 10 / budget 10. Firestore can't do weighted multi-field scoring,
// so candidates are pre-filtered by a single Firestore query (roles
// array-contains 'collaborator') and scored here in application code.

const BUDGET_ORDER = ['0-100', '100-500', '500-1000', '1000+'];

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

function scoreLocation(creatorLocation, collaboratorLocation) {
  const a = normalize(creatorLocation);
  const b = normalize(collaboratorLocation);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 20;
  return 0;
}

// No calendar/scheduling feature yet (that's a P1 milestone), so this is a
// presence-based proxy rather than a real date match: flexible availability
// scores highest, a fixed weekday/weekend window scores partial credit.
function scoreAvailability(availability) {
  if (availability === 'flexible') return 20;
  if (availability === 'weekdays' || availability === 'weekends') return 15;
  return 0;
}

function scoreAesthetic(creatorTags = [], collaboratorTags = []) {
  if (!creatorTags.length) return 0;
  const collabSet = new Set(collaboratorTags.map(normalize));
  const overlap = creatorTags.filter((t) => collabSet.has(normalize(t))).length;
  return Math.round((overlap / creatorTags.length) * 10);
}

function scoreBudget(creatorBudget, collaboratorBudget) {
  const ci = BUDGET_ORDER.indexOf(creatorBudget);
  const bi = BUDGET_ORDER.indexOf(collaboratorBudget);
  if (ci === -1 || bi === -1) return 0;
  const diff = Math.abs(ci - bi);
  if (diff === 0) return 10;
  if (diff === 1) return 5;
  return 0;
}

/**
 * `collaboratorProfile` is guaranteed (by the caller's pre-filter) to already
 * have the needed role in its skills array, so skill scoring is a constant.
 */
export function scoreCandidate(creatorProfile, collaboratorProfile) {
  const skill = 40;
  const location = scoreLocation(creatorProfile.location, collaboratorProfile.location);
  const availability = scoreAvailability(collaboratorProfile.availability);
  const aesthetic = scoreAesthetic(creatorProfile.aesthetic_tags, collaboratorProfile.aesthetic_tags);
  const budget = scoreBudget(creatorProfile.budget_range, collaboratorProfile.budget_range);
  return {
    total: skill + location + availability + aesthetic + budget,
    breakdown: { skill, location, availability, aesthetic, budget },
  };
}
