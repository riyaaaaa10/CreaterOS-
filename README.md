# CreatorOS AI

**IBM AI Builders Challenge — July 2026**
**Challenge theme: Reimagine Creative Industries with AI**
**Team: Riya Patel & Hanzalah Kaif**

## Problem statement

Independent creators often have ideas but struggle to turn them into
organized, production-ready projects. They juggle separate tools for
brainstorming, planning, finding collaborators, and managing shoots —
which wastes time and makes creative production difficult, especially
for newer creators without an established team.

## Solution

CreatorOS AI is an AI-powered workspace that takes a creator from a
rough idea through planning, collaboration, and production in one
place. A creator describes what they want to make in plain language;
Claude acts as a creative producer — asking clarifying questions,
proposing distinct concept directions, and only then generating a full
creative brief and shot-by-shot production plan. From there, the
platform matches the creator with a collaborator (photographer,
videographer, editor, etc.) based on skill, location, availability,
and aesthetic fit, and gives both people a shared project workspace.

## Core features

- **Conversational planning** — Claude asks 1-2 clarifying questions at
  a time (with tappable quick-select options), proposes multiple
  distinct creative directions, and generates a full brief + production
  plan (shot list, schedule, script, props/equipment) only once a
  direction is chosen
- **Collaborator matching** — rule-based scoring across skill, location,
  availability, and aesthetic fit, with an AI-generated one-line
  explanation for each match
- **Shared project workspace** — brief, plan, and task checklist visible
  to both the creator and matched collaborator
- **Personalized dashboard** — AI-generated content suggestions based on
  the creator's niche, goals, and profile
- **Content workflow stages** — Idea → Planning → Production → Editing →
  Ready to Publish → Published
- **Content signals** — AI-estimated virality/competition/trend
  indicators on each plan, clearly labeled as estimates (or as
  research-informed, when backed by live search) rather than presented
  as verified analytics

## AI approach and architecture

The app is a three-tier architecture: a React frontend, a Node/Express
backend that owns all business logic and AI orchestration, and Firebase
(Auth + Firestore) for data. The frontend never talks to Firestore
directly — all reads/writes go through the backend, which uses the
Firebase Admin SDK.

Claude (Anthropic API) is called at several points, each with a
strict JSON output contract enforced via schema:
1. **Conversation loop** — turn-by-turn planning conversation, capped
   at a small number of turns before a plan is forced, with a distinct
   step where Claude must propose multiple concept directions rather
   than committing to one interpretation
2. **Match explanation** — a one-sentence rationale for each
   collaborator match, grounded in the actual candidate data
3. **Dashboard recommendations** — content ideas generated from the
   creator's profile

Full prompt text and JSON contracts are documented in
`docs/CreatorOS_AI_Prompts.md`. Project context, architecture
decisions, and known constraints are documented in `AGENTS.md` and
`claude.md`.

## How IBM Bob was used

IBM Bob was used as the primary development tool for a significant
portion of this build. Specifically, Bob was used to:
- Generate project context (`AGENTS.md`) by scanning the existing
  codebase via `/init`
- Plan and implement several feature additions in Plan mode followed by
  Agent mode, including [fill in with your specifics — e.g. "the
  dashboard recommendation card, extended creator profile fields,
  content workflow stages, and content signal generation"]
- Trace and fix a state-machine bug in the conversation flow
  (`forceFinal` turn-cap logic not accounting for the concept-choice
  step), verified through a full regression test of the core
  conversation → matching → workspace flow after the fix
- [Add anything else Bob specifically built — the live-trend-research
  content signals, post-plan conversation continuation, etc., if those
  landed]

## Tech stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js, Express
- **Database & Auth:** Firebase Firestore, Firebase Auth
- **AI:** Anthropic Claude API
- **Hosting (local dev):** Vite dev server (frontend), Express (backend)

## Local development

### Backend

cd backend
npm install
cp .env.example .env # fill in real values
npm run dev


Runs on `http://localhost:4000`. Verify with `curl http://localhost:4000/health`.

### Frontend

cd frontend
npm install
cp .env.example .env # fill in real values
npm run dev


Runs on `http://localhost:5173` (Vite default).

Requires Node.js (LTS 20+) and npm installed locally.

## Project documentation

- `AGENTS.md` — full project context for AI coding assistants
  (architecture, gotchas, data model)
- `claude.md` — original project planning context
- `docs/CreatorOS_AI_Prompts.md` — exact AI system prompts and JSON
  contracts used throughout the app