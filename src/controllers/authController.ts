import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


class AuthController {

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Name is required'
        });
        return;
      }

      // Search for user by fullName or firstName + lastName combination
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { fullName: name },
            { firstName: name },
            { lastName: name }
          ]
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        // Set identifier
        sessionId: `user_${user.id}_${Date.now()}`
      });
    } catch (error) {
      console.error('Error in login controller:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new AuthController(); 