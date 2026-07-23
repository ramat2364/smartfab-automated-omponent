'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  ClipboardPen,
  Activity,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  Zap,
  Users,
  Settings,
  LogOut,
  Factory
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navigationItems: SidebarItem[] = [
  // Executive items
  { name: 'Executive View', href: '/executive', icon: LayoutDashboard, roles: ['CEO', 'ADMIN'] },
  
  // Production items
  { name: 'Production Dashboard', href: '/production', icon: Factory, roles: ['CEO', 'PLANT_HEAD', 'PRODUCTION_MANAGER', 'ADMIN'] },
  { name: 'Shift Entry', href: '/production/entry', icon: ClipboardPen, roles: ['PRODUCTION_MANAGER', 'PLANT_HEAD', 'ADMIN'] },
  { name: 'Production History', href: '/production/history', icon: BarChart3, roles: ['CEO', 'PLANT_HEAD', 'PRODUCTION_MANAGER', 'ADMIN'] },
  
  // Machine Health items
  { name: 'Machine Registry', href: '/machines', icon: Factory, roles: ['CEO', 'PLANT_HEAD', 'MAINTENANCE_ENGINEER', 'ADMIN'] },
  { name: 'Live Health', href: '/machines/live', icon: Activity, roles: ['CEO', 'PLANT_HEAD', 'MAINTENANCE_ENGINEER', 'ADMIN'] },
  { name: 'Predictive Alerts', href: '/machines/alerts', icon: AlertTriangle, roles: ['CEO', 'PLANT_HEAD', 'MAINTENANCE_ENGINEER', 'ADMIN'] },
  { name: 'Maintenance Logs', href: '/machines/logs', icon: Wrench, roles: ['CEO', 'PLANT_HEAD', 'MAINTENANCE_ENGINEER', 'ADMIN'] },
  
  // Quality items
  { name: 'Defect Log', href: '/quality', icon: ShieldCheck, roles: ['CEO', 'PLANT_HEAD', 'QUALITY_ENGINEER', 'ADMIN'] },
  { name: 'Log Defect', href: '/quality/entry', icon: ClipboardPen, roles: ['QUALITY_ENGINEER', 'PLANT_HEAD', 'ADMIN'] },
  { name: 'Root Cause (RCA)', href: '/quality/root-cause', icon: BarChart3, roles: ['CEO', 'PLANT_HEAD', 'QUALITY_ENGINEER', 'ADMIN'] },
  
  // Energy items
  { name: 'Energy Analytics', href: '/energy', icon: Zap, roles: ['CEO', 'PLANT_HEAD', 'ADMIN'] },
  
  // Admin items
  { name: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { name: 'System Settings', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  // { name: 'System Audit Logs', href: '/admin/logs', icon: Activity, roles: ['ADMIN'] }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  // Filter items by role
  const filteredItems = navigationItems.filter(item => {
    // If the item doesn't explicitly name roles, default to visible. If it does, check user role.
    if (item.roles && !item.roles.includes(user.role)) return false;
    
    // Custom check: CEO doesn't need basic "Production Dashboard" if they have "Executive View",
    // but they can have both if desired. Let's keep it clean.
    return true;
  });

  return (
    <aside className="w-64 sidebar-glass fixed inset-y-0 left-0 z-20 flex flex-col justify-between py-6 px-4">
      <div>
        {/* Company Logo Header */}
        <div className="flex items-center space-x-3 px-3 mb-8">
          <div className="bg-brand-blue/10 p-2 rounded-lg border border-brand-blue/30">
            <Factory className="h-6 w-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-sidebar-text-title uppercase">SmartFab Automated</h1>
            <p className="text-[10px] text-sidebar-text-muted font-semibold tracking-wider">TRANSFORMATION</p>
          </div>
        </div>

        {/* User Badge */}
        <div className="bg-sidebar-user-bg border border-sidebar-user-border rounded-xl p-3 mb-6 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-brand-blue/20 flex items-center justify-center border border-brand-blue/30 font-bold text-brand-blue text-sm">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-sidebar-text-title truncate">{user.name}</p>
            <p className="text-[10px] text-brand-cyan font-bold tracking-wider uppercase truncate">{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1">
          {filteredItems.map(item => {
            const isActive = pathname === item.href || (
              pathname.startsWith(item.href + '/') &&
              !navigationItems.some(nav => nav.href !== item.href && pathname.startsWith(nav.href))
            );
            const Icon = item.icon || Factory;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-link-active-bg text-sidebar-link-active-text font-medium border-l-2 border-brand-blue pl-2.5'
                    : 'text-sidebar-text-muted hover:text-sidebar-link-hover-text hover:bg-sidebar-link-hover-bg'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-brand-blue' : 'text-sidebar-text-muted'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <button
        onClick={logout}
        className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-text-muted hover:text-brand-rose hover:bg-brand-rose/10 transition-colors"
      >
        <LogOut className="h-4.5 w-4.5" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
