import Anthropic from '@anthropic-ai/sdk';
import { CONVERSATION_SYSTEM_PROMPT } from '../prompts/conversationPrompt.js';
import { MATCH_EXPLANATION_SYSTEM_PROMPT } from '../prompts/matchExplanationPrompt.js';
import { RECOMMENDATION_SYSTEM_PROMPT } from '../prompts/recommendationPrompt.js';
import { FOLLOW_UP_SYSTEM_PROMPT } from '../prompts/followUpPrompt.js';
import { ROLE_TAXONOMY } from '../config/constants.js';

const anthropic = new Anthropic();
const MODEL = 'claude-opus-5';

const briefSchema = {
  type: 'object',
  properties: {
    refined_concept: { type: 'string' },
    target_audience: { type: 'string' },
    hook: { type: 'string' },
    visual_style: { type: 'string' },
    story_structure: { type: 'array', items: { type: 'string' } },
    recommended_length_seconds: { type: 'integer' },
    caption_idea: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'refined_concept', 'target_audience', 'hook', 'visual_style',
    'story_structure', 'recommended_length_seconds', 'caption_idea', 'hashtags',
  ],
  additionalProperties: false,
};

const planSchema = {
  type: 'object',
  properties: {
    shot_list: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          shot_number: { type: 'integer' },
          description: { type: 'string' },
          shot_type: { type: 'string' },
          location_note: { type: 'string' },
        },
        required: ['shot_number', 'description', 'shot_type', 'location_note'],
        additionalProperties: false,
      },
    },
    props: { type: 'array', items: { type: 'string' } },
    equipment: { type: 'array', items: { type: 'string' } },
    outfit_suggestions: { type: 'array', items: { type: 'string' } },
    schedule: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string' },
          activity: { type: 'string' },
        },
        required: ['time', 'activity'],
        additionalProperties: false,
      },
    },
    editing_guidance: { type: 'string' },
    task_checklist: { type: 'array', items: { type: 'string' } },
    // Constrained to the fixed role taxonomy (backend/config/constants.js) so
    // the matching engine can key off these values with exact-match, not fuzzy text.
    needed_roles: { type: 'array', items: { type: 'string', enum: ROLE_TAXONOMY } },
    // Per-shot script lines — shot_number matches shot_list entries.
    script: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          shot_number: { type: 'integer' },
          line: { type: 'string' },
        },
        required: ['shot_number', 'line'],
        additionalProperties: false,
      },
    },
    // Content signals — estimated from content quality + (when available) live
    // web research. signals_source indicates whether search was used.
    content_signals: {
      type: 'object',
      properties: {
        virality_score: { type: 'number' },
        competition: { type: 'string', enum: ['Low', 'Medium', 'High'] },
        trend_growth: { type: 'string', enum: ['Rising', 'Steady', 'Declining'] },
        audience_match_pct: { type: 'integer' },
        estimated_reach_low: { type: 'integer' },
        estimated_reach_high: { type: 'integer' },
        // 'live_research' when web search succeeded, 'heuristic' as fallback.
        signals_source: { type: 'string', enum: ['live_research', 'heuristic'] },
      },
      required: [
        'virality_score', 'competition', 'trend_growth',
        'audience_match_pct', 'estimated_reach_low', 'estimated_reach_high',
        'signals_source',
      ],
      additionalProperties: false,
    },
  },
  required: [
    'shot_list', 'props', 'equipment', 'outfit_suggestions',
    'schedule', 'editing_guidance', 'task_checklist', 'needed_roles', 'script',
    'content_signals',
  ],
  additionalProperties: false,
};

const conceptOptionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'title', 'description'],
  additionalProperties: false,
};

const CONVERSATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['question', 'concept_choice', 'final_plan'] },
    message: { type: 'string' },
    // Always an array — use [] instead of null when no options apply.
    // anyOf [null, array] caused Claude to default to null too often.
    options: { type: 'array', items: { type: 'string' } },
    concept_options: { type: 'array', items: conceptOptionSchema },
    creative_brief: { anyOf: [{ type: 'null' }, briefSchema] },
    production_plan: { anyOf: [{ type: 'null' }, planSchema] },
  },
  required: ['type', 'message', 'options', 'concept_options', 'creative_brief', 'production_plan'],
  additionalProperties: false,
};

