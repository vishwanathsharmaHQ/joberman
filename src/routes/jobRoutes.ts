import express, { Request, Response } from 'express';
import jobController from '../controllers/jobController.js';

const router = express.Router();

// Job posting routes
router.post('/postings', async (req: Request, res: Response) => {
  await jobController.addJobPosting(req, res);
});

router.get('/postings/:jobPostingId', async (req: Request, res: Response) => {
  await jobController.getJobPosting(req, res);
});


// Get relevant jobs for a user
router.get('/relevant/:userId', async (req: Request, res: Response) => {
  await jobController.getRelevantJobs(req, res);
});

// Job analysis routes
router.post('/analyze/:userId/:jobPostingId', async (req: Request, res: Response) => {
  await jobController.analyzeJobMatch(req, res);
});

router.get('/analysis/history/:userId', async (req: Request, res: Response) => {
  await jobController.getJobAnalysisHistory(req, res);
});

router.get('/analysis/:analysisId', async (req: Request, res: Response) => {
  await jobController.getJobAnalysis(req, res);
});

// New route for fetching jobs from RapidAPI and storing them in database
router.get('/fetch-from-api', async (req: Request, res: Response) => {
  await jobController.getJobsFromRapidAPIAndPostToPostgres(req, res);
});

router.get('/generate-cover-letter/:userId/:jobPostingId', async (req: Request, res: Response) => {

await jobController.generateCoverLetter(req, res);



});




export default router; 