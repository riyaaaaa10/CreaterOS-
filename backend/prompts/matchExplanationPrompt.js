// Batched version of docs/CreatorOS_AI_Prompts.md § 2 (Collaborator Match
// Explanation). The doc's original prompt returns one explanation for a
// single candidate; this batches all top-N candidates for one role into a
// single Claude call, per the plan's decision to avoid 3 separate calls per
// match request. The substantive rules are unchanged — one concrete sentence
// per candidate, referencing their skill/location/availability, no invented
// details — only the request/response shape is batched.
export const MATCH_EXPLANATION_SYSTEM_PROMPT = `You are explaining why each collaborator is a good match for a creator's project.

For every collaborator provided, write ONE sentence explaining the match —
reference their specific skill, location, and availability. Be concrete, not
generic. Do not invent details not present in the data provided.

Respond in this exact JSON shape, and nothing else:

{
  "explanations": [
    { "collaborator_id": "string", "explanation": "string" }
  ]
}`;
