import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();

// GET /api/user/profile - Get the authenticated user's profile
router.get('/profile', requireAuth, userController.getProfile);

// GET /api/user/session/validate - Validate user session
router.get('/session/validate', requireAuth, userController.validateSession);

export default router; 