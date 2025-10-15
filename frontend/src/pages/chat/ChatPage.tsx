import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

interface ChatRoom {
  id: string;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'seeker' | 'employer';
    companyName?: string;
  }[];
}

const ChatPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the other participant dynamically
  const otherParticipant = room?.participants?.find(p => p.id !== user?.id);

  useEffect(() => {
    if (!roomId || !token) return;

    // Connect to Socket.IO
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    // Join chat room
    socketRef.current.emit('join-chat', roomId);

    // Room data received
    socketRef.current.on('room-data', (roomData: ChatRoom) => {
      setRoom(roomData);
    });

    // Message history received
    socketRef.current.on('chat-history', (msgs: Message[]) => {
      setMessages(msgs);
      setLoading(false);

      // Mark as read any messages targeted to current user
      const toMark = msgs
        .filter(m => !m.read && m.receiverId === user?.id)
        .map(m => m.id);
      if (toMark.length > 0) {
        socketRef.current?.emit('markMessagesAsRead', { messageIds: toMark });
      }
    });

    // New message received
    socketRef.current.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);

      // If the message is for current user and they are viewing this room, mark as read
      if (message.receiverId === user?.id) {
        socketRef.current?.emit('markMessagesAsRead', { messageIds: [message.id] });
      }
    });

    // Read acknowledgements
    socketRef.current.on('messages-marked-read', (ids: string[]) => {
      setMessages(prev => prev.map(m => (ids.includes(m.id) ? { ...m, read: true } : m)));
      // Trigger global refresh for Navbar unread badge
      window.dispatchEvent(new Event('unread-recalc'));
    });

    // Errors
    socketRef.current.on('error', (err: { message: string }) => {
      setError(err.message);
      setLoading(false);
    });

    socketRef.current.on('connect_error', (err: Error) => {
      setError(`Connection error: ${err.message}`);
      setLoading(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, token]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current || !otherParticipant?.id) return;

    socketRef.current.emit('send-message', {
      chatRoomId: roomId,
      content: newMessage.trim(),
      receiverId: otherParticipant.id
    });

    setNewMessage('');
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  );

  if (!room) return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
      Chat room not found.
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Chat header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {otherParticipant?.firstName?.charAt(0) || '?'}
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-gray-800">
              {otherParticipant?.role === 'employer'
                ? otherParticipant.companyName
                : `${otherParticipant?.firstName} ${otherParticipant?.lastName}`}
            </h2>
            <p className="text-sm text-gray-600">
              {otherParticipant?.role === 'employer' ? 'Employer' : 'Job Seeker'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 my-8">
              No messages yet. Start the conversation!
            </div>
          )}
          {messages.map(message => {
            const isCurrentUser = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${isCurrentUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                  <div className="text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isCurrentUser && <span className="ml-2">{message.read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={sendMessage} className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`bg-blue-500 text-white px-4 py-2 rounded-r-md ${!newMessage.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;