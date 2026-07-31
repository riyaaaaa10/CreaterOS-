// Fixed taxonomy for collaborator skills and (later) a project's needed_roles.
// Must stay in sync with frontend/src/constants.js — duplicated rather than
// shared because this is a two-package monorepo with no shared workspace.
export const ROLE_TAXONOMY = [
  'photographer',
  'videographer',
  'editor',
  'sound_engineer',
  'stylist',
  'makeup_artist',
  'model',
  'location_scout',
];
