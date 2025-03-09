import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pdfParserService from '../services/pdfParserService.js';
import mistralResumeParser from '../services/mistralResumeParser.js';
import userDatabaseService from '../services/userDatabaseService.js';
import openAIService from '../services/openAIService.js';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Correctly extend the Express Request type to include multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Type for user with enhanced properties
interface UserWithEnhancement {
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
 * Controller for handling resume uploads and parsing
 */
class ResumeController {
  /**
   * Parse an uploaded resume PDF file using basic pdf-parse
   */
  async parseResumeBasic(req: MulterRequest, res: Response) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Get the file path
      const filePath = req.file.path;

      // Parse the PDF
      const userData = await pdfParserService.parseResume(filePath);

      // Store user data in the database
      const storedUser = await userDatabaseService.storeUserData(userData);

      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });

      // Return the parsed data
      return res.status(200).json({ 
        success: true, 
        message: 'Resume parsed successfully (basic parser)',
        data: userData,
        storedUser
      });
    } catch (error) {
      console.error('Error in parseResumeBasic controller:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to parse resume',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Parse an uploaded resume PDF file using Mistral AI's advanced OCR and document understanding
   */
  async parseResume(req: MulterRequest, res: Response) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Check if MISTRAL_API_KEY is set
      if (!process.env.MISTRAL_API_KEY) {
        // Fall back to basic parser if Mistral API key is not available
        console.warn('MISTRAL_API_KEY not set, falling back to basic parser');
        return this.parseResumeBasic(req, res);
      }

      // Get the file path
      const filePath = req.file.path;

      try {
        // Parse the PDF with Mistral AI
        const userData = await mistralResumeParser.parseResume(filePath);

        // Store user data in the database
        const storedUser = await userDatabaseService.storeUserData(userData);

        // Clean up the temporary file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });

        // Return the parsed data
        return res.status(200).json({ 
          success: true, 
          message: 'Resume parsed successfully with Mistral AI',
          data: userData,
          storedUser
        });
      } catch (mistralError) {
        console.error('Error with Mistral AI parser, falling back to basic parser:', mistralError);
        
        // If Mistral AI parsing fails, fall back to basic parser
        return this.parseResumeBasic(req, res);
      }
    } catch (error) {
      console.error('Error in parseResume controller:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to parse resume',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Enhance a user's resume using OpenAI
   */
  async enhanceResume(req: Request, res: Response) {
    try {
      // Get user ID from request parameters or body
      const userId = parseInt(req.params.userId || req.body.userId);

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid user ID is required'
        });
      }

      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { id: userId }
      }) as unknown as UserWithEnhancement;

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found'
        });
      }

      // Check if the user has enough data to enhance
      if (!user.experience || 
          (typeof user.experience === 'object' && Object.keys(user.experience).length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Not enough resume data to enhance. Please upload a more complete resume first.'
        });
      }

      // Check if OPENAI_API_KEY is set
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: 'OpenAI API key not configured'
        });
      }

      try {
        // Before enhancing, save the original resume data if this is the first enhancement
        if (!user.enhanced) {
          // Store original resume data
          await prisma.user.update({
            where: { id: userId },
            data: {
              originalHeadline: user.headline,
              originalAbout: user.about,
              originalExperience: user.experience,
              originalEducation: user.education,
              originalSkills: user.skills,
            } as Prisma.UserUpdateInput
          });
        }

        // Enhance resume using OpenAI
        console.log('Enhancing resume for user:', userId);
        const enhancedResume = await openAIService.enhanceResume(user);
        console.log('Resume enhanced successfully');

        // Update user data in database with enhanced resume
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            headline: enhancedResume.headline || user.headline,
            about: enhancedResume.about || user.about,
            experience: enhancedResume.experience || user.experience || {},
            education: enhancedResume.education || user.education || {},
            skills: enhancedResume.skills || user.skills || {},
            headlineEnhancementReason: enhancedResume.headlineEnhancementReason || null,
            aboutEnhancementReason: enhancedResume.aboutEnhancementReason || null,
            experienceEnhancementReason: enhancedResume.experienceEnhancementReason || null,
            educationEnhancementReason: enhancedResume.educationEnhancementReason || null,
            skillsEnhancementReason: enhancedResume.skillsEnhancementReason || null,
            enhanced: true,
            enhancedAt: new Date()
          } as Prisma.UserUpdateInput
        });

        // Return the enhanced resume data
        return res.status(200).json({ 
          success: true, 
          message: 'Resume enhanced successfully',
          data: enhancedResume,
          user: updatedUser
        });
      } catch (openAIError) {
        console.error('Error enhancing resume with OpenAI:', openAIError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to enhance resume with AI service',
          error: openAIError instanceof Error ? openAIError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error in enhanceResume controller:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process resume enhancement request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ResumeController(); 