const FORCE_FINAL_NOTE =
  '[SYSTEM NOTE: This is turn 4, the final turn. You must respond with ' +
  'type "final_plan" now — fill any remaining gaps with reasonable ' +
  'assumptions rather than asking again.]';

const FORCE_CONCEPT_CHOICE_NOTE =
  '[SYSTEM NOTE: This is turn 3 and you have not yet presented concept ' +
  'directions. You must respond with type "concept_choice" now, offering ' +
  '2-3 distinct directions based on what you know so far — fill any ' +
  'remaining gaps with reasonable assumptions rather than asking another ' +
  'question.]';

/**
 * Attempts a web search call to gather current trend context for the creator's
 * niche/platform. Returns a plain-text summary string, or null on any failure.
 * Uses fetch directly because the SDK v0.32.1 pre-dates typed web_search support.
 *
 * searchQuery: a short string like "travel content TikTok trends 2025"
 */
async function fetchTrendContext(searchQuery) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for current trends, virality signals, and competition level for: ${searchQuery}. `
            + 'Summarise in 3-5 bullet points: what formats are trending, how competitive this niche is, '
            + 'whether interest is rising/steady/declining, and realistic reach for a small creator.',
        }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Extract all text blocks from the response (search results are returned as text)
    const textParts = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return textParts.trim() || null;
  } catch {
    return null; // any network/parse failure → fall back to heuristic
  }
}

/**
 * Extracts a short trend search query from the most recent user turns.
 * Used to scope web search to the creator's specific niche + platform.
 */
function buildSearchQuery(conversationHistory) {
  // Pull the last 3 user messages to get niche/platform context
  const userLines = conversationHistory
    .filter((t) => t.role === 'user')
    .slice(-3)
    .map((t) => {
      // Strip SYSTEM NOTE injections if present
      if (t.content.startsWith('[SYSTEM NOTE')) return '';
      return t.content;
    })
    .filter(Boolean)
    .join(' ');
  return `short-form video content trends 2025: ${userLines.slice(0, 200)}`;
}

/**
 * conversationHistory: [{ role: 'user' | 'assistant', content: string }]
 * Returns { parsed, raw } where parsed matches CONVERSATION_RESPONSE_SCHEMA.
 */
export async function getNextConversationTurn(
  conversationHistory,
  { forceFinal = false, forceConceptChoice = false } = {},
) {
  const messages = conversationHistory.map(({ role, content }) => ({ role, content }));
  if (forceFinal) {
    messages.push({ role: 'user', content: FORCE_FINAL_NOTE });
  } else if (forceConceptChoice) {
    messages.push({ role: 'user', content: FORCE_CONCEPT_CHOICE_NOTE });
  }

  // On final-plan turns, attempt a web search for live trend context.
  // If search fails for any reason, the main call proceeds without it (heuristic fallback).
  let trendContext = null;
  if (forceFinal) {
    const query = buildSearchQuery(conversationHistory);
    trendContext = await fetchTrendContext(query); // null on failure
  }

  // Build the system prompt, optionally injecting live trend research.
  const systemPrompt = trendContext
    ? `${CONVERSATION_SYSTEM_PROMPT}\n\n[LIVE TREND RESEARCH — use to inform content_signals]\n${trendContext}\nSet signals_source to "live_research" since search data was provided.`
    : `${CONVERSATION_SYSTEM_PROMPT}\n\nNo live trend data was retrieved. Set signals_source to "heuristic" and reason from content signals only.`;

  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: CONVERSATION_RESPONSE_SCHEMA },
        },
        messages,
      });

      if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined to respond to this request.');
      }
      if (response.stop_reason === 'max_tokens') {
        throw new Error('Response was truncated before completion (max_tokens reached).');
      }

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock) {
        throw new Error('Claude response contained no text content.');
      }

      const parsed = JSON.parse(textBlock.text);
      return { parsed, raw: textBlock.text };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Claude conversation turn failed after ${maxAttempts} attempts: ${lastError.message}`);
}

