import { db } from '../firebaseAdmin.js';

// Backend-mediated access control (consistent with how projects/matching
// already work — no direct client Firestore access, so this check lives
// here rather than in Firestore security rules). Revisit denormalizing
// creatorId/collaboratorId onto each doc if a P1 feature (e.g. real-time
// chat) ever needs the client SDK to read Firestore directly.
async function hasWorkspaceAccess(uid, projectId, project) {
  if (project.creatorId === uid) return true;
  const snapshot = await db
    .collection('collaboration_requests')
    .where('project_id', '==', projectId)
    .where('selected_collaborator', '==', uid)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function getWorkspace(req, res) {
  const projectId = req.params.id;
  const projectDoc = await db.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
  const project = projectDoc.data();

  if (!(await hasWorkspaceAccess(req.uid, projectId, project))) {
    return res.status(403).json({ error: 'You do not have access to this workspace' });
  }

  const [tasksSnapshot, requestsSnapshot] = await Promise.all([
    db.collection('workspace_tasks').where('project_id', '==', projectId).get(),
    db.collection('collaboration_requests').where('project_id', '==', projectId).get(),
  ]);

  res.json({
    project: { id: projectId, ...project },
    tasks: tasksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
    collaborationRequests: requestsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}

export async function createTask(req, res) {
  const projectId = req.params.id;
  const { title, assigned_to, due } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const projectDoc = await db.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
  const project = projectDoc.data();

  if (!(await hasWorkspaceAccess(req.uid, projectId, project))) {
    return res.status(403).json({ error: 'You do not have access to this workspace' });
  }

  const task = {
    project_id: projectId,
    title: title.trim(),
    assigned_to: assigned_to || null,
    status: 'todo',
    due: due || null,
  };
  const docRef = await db.collection('workspace_tasks').add(task);
  res.status(201).json({ id: docRef.id, ...task });
}

export async function updateTask(req, res) {
  const taskId = req.params.id;
  const taskDocRef = db.collection('workspace_tasks').doc(taskId);
  const taskDoc = await taskDocRef.get();
  if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
  const task = taskDoc.data();

  const projectDoc = await db.collection('projects').doc(task.project_id).get();
  if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
  const project = projectDoc.data();

  if (!(await hasWorkspaceAccess(req.uid, task.project_id, project))) {
    return res.status(403).json({ error: 'You do not have access to this workspace' });
  }

  const updates = {};
  if (typeof req.body.status === 'string') updates.status = req.body.status;
  if (typeof req.body.title === 'string') updates.title = req.body.title;
  if ('assigned_to' in req.body) updates.assigned_to = req.body.assigned_to;
  if ('due' in req.body) updates.due = req.body.due;

  await taskDocRef.update(updates);
  res.json({ id: taskId, ...task, ...updates });
}
