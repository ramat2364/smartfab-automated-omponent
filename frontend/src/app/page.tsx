'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    let target = '/login';
    if (user) {
      switch (user.role) {
        case 'CEO':
          target = '/executive';
          break;
        case 'PLANT_HEAD':
        case 'PRODUCTION_MANAGER':
          target = '/production';
          break;
        case 'MAINTENANCE_ENGINEER':
          target = '/machines';
          break;
        case 'QUALITY_ENGINEER':
          target = '/quality';
          break;
        case 'ADMIN':
          target = '/admin/users';
          break;
        default:
          target = '/production';
      }
    }

    if (typeof window !== 'undefined') {
      window.location.replace(target);
    } else {
      router.push(target);
    }
  }, [user, loading, router]);


  return (
    <div className="min-h-screen bg-[#080B13] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
      <p className="text-sm text-gray-400 font-semibold tracking-wide">Routing to your workspace...</p>
    </div>
  );
}