const MATCH_EXPLANATION_SCHEMA = {
  type: 'object',
  properties: {
    explanations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          collaborator_id: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['collaborator_id', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['explanations'],
  additionalProperties: false,
};

/**
 * candidates: [{ collaboratorId, profile }] — profile is a collaborator_profile object.
 * projectNeeds: { role, creatorProfile } — the role being filled and the creator's own profile.
 * Returns a Map of collaboratorId -> explanation string.
 */
export async function getMatchExplanations(projectNeeds, candidates) {
  const userContent = JSON.stringify({
    project_needs: projectNeeds,
    candidates: candidates.map((c) => ({ collaborator_id: c.collaboratorId, profile: c.profile })),
  });

  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: MATCH_EXPLANATION_SYSTEM_PROMPT,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: MATCH_EXPLANATION_SCHEMA },
        },
        messages: [{ role: 'user', content: userContent }],
      });

      if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined to respond to this request.');
      }
      if (response.stop_reason === 'max_tokens') {
        throw new Error('Response was truncated before completion (max_tokens reached).');
      }

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock) throw new Error('Claude response contained no text content.');

      const parsed = JSON.parse(textBlock.text);
      const explanationMap = new Map(parsed.explanations.map((e) => [e.collaborator_id, e.explanation]));
      return explanationMap;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Match explanation call failed after ${maxAttempts} attempts: ${lastError.message}`);
}

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          reasoning: { type: 'string' },
        },
        required: ['title', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['ideas'],
  additionalProperties: false,
};

/**
 * creatorProfile: the creator_profile object from the users collection.
 * Returns { ideas: [{ title, reasoning }] } or throws.
 */
export async function getContentRecommendation(creatorProfile) {
  const userContent = JSON.stringify(creatorProfile);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: RECOMMENDATION_SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RECOMMENDATION_SCHEMA },
    },
    messages: [{ role: 'user', content: userContent }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate a recommendation.');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('Claude response contained no text content.');

  return JSON.parse(textBlock.text);
}

const FOLLOW_UP_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['answer', 'updated_plan'] },
    message: { type: 'string' },
    creative_brief: { anyOf: [{ type: 'null' }, briefSchema] },
    production_plan: { anyOf: [{ type: 'null' }, planSchema] },
  },
  required: ['type', 'message', 'creative_brief', 'production_plan'],
  additionalProperties: false,
};

/**
 * Handles a post-plan follow-up message.
 * followUpHistory: [{ role, content }] — only the follow-up exchange, not the
 *   original brief-generation history.
 * brief / plan: the current creative_brief and production_plan objects.
 * Returns { parsed, raw } where parsed matches FOLLOW_UP_RESPONSE_SCHEMA.
 */
export async function getFollowUpResponse(followUpHistory, brief, plan) {
  // Inject the existing plan as context in the first user message position
  const contextNote = `[Current plan context]\nCreative brief: ${JSON.stringify(brief)}\nProduction plan: ${JSON.stringify(plan)}`;

  const messages = [
    { role: 'user', content: contextNote },
    { role: 'assistant', content: 'Understood — I have your current brief and production plan. What would you like to change or ask?' },
    ...followUpHistory.map(({ role, content }) => ({ role, content })),
  ];

  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 6000,
        system: FOLLOW_UP_SYSTEM_PROMPT,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: FOLLOW_UP_RESPONSE_SCHEMA },
        },
        messages,
      });

      if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined to respond to this request.');
      }
      if (response.stop_reason === 'max_tokens') {
        throw new Error('Response was truncated before completion (max_tokens reached).');
      }

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock) throw new Error('Claude response contained no text content.');

      const parsed = JSON.parse(textBlock.text);
      return { parsed, raw: textBlock.text };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Follow-up call failed after ${maxAttempts} attempts: ${lastError.message}`);
}
