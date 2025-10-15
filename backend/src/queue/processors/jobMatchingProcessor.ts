import { PrismaClient } from '@prisma/client';
import { calculateJobMatch } from '../../services/matching.service';

const prisma = new PrismaClient();

interface JobMatchingData {
  seekerProfileId: string;
  jobPostingId?: string; // Optional if matching against specific job
}

export const processJobMatching = async (data: JobMatchingData) => {
  try {
    const { seekerProfileId, jobPostingId } = data;

    // Get seeker profile with parsed CV and skills
    const seekerProfile = await prisma.seekerProfile.findUnique({
      where: { id: seekerProfileId },
      include: { skills: true }
    });

    if (!seekerProfile) {
      throw new Error(`Seeker profile with ID ${seekerProfileId} not found`);
    }

    // If jobPostingId is provided, match against specific job
    if (jobPostingId) {
      const jobPosting = await prisma.jobPosting.findUnique({
        where: { id: jobPostingId },
        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          location: true
        }
      });
      
      if (!jobPosting) {
        throw new Error(`Job posting with ID ${jobPostingId} not found`);
      }
      
      const matchScore = calculateJobMatch(
        { skills: seekerProfile.skills, parsedCvText: seekerProfile.parsedCvText || undefined },
        { requirements: jobPosting.requirements, description: jobPosting.description, location: jobPosting.location }
      );

      // Return match result (no persistence model exists for matches)
      return { jobPostingId: jobPosting.id, matchScore };
    } 
    // Otherwise match against all active jobs
    else {
      const jobPostings = await prisma.jobPosting.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          location: true
        }
      });
      
      const matchResults = [];
      
      for (const job of jobPostings) {
        const matchScore = calculateJobMatch(
          { skills: seekerProfile.skills, parsedCvText: seekerProfile.parsedCvText || undefined },
          { requirements: job.requirements, description: job.description, location: job.location }
        );

        matchResults.push({ jobPostingId: job.id, matchScore });
      }
      
      return { matches: matchResults };
    }
  } catch (error) {
    console.error('Error in job matching processor:', error);
    throw error;
  }
};