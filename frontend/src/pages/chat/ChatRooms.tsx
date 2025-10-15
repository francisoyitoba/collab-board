import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatRoom {
  id: string;
  otherParticipant?: {
    id?: string;
    email?: string;
    role?: string; // 'SEEKER' | 'EMPLOYER'
    displayName?: string;
  };
  application?: {
    id?: string;
    status?: string;
    job?: { id?: string; title?: string };
  };
  lastMessage?: {
    id?: string;
    content?: string;
    createdAt?: string;
    read?: boolean;
    senderId?: string;
  } | null;
  unreadCount?: number;
  updatedAt?: string;
}

const ChatRooms = () => {
  const { user, token } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/chat/rooms`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setChatRooms(response.data || []);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        setError('Failed to load chat rooms. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchChatRooms();
  }, [token]);

  // Live updates via socket notifications
  useEffect(() => {
    if (!token) return;
    socketRef.current = io(import.meta.env.VITE_API_URL, { auth: { token } });

    socketRef.current.on('notification', (payload: any) => {
      if (payload?.type === 'new-message') {
        const { chatRoomId, message } = payload;
        setChatRooms(prev => {
          const idx = prev.findIndex(r => r.id === chatRoomId);
          if (idx === -1) return prev;
          const updated = [...prev];
          const room = { ...updated[idx] };
          room.lastMessage = message;
          if (message?.receiverId === user?.id) {
            room.unreadCount = (room.unreadCount || 0) + 1;
          }
          // Move updated room to top
          updated.splice(idx, 1);
          return [room, ...updated];
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      
      {chatRooms.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">You don't have any conversations yet.</p>
          <p className="text-gray-600">Start a chat from your applications or employer dashboard.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {chatRooms.map((room) => {
              const displayName = room.otherParticipant?.displayName || room.otherParticipant?.email || 'Unknown';
              const roleLabel = (room.otherParticipant?.role || '').toLowerCase() === 'employer' ? 'Employer' : 'Job Seeker';
              const isLastMessageFromUser = room.lastMessage?.senderId === user?.id;
              
              return (
                <li key={room.id}>
                  <Link 
                    to={`/chat/${room.id}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {roleLabel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {room.lastMessage?.createdAt && (
                            <p className="text-xs text-gray-500">
                              {new Date(room.lastMessage.createdAt).toLocaleDateString()}
                            </p>
                          )}
                          {(room.unreadCount || 0) > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        {room.lastMessage?.content ? (
                          <p className="text-sm text-gray-600 truncate">
                            {room.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No messages yet
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatRooms;