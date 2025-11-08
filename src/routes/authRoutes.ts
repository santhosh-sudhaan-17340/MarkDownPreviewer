import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-pin', authenticate, AuthController.verifyPin);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
