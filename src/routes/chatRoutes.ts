import express from 'express';
import { Request, Response, NextFunction } from 'express';
import chatController from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/chat/start - Initialize a new chat session
router.post('/start', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  chatController.initializeChat(req, res).catch(next);
});

// POST /api/chat/message - Send a message in a chat session
router.post('/message', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  chatController.sendMessage(req, res).catch(next);
});

// GET /api/chat/history/:sessionId - Get chat history for a session
router.get('/history/:sessionId', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  chatController.getChatHistory(req, res).catch(next);
});

// PUT /api/chat/context - Update chat context
router.put('/context', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  chatController.updateContext(req, res).catch(next);
});

export default router; 