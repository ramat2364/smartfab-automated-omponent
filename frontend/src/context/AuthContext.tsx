'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getApiBaseUrl } from '@/config/api';

export type UserRole = 'CEO' | 'PLANT_HEAD' | 'PRODUCTION_MANAGER' | 'MAINTENANCE_ENGINEER' | 'QUALITY_ENGINEER' | 'ADMIN';


export interface Plant {
  id: string;
  name: string;
  code: string;
  location: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plantAccess: Plant | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAPIUrl = () => getApiBaseUrl();

// Queue concurrent refresh token requests to avoid race conditions
let activeRefreshPromise: Promise<string | null> | null = null;

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && (Date.now() / 1000) >= payload.exp) {
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error decoding JWT token:', e);
    return false;
  }
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load auth from localStorage on boot
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    const storedRefresh = localStorage.getItem('refreshToken');

    if (storedUser && storedToken && storedRefresh) {
      if (isTokenExpired(storedRefresh)) {
        console.warn('Stored refresh token is expired. Clearing local storage.');
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } else {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setRefreshToken(storedRefresh);
      }
    }
    setLoading(false);
  }, []);

  // Redirect unauthenticated users
  useEffect(() => {
    if (loading) return;
    
    const publicPages = ['/login'];
    const isPublicPage = publicPages.includes(pathname);

    if (!user && !isPublicPage) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.push('/login');
      }
    } else if (user && isPublicPage) {
      let target = '/production';
      if (user.role === 'CEO') target = '/executive';
      else if (user.role === 'ADMIN') target = '/admin/users';
      else if (user.role === 'MAINTENANCE_ENGINEER') target = '/machines';
      else if (user.role === 'QUALITY_ENGINEER') target = '/quality';

      if (typeof window !== 'undefined') {
        window.location.replace(target);
      } else {
        router.push(target);
      }
    }
  }, [user, loading, pathname, router]);


  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${getAPIUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      
      setUser(data.user);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Routing redirect
      let targetPath = '/production';
      if (data.user.role === 'CEO') {
        targetPath = '/executive';
      } else if (data.user.role === 'ADMIN') {
        targetPath = '/admin/users';
      } else if (data.user.role === 'MAINTENANCE_ENGINEER') {
        targetPath = '/machines';
      } else if (data.user.role === 'QUALITY_ENGINEER') {
        targetPath = '/quality';
      }

      if (typeof window !== 'undefined') {
        window.location.href = targetPath;
      } else {
        router.push(targetPath);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await fetch(`${getAPIUrl()}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.error('Logout API call failed, clearing local storage anyway.', e);
    } finally {
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  const refreshAccessToken = async (currRefresh: string): Promise<string | null> => {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const response = await fetch(`${getAPIUrl()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currRefresh }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.warn('Session expired. Logging out.');
          } else {
            console.error(`Token refresh failed with status ${response.status}. Logging out.`);
          }
          await logout();
          return null;
        }

        const data = await response.json();
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setUser(data.user);

        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        return data.accessToken;
      } catch (error) {
        console.error('Network or unexpected error during token refresh. Logging out:', error);
        await logout();
        return null;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  };

  const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    // Fallback to localStorage if state token has not populated yet (e.g. initial page reload)
    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    
    // Add auth headers
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const fetchOptions = { ...options, headers };
    const url = path.startsWith('http') ? path : `${getAPIUrl()}${path}`;

    let response = await fetch(url, fetchOptions);

    // If forbidden or expired, try rotating the refresh token
    if (response.status === 403) {
      // 1. Check if a concurrent request already updated the token in localStorage
      const latestToken = localStorage.getItem('accessToken');
      if (latestToken && latestToken !== currentToken) {
        console.log('Access token was already refreshed by another concurrent request. Retrying...');
        headers.set('Authorization', `Bearer ${latestToken}`);
        return fetch(url, { ...options, headers });
      }

      // 2. Otherwise, we are the first to trigger refresh
      const currentRefresh = localStorage.getItem('refreshToken') || refreshToken;
      if (currentRefresh) {
        console.log('Access token expired. Attempting refresh...');
        const newToken = await refreshAccessToken(currentRefresh);
        
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, { ...options, headers });
        }
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
