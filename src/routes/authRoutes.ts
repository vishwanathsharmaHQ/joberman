import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login - User login with name only
router.post('/login', authController.login);

export default router; 