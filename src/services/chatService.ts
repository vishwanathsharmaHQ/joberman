import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatService {
  /**
   * Initialize a new chat session for a user
   */
  async initializeChat(userId: number) {
    try {
      // Create a new chat session
      const session = await prisma.chatSession.create({
        data: {
          userId,
          context: {
            goals: [],
            preferences: {},
            history: []
          }
        },
        include: {
          messages: true
        }
      });

      return session;
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(sessionId: number, content: string) {
    try {
      // Ensure sessionId is an integer
      const sessionIdInt = typeof sessionId === 'string' ? parseInt(sessionId) : sessionId;
      
      if (isNaN(sessionIdInt)) {
        throw new Error('Invalid session ID');
      }

      // Get the chat session with its messages and full user profile
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionIdInt },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              lastName: true,
              headline: true,
              location: true,
              about: true,
              experience: true,
              education: true,
              skills: true,
              // Include enhanced profile data if available
              originalHeadline: true,
              originalAbout: true,
              originalExperience: true,
              originalEducation: true,
              originalSkills: true,
              enhanced: true
            }
          }
        }
      });

      if (!session) {
        throw new Error('Chat session not found');
      }

      // Get user's complete profile
      const userProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          fullName: true,
          firstName: true,
          lastName: true,
          headline: true,
          location: true,
          about: true,
          experience: true,
          education: true,
          skills: true,
          // Include enhanced profile data if available
          originalHeadline: true,
          originalAbout: true,
          originalExperience: true,
          originalEducation: true,
          originalSkills: true,
          enhanced: true
        }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          sessionId: sessionIdInt,
          role: 'user',
          content
        }
      });

      // Prepare conversation history for OpenAI
      const conversationHistory = session.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Format experience for better readability
      const formatExperience = (exp: any) => {
        if (!exp || !Array.isArray(exp)) return [];
        return exp.map(e => ({
          position: e.position || '',
          company: e.company_name || '',
          location: e.location || '',
          duration: e.duration || '',
          timeframe: `${e.starts_at || ''} - ${e.ends_at || ''}`,
          description: e.summary || ''
        }));
      };

      // Add system message for context
      const messages = [
        {
          role: 'system',
          content: `You are a proactive career advisor AI assistant. Your role is to provide personalized career guidance and professional development advice. You should guide the conversation flow, not wait for the user to lead.

Key Guidelines:
1. ALWAYS incorporate the user's resume/profile data in your responses - especially their experience, skills, and education
2. GUIDE THE CONVERSATION PROACTIVELY - don't wait for the user to ask all the questions
3. For career recommendations, analyze their skills and experience to suggest suitable paths
4. Ask focused questions one at a time and wait for user responses
5. Be conversational but professional
6. Focus on actionable advice
7. Base recommendations on user's specific background and goals
8. Maintain context from previous messages

CONVERSATION STRUCTURE (follow this progression):
1. Initial Assessment: Begin by reviewing their profile and highlighting key strengths/areas for improvement
2. Career Path Analysis: Suggest potential career paths based on their background
3. Skill Gap Analysis: Identify skills they should develop for their desired path
4. Resume/Profile Feedback: Offer specific improvements to their professional materials
5. Job Search Strategy: Provide tailored job search advice
6. Interview Preparation: Share tips relevant to their target roles

User Profile Information:
${userProfile ? `
- Name: ${userProfile.fullName || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()}
- Headline: ${userProfile.headline || 'Not provided'}
- Location: ${userProfile.location || 'Not provided'}
- About: ${userProfile.about || 'Not provided'}
- Experience: ${JSON.stringify(formatExperience(userProfile.experience as any), null, 2)}
- Education: ${JSON.stringify(Array.isArray(userProfile.education) ? userProfile.education : [], null, 2)}
- Skills: ${JSON.stringify(Array.isArray(userProfile.skills) ? userProfile.skills : [], null, 2)}
` : 'No user profile information available'}

MESSAGE FORMATTING:
- Use clear section headers (bold formatting with **Title**)
- Use bullet points (- ) for lists
- Use numbered lists (1. ) for sequential steps
- Break up long content with paragraph spacing
- Highlight key points with emphasis (*text*)

When providing career advice or recommendations:
- ANALYZE the user's experience, skills, and education before suggesting career paths
- REFERENCE specific aspects of their background when making recommendations
- Provide tailored advice based on their current experience level and skills
- Consider the industry trends relevant to their background
- Suggest potential career transitions that leverage their existing skills

For resume advice:
- Focus on concrete improvements
- Suggest specific wording changes
- Highlight relevant skills for target roles
- Recommend ways to quantify achievements

Context: ${JSON.stringify(session.context)}
Previous conversation history is provided to maintain continuity.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content
        }
      ];

      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1000
      });

      // Extract assistant's response
      const assistantResponse = completion.choices[0].message.content;

      if (!assistantResponse) {
        throw new Error('No response from OpenAI');
      }

      // Save assistant's response
      const assistantMessage = await prisma.message.create({
        data: {
          sessionId: sessionIdInt,
          role: 'assistant',
          content: assistantResponse
        }
      });

      return {
        userMessage,
        assistantMessage
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: number) {
    try {
      const messages = await prisma.message.findMany({
        where: {
          sessionId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return messages;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Update chat context
   */
  async updateContext(sessionId: number, context: any) {
    try {
      const updatedSession = await prisma.chatSession.update({
        where: {
          id: sessionId
        },
        data: {
          context
        }
      });

      return updatedSession;
    } catch (error) {
      console.error('Error updating chat context:', error);
      throw error;
    }
  }
}

export default new ChatService(); 