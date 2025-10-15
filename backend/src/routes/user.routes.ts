import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

const router = express.Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists (resolve to backend/uploads/cv)
// __dirname here is backend/src/routes; go up two levels to backend/uploads
const uploadsDir = path.join(__dirname, '../../uploads/cv');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for CV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${Date.now()}_${safeBase}${ext}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF or Word documents are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        seekerProfile: {
          include: {
            skills: true,
            },
          },
        employerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update seeker profile
router.put('/seeker/profile', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { firstName, lastName, location, availability, bio, skills } = req.body as {
      firstName?: string;
      lastName?: string;
      location?: string;
      availability?: string;
      bio?: string;
      skills?: string[];
    };

    // Get user info (to verify role if you have one)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: If you have user.role
    // if (user.role !== 'SEEKER') {
    //   return res.status(403).json({ message: 'Not authorized as a seeker' });
    // }

    // Update or create seeker profile
    // Upsert seeker profile basic fields
    const seeker = await prisma.seekerProfile.upsert({
      where: { userId },
      update: {
        firstName: firstName,
        lastName: lastName,
        bio,
        location,
        availability,
      },
      create: {
        userId,
        firstName: firstName || 'First',
        lastName: lastName || 'Last',
        bio,
        location,
        availability,
      },
    });

    // Replace skills if provided
    if (skills && Array.isArray(skills)) {
      // Get existing skills
      const existing = await prisma.seekerSkill.findMany({
        where: { seekerProfileId: seeker.id },
      });
      const existingIds = existing.map(s => s.id);
      if (existingIds.length > 0) {
        await prisma.seekerSkill.deleteMany({ where: { id: { in: existingIds } } });
      }
      if (skills.length > 0) {
        await prisma.seekerSkill.createMany({
          data: skills.filter(Boolean).map(name => ({
            seekerProfileId: seeker.id,
            name: name.trim(),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Return updated profile with skills
    const updatedSeeker = await prisma.seekerProfile.findUnique({
      where: { id: seeker.id },
      include: { skills: true },
    });

    res.json(updatedSeeker);
  } catch (error) {
    console.error('Error updating seeker profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employer profile
router.put('/employer/profile', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { companyName, website, description, logoUrl } = req.body as {
      companyName?: string;
      website?: string;
      description?: string;
      logoUrl?: string;
    };

    // Get user info (to verify role if needed)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: if you have a `role` field on user, check it
    // if (user.role !== 'EMPLOYER') {
    //   return res.status(403).json({ message: 'Not authorized as an employer' });
    // }

    // Upsert employer profile — creates if doesn't exist, updates if it does
    const updatedEmployer = await prisma.employerProfile.upsert({
      where: { userId },
      update: {
        ...(companyName !== undefined ? { companyName } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(website !== undefined ? { website } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
      create: {
        userId,
        companyName: companyName || 'Company',
        description: description || '',
        website: website || '',
        logoUrl: logoUrl || '',
      },
    });

    res.json(updatedEmployer);
  } catch (error) {
    console.error('Error updating employer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload CV for seeker
router.post('/seeker/cv', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const { cvUrl } = req.body;

    // Check if user is a seeker
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { seekerProfile: true },
    });

    if (!user || !user.seekerProfile) {
      return res.status(403).json({ message: 'Not authorized as a seeker' });
    }

    // Update seeker with CV URL and trigger processing
    const updatedSeeker = await prisma.seekerProfile.update({
      where: { userId },
      data: {
        cvUrl,
      },
    });

    // In a real implementation, you would trigger the CV processing job here
    // For example: await cvProcessingQueue.add({ seekerId: updatedSeeker.id, cvUrl });

    res.json({
      message: 'CV uploaded successfully and queued for processing',
      seeker: updatedSeeker,
    });
  } catch (error) {
    console.error('Error uploading CV:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload CV file via multipart/form-data and persist URL
router.post('/seeker/cv/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user has a seeker profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { seekerProfile: true }
    });

    if (!user || !user.seekerProfile) {
      return res.status(403).json({ message: 'Not authorized as a seeker' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${baseUrl}/uploads/cv/${file.filename}`;

    // Persist CV URL on seeker profile
    const updatedSeeker = await prisma.seekerProfile.update({
      where: { userId },
      data: { cvUrl: publicUrl }
    });

    return res.json({
      message: 'CV uploaded successfully',
      cvUrl: publicUrl,
      seeker: updatedSeeker
    });
  } catch (error: any) {
    console.error('Error handling CV file upload:', error);
    return res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Get CV processing status
router.get('/seeker/cv/status', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);

    const seeker = await prisma.seekerProfile.findUnique({
      where: { userId },
      select: {
        cvUrl: true,
      },
    });

    if (!seeker) {
    return res.status(404).json({ message: 'Seeker profile not found' });
    }

    res.json({
      cvUrl: seeker.cvUrl,
    });
  } catch (error) {
    console.error('Error fetching CV status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper: simple skill extraction from text
const extractSkillsFromText = (text: string): string[] => {
  const commonSkills = [
    'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'sql',
    'python', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'rust', 'swift',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'material-ui',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'bitbucket', 'jira', 'agile', 'scrum', 'kanban', 'devops',
    'ci/cd', 'testing', 'jest', 'mocha', 'cypress', 'selenium', 'qa',
    'product management', 'project management', 'ui/ux', 'figma', 'sketch',
    'adobe', 'photoshop', 'illustrator', 'xd', 'indesign', 'marketing',
    'seo', 'sem', 'content', 'social media', 'analytics', 'data science',
    'machine learning', 'ai', 'nlp', 'computer vision', 'data analysis',
    'statistics', 'r', 'tableau', 'power bi', 'excel', 'word', 'powerpoint',
    'communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking'
  ];
  const lowerText = (text || '').toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
};

// Analyze CV with AI using env AI_API_URL and AI_API_KEY; fallback to local parsing
router.post('/seeker/cv/analyze', authMiddleware, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId) || ((req as any).user?.id);
    const seeker = await prisma.seekerProfile.findUnique({ where: { userId }, include: { skills: true } });
    if (!seeker) return res.status(404).json({ message: 'Seeker profile not found' });
    if (!seeker.cvUrl) return res.status(400).json({ message: 'No CV uploaded' });

    const AI_API_URL = process.env.AI_API_URL;
    const AI_API_KEY = process.env.AI_API_KEY;

    let parsedText = '';
    let extractedSkills: string[] = [];

    if (AI_API_URL && AI_API_KEY) {
      try {
        const resp = await fetch(`${AI_API_URL.replace(/\/$/, '')}/analyze-cv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`
          },
          body: JSON.stringify({ cvUrl: seeker.cvUrl, seekerId: seeker.id })
        });
        const data: any = await resp.json().catch(() => ({} as any));
        parsedText = (data && data.parsedText) || '';
        extractedSkills = Array.isArray(data?.extractedSkills) ? data.extractedSkills : (data?.skills || []);
      } catch (err) {
        console.warn('AI API call failed, falling back to local parsing:', err);
      }
    }

    // Fallback if AI response missing
    if (!parsedText || extractedSkills.length === 0) {
      parsedText = parsedText || 'Parsed CV text not available from AI. Using heuristic extraction.';
      extractedSkills = extractSkillsFromText(parsedText);
    }

    // Persist parsed text and skills
    await prisma.seekerProfile.update({
      where: { id: seeker.id },
      data: { parsedCvText: parsedText }
    });

    // Insert new skills if not already present
    for (const skill of extractedSkills) {
      const exists = await prisma.seekerSkill.findFirst({
        where: { seekerProfileId: seeker.id, name: skill }
      });
      if (!exists) {
        await prisma.seekerSkill.create({ data: { seekerProfileId: seeker.id, name: skill } });
      }
    }

    return res.json({ parsedText, extractedSkills });
  } catch (error: any) {
    console.error('Error analyzing CV:', error);
    return res.status(500).json({ message: error?.message || 'Server error' });
  }
});

export default router;