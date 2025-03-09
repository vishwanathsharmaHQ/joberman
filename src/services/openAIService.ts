import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Service for interacting with OpenAI API to enhance resumes and generate
 * professional content
 */
class OpenAIService {
  /**
   * Enhances a resume by improving clarity, highlighting achievements,
   * using action verbs, and quantifying accomplishments
   * @param resumeData - The user's resume data
   * @returns Enhanced resume data with improvement explanations
   */
  async enhanceResume(resumeData: any) {
    try {
      const prompt = this.createResumeEnhancementPrompt(resumeData);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume consultant. Your task is to enhance the resume provided, 
                      making it more professional, impactful, and appealing to recruiters.
                      Focus on improving clarity, highlighting achievements, using action verbs,
                      and quantifying accomplishments where possible. Keep the same factual information
                      but present it more effectively.
                      
                      For each section you enhance, provide a brief explanation of WHY you made the changes.
                      These explanations should help the user understand how your changes improve their resume.
                      Include these explanations in a separate "enhancementReasons" object in your response.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      return this.parseEnhancedResume(response.choices[0].message.content, resumeData);
    } catch (error) {
      console.error('Error enhancing resume with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Creates a structured prompt for the OpenAI model based on resume sections
   * @param resumeData - The user's resume data
   * @returns Formatted prompt string
   */
  private createResumeEnhancementPrompt(resumeData: any) {
    const {
      fullName,
      headline,
      about,
      experience,
      education,
      skills,
    } = resumeData;

    let promptSections = [];
    
    promptSections.push(`# Resume Enhancement Request\n\n## Original Resume for ${fullName || 'User'}\n\n`);

    if (headline) {
      promptSections.push(`### Headline\n${headline}\n\n`);
    }

    if (about) {
      promptSections.push(`### About/Summary\n${about}\n\n`);
    }

    if (experience && Array.isArray(experience)) {
      promptSections.push(`### Experience\n${experience.map(job => `
- Position: ${job.position || 'N/A'}
  Company: ${job.company_name || 'N/A'}
  Duration: ${job.starts_at || 'N/A'} - ${job.ends_at || 'N/A'}
  Summary: ${job.summary || 'N/A'}
`).join('')}

`);
    }

    if (education && Array.isArray(education)) {
      promptSections.push(`### Education
${education.map(edu => `
- School: ${edu.school || 'N/A'}
  Degree: ${edu.degree || 'N/A'}
  Field: ${edu.field_of_study || 'N/A'}
  Duration: ${edu.starts_at || 'N/A'} - ${edu.ends_at || 'N/A'}
`).join('')}

`);
    }

    if (skills) {
      let skillsText = '';
      if (Array.isArray(skills)) {
        skillsText = skills.join(', ');
      } else if (typeof skills === 'string') {
        skillsText = skills;
      } else if (typeof skills === 'object') {
        skillsText = JSON.stringify(skills);
      }
      
      promptSections.push(`### Skills
${skillsText}

`);
    }

    promptSections.push(`## Enhancement Instructions
Please enhance this resume by:
1. Improving the headline to be more compelling and specific
2. Rewriting the about/summary section to be more impactful
3. Enhancing each experience entry:
   - Use strong action verbs
   - Quantify achievements where possible
   - Focus on accomplishments rather than responsibilities
   - Ensure proper formatting and clarity
4. Improving the education section formatting
5. Organizing and enhancing the skills section

Please return the enhanced resume in JSON format with the following structure:
{
  "headline": "Enhanced headline",
  "about": "Enhanced about section",
  "experience": [...enhanced experience array...],
  "education": [...enhanced education array...],
  "skills": [...enhanced skills array...],
  "enhancementReasons": {
    "headlineReason": "Explanation of why the headline was improved",
    "aboutReason": "Explanation of why the about section was improved",
    "experienceReason": "Explanation of why the experience section was improved",
    "educationReason": "Explanation of why the education section was improved",
    "skillsReason": "Explanation of why the skills section was improved"
  }
}`);

    return promptSections.join('');
  }

  /**
   * Parse the enhanced resume from OpenAI's response
   * @param responseText - The text response from OpenAI
   * @param originalData - The original resume data for reference
   * @returns Enhanced resume data
   */
  private parseEnhancedResume(responseText: string | null, originalData: any) {
    if (!responseText) {
      console.log('Empty response from OpenAI');
      throw new Error('Empty response from OpenAI');
    }
    
    try {
      console.log('Parsing OpenAI response...');
      
      // First try to see if response is properly formatted JSON
      // Check for JSON blocks in markdown format or standalone JSON
      let jsonText = '';
      const jsonBlockMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonText = jsonBlockMatch[1];
      } else {
        // Look for content that appears to be JSON
        const possibleJsonMatch = responseText.match(/(\{[\s\S]*\})/);
        if (possibleJsonMatch && possibleJsonMatch[1]) {
          jsonText = possibleJsonMatch[1];
        }
      }
      
      // Try to parse the JSON if found
      if (jsonText) {
        try {
          const parsedData = JSON.parse(jsonText);
          console.log('Successfully parsed JSON response');
          
          // Extract enhancement reasons
          const enhancementReasons = parsedData.enhancementReasons || {};
          
          // Create enhanced data object
          const enhancedData = {
            ...originalData,
            headline: parsedData.headline || originalData.headline,
            about: parsedData.about || originalData.about,
            experience: parsedData.experience || originalData.experience,
            education: parsedData.education || originalData.education,
            skills: parsedData.skills || originalData.skills,
            
            // Add enhancement reasons with proper formatting
            headlineEnhancementReason: enhancementReasons.headlineReason || null,
            aboutEnhancementReason: enhancementReasons.aboutReason || null,
            experienceEnhancementReason: typeof enhancementReasons.experienceReason === 'string' 
              ? { general: enhancementReasons.experienceReason }
              : enhancementReasons.experienceReason || null,
            educationEnhancementReason: typeof enhancementReasons.educationReason === 'string'
              ? { general: enhancementReasons.educationReason }
              : enhancementReasons.educationReason || null,
            skillsEnhancementReason: typeof enhancementReasons.skillsReason === 'string'
              ? { general: enhancementReasons.skillsReason }
              : enhancementReasons.skillsReason || null,
            
            // Mark as enhanced
            enhanced: true,
            enhancedAt: new Date().toISOString()
          };
          
          // Process any detailed experience reasons if they exist
          if (parsedData.experience && Array.isArray(parsedData.experience) && 
              enhancementReasons.experienceDetailedReasons && 
              Array.isArray(enhancementReasons.experienceDetailedReasons)) {
            
            // Try to match detailed reasons to experience items
            const experienceWithReasons = parsedData.experience.map((exp: any, index: number) => {
              if (enhancementReasons.experienceDetailedReasons && 
                  enhancementReasons.experienceDetailedReasons[index]) {
                return {
                  ...exp,
                  enhancementReason: enhancementReasons.experienceDetailedReasons[index]
                };
              }
              return exp;
            });
            
            enhancedData.experience = experienceWithReasons;
          }
          
          return enhancedData;
        } catch (jsonError) {
          console.error('Error parsing JSON from OpenAI response:', jsonError);
          // Continue to fallback approach
        }
      }
      
      console.log('Using fallback parsing approach');
      // Fallback parsing approach - extract sections from text response
      const enhancedData = { ...originalData };
      
      // Extract headline if present
      const headlineMatch = responseText.match(/(?:Headline|HEADLINE)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
      if (headlineMatch && headlineMatch[1].trim()) {
        enhancedData.headline = headlineMatch[1].trim();
      }
      
      // Extract about/summary if present
      const aboutMatch = responseText.match(/(?:About|ABOUT|Summary|SUMMARY)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
      if (aboutMatch && aboutMatch[1].trim()) {
        enhancedData.about = aboutMatch[1].trim();
      }
      
      // Extract experience if present - this is more complex and might need custom logic
      const experienceSection = responseText.match(/(?:Experience|EXPERIENCE)[:\s]+(.*?)(?:\n\n\w+:|\n###|\n##|$)/s);
      if (experienceSection && experienceSection[1].trim() && 
          Array.isArray(originalData.experience) && originalData.experience.length > 0) {
        
        // Simple enhancement: just improve the summaries of each experience
        const enhancedExperience = [...originalData.experience];
        
        // Look for content that might be summaries
        const expMatches = experienceSection[1].matchAll(/- Position:[\s\S]*?Summary:([\s\S]*?)(?=\n-|\n\n|$)/g);
        let index = 0;
        for (const match of expMatches) {
          if (match[1] && match[1].trim() && enhancedExperience[index]) {
            enhancedExperience[index].summary = match[1].trim();
            index++;
          }
        }
        
        if (index > 0) {
          enhancedData.experience = enhancedExperience;
        }
      }
      
      // Extract reasons if present (fallback)
      const reasonsSection = responseText.match(/(?:Reasons|REASONS|Enhancement Reasons|ENHANCEMENT REASONS)[:\s]+(.*?)(?:\n\n\w+:|\n###|\n##|$)/s);
      if (reasonsSection && reasonsSection[1].trim()) {
        // Try to extract individual reasons
        const headlineReasonMatch = reasonsSection[1].match(/(?:Headline|HEADLINE)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
        if (headlineReasonMatch && headlineReasonMatch[1].trim()) {
          enhancedData.headlineEnhancementReason = headlineReasonMatch[1].trim();
        }
        
        const aboutReasonMatch = reasonsSection[1].match(/(?:About|ABOUT|Summary|SUMMARY)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
        if (aboutReasonMatch && aboutReasonMatch[1].trim()) {
          enhancedData.aboutEnhancementReason = aboutReasonMatch[1].trim();
        }
        
        const experienceReasonMatch = reasonsSection[1].match(/(?:Experience|EXPERIENCE)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
        if (experienceReasonMatch && experienceReasonMatch[1].trim()) {
          enhancedData.experienceEnhancementReason = experienceReasonMatch[1].trim();
        }
        
        const educationReasonMatch = reasonsSection[1].match(/(?:Education|EDUCATION)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
        if (educationReasonMatch && educationReasonMatch[1].trim()) {
          enhancedData.educationEnhancementReason = educationReasonMatch[1].trim();
        }
        
        const skillsReasonMatch = reasonsSection[1].match(/(?:Skills|SKILLS)[:\s]+(.*?)(?:\n\n|\n###|\n##|$)/s);
        if (skillsReasonMatch && skillsReasonMatch[1].trim()) {
          enhancedData.skillsEnhancementReason = skillsReasonMatch[1].trim();
        }
      }
      
      // Mark as enhanced
      enhancedData.enhanced = true;
      enhancedData.enhancedAt = new Date().toISOString();
      
      console.log('Resume enhanced with fallback parsing approach');
      return enhancedData;
    } catch (error) {
      console.error('Error parsing enhanced resume:', error);
      // Return original data if parsing fails
      return {
        ...originalData,
        enhancementError: 'Failed to parse enhanced resume'
      };
    }
  }
}

export default new OpenAIService(); 