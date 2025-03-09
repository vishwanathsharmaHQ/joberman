import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jobAnalysisService from '../services/jobAnalysisService.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Handles all job-related operations including posting management,
 * job analysis, and matching functionality
 */
class JobController {
  /**
   * Creates a new job posting with analyzed data
   */
  async addJobPosting(req: Request, res: Response) {
    try {
      const { title, company, description, url, location } = req.body;

      if (!title || !company || !description) {
        return res.status(400).json({
          error: 'Missing required fields: title, company, and description are required'
        });
      }

      const analyzedData = await jobAnalysisService.analyzeJobPosting(description);

      const jobPosting = await prisma.$transaction(async (tx) => {
        return tx.jobPosting.create({
          data: {
            title,
            company,
            description,
            url,
            location,
            analyzedData
          }
        });
      });

      res.json(jobPosting);
    } catch (error) {
      console.error('Error adding job posting:', error);
      res.status(500).json({ error: 'Failed to add job posting' });
    }
  }

  /**
   * Retrieves a specific job posting by ID
   */
  async getJobPosting(req: Request, res: Response) {
    try {
      const { jobPostingId } = req.params;

      const jobPosting = await prisma.$transaction(async (tx) => {
        return tx.jobPosting.findUnique({
          where: { id: parseInt(jobPostingId) }
        });
      });

      if (!jobPosting) {
        return res.status(404).json({ error: 'Job posting not found' });
      }

      res.json(jobPosting);
    } catch (error) {
      console.error('Error getting job posting:', error);
      res.status(500).json({ error: 'Failed to get job posting' });
    }
  }

  /**
   * Analyzes the match between a user and a job posting,
   * generating match score and recommendations
   */
  async analyzeJobMatch(req: Request, res: Response) {
    try {
      const { userId, jobPostingId } = req.params;

      if (!userId || !jobPostingId) {
        return res.status(400).json({
          error: 'Missing required parameters: userId and jobPostingId'
        });
      }

      const jobPosting = await prisma.$transaction(async (tx) => {
        return tx.jobPosting.findUnique({
          where: { id: parseInt(jobPostingId) }
        });
      });

      if (!jobPosting) {
        return res.status(404).json({ error: 'Job posting not found' });
      }

      const matchAnalysis = await jobAnalysisService.calculateMatchScore(
        parseInt(userId),
        jobPosting.analyzedData
      );

      const recommendations = await jobAnalysisService.generateRecommendations(matchAnalysis);

      const jobAnalysis = await prisma.$transaction(async (tx) => {
        return tx.jobAnalysis.upsert({
          where: {
            userId_jobPostingId: {
              userId: parseInt(userId),
              jobPostingId: parseInt(jobPostingId)
            }
          },
          update: {
            matchScore: matchAnalysis.overallScore || 0,
            analysis: {
              matchAnalysis,
              recommendations
            }
          },
          create: {
            userId: parseInt(userId),
            jobPostingId: parseInt(jobPostingId),
            matchScore: matchAnalysis.overallScore || 0,
            analysis: {
              matchAnalysis,
              recommendations
            }
          }
        });
      });

      res.json(jobAnalysis);
    } catch (error) {
      console.error('Error analyzing job match:', error);
      res.status(500).json({ error: 'Failed to analyze job match' });
    }
  }

