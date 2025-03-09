import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Extended Prisma types to include our new fields
type UserWhereWithOriginalFields = Prisma.UserWhereInput & {
  originalHeadline?: { not: null } | null;
  enhanced?: boolean;
};

type UserUpdateWithOriginalFields = Prisma.UserUpdateInput & {
  originalHeadline?: string | null;
  originalAbout?: string | null;
  originalExperience?: any;
  originalEducation?: any;
  originalSkills?: any;
};

/**
 * Updates existing users who were enhanced before original resume data tracking was added.
 * For these users, we'll use their current data as original data since we don't have
 * access to their pre-enhancement state.
 */
async function updateExistingUsers() {
  try {
    console.log('Updating existing users with enhanced resumes...');
    
    // Find all users without originalHeadline but with content in their profile
    // These are likely users who were enhanced before we added the feature
    const users = await prisma.user.findMany({
      where: {
        originalHeadline: null,
        enhanced: true,
        // OR have content in their profile
        OR: [
          { headline: { not: null } },
          { about: { not: null } },
          { experience: { not: null } }
        ]
      } as UserWhereWithOriginalFields
    });
    
    console.log(`Found ${users.length} users to update`);
    
    // For each user that needs updating
    for (const user of users) {
      console.log(`Updating user ${user.id} (${user.fullName || 'Unknown'})`);
      
      // Since we don't have their original data, we'll use their current data
      // This isn't ideal but better than nothing for existing users
      await prisma.user.update({
        where: { id: user.id },
        data: {
          originalHeadline: user.headline,
          originalAbout: user.about,
          originalExperience: user.experience,
          originalEducation: user.education,
          originalSkills: user.skills,
        } as UserUpdateWithOriginalFields
      });
      
      console.log(`Updated user ${user.id}`);
    }
    
    console.log('Update complete!');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateExistingUsers()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 