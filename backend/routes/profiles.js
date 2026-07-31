import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { getMyProfile, upsertMyProfile, getRecommendation } from '../controllers/profilesController.js';

const router = Router();

router.get('/me', verifyFirebaseToken, getMyProfile);
router.put('/me', verifyFirebaseToken, upsertMyProfile);
router.get('/recommendation', verifyFirebaseToken, getRecommendation);

export default router;
