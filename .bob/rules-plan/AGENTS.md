# AGENTS.md — Plan mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious architectural constraints

- **Frontend is auth-only Firebase** — adding any feature that needs real-time data (e.g. P1 workspace chat) requires revisiting `firestore/firestore.rules` and scoping per-collection rules. Do not write client-side Firestore calls without updating the rules file first.
- **The conversation cap is 4 turns, not 3** — the original spec says ~3 turns; the implementation uses 4. This was deliberately extended so `concept_choice` always gets a dedicated slot before the forced final turn. Any plan to change the UX flow must account for the `forceFinal` (turn ≥ 4) and `forceConceptChoice` (turn = 3, no prior concept_choice) flags in [`projectsController.js`](../../backend/controllers/projectsController.js:77).
- **`needed_roles` are extracted from the production plan at plan-save time** and stored directly on the `projects` doc — matching reads `project.needed_roles`, not `project.production_plan.needed_roles`. Both exist but the top-level field is what's queried.
- **Matching creates one `collaboration_requests` doc per role** — a project needing 3 roles produces 3 docs. Selection (`selectCollaborator`) acts on the collaboration_request doc, not the project doc. The workspace is per-project, not per-role.
- **No shared module system** — backend and frontend are two fully independent npm packages in the same repo. There is no monorepo tooling (no Turborepo, nx, Lerna, etc.). Planning a shared utility means either duplicating it or adding a workspace setup from scratch.
- **Claude model is `claude-opus-5`** — any plan involving AI features must use this model with the `output_config` structured-output approach, not `response_format`. Changing model requires verifying the `thinking: { type: 'adaptive' }` and `output_config` params are still supported.
- **P1/P2 features not started**: ratings/reviews, portfolio uploads, real-time workspace chat, calendar integration, mood-board upload, video feedback, weather-aware planning, trending feed. Do not assume any of these exist.