  async getJobAnalysisHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const analyses = await prisma.$transaction(async (tx) => {
        return tx.jobAnalysis.findMany({
          where: { userId: parseInt(userId) },
          include: {
            jobPosting: {
              select: {
                title: true,
                company: true,
                location: true,
                url: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      });

      res.json(analyses);
    } catch (error) {
      console.error('Error getting job analysis history:', error);
      res.status(500).json({ error: 'Failed to get job analysis history' });
    }
  }

  async getJobAnalysis(req: Request, res: Response) {
    try {
      const { analysisId } = req.params;

      const analysis = await prisma.$transaction(async (tx) => {
        return tx.jobAnalysis.findUnique({
          where: { id: parseInt(analysisId) },
          include: {
            jobPosting: true
          }
        });
      });

      if (!analysis) {
        return res.status(404).json({ error: 'Job analysis not found' });
      }

      res.json(analysis);
    } catch (error) {
      console.error('Error getting job analysis:', error);
      res.status(500).json({ error: 'Failed to get job analysis' });
    }
  }

  async getRelevantJobs(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing required parameter: userId'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          headline: true,
          experience: true,
          skills: true,
          education: true,
          about: true,
          location: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const jobs = await prisma.jobPosting.findMany({
        select: {
          id: true,
          title: true,
          company: true,
          description: true,
          url: true,
          location: true,
          employmentType: true,
          datePosted: true,
          salary: true,
          organizationLogo: true,
          remoteDerived: true,
          analyzedData: true
        }
      });

      if (!jobs) {
        return res.status(404).json({ error: 'No jobs found' });
      }

      const relevantJobs = jobs.filter((job: any) => {
        if (!job.title) return false;

        // score calculation for job matching
        let score = 0;
        const jobTitle = job.title ? job.title.toLowerCase() : '';
        const jobDescription = job.description ? job.description.toLowerCase() : '';
        const jobCompany = job.company ? job.company.toLowerCase() : '';
        const jobLocation = job.location ? job.location.toLowerCase() : '';

        // Extract user profile data
        const userHeadline = user.headline?.toLowerCase() || '';
        const userLocation = user.location?.toLowerCase() || '';
        const userAbout = user.about?.toLowerCase() || '';
        const userSkills = user.skills ? (Array.isArray(user.skills) ? user.skills : [user.skills]) : [];

        // Extract education details 
        const userEducation = user.education || {};
        let educationKeywords: string[] = [];
        if (Array.isArray(userEducation)) {
          educationKeywords = userEducation.flatMap((edu: any) => {
            const keywords = [];
            if (edu.school) keywords.push(edu.school.toLowerCase());
            if (edu.degree) keywords.push(edu.degree.toLowerCase());
            if (edu.fieldOfStudy) keywords.push(edu.fieldOfStudy.toLowerCase());
            return keywords;
          });
        }

        // Extract experience details for keyword matching
        const userExperience = user.experience || {};
        let experienceKeywords: string[] = [];
        if (Array.isArray(userExperience)) {
          experienceKeywords = userExperience.flatMap((exp: any) => {
            const keywords = [];
            if (exp.position) keywords.push(exp.position.toLowerCase());
            if (exp.companyName) keywords.push(exp.companyName.toLowerCase());
            return keywords;
          });
        }

        // 1. Check for headline match (high weight)
        if (userHeadline) {
          // Extract important keywords from headline
          const headlineWords = userHeadline.split(/\s+/);
          headlineWords.forEach(word => {
            if (word.length > 3) { 
              if (jobTitle.includes(word)) {
                score += 15; 
              }
              if (jobDescription.includes(word)) {
                score += 8; 
              }
            }
          });
        }

        // 2. Check for skills match
        userSkills.forEach(skill => {
          if (typeof skill === 'string') {
            const skillLower = skill.toLowerCase();
            if (jobTitle.includes(skillLower)) {
              score += 10;
            }
            if (jobDescription.includes(skillLower)) {
              score += 5;
            }

            if (job.analyzedData) {
              // Analyze against required skills
              const requiredSkills = job.analyzedData.requiredSkills || [];
              if (Array.isArray(requiredSkills)) {
                for (const requiredSkill of requiredSkills) {
                  if (typeof requiredSkill === 'string' &&
                    requiredSkill.toLowerCase().includes(skillLower)) {
                    score += 15; // Higher weight for exact match with required skills
                    break;
                  }
                }
              }

              // Check for matches in key responsibilities
              const keyResponsibilities = job.analyzedData.keyResponsibilities || [];
              if (Array.isArray(keyResponsibilities)) {
                for (const responsibility of keyResponsibilities) {
                  if (typeof responsibility === 'string' &&
                    responsibility.toLowerCase().includes(skillLower)) {
                    score += 8; 
                    break;
                  }
                }
              }

              // Check for matches in must-have qualifications
              const mustHaveQualifications = job.analyzedData.mustHaveQualifications || [];
              if (Array.isArray(mustHaveQualifications)) {
                for (const qualification of mustHaveQualifications) {
                  if (typeof qualification === 'string' &&
                    qualification.toLowerCase().includes(skillLower)) {
                    score += 12; 
                    break;
                  }
                }
              }
            }
          }
        });

        // 3. Check for about/bio match (medium weight)
        if (userAbout) {
          const aboutWords = userAbout.split(/\s+/);
          const relevantWords = aboutWords.filter(word =>
            word.length > 4 &&
            !['and', 'the', 'that', 'with', 'this', 'for', 'from'].includes(word.toLowerCase())
          );

          relevantWords.forEach(word => {
            const wordLower = word.toLowerCase();
            if (jobDescription.includes(wordLower)) {
              score += 3; 
            }
          });
        }

        // 4. Check for education match
        educationKeywords.forEach(keyword => {
          if (jobTitle.includes(keyword)) {
            score += 8;
          }
          if (jobDescription.includes(keyword)) {
            score += 4;
          }
        });

        // 5. Check for experience match
        experienceKeywords.forEach(keyword => {
          if (jobTitle.includes(keyword)) {
            score += 12;
          }
          if (jobDescription.includes(keyword)) {
            score += 6;
          }
          if (jobCompany.includes(keyword)) {
            score += 10; 
          }
        });

        // 6. Location matching (if available)
        if (userLocation && jobLocation && userLocation.includes(jobLocation)) {
          score += 15; 
        }

        job.matchScore = score;

        return true;
      }) as Array<typeof jobs[0] & { matchScore: number }>;

      // Sort jobs 
      const topJobs = relevantJobs
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 20)
        .map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description ?
            (job.description.length > 300 ? job.description.substring(0, 300) + '...' : job.description)
            : '',
          url: job.url,
          location: job.location,
          matchScore: job.matchScore,
          datePosted: job.datePosted,
          employmentType: job.employmentType,
          salary: job.salary,
          organizationLogo: job.organizationLogo,
          isRemote: job.remoteDerived
        }));

