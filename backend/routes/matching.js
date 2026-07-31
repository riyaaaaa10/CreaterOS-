import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  createMatchesForProject,
  getMatchesForProject,
  selectCollaborator,
  listMyCollaborations,
} from '../controllers/matchingController.js';

const router = Router();

router.post('/projects/:id/match', verifyFirebaseToken, createMatchesForProject);
router.get('/projects/:id/matches', verifyFirebaseToken, getMatchesForProject);
router.post('/collaboration-requests/:id/select', verifyFirebaseToken, selectCollaborator);
router.get('/my-collaborations', verifyFirebaseToken, listMyCollaborations);

export default router;
