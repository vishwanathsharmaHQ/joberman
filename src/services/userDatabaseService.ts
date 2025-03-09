import { PrismaClient } from '@prisma/client';

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

/**
 * Service for handling user data storage in the database
 */
class UserDatabaseService {
  /**
   * Store parsed user data from a resume in the database
   * @param userData The parsed user data from a resume
   * @returns The stored user object
   */
  async storeUserData(userData: any) {
    try {
      // Extract fields from the parsed data
      const {
        fullName,
        first_name,
        last_name,
        email,
        headline,
        location,
        about,
        profile_photo,
        linkedin_internal_id,
        public_identifier,
        experience,
        education,
        skills,
      } = userData;

      // Create or update the user record
      const user = await prisma.user.upsert({
        where: {
          // Try to find by email if available, otherwise create new
          email: email || `${Date.now()}@placeholder.com`,
        },
        update: {
          fullName,
          firstName: first_name,
          lastName: last_name,
          headline,
          location,
          about,
          profilePhoto: profile_photo,
          linkedinId: linkedin_internal_id,
          publicIdentifier: public_identifier,
          experience: experience || {},
          education: education || {},
          skills: skills || {},
        },
        create: {
          fullName,
          firstName: first_name,
          lastName: last_name,
          email,
          headline,
          location,
          about,
          profilePhoto: profile_photo,
          linkedinId: linkedin_internal_id,
          publicIdentifier: public_identifier,
          experience: experience || {},
          education: education || {},
          skills: skills || {},
        },
      });

      return user;
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }
}

export default new UserDatabaseService(); 