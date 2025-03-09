import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

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

class PDFParserService {
  /**
   * Parse a PDF file and extract structured data
   * @param filePath Path to the uploaded PDF file
   * @returns Parsed user data in the format specified in userData.js
   */
  async parseResume(filePath: string): Promise<UserData> {
    try {
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse the PDF content with options to suppress warnings
      const data = await pdfParse(dataBuffer, {
        pagerender: function(pageData: any) {
          return pageData.getTextContent();
        },
        max: 0,
        version: 'v2.0.550'
      });
      const text = data.text;
      
      // Extract information from the PDF text
      // This is a simplified implementation - in a real-world scenario,
      // you would use more sophisticated NLP or regex patterns to extract structured data
      
      // Extract name (assuming the name is at the beginning of the resume)
      const nameMatch = text.match(/^([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/);
      const fullName = nameMatch ? nameMatch[0].trim() : '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      
      // Extract experiences (simplified approach)
      const experiences: Experience[] = [];
      
      // Look for common job title keywords followed by company names
      const experienceRegex = /(?:senior|junior|lead|manager|developer|engineer|specialist|director|associate)?\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,5})\s*(?:at|@|for|with)?\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,3})/gi;
      
      let match;
      while ((match = experienceRegex.exec(text)) !== null) {
        if (match[1] && match[2]) {
          experiences.push({
            position: match[1].trim(),
            company_name: match[2].trim(),
            company_url: '',
            company_image: '',
            location: '',
            summary: '',
            starts_at: '',
            ends_at: '',
            duration: ''
          });
        }
      }
      
      // Create the user data object
      const userData: UserData = {
        fullName,
        linkedin_internal_id: '',
        first_name: firstName,
        last_name: lastName,
        public_identifier: '',
        background_cover_image_url: '',
        profile_photo: '',
        headline: '',
        location: '',
        about: '',
        experience: experiences,
        education: [],
        articles: [],
        description: {
          description1: '',
          description1_link: '',
          description2: '',
          description2_link: null
        },
        activities: [],
        volunteering: [],
        certification: [],
        people_also_viewed: [],
        similar_profiles: [],
        recommendations: [],
        publications: [],
        courses: [],
        languages: [],
        organizations: [],
        projects: [],
        awards: [],
        score: []
      };
      
      return userData;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF resume');
    }
  }
}

export default new PDFParserService(); 