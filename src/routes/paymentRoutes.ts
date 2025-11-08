import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticate, requireVerified } from '../middleware/auth';

const router = Router();

router.post('/transfer', authenticate, requireVerified, PaymentController.processPayment);
router.get('/transactions', authenticate, PaymentController.getTransactionHistory);
router.get('/transactions/:transactionId', authenticate, PaymentController.getTransactionById);

export default router;
