'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Loader2 } from 'lucide-react';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
        <p className="text-sm text-text-secondary font-semibold tracking-wide">Initializing SmartFab Automated Platform...</p>
      </div>
    );
  }

  if (!user) {
    return null; // AuthContext handles redirect to /login
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary dashboard-theme">
      <Sidebar />
      <Navbar />
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
