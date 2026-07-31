import { db } from '../firebaseAdmin.js';
import { matchCollaboratorsForRole } from '../services/matchingService.js';

export async function createMatchesForProject(req, res) {
  const projectDoc = await db.collection('projects').doc(req.params.id).get();
  if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });

  const project = projectDoc.data();
  if (project.creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });
  if (project.status !== 'plan_ready') {
    return res.status(400).json({ error: 'Project does not have a final plan yet' });
  }

  const roles = [...new Set(project.needed_roles || [])];
  if (roles.length === 0) {
    return res.status(400).json({ error: 'This project has no needed_roles to match against' });
  }

  const creatorDoc = await db.collection('users').doc(req.uid).get();
  const creatorProfile = creatorDoc.exists ? creatorDoc.data().creator_profile || {} : {};

  const projectSummary = {
    concept: project.creative_brief?.refined_concept || project.raw_idea,
    niche: creatorProfile.niche || null,
  };

  const results = [];

  for (const role of roles) {
    let matched_candidates = [];
    try {
      matched_candidates = await matchCollaboratorsForRole({
        creatorId: req.uid,
        creatorProfile,
        role,
        projectSummary,
      });
    } catch (err) {
      return res.status(502).json({ error: `Matching failed for role "${role}": ${err.message}` });
    }

    const docId = `${req.params.id}_${role}`;
    const collaborationRequest = {
      project_id: req.params.id,
      role_needed: role,
      matched_candidates,
      selected_collaborator: null,
      status: 'pending',
    };
    await db.collection('collaboration_requests').doc(docId).set(collaborationRequest);
    results.push({ id: docId, ...collaborationRequest });
  }

  res.json(results);
}

export async function getMatchesForProject(req, res) {
  const projectDoc = await db.collection('projects').doc(req.params.id).get();
  if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
  if (projectDoc.data().creatorId !== req.uid) return res.status(403).json({ error: 'Not your project' });

  const snapshot = await db
    .collection('collaboration_requests')
    .where('project_id', '==', req.params.id)
    .get();

  res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function selectCollaborator(req, res) {
  const { collaboratorId } = req.body;
  if (!collaboratorId) return res.status(400).json({ error: 'collaboratorId is required' });

  const reqDocRef = db.collection('collaboration_requests').doc(req.params.id);
  const reqDoc = await reqDocRef.get();
  if (!reqDoc.exists) return res.status(404).json({ error: 'Collaboration request not found' });

  const collaborationRequest = reqDoc.data();
  const projectDoc = await db.collection('projects').doc(collaborationRequest.project_id).get();
  if (!projectDoc.exists || projectDoc.data().creatorId !== req.uid) {
    return res.status(403).json({ error: 'Not your project' });
  }

  const isValidCandidate = collaborationRequest.matched_candidates.some(
    (c) => c.collaboratorId === collaboratorId,
  );
  if (!isValidCandidate) {
    return res.status(400).json({ error: 'collaboratorId is not among the matched candidates' });
  }

  await reqDocRef.update({ selected_collaborator: collaboratorId, status: 'selected' });
  res.json({ id: reqDoc.id, ...collaborationRequest, selected_collaborator: collaboratorId, status: 'selected' });
}

export async function listMyCollaborations(req, res) {
  const snapshot = await db
    .collection('collaboration_requests')
    .where('selected_collaborator', '==', req.uid)
    .get();
  res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
}
