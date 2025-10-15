import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new job posting (employer only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { title, description, location, salary, tags, requirements } = req.body;

    // Verify user is an employer via EmployerProfile
    const employerProfile = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employerProfile) {
      return res.status(403).json({ message: 'Only employers can post jobs' });
    }

    // Create job posting (employerId references User.id)
    const job = await prisma.jobPosting.create({
      data: {
        title,
        description,
        location,
        salary,
        employerId: userId,
      },
    });

    // Optionally create tags from provided array (tags or requirements)
    const tagNames: string[] = Array.isArray(tags)
      ? tags
      : Array.isArray(requirements)
      ? requirements
      : [];

    if (tagNames.length > 0) {
      await prisma.jobTag.createMany({
        data: tagNames.map((name) => ({ jobPostingId: job.id, name })),
        skipDuplicates: true,
      });
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all jobs (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { location, tags } = req.query;

    const where: any = {};
    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: {
        employer: {
          include: {
            employerProfile: true,
          },
        },
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Optional tag filtering
    const tagFilter = tags ? (tags as string).split(',').map((t) => t.trim()) : null;
    const filtered = tagFilter
      ? jobs.filter((j) => j.tags.some((t) => tagFilter.includes(t.name)))
      : jobs;

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        employer: {
          include: { employerProfile: true },
        },
        tags: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const postedAt = job.createdAt ? new Date(job.createdAt).toISOString() : null;

    res.json({
      ...job,
      postedAt,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update job posting (employer only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { title, description, location, salary, tags } = req.body;

    // Verify job exists and belongs to the employer
    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.employerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: { title, description, location, salary },
    });

    if (Array.isArray(tags)) {
      // Replace tags: delete existing and create new
      await prisma.jobTag.deleteMany({ where: { jobPostingId: id } });
      await prisma.jobTag.createMany({
        data: tags.map((name) => ({ jobPostingId: id, name })),
        skipDuplicates: true,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete job posting (employer only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.employerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await prisma.jobTag.deleteMany({ where: { jobPostingId: id } });
    await prisma.application.deleteMany({ where: { jobPostingId: id } });
    await prisma.jobPosting.delete({ where: { id } });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get matching jobs for a seeker
router.get('/matching/seeker', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const seeker = await prisma.seekerProfile.findUnique({ where: { userId } });
    if (!seeker) {
      return res.status(403).json({ message: 'Only seekers can access matching jobs' });
    }

    // Simple recommendation: latest jobs with placeholder match score
    const jobs = await prisma.jobPosting.findMany({
      include: {
        employer: { include: { employerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recommendations = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.employer.employerProfile?.companyName || 'Company',
      location: job.location,
      salary: job.salary || '',
      matchScore: 75,
      matchingSkills: [],
      postedAt: job.createdAt,
    }));

    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching matching jobs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get jobs posted by an employer
router.get('/employer/posted', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    // Verify employer profile exists
    const employer = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!employer) {
      return res.status(403).json({ message: 'Only employers can access their posted jobs' });
    }

    const jobs = await prisma.jobPosting.findMany({
      where: { employerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching employer jobs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;