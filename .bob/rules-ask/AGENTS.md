# AGENTS.md — Ask mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious documentation context

- **`claude.md`** (project root) is the canonical product spec — feature priority tiers (P0/P1/P2), scoring formula, conversation contract, and data model are all defined there, not in README.
- **`docs/CreatorOS_AI_Prompts.md`** contains the exact AI system prompt wording and revision history. [`backend/prompts/conversationPrompt.js`](../../backend/prompts/conversationPrompt.js) must stay in sync with it — they can drift.
- **The conversation loop has 3 response types** (`question`, `concept_choice`, `final_plan`), not 2 as the original spec in `claude.md` describes. The prompt file was extended and `claude.md` was not updated — the code in [`claudeService.js`](../../backend/services/claudeService.js) is the source of truth for current contract shape.
- **Firestore rules deny all client access by design** — this is not a misconfiguration. See [`firestore/firestore.rules`](../../firestore/firestore.rules) comment. All data flows through the Express backend.
- **`frontend/src/constants.js`** and **`backend/config/constants.js`** are intentional duplicates with no auto-sync — the project has no shared package workspace.
- **The scoring formula is implemented in [`backend/services/scoring.js`](../../backend/services/scoring.js)** — availability scoring is a proxy (presence-based) because the calendar feature (P1) hasn't been built yet. `flexible` = 20 pts, `weekdays`/`weekends` = 15 pts, anything else = 0.
- **Seed data** for collaborators lives in [`firestore/seed/seedCollaborators.js`](../../firestore/seed/seedCollaborators.js).
