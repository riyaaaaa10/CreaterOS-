import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  createProject,
  replyToProject,
  replyFollowUp,
  getProject,
  listMyProjects,
  updateWorkflowStage,
} from '../controllers/projectsController.js';

const router = Router();

router.get('/', verifyFirebaseToken, listMyProjects);
router.post('/', verifyFirebaseToken, createProject);
router.get('/:id', verifyFirebaseToken, getProject);
router.post('/:id/reply', verifyFirebaseToken, replyToProject);
router.post('/:id/follow-up', verifyFirebaseToken, replyFollowUp);
router.patch('/:id/stage', verifyFirebaseToken, updateWorkflowStage);

export default router;
