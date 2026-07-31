#project context 

What this is

An AI platform for content creators (IBM AI Builders Challenge, July 2026, theme: Reimagine Creative Industries with AI). Deadline: July 31, 2026.

Problem: Independent creators have ideas but struggle to turn them into organized, production-ready projects — they juggle separate tools for brainstorming, planning, finding collaborators, and managing shoots.

Solution: A creator types a rough idea. Claude has a short back-and-forth to fill in gaps, then generates a creative brief and production plan. The app then matches the creator with a collaborator (photographer, editor, etc.) and gives them a shared project workspace.

Target user: small social-media creators making short-form video (Reels, TikTok, YouTube Shorts) — one persona, not every type of creator.

Tech stack
Frontend: React + Tailwind
Backend: Node.js + Express
Database/Auth: Firebase Firestore + Firebase Auth
In-app AI: Claude API
Hosting: Vercel (frontend), Render (backend)
Dev tool: IBM Bob (used to build this — separate from the in-app Claude calls, don't conflate the two)
Core user journey (build in this order — each step depends on the last)
Sign up, create profile (creator and/or collaborator: niche, platforms, location, experience, aesthetic tags, budget, skills, availability)
Creator types a rough idea in a chat-style input
Claude asks 1-2 clarifying questions max per turn, infers what it can, forces a final answer by turn 3
Claude returns a creative brief (concept, hook, style, caption) then a production plan (shot list, schedule, props, equipment, needed roles)
Matching engine scores registered collaborators against needed roles (skill 40 / location 20 / availability 20 / aesthetic 10 / budget 10), returns top 3 with a one-line AI explanation each
Matched creator + collaborator get a shared workspace: brief, plan, task checklist
AI conversation contract (important — don't skip this)

Claude must always respond in this exact JSON shape, nothing else:

json
{
  "type": "question" | "final_plan",
  "message": "string",
  "creative_brief": { ... } | null,
  "production_plan": { ... } | null
}

Backend branches on type: question → show as a chat bubble and wait for reply. final_plan → render structured cards, end the conversation loop. Send the full conversation history on every call, not just the latest message — Claude has no memory between API calls.

Cap questions at ~3 turns max. On the final forced turn, tell Claude to fill any remaining gaps with reasonable assumptions rather than asking again — this keeps the demo predictable.

Data model (Firestore collections)
users: role, niche, platforms, location, experience_level, aesthetic_tags, budget_range, skills, availability
projects: raw_idea, conversation_history, constraints, creative_brief, production_plan, needed_roles, status
collaboration_requests: project_id, role_needed, matched_candidates, selected_collaborator, status
workspace_tasks: project_id, title, assigned_to, status, due
Full feature list (build in this priority order)

P0 — core loop, must work perfectly for the demo

Sign up / profiles / idea input / conversational brief + plan / matching / shared workspace (see Core user journey above)

P1 — build once P0 is solid

Ratings & reviews on collaborator profiles
Portfolio uploads (image gallery per collaborator)
Real-time chat inside the shared workspace (beyond the idea-input conversation)
Calendar integration for scheduling shoots

P2 — stretch, only if P0 and P1 are done with time to spare

Mood-board upload (Pinterest/Instagram links or images) that Claude analyzes for aesthetic before generating the brief
Video feedback analysis (upload a draft, Claude critiques pacing/hook/lighting)
Weather-aware shoot planning (pull forecast for the shoot date/location, flag risk)
Trending content/audio recommendations feed — see "Dashboard trending research" below for detail

How to use these tiers under time pressure: if you're behind schedule at any checkpoint, cut from the bottom of P2 first, never from P0. A judge sees a flawless core loop as stronger than a buggy version of everything — so even if you build toward all of this, sequence matters more than feature count.

Dashboard trending research (P2)

When the dashboard loads, it should show what's currently trending — but scoped to that specific creator, not generic trends. Scope comes from their profile: niche, platform(s), and location.

How it works:

On dashboard load, backend calls Claude with web search enabled, passing the creator's niche + platform + location as scope (e.g. "travel content, Instagram Reels, San Francisco")
Claude researches current trends within that scope — trending formats, audio, hooks, or topics relevant to that niche right now — and returns a short structured list (not raw search results)
Dashboard renders this as a card/feed: a handful of trend items, each with a one-line explanation of why it's relevant to this creator specifically

Technical decisions to make before building this:

Caching: don't re-research on every dashboard load — cache results per niche/platform/location combo for a set window (e.g. 6-12 hours) to avoid excessive API calls and latency
Output contract: define a JSON shape for this call too, similar to the brief/plan contract, e.g. {"trends": [{"title": "", "why_relevant": "", "format": ""}]}
Fallback: if web search returns nothing useful for a narrow niche, decide whether to broaden scope (e.g. drop location) or show a "nothing trending right now" state rather than forcing a bad match

This is P2 — build it after the core P0 loop is solid, since it's a nice differentiator but not essential to the demo's core story.

Submission requirements (don't lose track of these)
Public GitHub repo, README with: problem statement, solution, AI approach/architecture, challenge theme, how IBM Bob was used
Completed IBM SkillsBuild required learning module
Project page on challenge platform: team details, repo link, demo video (max 3 minutes)