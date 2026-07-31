import { db } from '../firebaseAdmin.js';
import { getNextConversationTurn, getFollowUpResponse } from '../services/claudeService.js';

function hasShownConceptChoice(conversationHistory) {
  return conversationHistory.some((turn) => {
    if (turn.role !== 'assistant') return false;
    try {
      return JSON.parse(turn.content).type === 'concept_choice';
    } catch {
      return false;
    }
  });
}

function applyClaudeResult(project, parsed, rawText, turnCount) {
  project.conversation_history.push({ role: 'assistant', content: rawText });
  project.turnCount = turnCount;

  if (parsed.type === 'final_plan') {
    project.status = 'plan_ready';
    project.creative_brief = parsed.creative_brief;
    project.production_plan = parsed.production_plan;
    project.needed_roles = parsed.production_plan.needed_roles;
  }

  return project;
}

export async function createProject(req, res) {
  const { rawIdea } = req.body;
  if (!rawIdea || typeof rawIdea !== 'string' || !rawIdea.trim()) {
    return res.status(400).json({ error: 'rawIdea is required' });
  }

  const project = {
    creatorId: req.uid,
    status: 'in_progress',
    turnCount: 0,
    raw_idea: rawIdea,
    conversation_history: [{ role: 'user', content: rawIdea }],
    constraints: null,
    creative_brief: null,
    production_plan: null,
    needed_roles: null,
  };

  try {
    const { parsed, raw } = await getNextConversationTurn(project.conversation_history);
    applyClaudeResult(project, parsed, raw, 1);
  } catch (err) {
    return res.status(502).json({ error: `Claude call failed: ${err.message}` });
  }

  const docRef = db.collection('projects').doc();
  await docRef.set(project);
  res.status(201).json({ id: docRef.id, ...project });
}

export async function replyToProject(req, res) {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const docRef = db.collection('projects').doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Project not found' });

  const project = doc.data();
  if (project.creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });
  if (project.status !== 'in_progress') {
    return res.status(400).json({ error: 'This project already has a final plan' });
  }

  project.conversation_history.push({ role: 'user', content: message });
  const nextTurnNumber = project.turnCount + 1;
  // Also force final once concept_choice has been shown — guarantees that whichever
  // turn the user replies to it on (card tap OR custom text), Claude emits final_plan.
  const forceFinal = nextTurnNumber >= 4 || hasShownConceptChoice(project.conversation_history);
  const forceConceptChoice =
    !forceFinal && nextTurnNumber === 3 && !hasShownConceptChoice(project.conversation_history);

  try {
    const { parsed, raw } = await getNextConversationTurn(project.conversation_history, {
      forceFinal,
      forceConceptChoice,
    });
    applyClaudeResult(project, parsed, raw, nextTurnNumber);
  } catch (err) {
    return res.status(502).json({ error: `Claude call failed: ${err.message}` });
  }

  await docRef.set(project);
  res.json({ id: docRef.id, ...project });
}

export async function getProject(req, res) {
  const doc = await db.collection('projects').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Project not found' });
  const project = doc.data();
  if (project.creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });
  res.json({ id: doc.id, ...project });
}

export async function listMyProjects(req, res) {
  const snapshot = await db.collection('projects').where('creatorId', '==', req.uid).get();
  const projects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(projects);
}

const VALID_WORKFLOW_STAGES = [
  'idea', 'planning', 'production', 'editing', 'ready_to_publish', 'published',
];

export async function replyFollowUp(req, res) {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const docRef = db.collection('projects').doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Project not found' });

  const project = doc.data();
  if (project.creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });
  if (project.status !== 'plan_ready') {
    return res.status(400).json({ error: 'Follow-up is only available after a final plan is ready' });
  }

  // followup_history is a separate array from conversation_history.
  // It never affects the brief-generation state machine.
  const followUpHistory = project.followup_history || [];
  followUpHistory.push({ role: 'user', content: message.trim() });

  let parsed;
  let raw;
  try {
    ({ parsed, raw } = await getFollowUpResponse(
      followUpHistory,
      project.creative_brief,
      project.production_plan,
    ));
  } catch (err) {
    return res.status(502).json({ error: `Follow-up call failed: ${err.message}` });
  }

  followUpHistory.push({ role: 'assistant', content: raw });

  const update = { followup_history: followUpHistory };
  if (parsed.type === 'updated_plan') {
    update.creative_brief = parsed.creative_brief;
    update.production_plan = parsed.production_plan;
    update.needed_roles = parsed.production_plan.needed_roles;
  }

  await docRef.update(update);
  res.json({ id: req.params.id, ...project, ...update, followup_response: parsed });
}

export async function updateWorkflowStage(req, res) {
  const { workflow_stage } = req.body;
  if (!VALID_WORKFLOW_STAGES.includes(workflow_stage)) {
    return res.status(400).json({ error: `workflow_stage must be one of: ${VALID_WORKFLOW_STAGES.join(', ')}` });
  }

  const docRef = db.collection('projects').doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Project not found' });
  if (doc.data().creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });

  await docRef.update({ workflow_stage });
  res.json({ id: req.params.id, workflow_stage });
}
