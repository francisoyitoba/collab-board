import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Get all chat rooms for a user
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
  const userId = (req as any).user?.id;

    // Find all chat rooms where the user is a participant
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                seekerProfile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                employerProfile: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        application: {
          select: {
            id: true,
            status: true,
            jobPosting: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute unread counts per room for this user
    const formattedRooms = [] as any[];
    for (const room of chatRooms) {
      const otherParticipants = room.participants.filter(p => p.userId !== userId);
      const otherUser = otherParticipants[0]?.user;

      let displayName = 'Unknown';
      if (otherUser) {
        if (otherUser.role === 'SEEKER' && otherUser.seekerProfile) {
          const { firstName, lastName } = otherUser.seekerProfile;
          displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
        } else if (otherUser.role === 'EMPLOYER' && otherUser.employerProfile) {
          displayName = otherUser.employerProfile.companyName || 'Unknown';
        }
      }

      const lastMessage = room.messages[0] || null;
      const unreadCount = await prisma.message.count({
        where: { chatRoomId: room.id, receiverId: userId, read: false },
      });

      formattedRooms.push({
        id: room.id,
        otherParticipant: {
          id: otherUser?.id,
          email: otherUser?.email,
          role: otherUser?.role,
          displayName,
        },
        lastMessage,
        unreadCount,
        application: room.application
          ? {
              id: room.application.id,
              status: room.application.status,
              job: room.application.jobPosting
                ? { id: room.application.jobPosting.id, title: room.application.jobPosting.title }
                : undefined,
            }
          : undefined,
        updatedAt: (lastMessage?.createdAt as any) || (room as any).createdAt,
      });
    }

    // Sort rooms by updatedAt desc
    formattedRooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(formattedRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific chat room
router.get('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
  const userId = (req as any).user?.id;
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if user is a participant in the chat room
    const isParticipant = await prisma.chatRoomParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to access this chat room' });
    }

    // Build the query
    const whereClause: any = {
      chatRoomId: roomId,
    };

    // If 'before' is provided, get messages before that timestamp
    if (before) {
      whereClause.createdAt = {
        lt: new Date(before as string),
      };
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      select: {
        id: true,
        chatRoomId: true,
        senderId: true,
        receiverId: true,
        content: true,
        read: true,
        createdAt: true,
      }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: { chatRoomId: roomId, receiverId: userId, read: false },
      data: { read: true },
    });

    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new chat room (typically when an application is accepted)
router.post('/rooms', authMiddleware, async (req, res) => {
  try {
  const userId = (req as any).user?.id;
    const { applicationId } = req.body;

    console.log('🟦 Chat Room Creation Started');
    console.log('User ID:', userId);
    console.log('Application ID:', applicationId);

    if (!applicationId) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    // Get application details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobPosting: {
          include: {
            employer: true,
          },
        },
        seeker: true,
      },
    });

    console.log('📄 Application found:', application);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Validate the relationship structure
    console.log('JobPosting:', application.jobPosting);
    console.log('Seeker:', application.seeker);

    const isEmployer = application.jobPosting.employerId === userId;
    const isSeeker = application.seekerId === userId;

    console.log('Role check — Employer?', isEmployer, 'Seeker?', isSeeker);

    if (!isEmployer && !isSeeker) {
      return res.status(403).json({ message: 'Not authorized to create this chat room' });
    }

    // Check if room already exists
    const existingRoom = await prisma.chatRoom.findFirst({
      where: { applicationId },
    });

    if (existingRoom) {
      console.log('✅ Existing chat room found:', existingRoom.id);
      return res.json(existingRoom);
    }

    console.log('🆕 Creating new chat room...');

    const chatRoom = await prisma.chatRoom.create({
      data: {
        applicationId,
        participants: {
          create: [
            { userId: application.seekerId },
            { userId: application.jobPosting.employerId },
          ],
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    console.log('✅ Chat room created:', chatRoom.id);
    res.status(201).json(chatRoom);

  } catch (error) {
    console.error('❌ Error creating chat room:', error);
    res.status(500).json({ message: 'Server error', error: String(error) });
  }
});

export default router;