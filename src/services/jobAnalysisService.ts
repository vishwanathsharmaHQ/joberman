import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class JobAnalysisService {
  /**
   * Analyze a job posting and extract key information
   * @param jobDescription - The full job posting text
   * @returns Structured job data
   */
  async analyzeJobPosting(jobDescription: string) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a job analysis expert. Extract and structure the following information from job postings:
            1. Required skills (technical and soft skills)
            2. Experience level requirements
            3. Key responsibilities
            4. Must-have qualifications
            5. Nice-to-have qualifications
            6. Company culture indicators
            7. Potential red flags (if any)
            
            Return the data in a structured JSON format with the following fields:
            {
              "requiredSkills": ["skill1", "skill2", ...], // Always include this field with an array of strings
              "experienceLevel": "string description",
              "keyResponsibilities": ["responsibility1", "responsibility2", ...],
              "mustHaveQualifications": ["qualification1", "qualification2", ...],
              "niceToHaveQualifications": ["qualification1", "qualification2", ...],
              "companyCulture": ["culture indicator1", "culture indicator2", ...],
              "potentialRedFlags": ["red flag1", "red flag2", ...] // Can be empty array if none found
            }
            
            Ensure you always include the requiredSkills field as an array of specific individual skills, not paragraphs.`
          },
          {
            role: "user",
            content: jobDescription
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, structured output
        response_format: { type: "json_object" }
      });

      const responseData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure requiredSkills exists and is an array
      if (!responseData.requiredSkills || !Array.isArray(responseData.requiredSkills)) {
        responseData.requiredSkills = [];
      }
      
      return responseData;
    } catch (error) {
      console.error('Error analyzing job posting:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between a user's profile and a job posting
   * @param userId - The user's ID
   * @param jobData - The analyzed job posting data
   * @returns Match score and detailed analysis
   */
  async calculateMatchScore(userId: number, jobData: any) {
    try {
      // Get user's profile
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          experience: true,
          skills: true,
          education: true,
          about: true
        }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a job match analysis expert. Compare the candidate's profile with the job requirements and provide:
            1. Overall match score (0-100)
            2. Detailed breakdown of matches and gaps
            3. Specific recommendations for improvement
            
            Structure your response as a JSON object with these EXACT fields:
            {
              "overallScore": number from 0-100,
              "matchedSkills": ["skill1", "skill2", ...],
              "skillGaps": ["skill1", "skill2", ...],
              "experienceMatch": detailed assessment of experience match,
              "educationMatch": detailed assessment of education match,
              "strengths": ["strength1", "strength2", ...],
              "weaknesses": ["weakness1", "weakness2", ...]
            }
            
            Ensure you extract and list SPECIFIC skills in the matchedSkills and skillGaps arrays.
            The skillGaps array should contain specific technologies, tools, or skills that are mentioned in the job requirements but not present in the candidate's profile.`
          },
          {
            role: "user",
            content: JSON.stringify({
              jobData,
              userProfile
            })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error calculating match score:', error);
      throw error;
    }
  }

  /**
   * Generate improvement recommendations based on match analysis
   * @param matchAnalysis - The result of match score calculation
   * @returns Detailed recommendations
   */
  async generateRecommendations(matchAnalysis: any) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a career advisor and resume specialist.
            Analyze the provided job match analysis and provide specific, actionable recommendations.
            Format your response as a JSON object with the following EXACT structure:
            {
              "strengths": ["strength1", "strength2", ...],
              "improvementAreas": ["area1", "area2", ...],
              "recommendations": ["specific actionable recommendation 1", "specific actionable recommendation 2", ...]
            }
            
            For recommendations, provide at least 3 very specific, actionable pieces of advice.
            Each recommendation should:
            1. Address a specific skill gap or improvement area
            2. Provide a concrete action the candidate can take
            3. Be directly relevant to improving their chances for this specific job`
          },
          {
            role: "user",
            content: JSON.stringify(matchAnalysis)
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  async generateCoverLetter(user: any, jobPosting: any) {
    try {
      // Extract relevant information from user profile and job posting
      const userInfo = {
        skills: user.skills || [],
        experience: user.experience || [],
        education: user.education || [],
        achievements: user.achievements || [],
        location: user.location || '',
        fullName: user.fullName || '',
        email: user.email || ''
      };

      const jobInfo = {
        title: jobPosting.title || '',
        company: jobPosting.company || '',
        description: jobPosting.description || '',
        requirements: jobPosting.analyzedData?.keyRequirements || [],
        location: jobPosting.location || '',
        employmentType: jobPosting.employmentType || ''
      };

      // Generate cover letter using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional cover letter writer with expertise in crafting compelling, personalized cover letters.
            Create a professional cover letter for the provided candidate applying to the specified job.
            The cover letter should:
            1. Be personalized and specifically connect the candidate's experience to the job requirements
            2. Highlight relevant skills and achievements that make the candidate a good fit
            3. Be professional in tone but engaging and compelling
            4. Be properly formatted as a business letter with appropriate greeting and closing
            5. Be approximately 300-400 words in length
            6. Include placeholders for contact information at the top`
          },
          {
            role: "user",
            content: JSON.stringify({
              user: userInfo,
              job: jobInfo
            })
          }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  }
}

export default new JobAnalysisService(); 