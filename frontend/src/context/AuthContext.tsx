import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: 'seeker' | 'employer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'seeker' | 'employer') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/users/profile`,
            {
              headers: {
                Authorization: `Bearer ${storedToken}`
              }
            }
          );
          const apiUser = response.data;
          const mappedUser: User = {
            id: apiUser.id,
            email: apiUser.email,
            role: apiUser.role === 'SEEKER' ? 'seeker' : 'employer'
          };
          setUser(mappedUser);
          setToken(storedToken);
        } catch (error) {
          console.error('Failed to validate token:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token, user: apiUser } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      const mappedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        role: apiUser.role === 'SEEKER' ? 'seeker' : 'employer'
      };
      setUser(mappedUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, role: 'seeker' | 'employer') => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        email,
        password,
        role: role === 'seeker' ? 'SEEKER' : 'EMPLOYER'
      });
      
      const { token, user: apiUser } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      const mappedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        role: apiUser.role === 'SEEKER' ? 'seeker' : 'employer'
      };
      setUser(mappedUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};