      res.status(200).json(topJobs);
    } catch (error) {
      console.error('Error getting relevant jobs:', error);
      res.status(500).json({ error: 'Failed to get relevant jobs' });
    }
  }

  async generateCoverLetter(req: Request, res: Response) {
    try {
      const { userId, jobPostingId } = req.params;

      if (!userId || !jobPostingId) {
        return res.status(400).json({
          error: 'Missing required parameters: userId and jobPostingId'
        });
      }

      // Get user profile
      const user = await prisma.user.findUnique({ 
        where: { id: parseInt(userId) },
        select: {
          fullName: true,
          email: true,
          location: true,
          about: true,
          skills: true,
          education: true,
          experience: true,
          headline: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get job posting
        const jobPosting = await prisma.jobPosting.findUnique({
        where: { id: parseInt(jobPostingId) },
        select: {
          title: true,
          company: true,
          description: true,
          url: true,
          location: true,
          employmentType: true,
          salary: true,
          organizationLogo: true,
          remoteDerived: true,
          analyzedData: true
        } 
      });

      if (!jobPosting) {
        return res.status(404).json({ error: 'Job posting not found' });
      } 

      // Generate cover letter
      const coverLetter = await jobAnalysisService.generateCoverLetter(user, jobPosting);

      res.status(200).json({ coverLetter });
    } catch (error) { 
      console.error('Error generating cover letter:', error);
      res.status(500).json({ error: 'Failed to generate cover letter' });
    }
  }

  async getJobsFromRapidAPIAndPostToPostgres(req: Request, res: Response) {
    try {
      const { title_filter, location_filter, description_filter, limit = 10 } = req.query;

      // Validate required parameters
      if (!title_filter) {
        return res.status(400).json({
          error: 'Missing required parameter: title_filter'
        });
      }

      // Set up API request parameters
      const encodedTitle = encodeURIComponent(String(title_filter));
      const encodedLocation = location_filter ? encodeURIComponent(String(location_filter)) : '';
      const encodedDescription = description_filter ? encodeURIComponent(String(description_filter)) : '%7Bjob%20description%7D';

      // Construct the API URL
      let apiUrl = `https://linkedin-job-search-api.p.rapidapi.com/active-jb-24h?title_filter=${encodedTitle}`;

      // Add optional parameters if provided
      if (encodedLocation) {
        apiUrl += `&location_filter=${encodedLocation}`;
      }
      if (encodedDescription) {
        apiUrl += `&description_filter=${encodedDescription}`;
      }

      // Set up request options
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '32dfb698c8mshf8cfb4e4644eba4p1453e4jsnbf2db16c02ba',
          'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com'
        }
      };

      // Make the API request
      console.log(`Fetching jobs from API with URL: ${apiUrl}`);
      const response = await fetch(apiUrl, options);

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({
          error: `Failed to fetch jobs from API: ${response.statusText}`
        });
      }

      const jobsData = await response.json();

      if (!Array.isArray(jobsData)) {
        console.error('API response is not an array');
        return res.status(500).json({
          error: 'Invalid API response format'
        });
      }

      console.log(`Retrieved ${jobsData.length} jobs from API`);

      // Limit the number of jobs to process if specified
      const jobsToProcess = limit ? jobsData.slice(0, Number(limit)) : jobsData;

      // Store jobs in database using a transaction
      const results = await prisma.$transaction(async (tx) => {
        const savedJobs = [];

        for (const job of jobsToProcess) {
          // Check if job already exists by apiId
          const existingJob = await tx.jobPosting.findFirst({
            where: {
              apiId: {
                equals: job.id
              }
            }
          });

          if (existingJob) {
            console.log(`Job with API ID ${job.id} already exists, skipping`);
            savedJobs.push(existingJob);
            continue;
          }

          // Format dates
          const datePosted = job.date_posted ? new Date(job.date_posted) : null;
          const dateCreated = job.date_created ? new Date(job.date_created) : null;
          const dateValidThrough = job.date_validthrough ? new Date(job.date_validthrough) : null;

          // Create new job posting
          const jobPosting = await tx.jobPosting.create({
            data: {
              // Map API response fields to our schema
              apiId: job.id.toString(),
              title: job.title,
              company: job.organization,
              description: job.description || '', // API response doesn't contain description
              url: job.url,
              location: job.locations_derived ? job.locations_derived[0] : null,
              datePosted,
              dateCreated,
              dateValidThrough,
              organizationUrl: job.organization_url,
              locationsRaw: job.locations_raw,
              locationType: job.location_type,
              locationRequirements: job.location_requirements_raw,
              salary: job.salary_raw,
              employmentType: job.employment_type,
              sourceType: job.source_type,
              source: job.source,
              sourceDomain: job.source_domain,
              organizationLogo: job.organization_logo,
              citiesDerived: job.cities_derived,
              regionsDerived: job.regions_derived,
              countriesDerived: job.countries_derived,
              locationsDerived: job.locations_derived,
              timezonesDerived: job.timezones_derived,
              latsDerived: job.lats_derived,
              lngsDerived: job.lngs_derived,
              remoteDerived: job.remote_derived,
              linkedinOrgInfo: {
                employees: job.linkedin_org_employees,
                url: job.linkedin_org_url,
                size: job.linkedin_org_size,
                slogan: job.linkedin_org_slogan,
                industry: job.linkedin_org_industry,
                followers: job.linkedin_org_followers,
                headquarters: job.linkedin_org_headquarters,
                type: job.linkedin_org_type,
                foundedDate: job.linkedin_org_foundeddate,
                specialties: job.linkedin_org_specialties,
                locations: job.linkedin_org_locations,
                description: job.linkedin_org_description,
                recruitmentAgency: job.linkedin_org_recruitment_agency_derived
              }
            }
          });

          savedJobs.push(jobPosting);
        }

        return savedJobs;
      });

      res.status(200).json({
        success: true,
        count: results.length,
        jobs: results
      });
    } catch (error) {
      console.error('Error fetching and storing jobs:', error);
      res.status(500).json({ error: 'Failed to fetch and store jobs' });
    }
  }
}

export default new JobController(); 