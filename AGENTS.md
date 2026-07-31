# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project overview

CreatorOS — AI platform for short-form content creators. See `claude.md` for full spec and `docs/CreatorOS_AI_Prompts.md` for exact AI prompt wording. Two separate npm packages: `backend/` (Node/Express) and `frontend/` (React/Vite). **No shared workspace or root-level package.json** — all commands must be run from the relevant subdirectory.

## Commands (run from subdirectory)

```bash
# Backend
cd backend && npm run dev      # node --watch server.js, port 4000
cd backend && npm start        # production

# Frontend
cd frontend && npm run dev     # Vite dev server, port 5173
cd frontend && npm run build

# Health check
curl http://localhost:4000/health
curl http://localhost:4000/health/firebase
```

No test framework exists yet. No lint scripts in either `package.json`.

## Environment setup

- `backend/.env.example` — requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ANTHROPIC_API_KEY`
- `frontend/.env.example` — requires `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- `FIREBASE_PRIVATE_KEY` in `.env` stores `\n` as literal `\\n`; [`firebaseAdmin.js`](backend/firebaseAdmin.js:3) replaces them at runtime.

## Critical architecture constraints

- **Frontend never touches Firestore directly.** All Firestore reads/writes go through the Express backend (Admin SDK). Firestore security rules deny all client access. Frontend only calls Firebase Auth directly.
- **Every protected API route sets `req.uid` and `req.userEmail`** via [`verifyFirebaseToken`](backend/middleware/verifyFirebaseToken.js) middleware — auth header must be `Bearer <Firebase ID token>`.
- **Claude response contract is strictly enforced** — every call uses `output_config.format.type: 'json_schema'` with inline schema objects (see [`claudeService.js`](backend/services/claudeService.js)). Do not change Claude API calls to return free text.
- **Conversation loop is capped at 4 turns.** Turn 4 injects a `FORCE_FINAL_NOTE` as a phantom user message (not stored in DB history) to make Claude emit `final_plan`. Turn 3 injects `FORCE_CONCEPT_CHOICE_NOTE` if no `concept_choice` has appeared yet.
- **`needed_roles` must use the fixed `ROLE_TAXONOMY`** — both `backend/config/constants.js` and `frontend/src/constants.js` define the same list. These are intentionally duplicated (no shared package); if you add a role, update both files.

## Firestore data model

Collections: `users`, `projects`, `collaboration_requests`, `workspace_tasks`

- `users` doc has two sub-objects: `creator_profile` and `collaborator_profile` — a user can hold both roles simultaneously.
- `collaboration_requests` doc ID is `{projectId}_{role}` (e.g. `abc123_photographer`).
- Matching runs entirely in application code ([`scoring.js`](backend/services/scoring.js)) — Firestore only pre-filters by `roles array-contains 'collaborator'`. Scoring weights: skill 40 / location 20 / availability 20 / aesthetic 10 / budget 10.

## Code style

Both packages use `"type": "module"` — use ES module syntax (`import`/`export`) throughout, no `require()`.

Backend controller pattern: `req.uid` (set by auth middleware) is used for ownership checks; controllers read/write Firestore directly via `db` imported from [`firebaseAdmin.js`](backend/firebaseAdmin.js). No ORM.

Frontend API calls: all live in `frontend/src/api/` and share an [`authHeader()`](frontend/src/api/projects.js:6) helper that fetches the Firebase ID token before every request. Errors bubble as thrown `Error` objects with `body.error` message.

Frontend constants (`frontend/src/constants.js`) must stay in sync with backend constants (`backend/config/constants.js`) — no auto-enforcement exists.
