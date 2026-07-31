import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { getWorkspace, createTask, updateTask } from '../controllers/workspaceController.js';

const router = Router();

router.get('/projects/:id/workspace', verifyFirebaseToken, getWorkspace);
router.post('/projects/:id/tasks', verifyFirebaseToken, createTask);
router.patch('/tasks/:id', verifyFirebaseToken, updateTask);

export default router;
