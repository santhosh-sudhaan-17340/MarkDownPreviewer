import { Router } from 'express';
import { DisputeController } from '../controllers/disputeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, DisputeController.createDispute);
router.get('/', authenticate, DisputeController.getUserDisputes);
router.get('/statistics', authenticate, DisputeController.getStatistics);
router.get('/:disputeId', authenticate, DisputeController.getDisputeById);

export default router;
