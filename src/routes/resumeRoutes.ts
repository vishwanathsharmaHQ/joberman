import express from 'express';
import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import resumeController from '../controllers/resumeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    cb(null, path.join(process.cwd(), 'src/uploads'));
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    // Create unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

// Only allow PDF files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
    cb(new Error('Only PDF files are allowed'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// POST /api/resume/upload - Upload and parse a resume PDF
router.post('/upload', upload.single('resume'), (req: Request, res: Response, next: NextFunction) => {
  resumeController.parseResume(req as any, res)
    .catch(next);
});

// POST /api/resume/enhance/:userId - Enhance a user's resume using OpenAI
router.post('/enhance/:userId', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  resumeController.enhanceResume(req, res)
    .catch(next);
});

export default router; 