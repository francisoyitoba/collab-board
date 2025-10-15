import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Submit a job application (seeker only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { jobId, coverLetter, resumeUrl } = req.body;

    // Verify user is a seeker
    const seeker = await prisma.seekerProfile.findUnique({
      where: { userId },
    });

    if (!seeker) {
      return res.status(403).json({ message: 'Only job seekers can submit applications' });
    }

    // Check if job exists
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await prisma.application.findFirst({
      where: {
        jobPostingId: jobId,
        seekerId: userId,
      },
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobPostingId: jobId,
        seekerId: userId,
        employerId: job.employerId,
        coverLetter,
        status: 'PENDING',
      },
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications for a job (employer only)
router.get('/job/:jobId', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { jobId } = req.params;

    // Verify user is an employer and owns the job
    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return res.status(403).json({ message: 'Only employers can view applications' });
    }

    // Check if job exists and belongs to the employer
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!job || job.employerId !== userId) {
      return res.status(404).json({ message: 'Job not found or not authorized' });
    }

    // Get applications for the job
    const applications = await prisma.application.findMany({
      where: {
        jobPostingId: jobId,
      },
      include: {
        seeker: {
          include: {
            seekerProfile: {
              include: { skills: true },
            },
          },
        },
        jobPosting: {
          include: { tags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications submitted by a seeker
router.get('/seeker', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    // Verify user is a seeker
    const seeker = await prisma.seekerProfile.findUnique({
      where: { userId },
    });

    if (!seeker) {
      return res.status(403).json({ message: 'Only job seekers can view their applications' });
    }

    // Get applications submitted by the seeker
    const applications = await prisma.application.findMany({
      where: {
        seekerId: userId,
      },
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching seeker applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application status (employer only)
// Update application status (supports PUT/PATCH)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { id } = req.params;
    let { status } = req.body as { status: string };
    status = (status || '').toUpperCase();

    // Verify user is an employer
    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return res.status(403).json({ message: 'Only employers can update application status' });
    }

    // Check if application exists and is for a job owned by the employer
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        jobPosting: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.jobPosting.employerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    // Update application status
    const prevStatus = application.status;
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status,
      },
    });

    // Log activity
    await prisma.applicationActivity.create({
      data: {
        applicationId: id,
        actorId: userId,
        type: 'STATUS_CHANGE',
        detail: `Status: ${prevStatus} -> ${status}`,
      },
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Alias route to support PATCH requests for status updates
router.patch('/:id/status', authMiddleware, async (req, res) => {
  // Delegate to the PUT handler
  (router as any).handle({ ...req, method: 'PUT' }, res, () => {});
});

// Bulk update statuses
router.patch('/bulk/status', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { applicationIds, status } = req.body as { applicationIds: string[]; status: string };
    const normalized = (status || '').toUpperCase();

    // Verify employer
    const employer = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!employer) {
      return res.status(403).json({ message: 'Only employers can update application status' });
    }

    // Filter applications that belong to this employer's job postings
    const apps = await prisma.application.findMany({
      where: { id: { in: applicationIds || [] } },
      include: { jobPosting: true },
    });

    const allowedIds = apps.filter(a => a.jobPosting.employerId === userId).map(a => a.id);

    if (allowedIds.length === 0) {
      return res.json({ updated: 0 });
    }

    const result = await prisma.application.updateMany({
      where: { id: { in: allowedIds } },
      data: { status: normalized },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Error bulk updating application status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update private notes for an application
router.patch('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { id } = req.params;
    const { notes } = req.body as { notes: string };

    const employer = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!employer) {
      return res.status(403).json({ message: 'Only employers can add notes' });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { jobPosting: true },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.jobPosting.employerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { notes },
    });

    // Log activity
    await prisma.applicationActivity.create({
      data: {
        applicationId: id,
        actorId: userId,
        type: 'NOTE_ADDED',
        detail: (notes || '').slice(0, 500),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating application notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get activity log for an application (seeker or employer)
router.get('/:id/activities', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    const application = await prisma.application.findUnique({
      where: { id },
      include: { jobPosting: true },
    });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.seekerId !== userId && application.jobPosting.employerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view activities' });
    }

    const activities = await prisma.applicationActivity.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      include: { actor: true },
    });

    // Strip password from actor
    const sanitized = activities.map(a => ({
      id: a.id,
      type: a.type,
      detail: a.detail,
      createdAt: a.createdAt,
      actor: { id: a.actor.id, email: a.actor.email },
    }));
    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate AI cover letter for an application
router.post('/:jobId/cover-letter', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { jobId } = req.params;

    // Verify user is a seeker
    const seeker = await prisma.seekerProfile.findUnique({
      where: { userId },
    });

    if (!seeker) {
      return res.status(403).json({ message: 'Only job seekers can generate cover letters' });
    }

    // Check if job exists
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        employer: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // In a real implementation, you would trigger the cover letter generation job here
    // For example: await coverLetterQueue.add({ seekerId: seeker.id, jobId });

    // For now, return a placeholder response
    res.json({
      message: 'Cover letter generation has been queued',
      status: 'PENDING',
    });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if the logged-in seeker has applied for a specific job
router.get('/job/:jobId/status', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    // Verify user is a seeker
    const seeker = await prisma.seekerProfile.findUnique({
      where: { userId },
    });

    if (!seeker) {
      return res.status(403).json({ message: 'Only job seekers can check application status' });
    }

    // Find if the seeker has an application for this job
    const application = await prisma.application.findFirst({
      where: {
        jobPostingId: jobId,
        seekerId: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      return res.json({ hasApplied: false });
    }

    res.json({
      hasApplied: true,
      status: application.status,
    });
  } catch (error) {
    console.error('Error checking application status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single application by ID (for seeker or employer)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        jobPosting: {
          include: {
            employer: {
              include: { employerProfile: true },
            },
          },
        },
        seeker: {
          include: { seekerProfile: true },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Ensure that either the seeker who applied OR the employer who owns the job can view it
    if (
      application.seekerId !== userId &&
      application.jobPosting.employerId !== userId
    ) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;