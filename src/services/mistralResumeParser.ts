import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the user data structure based on userData.js
interface Experience {
  position: string;
  company_url: string;
  company_image: string;
  company_name: string;
  location: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  duration: string;
}

interface UserData {
  fullName: string;
  linkedin_internal_id: string;
  first_name: string;
  last_name: string;
  public_identifier: string;
  background_cover_image_url: string;
  profile_photo: string;
  headline: string;
  location: string;
  about: string;
  experience: Experience[];
  education: any[];
  articles: any[];
  description: {
    description1: string;
    description1_link: string;
    description2: string;
    description2_link: string | null;
  };
  activities: any[];
  volunteering: any[];
  certification: any[];
  people_also_viewed: any[];
  similar_profiles: any[];
  recommendations: any[];
  publications: any[];
  courses: any[];
  languages: any[];
  organizations: any[];
  projects: any[];
  awards: any[];
  score: any[];
}

// Define types for Mistral API content
interface ContentText {
  type: 'text';
  text: string;
}

interface ContentDocumentUrl {
  type: 'document_url';
  documentUrl: string;
}

type ContentChunk = ContentText | ContentDocumentUrl;

class MistralResumeParser {
  private client: Mistral;
  
  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable not set');
    }
    
    this.client = new Mistral({ apiKey });
  }

  /**
   * Sleep for a given number of milliseconds
   * @param ms Milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param fn Function to retry
   * @param retries Maximum number of retries
   * @param baseDelay Base delay in milliseconds
   * @param maxDelay Maximum delay in milliseconds
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>, 
    retries = 3, 
    baseDelay = 1000, 
    maxDelay = 10000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // If we're out of retries, throw the error
      if (retries <= 0) throw error;

      // If it's a rate limit error (429), apply backoff
      if (error.statusCode === 429) {
        const delay = Math.min(baseDelay * (2 ** (3 - retries)), maxDelay);
        console.log(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await this.sleep(delay);
        return this.retryWithBackoff(fn, retries - 1, baseDelay, maxDelay);
      }

      // For other errors, just throw
      throw error;
    }
  }
  
  /**
   * Extract JSON from a string that might be wrapped in markdown code blocks
   * @param content The string that might contain JSON wrapped in markdown
   * @returns Parsed JSON object
   */
  private extractJsonFromResponse(content: string): any {
    try {
      // First try to parse as is (might be plain JSON)
      return JSON.parse(content);
    } catch (error) {
      // If that fails, try to extract JSON from markdown code blocks
      console.log('Failed to parse JSON directly, trying to extract from markdown...');
      
      // Look for JSON code blocks
      const jsonCodeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
      const match = content.match(jsonCodeBlockRegex);
      
      if (match && match[1]) {
        try {
          return JSON.parse(match[1].trim());
        } catch (innerError) {
          console.error('Failed to parse extracted JSON from markdown:', innerError);
          throw new Error('Could not parse JSON from the model response');
        }
      }
      
      // If no JSON code block found, look for what might be JSON without code blocks
      const possibleJson = content.match(/(\{[\s\S]*\})/);
      if (possibleJson && possibleJson[1]) {
        try {
          return JSON.parse(possibleJson[1].trim());
        } catch (innerError) {
          console.error('Failed to parse possible JSON content:', innerError);
          throw new Error('Could not find valid JSON in the model response');
        }
      }
      
      throw new Error('No JSON content found in the model response');
    }
  }
  
  /**
   * Parse a resume PDF file using Mistral AI's OCR and document understanding
   * @param filePath Path to the uploaded PDF file
   * @returns Parsed user data in the format specified in userData.js
   */
  async parseResume(filePath: string): Promise<UserData> {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath);
      
      console.log('Uploading file to Mistral AI...');
      // Upload the file to Mistral AI with retry
      const uploadedFile = await this.retryWithBackoff(() => 
        this.client.files.upload({
          file: {
            fileName: `resume_${Date.now()}.pdf`,
            content: fileContent,
          },
          purpose: "ocr" as any // Type cast to fix type error
        })
      );
      
      console.log('Getting signed URL...');
      // Get the signed URL for the uploaded file with retry
      const signedUrl = await this.retryWithBackoff(() => 
        this.client.files.getSignedUrl({
          fileId: uploadedFile.id,
        })
      );
      
      console.log('Processing document with OCR...');
      // Process the document with OCR with retry
      const ocrResponse = await this.retryWithBackoff(() => 
        this.client.ocr.process({
          model: "mistral-ocr-latest",
          document: {
            type: "document_url",
            documentUrl: signedUrl.url,
          }
        })
      );
      
      // Use the document understanding capability to extract structured data
      const extractionPrompt = `
        You are a resume parsing API that ONLY returns valid JSON.
        
        Extract the following information from this resume:
        
        1. Full name
        2. Headline or job title
        3. Location
        4. Contact information (email, website, etc.)
        5. About/Summary
        6. Work experience (for each position):
           - Job title
           - Company name
           - Location
           - Duration (start date and end date)
           - Description/responsibilities
        7. Education:
           - School name
           - Degree
           - Field of study
           - Graduation year
        8. Skills
        9. Projects
        10. Certifications
        11. Languages
        
        IMPORTANT: You must return ONLY raw JSON with no explanations, markdown formatting, or code blocks.
        Never use \`\`\` or any other formatting. Your entire response must be valid parseable JSON.
        
        Use this exact structure:
        {
          "fullName": "",
          "first_name": "",
          "last_name": "",
          "headline": "",
          "location": "",
          "contact": { },
          "about": "",
          "experience": [
            {
              "position": "",
              "company_name": "",
              "location": "",
              "starts_at": "",
              "ends_at": "",
              "duration": "",
              "summary": ""
            }
          ],
          "education": [
            {
              "school": "",
              "degree": "",
              "field_of_study": "",
              "ends_at": "",
              "description": ""
            }
          ],
          "skills": [],
          "projects": [],
          "certifications": [],
          "languages": []
        }
      `;
      
      console.log('Using LLM to extract structured data...');
      // Call the LLM to extract structured data with retry
      const chatResponse = await this.retryWithBackoff(() => 
        this.client.chat.complete({
          model: "mistral-large-latest",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: extractionPrompt,
                } as ContentText,
                {
                  type: "document_url",
                  documentUrl: signedUrl.url,
                } as ContentDocumentUrl,
              ] as ContentChunk[],
            },
          ],
        })
      );
      
      // Parse the JSON response
      let responseContent = chatResponse.choices[0].message.content;
      
      console.log('Received response from Mistral AI');
      if (typeof responseContent !== 'string') {
        console.log('Response is not a string, converting...');
        responseContent = JSON.stringify(responseContent);
      }
      
      // Extract and parse JSON from the response
      const resumeJson = this.extractJsonFromResponse(responseContent);
      
      console.log('Successfully parsed JSON from the response');
      
      // Clean up - delete the file from Mistral AI
      console.log('Cleaning up temporary files...');
      await this.retryWithBackoff(() => 
        this.client.files.delete({
          fileId: uploadedFile.id,
        })
      );
      
      // Map the extracted data to our UserData format
      const userData: UserData = {
        fullName: resumeJson.fullName || '',
        linkedin_internal_id: '',
        first_name: resumeJson.first_name || resumeJson.fullName?.split(' ')[0] || '',
        last_name: resumeJson.last_name || (resumeJson.fullName?.split(' ').length > 1 ? resumeJson.fullName.split(' ').pop() : '') || '',
        public_identifier: '',
        background_cover_image_url: '',
        profile_photo: '',
        headline: resumeJson.headline || '',
        location: resumeJson.location || '',
        about: resumeJson.about || '',
        experience: (resumeJson.experience || []).map((exp: any) => ({
          position: exp.position || '',
          company_url: '',
          company_image: '',
          company_name: exp.company_name || '',
          location: exp.location || '',
          summary: exp.summary || '',
          starts_at: exp.starts_at || '',
          ends_at: exp.ends_at || '',
          duration: exp.duration || ''
        })),
        education: (resumeJson.education || []).map((edu: any) => ({
          school: edu.school || '',
          degree: edu.degree || '',
          field_of_study: edu.field_of_study || '',
          starts_at: edu.starts_at || '',
          ends_at: edu.ends_at || '',
          description: edu.description || ''
        })),
        articles: [],
        description: {
          description1: resumeJson.headline || '',
          description1_link: '',
          description2: resumeJson.location || '',
          description2_link: null
        },
        activities: [],
        volunteering: [],
        certification: resumeJson.certifications || [],
        people_also_viewed: [],
        similar_profiles: [],
        recommendations: [],
        publications: [],
        courses: [],
        languages: resumeJson.languages || [],
        organizations: [],
        projects: resumeJson.projects || [],
        awards: [],
        score: []
      };
      
      return userData;
    } catch (error) {
      console.error('Error parsing resume with Mistral AI:', error);
      throw new Error('Failed to parse resume with Mistral AI');
    }
  }
}

export default new MistralResumeParser(); 