# AGENTS.md — Agent (coding) mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious coding rules

- **No root-level package.json** — you cannot run `npm install` or `npm run` from the project root. Always `cd backend` or `cd frontend` first.
- **Claude SDK call shape is non-standard** — uses `output_config: { effort, format: { type: 'json_schema', schema: ... } }` and `thinking: { type: 'adaptive' }`. Do not replace with the standard `.messages.create({ response_format })` pattern; these are bespoke params for `claude-opus-5` structured output.
- **Never store the phantom force-final/force-concept-choice messages** — in [`projectsController.js`](../../backend/controllers/projectsController.js:82), these are injected into the `messages` array passed to Claude but are **not** pushed to `project.conversation_history` before or after the call.
- **`collaboration_requests` doc IDs are deterministic**: `{projectId}_{role}`. Writing to a new role creates a new doc; re-running matching for the same role **overwrites** the existing doc (`.set()`, not `.add()`).
- **Matching pre-filter is Firestore, scoring is JS** — do not try to move scoring into a Firestore query; it cannot do weighted multi-field scoring. The pattern is intentional: coarse Firestore `array-contains` filter, then [`scoreCandidate()`](../../backend/services/scoring.js) in application code.
- **`ROLE_TAXONOMY` enum is embedded in the JSON schema** sent to Claude** ([`claudeService.js`](../../backend/services/claudeService.js:64) `needed_roles` field). If you add a role to the taxonomy constants, also update the inline `enum` array in `planSchema` — the schema is not auto-generated from the constants.
- **Frontend pages are under `frontend/src/pages/`** with flat structure — no nested route folders despite having nested routes.
- **Auth guard is [`RequireAuth`](../../frontend/src/components/RequireAuth.jsx)** — wrap new protected routes with it in [`App.jsx`](../../frontend/src/App.jsx), not inline in the page component.
- **`IdeaInput` page is dual-mode**: `/idea-input` (new idea) and `/idea-input/:projectId` (resume existing). The `projectId` param presence drives which branch renders.
