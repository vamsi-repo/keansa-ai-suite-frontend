import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as apiService from '@/services/api';

interface User {
  email: string;
  id: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  register: (userData: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    password: string;
    confirm_password: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const register = async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    password: string;
    confirm_password: string;
  }) => {
    try {
      const response = await apiService.register(userData);
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('AuthProvider register error:', error);
      throw error;
    }
  };

  useEffect(() => {
  const checkAuth = async () => {
    try {
      const response = await apiService.checkAuthStatus();
      console.log('Check auth response:', response.data);
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      console.error('Check auth error:', error);
      setUser(null);
      setIsAuthenticated(false);
      if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
        navigate('/login', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };
  checkAuth();
}, [navigate, location.pathname]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser, setIsAuthenticated, isLoading, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};