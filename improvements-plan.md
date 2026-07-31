# CreatorOS Improvements Plan

## Overview

Seven improvements to the existing working app (P0 complete through M6). All changes build on
the current codebase — no rebuilds. The conversation contract already uses 4 turns with
`concept_choice`, so items 2 and 3 are already wired at the backend level; they mainly require
frontend surfacing and prompt tuning. Item 7 is a confirmed state bug with a clear fix.

---

## Item 1 — Dashboard visual polish

**Status:** [ ] pending

**Intent:** Replace the current flat list with a card-based layout that has clear visual hierarchy.
The current dashboard is already reasonably structured but the project list is just a plain linked
row — no preview content (only `raw_idea` truncated), no secondary info, and the two sections
(Your projects / Collaborating on) have no visual weight difference.

**Bug investigation first:** The user says it "looks basic and cluttered." The existing code in
`Dashboard.jsx` already has a gradient hero card and section headings — the clutter is likely the
project rows, which show only `raw_idea` (can be very long) and a tiny status badge with no
breathing room.

**Proposed layout (confirm before implementing):**
- Widen content area from `max-w-2xl` to `max-w-3xl` for more breathing room.
- Hero CTA card: keep as-is (gradient, works well).
- "Your projects" section: larger cards with `raw_idea` as a truncated heading (2 lines max),
  status badge top-right, and a secondary line showing the production plan's `refined_concept`
  when status is `plan_ready` (already in the project data). Cards link to the right destination:
  `plan_ready` → `/matches/:id`, `in_progress` → `/idea-input/:id`.
- "Collaborating on" section: show `role_needed` formatted (replace `_` with space, capitalize),
  status badge, and the project_id as a subtle secondary label.
- Empty states: existing `EmptyState` component is fine, keep it.

**Expected outcomes:**
- Project cards show a 2-line idea preview and a secondary concept line when available.
- `plan_ready` projects link directly to `/matches/:id` rather than back to the chat.
- Cards feel visually distinct (subtle border, rounded-2xl, shadow-sm hover state).

**Todo list:**
1. Read `Dashboard.jsx` fully to confirm current card structure.
2. Update project card: 2-line `raw_idea` clamp, status badge repositioned top-right, secondary
   `refined_concept` line conditional on `plan_ready`.
3. Fix link destination: `plan_ready` projects link to `/matches/:projectId`; `in_progress`
   projects continue to link to `/idea-input/:projectId`.
4. Collaborating-on cards: capitalize role, add subtle project_id secondary text.
5. Adjust max-width to `max-w-3xl` and ensure consistent padding.

**Relevant files:**
- `frontend/src/pages/Dashboard.jsx`

---

## Item 2 — Tappable question options

**Status:** [ ] pending

