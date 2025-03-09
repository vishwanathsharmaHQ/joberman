import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extended user type with the new fields
interface EnhancedUser {
  id: number;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  about?: string | null;
  profilePhoto?: string | null;
  linkedinId?: string | null;
  publicIdentifier?: string | null;
  experience?: any;
  education?: any;
  skills?: any;
  originalHeadline?: string | null;
  originalAbout?: string | null;
  originalExperience?: any;
  originalEducation?: any;
  originalSkills?: any;
  headlineEnhancementReason?: string | null;
  aboutEnhancementReason?: string | null;
  experienceEnhancementReason?: any;
  educationEnhancementReason?: any;
  skillsEnhancementReason?: any;
  enhanced?: boolean;
  enhancedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Controller for handling user-related operations
 */
class UserController {
  /**
   * Get the profile of the authenticated user
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // Get user ID from the request object (set by authMiddleware)
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Fetch the user from the database
      const user = await prisma.user.findUnique({
        where: { id: userId }
      }) as unknown as EnhancedUser;

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Return the user profile without sensitive information
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          headline: user.headline,
          location: user.location,
          about: user.about,
          profilePhoto: user.profilePhoto,
          experience: user.experience,
          education: user.education,
          skills: user.skills,
          // Add original resume data fields
          originalHeadline: user.originalHeadline,
          originalAbout: user.originalAbout,
          originalExperience: user.originalExperience,
          originalEducation: user.originalEducation,
          originalSkills: user.originalSkills,
          // Add enhancement reasons
          headlineEnhancementReason: user.headlineEnhancementReason,
          aboutEnhancementReason: user.aboutEnhancementReason,
          experienceEnhancementReason: user.experienceEnhancementReason,
          educationEnhancementReason: user.educationEnhancementReason,
          skillsEnhancementReason: user.skillsEnhancementReason,
          // Add enhancement status
          enhanced: user.enhanced,
          enhancedAt: user.enhancedAt
        }
      });
    } catch (error) {
      console.error('Error in getProfile controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate user session
   */
  async validateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Check if user exists in database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Session is valid
      res.status(200).json({
        success: true,
        message: 'Session is valid'
      });
    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate session'
      });
    }
  }
}

export default new UserController(); 