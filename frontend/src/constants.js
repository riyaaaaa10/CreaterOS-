// Fixed taxonomy for collaborator skills and (later) a project's needed_roles.
// Must stay in sync with backend/config/constants.js.

/**
 * Human-readable display labels for all enum-style values used in the app.
 * Use label(value) anywhere you'd otherwise call .replace(/_/g, ' ').
 */
const LABEL_MAP = {
  // Platforms
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  // Experience levels
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  // Availability
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  flexible: 'Flexible',
  // Roles / skills
  photographer: 'Photographer',
  videographer: 'Videographer',
  editor: 'Editor',
  sound_engineer: 'Sound Engineer',
  stylist: 'Stylist',
  makeup_artist: 'Makeup Artist',
  model: 'Model',
  location_scout: 'Location Scout',
  // Content goals
  grow_following: 'Grow Following',
  brand_deals: 'Brand Deals',
  sell_products: 'Sell Products',
  build_community: 'Build Community',
  creative_expression: 'Creative Expression',
  educate_audience: 'Educate Audience',
};

/** Returns the human-readable label for a raw enum value, falling back to
 *  capitalising the first letter of each word separated by underscores/spaces. */
export function label(value) {
  if (!value) return '';
  return LABEL_MAP[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

export const PLATFORMS = ['instagram_reels', 'tiktok', 'youtube_shorts'];

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'experienced'];

export const BUDGET_RANGES = ['0-100', '100-500', '500-1000', '1000+'];

export const AVAILABILITY_OPTIONS = ['weekdays', 'weekends', 'flexible'];

export const CONTENT_GOALS = [
  'grow_following',
  'brand_deals',
  'sell_products',
  'build_community',
  'creative_expression',
  'educate_audience',
];

export const POSTING_FREQUENCY = [
  'daily',
  '3-5x per week',
  '1-2x per week',
  'a few times a month',
];

export const WORKFLOW_STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'production', label: 'Production' },
  { value: 'editing', label: 'Editing' },
  { value: 'ready_to_publish', label: 'Ready to publish' },
  { value: 'published', label: 'Published' },
];
