import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: Server) => {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as { userId: string; role: string };

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    if (socket.userId) socket.join(`user:${socket.userId}`);

    // Join chat room
    socket.on('join-chat', async (chatRoomId: string) => {
      try {
        // Try to find chat room
        let chatRoom = await prisma.chatRoom.findUnique({
          where: { id: chatRoomId },
          include: {
            application: { select: { id: true, seekerId: true, employerId: true } },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    role: true,
                    seekerProfile: { select: { firstName: true, lastName: true } },
                    employerProfile: { select: { companyName: true } }
                  }
                }
              }
            }
          }
        });

        // If not found, auto-create a chat room for the application
        if (!chatRoom) {
          const application = await prisma.application.findUnique({
            where: { id: chatRoomId }
          });

          if (!application) {
            socket.emit('error', { message: 'Chat room or application not found' });
            return;
          }

          chatRoom = await prisma.chatRoom.create({
            data: {
              id: chatRoomId, // reuse application ID as chatRoomId
              applicationId: application.id,
              participants: {
                create: [
                  { user: { connect: { id: application.seekerId } } },
                  { user: { connect: { id: application.employerId } } }
                ]
              }
            },
            include: {
              application: { select: { id: true, seekerId: true, employerId: true } },
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      role: true,
                      seekerProfile: { select: { firstName: true, lastName: true } },
                      employerProfile: { select: { companyName: true } }
                    }
                  }
                }
              }
            }
          });
        }

        // Check access
        if (
          socket.userId !== chatRoom.application.seekerId &&
          socket.userId !== chatRoom.application.employerId
        ) {
          socket.emit('error', { message: 'Access denied to this chat room' });
          return;
        }

        // Join room
        socket.join(`chat:${chatRoom.id}`);

        socket.emit('room-data', {
          id: chatRoom.id,
          participants: chatRoom.participants.map(p => ({
            id: p.user.id,
            firstName: p.user.seekerProfile?.firstName || '',
            lastName: p.user.seekerProfile?.lastName || '',
            role: p.user.role === 'EMPLOYER' ? 'employer' : 'seeker',
            companyName: p.user.employerProfile?.companyName
          }))
        });

        const messages = await prisma.message.findMany({
          where: { chatRoomId: chatRoom.id },
          orderBy: { createdAt: 'asc' }
        });

        socket.emit('chat-history', messages);
      } catch (error) {
        console.error('Error joining chat room:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // Send message
    socket.on('send-message', async (data: { chatRoomId: string; content: string; receiverId: string }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });

        const { chatRoomId, content, receiverId } = data;

        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: chatRoomId },
          include: {
            application: true
          }
        });

        if (!chatRoom) return socket.emit('error', { message: 'Chat room not found' });

        const message = await prisma.message.create({
          data: { chatRoomId, senderId: socket.userId, receiverId, content }
        });

        io.to(`chat:${chatRoomId}`).emit('new-message', message);
        io.to(`user:${receiverId}`).emit('notification', { type: 'new-message', chatRoomId, message });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('markMessagesAsRead', async ({ messageIds }: { messageIds: string[] }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });

        await prisma.message.updateMany({
          where: { id: { in: messageIds }, receiverId: socket.userId },
          data: { read: true }
        });

        socket.emit('messages-marked-read', messageIds);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};