**Investigation finding:** The backend and Claude service already support and return `options` on
`question` type turns (it's in `CONVERSATION_RESPONSE_SCHEMA` in `claudeService.js`). The
`IdeaInput.jsx` already renders `QuestionOptions` and `ConceptChoices` components. The system
prompt already instructs Claude to include 2-4 tappable options on question turns.

**This item is already implemented.** However, if options aren't appearing in practice, it may be
a prompt compliance issue or a schema enforcement gap. Verify:
1. Confirm `options` field is in the schema and marked as required.
2. Confirm the system prompt asks for options on `question` type.
3. If options are already working: nothing to do; document it.
4. If they're not appearing: the fix is adjusting the prompt to be more explicit or checking the
   schema `anyOf` shape allows non-null arrays reliably.

**Current schema for `options`:**
```
"options": { anyOf: [{ type: 'null' }, { type: 'array', items: { type: 'string' } }] }
```
This `anyOf` null-or-array shape can cause Claude to default to `null` instead of providing
options. The more reliable pattern is to remove the `anyOf` and use `{ type: 'array', items:
{ type: 'string' } }` with explicit prompt instruction that it should be empty array `[]` rather
than null when no options apply.

**Expected outcomes:**
- `question` turns reliably include 2–4 tappable option chips.
- "Something else" fallback to free text continues to work.
- No regression in concept_choice display.

**Todo list:**
1. Confirm whether options are currently appearing or not (review schema + prompt).
2. If not reliable: tighten the schema — change `options` from `anyOf [null, array]` to
   `type: array` only (empty `[]` instead of `null`). Update `concept_options` the same way.
3. Update the system prompt to specify `options` should be `[]` (not null) when not applicable,
   and always populated on `question` type turns.
4. Update `IdeaInput.jsx` condition from `lastTurn.options?.length > 0` (already handles empty
   array fine — no change needed there).

**Relevant files:**
- `backend/services/claudeService.js` — `CONVERSATION_RESPONSE_SCHEMA`, `options` field
- `backend/prompts/conversationPrompt.js` — system prompt wording
- `frontend/src/pages/IdeaInput.jsx` — `QuestionOptions` component (likely fine already)

---

## Item 3 — Concept-choice step before the final plan

**Status:** [ ] pending

**Investigation finding:** This is also already implemented at the backend/schema level. The
`concept_choice` type exists in the schema, the `FORCE_CONCEPT_CHOICE_NOTE` is injected at turn 3
if no concept_choice has appeared, and `IdeaInput.jsx` already renders `ConceptChoices`. The
problem described ("sunny, upbeat" → single concept too fast) is a **prompt compliance** issue —
Claude is not reliably offering concept directions even when it should.

The system prompt already includes instructions for `concept_choice`, but they may not be
emphatic enough. Specifically: Claude needs to understand it should propose multiple directions
*as soon as it has enough basics*, not only when forced.

**Expected outcomes:**
- By turn 2 or 3, Claude reliably presents 2-3 distinct concept directions with title + 1-2
  sentence pitch.
- The `concept_choice` step appears before `final_plan` in the happy path.
- The forced injection at turn 3 remains as the safety net.

**Todo list:**
1. Review current system prompt wording in `conversationPrompt.js`.
2. Strengthen the concept_choice instruction: make it explicit that Claude must NOT commit to a
   single interpretation when multiple are plausible — it should always offer a choice.
3. Also strengthen: the `concept_choice` message should include tappable concept option cards
   (the `concept_options` array), not just text — confirm the prompt tells Claude to populate
   `concept_options` with `id`, `title`, `description` objects.
4. Update `docs/CreatorOS_AI_Prompts.md` to stay in sync with any prompt changes.

**Relevant files:**
- `backend/prompts/conversationPrompt.js`
- `docs/CreatorOS_AI_Prompts.md` (sync after prompt change)

---

## Item 4 — Clearer final output

**Status:** [ ] pending

**Intent:** The `PlanSummary` component in `IdeaInput.jsx` currently renders the creative brief
as a `<dl>` with inline `<dt>/<dd>` pairs, and the shot list as a flat `<ul>`. This is readable
but dense. The ask is clear visual separation between brief and plan sections.

**Proposed changes:**
- Creative brief: use a two-column grid for the key fields (Hook, Style, Caption), with
  `refined_concept` as a stand-alone heading, and hashtags as small chips.
- Production plan: shot list as numbered cards (not bare `<li>` items) — each shot gets its own
  mini-card with shot number, description, shot type, and location note on separate lines.
- Add a visual divider between brief and plan sections (already has `border-t`, make it more
  prominent with a section label).
- Props/equipment/outfit suggestions: render as horizontal chip lists rather than plain text.
- Needed roles: existing comma-join is fine, keep as chips.

**Expected outcomes:**
- Brief and plan are clearly separated sections with labelled headers.
- Shot list is scannable — each shot reads as its own unit.
- No new data fetched; only layout changes in `PlanSummary`.

**Todo list:**
1. Refactor `PlanSummary` in `IdeaInput.jsx`:
   - Brief section: `refined_concept` as bold heading, grid for Hook/Style/Caption, hashtag chips.
   - Plan section: shot list as numbered mini-cards, prop/equipment chips, needed-roles chips.
2. Keep all existing data reads the same — only restructure the JSX and Tailwind classes.

**Relevant files:**
- `frontend/src/pages/IdeaInput.jsx` — `PlanSummary` component (lines ~278–315)

---

## Item 5 — Text capitalization standardization

**Status:** [ ] pending

**Convention (confirmed):**
- **h1 / h2 headers and card titles**: Title Case — e.g., "Plan Your Shoot", "Creative Brief", "Shared Workspace"
- **Button text**: Sentence case — e.g., "Start a new idea", "Find collaborators", "Save profile"
- **Body text / AI messages / placeholders / empty states**: Sentence case
- **`text-xs uppercase tracking-wide` labels**: CSS handles display, no content change needed
- **Status badge text**: keep `.capitalize` CSS — already handled

**Specific fixes to apply:**
- `IdeaInput.jsx` h1: "Plan your shoot" → "Plan Your Shoot"
- `Workspace.jsx` h1: "Shared workspace" → "Shared Workspace"
- `MatchResults.jsx` h1: "Matched collaborators" → "Matched Collaborators"
- `Workspace.jsx` h2s: "Brief" → keep, "Team" → keep, "Task checklist" → "Task Checklist"
- `ProfileSetup.jsx` h1: "Set up your profile" → "Set Up Your Profile"
- `Dashboard.jsx` hero h1: "Got a new idea?" → keep (rhetorical, sentence case intentional)
- Any `role.replace('_', ' ')` rendered without CSS capitalize: add string capitalize helper or
  CSS `capitalize` class.

**Expected outcomes:**
- Consistent casing across all visible text elements per the documented convention.
- No substantive layout or logic changes.

**Todo list:**
1. Audit each page (`IdeaInput`, `Dashboard`, `MatchResults`, `Workspace`, `ProfileSetup`) for
   casing inconsistencies against the above convention.
2. Fix any inconsistencies found (likely minor — the current app is mostly consistent).
3. Ensure `role.replace('_', ' ')` outputs are either CSS-capitalized or string-capitalized.

**Relevant files:**
- `frontend/src/pages/IdeaInput.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Workspace.jsx`
- `frontend/src/pages/MatchResults.jsx`
- `frontend/src/pages/ProfileSetup.jsx`

---

## Item 6 — Remove budget range from creator profile

**Status:** [ ] pending

**Investigation finding — downstream dependency (READ THIS BEFORE IMPLEMENTING):**

`scoring.js` line 55 calls:
```js
const budget = scoreBudget(creatorProfile.budget_range, collaboratorProfile.budget_range);
```

`creatorProfile` is fetched from `users/{uid}.creator_profile` in `matchingController.js` line 20.
If a creator has no `budget_range` (because it was removed from the form), `scoreBudget` receives
`undefined` as the first argument → `BUDGET_ORDER.indexOf(undefined)` returns `-1` → the function
returns `0`. **This is a graceful fallback — the score just loses 0-10 points from the budget
dimension, which is already the lowest-weighted factor.**

**Decision:** Removing budget from the creator form is safe. The scoring formula already handles
missing/undefined values with a 0-score fallback. The total out of 100 becomes out of 90 maximum
for unmatched budgets, which is acceptable. Collaborator `budget_range` is still validated and
retained (it makes sense for a collaborator to declare their rates).

**Scope of removal:**
1. Frontend: remove the `budget_range` `<select>` from `ProfileFieldGroup` when rendering the
   creator section (it's already conditionally hidden via `showSkillsAndAvailability` for
   collaborator-only fields — but `budget_range` currently shows for both roles).
2. Backend validation: `profilesController.js` does NOT validate `budget_range` for creator
   profiles (only for collaborator profiles, line 22). No backend change needed.
3. `frontend/src/constants.js`: keep `BUDGET_RANGES` — still used for collaborator profile.
4. `scoring.js`: no change needed (graceful fallback already works).

**Expected outcomes:**
- Creator profile form no longer has a budget range field.
- Existing profiles with `budget_range` set are unaffected (field ignored, not deleted).
- Matching scoring silently awards 0 for budget dimension when creator has no budget set.

**Todo list:**
1. In `ProfileSetup.jsx`, move the `budget_range` select inside the
   `{showSkillsAndAvailability && ...}` block so it only appears for collaborators.
2. Remove `budget_range` from the `emptyFields` object (or leave it — it just won't be shown
   for creators and will submit as empty string, which scores as 0).

**Relevant files:**
- `frontend/src/pages/ProfileSetup.jsx`
- `backend/services/scoring.js` (no change, but verify fallback logic in review)
- `backend/controllers/profilesController.js` (no change needed)

---

## Item 7 — Bug: custom concept description doesn't generate a final plan

**Status:** [ ] pending

**Root cause identified:**

The bug is in how turn counting works when a user picks a concept card vs. types a custom reply.

**Trace:**

1. Project is created (turn 1). Claude responds with a question.
2. User replies (turn 2 → `turnCount` becomes 2). Claude might respond with another question.
3. User replies (turn 3 → `nextTurnNumber = project.turnCount + 1 = 3`).
   - `forceFinal = (3 >= 4) = false`
   - `forceConceptChoice = (3 === 3 && !hasShownConceptChoice) = true` (if not yet shown)
   - Claude responds with `concept_choice`.
   - `applyClaudeResult` stores this, `project.turnCount = 3`, `project.status` stays `in_progress`.

4. **User picks a concept card (happy path):**
   - Frontend calls `submitReply(I'll go with "X": description)`.
   - Backend: `nextTurnNumber = project.turnCount + 1 = 4`.
   - `forceFinal = (4 >= 4) = true` → Claude is forced to emit `final_plan`.
   - `applyClaudeResult` sets `project.status = 'plan_ready'`. ✅

5. **User types a custom concept (bug path):**
   - User clicks "None of these — let me describe something else" → `setShowCustom(true)`.
   - User types a description and submits.
   - Same `submitReply()` call → same backend flow → `nextTurnNumber = 4`, `forceFinal = true`.
   - Claude receives `FORCE_FINAL_NOTE` and should emit `final_plan`. ✅ (This path looks correct.)

**Wait — re-examine.** The issue reported is "This project already has a final plan" error. That
error only comes from this line in `replyToProject`:
```js
if (project.status !== 'in_progress') {
  return res.status(400).json({ error: 'This project already has a final plan' });
}
```

This means `project.status` is NOT `'in_progress'` when the custom reply is submitted. But how?
A `concept_choice` turn does NOT set `status = 'plan_ready'` — only `final_plan` does in
`applyClaudeResult`. So the status should still be `in_progress`...

**The real bug:** Look at `ConceptChoices` in `IdeaInput.jsx`:
```js
onChoose={(concept) => submitReply(`I'll go with "${concept.title}": ${concept.description}`)}
```
When a concept card is tapped, it calls `submitReply`, which hits the backend, Claude emits
`final_plan`, `applyClaudeResult` sets `status = 'plan_ready'`, and the updated project is
returned and stored in React state.

Then the user clicks "None of these — let me describe something else" → `setShowCustom(true)`.
But `lastTurn` in the component is computed as:
```js
const lastTurn = project && project.status === 'in_progress'
  ? parseTurn(project.conversation_history.at(-1)?.content)
  : null;
```

If the user typed something custom **after having already submitted a concept card reply that
returned a `final_plan`** — the status would be `plan_ready`. But that's the double-submit
scenario.

**More likely scenario:** The bug is a turn count mismatch. If `concept_choice` happened at turn 2
(not turn 3), then:
- Turn 3 reply (custom concept): `nextTurnNumber = 3`, `forceFinal = false`, `forceConceptChoice`
  might be false (hasShownConceptChoice is true), so Claude gets no force instruction.
- Claude might choose to respond with another `concept_choice` or `question` rather than
  `final_plan`. If it emits `final_plan`, status becomes `plan_ready`. If the user then tries to
  submit the custom text a *second* time (because the UI didn't update visibly), they hit the
  "already has a final plan" error.

**The actual fix needed:** There is a timing/UX issue. After "None of these" is clicked, the user
submits a custom message. If Claude responds with `final_plan`, the project state updates to
`plan_ready` in React. The "None of these" fallback text input is shown because `showCustom = true`
— but `showCustomInput` is gated on `project?.status === 'in_progress'`. After the `final_plan`
response updates state, `showCustomInput` becomes false, so the form disappears. That part is
fine.

**The actual actual bug:** Re-read the `ConceptChoices` and `QuestionOptions` rendering:
```js
{project.status === 'in_progress' && lastTurn?.type === 'concept_choice' && ...}
```
`lastTurn` uses `project.conversation_history.at(-1)` — the LAST turn. When the user submits a
custom message:
1. Frontend appends the user message to local project state? No — it doesn't. It only calls
   `replyToProject` and then `setProject(updated)`.
2. BUT — consider this: what if the user clicks "None of these" while `showCustom = true`, but
   then the concept card buttons are STILL rendered (because `status === 'in_progress'` and
   `lastTurn?.type === 'concept_choice'` is still true). If the user accidentally taps a concept
   card FIRST (setting status to `plan_ready`), then tries to type a custom reply, they'd see
   "already has a final plan."

**Most likely root cause:** `ConceptChoices.onChoose` calls `submitReply()` which is async. If
the user clicks a concept card AND hits the custom submit in quick succession, the second
`replyToProject` call sees the project is now `in_progress` (first call hasn't returned yet), but
by the time it hits the server, the first call has written `plan_ready` to Firestore. So the
second call gets a stale version. **This is a race condition, not a pure state bug.**

But more simply: the error can be reproduced without racing. The user types a custom concept and
submits — Claude responds with `final_plan` and status becomes `plan_ready`. The component
re-renders with the plan. If `showCustom` is still `true` in local state after this update (because
`setShowCustom(false)` is in `submitReply` but only runs on success), there would still be no
second form visible. So single-path use should work.

**Definitive fix path:** Add a guard on the custom submit: check `project.status === 'in_progress'`
before calling `submitReply`, and ensure `setShowCustom(false)` always runs on any response.
Also add a `disabled` prop check to the custom submit button based on `project.status`.
Additionally, `submitReply` already calls `setShowCustom(false)` on success — verify it also
clears on error. The deeper fix is ensuring the `concept_choice` step correctly sets `forceFinal`
on the NEXT turn regardless of how the user replies.

**The real issue:** When concept_choice is shown at turn 2 (not forced at turn 3), the next reply
(turn 3) has `nextTurnNumber = 3`, `forceFinal = false`. Claude might not emit `final_plan`
spontaneously. It might emit another question. The user gets stuck. The `forceFinal` only triggers
at turn ≥ 4, but concept_choice can appear at turn 2.

**Fix:** Change the `forceFinal` condition in `replyToProject` to also force final when a
concept_choice has already been shown and this is the user's reply to it:
```js
const forceFinal = nextTurnNumber >= 4 || hasShownConceptChoice(project.conversation_history);
```
This means: once concept_choice has been presented, the NEXT user reply always forces `final_plan`.

**Expected outcomes:**
- After any concept selection (card or custom text), Claude always emits `final_plan`.
- "This project already has a final plan" error no longer appears for the custom path.
- No regression for projects that haven't reached concept_choice yet.

**Todo list:**
1. In `projectsController.js`, update the `forceFinal` logic:
   ```js
   const forceFinal = nextTurnNumber >= 4 || hasShownConceptChoice(project.conversation_history);
   ```
   Note: `hasShownConceptChoice` checks the history AFTER the user message is pushed (line 75),
   so it correctly sees the prior assistant concept_choice turn.
2. In `IdeaInput.jsx`, add a defensive check in the custom submit `handleCustomSubmit` — if
   `project.status !== 'in_progress'`, do not call `submitReply`.
3. Verify `setShowCustom(false)` runs on both success and the error path in `submitReply`.

**Relevant files:**
- `backend/controllers/projectsController.js` — `replyToProject`, `forceFinal` logic (line 77)
- `frontend/src/pages/IdeaInput.jsx` — `handleCustomSubmit`, `submitReply`, `ConceptChoices`

---

## Ordering and dependencies

Items can be implemented independently in any order. Recommended sequence:

1. **Item 7 first** (backend bug fix — unblocks reliable concept→plan flow that other items depend on for testing)
2. **Items 2 & 3 together** (both touch `claudeService.js` schema and `conversationPrompt.js`)
3. **Item 4** (PlanSummary layout — depends on reliable plan generation from items 2/3/7)
4. **Item 6** (ProfileSetup change — quick, no backend changes)
5. **Item 5** (casing audit — touches all pages, do last to avoid rework)
6. **Item 1** (Dashboard polish — visual layer, independent)
