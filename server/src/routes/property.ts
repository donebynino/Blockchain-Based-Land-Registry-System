import express from 'express';
import { 
  getAllProperties, 
  getProperty, 
  registerProperty, 
  transferProperty,
  uploadDocument,
  // Add new imports for multi-sig functions
  initiateMultiSigTransfer,
  signTransfer,
  cancelTransfer,
  getPendingTransfer
} from '../controllers/propertyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Existing routes
router.get('/', getAllProperties);
router.get('/:propertyId', getProperty);
router.post('/', authenticate, registerProperty);
router.post('/transfer', authenticate, transferProperty);
router.post('/:propertyId/documents', authenticate, uploadDocument);

// New routes for multi-signature transfers
router.post('/multi-sig/initiate', authenticate, initiateMultiSigTransfer);
router.post('/multi-sig/:propertyId/sign', authenticate, signTransfer);
router.delete('/multi-sig/:propertyId', authenticate, cancelTransfer);
router.get('/multi-sig/:propertyId', getPendingTransfer);

export default router;