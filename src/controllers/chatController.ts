import { Request, Response } from 'express';
import chatService from '../services/chatService.js';

class ChatController {
  /**
   * Initialize a new chat session
   */
  async initializeChat(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const session = await chatService.initializeChat(userId);

      return res.status(200).json({
        success: true,
        message: 'Chat session initialized',
        data: session
      });
    } catch (error) {
      console.error('Error in initializeChat controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize chat session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a message in a chat session
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId, message } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and message are required'
        });
      }

      // Validate sessionId type
      const sessionIdInt = parseInt(sessionId);
      if (isNaN(sessionIdInt)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid session ID format'
        });
      }

      const result = await chatService.processMessage(sessionIdInt, message);

      return res.status(200).json({
        success: true,
        message: 'Message processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in sendMessage controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process message',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(req: Request, res: Response) {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!sessionId || isNaN(sessionId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid session ID is required'
        });
      }

      const messages = await chatService.getChatHistory(sessionId);

      return res.status(200).json({
        success: true,
        message: 'Chat history retrieved successfully',
        data: messages
      });
    } catch (error) {
      console.error('Error in getChatHistory controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update chat context
   */
  async updateContext(req: Request, res: Response) {
    try {
      const { sessionId, context } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!sessionId || !context) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and context are required'
        });
      }

      const updatedSession = await chatService.updateContext(sessionId, context);

      return res.status(200).json({
        success: true,
        message: 'Chat context updated successfully',
        data: updatedSession
      });
    } catch (error) {
      console.error('Error in updateContext controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update chat context',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ChatController(); 