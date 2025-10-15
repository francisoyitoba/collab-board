import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Fetch unread count and subscribe to socket notifications
  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      if (!token || !user) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          const rooms = res.data || [];
          const total = rooms.reduce((sum: number, r: any) => sum + (r.unreadCount || 0), 0);
          setUnread(total);
        }
      } catch (err) {
        // Silently ignore
      }
    };

    // Initial fetch
    fetchUnread();

    // Setup socket for live notifications
    if (token && user) {
      socketRef.current = io(import.meta.env.VITE_API_URL, {
        auth: { token }
      });

      socketRef.current.on('notification', (payload: any) => {
        if (payload?.type === 'new-message') {
          setUnread((u) => u + 1);
        }
      });
    }

    // Refetch when tab becomes visible or route changes
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onUnreadRecalc = () => fetchUnread();
    window.addEventListener('unread-recalc', onUnreadRecalc as EventListener);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('unread-recalc', onUnreadRecalc as EventListener);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  // Poll on route change to keep badge fresh
  useEffect(() => {
    const poll = setTimeout(() => {
      if (token && user) {
        axios
          .get(`${import.meta.env.VITE_API_URL}/api/chat/rooms`, { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => {
            const rooms = res.data || [];
            const total = rooms.reduce((sum: number, r: any) => sum + (r.unreadCount || 0), 0);
            setUnread(total);
          })
          .catch(() => {});
      }
    }, 500);
    return () => clearTimeout(poll);
  }, [location.pathname]);

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white font-bold shadow-brand">JP</span>
            <span className="text-lg font-semibold text-gray-900">JobPulse</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'seeker' && (
                  <>
                    <Link to="/seeker" className="nav-link">Dashboard</Link>
                    <Link to="/seeker/profile" className="nav-link">Profile</Link>
                  </>
                )}

                {user.role === 'employer' && (
                  <>
                    <Link to="/employer" className="nav-link">Dashboard</Link>
                    <Link to="/employer/jobs/new" className="nav-link">Post Job</Link>
                    <Link to="/employer/profile" className="nav-link">Profile</Link>
                  </>
                )}

                <Link to="/chat" className="nav-link relative" title="Messages" aria-label="Messages">
                  <span className="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 5a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3H8l-4 3v-3H5a3 3 0 01-3-3V5z" />
                    </svg>
                    <span className="hidden sm:inline">Messages</span>
                  </span>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-2 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-xs h-5 min-w-[1.25rem] px-1">
                      {unread}
                    </span>
                  )}
                </Link>

                <div className="flex items-center gap-3 pl-2 ml-2 border-l border-gray-200">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.firstName || user.email}
                  </span>
                  <button onClick={handleLogout} className="btn btn-secondary text-sm">Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="nav-link">Login</Link>
                <Link to="/auth/register" className="btn btn-primary text-sm">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;