import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple tag-based matching algorithm
export const findMatchingJobs = async (seekerProfileId: string) => {
  try {
    // Get seeker skills
    const seekerProfile = await prisma.seekerProfile.findUnique({
      where: { id: seekerProfileId },
      include: { skills: true }
    });

    if (!seekerProfile) {
      throw new Error('Seeker profile not found');
    }

    const seekerSkills = seekerProfile.skills.map(skill => skill.name.toLowerCase());

    // Get all job postings with their tags
    const jobPostings = await prisma.jobPosting.findMany({
      include: {
        tags: true,
        employer: {
          include: {
            employerProfile: true
          }
        }
      }
    });

    // Calculate match score for each job
    const matchedJobs = jobPostings.map(job => {
      const jobTags = job.tags.map(tag => tag.name.toLowerCase());
      
      // Calculate overlap between seeker skills and job tags
      const matchingTags = jobTags.filter(tag => seekerSkills.includes(tag));
      
      // Calculate match score (percentage of job tags matched)
      const matchScore = jobTags.length > 0 
        ? (matchingTags.length / jobTags.length) * 100 
        : 0;
      
      return {
        job,
        matchScore,
        matchingTags
      };
    });

    // Sort by match score (highest first)
    return matchedJobs.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error finding matching jobs:', error);
    throw error;
  }
};

// Get job recommendations for a seeker
export const getJobRecommendations = async (seekerProfileId: string) => {
  const matchedJobs = await findMatchingJobs(seekerProfileId);
  
  // Return top matches with relevant information
  return matchedJobs.map(({ job, matchScore, matchingTags }) => ({
    id: job.id,
    title: job.title,
    company: job.employer.employerProfile?.companyName || 'Company',
    location: job.location,
    salary: job.salary,
    matchScore: Math.round(matchScore),
    matchingSkills: matchingTags,
    postedAt: job.createdAt
  }));
};

// Simple match score calculator used by background processors
// Computes percentage of seeker skills appearing in job requirements/description
export const calculateJobMatch = (
  seeker: { skills: Array<{ name: string }> | string[]; parsedCvText?: string; location?: string },
  job: { requirements?: string | null; description?: string | null; location?: string | null }
): number => {
  const seekerSkills = Array.isArray(seeker.skills)
    ? seeker.skills.map((s: any) => (typeof s === 'string' ? s : s.name)).map((n: string) => n.toLowerCase())
    : [];

  const text = `${job.requirements || ''} ${job.description || ''}`.toLowerCase();
  const total = seekerSkills.length || 1;
  const matched = seekerSkills.filter((s) => text.includes(s)).length;
  return Math.round((matched / total) * 100);
};