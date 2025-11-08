import { Router } from 'express';
import { QRController } from '../controllers/qrController';
import { authenticate, requireVerified } from '../middleware/auth';

const router = Router();

router.post('/generate', authenticate, requireVerified, QRController.generateQRCode);
router.post('/validate', authenticate, QRController.validateQRCode);
router.post('/pay', authenticate, requireVerified, QRController.processQRPayment);
router.get('/my-codes', authenticate, QRController.getUserQRCodes);
router.delete('/:qrCodeId', authenticate, QRController.deactivateQRCode);

export default router;
