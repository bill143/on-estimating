'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  FolderOpen,
  Calculator,
  Shield,
  Brain,
  Users,
  ClipboardCheck,
  Crosshair,
  ScanLine,
  Settings,
  HardHat,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; badge?: string }[];
}

const navSections: NavSection[] = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pipeline', label: 'Bid Pipeline', icon: Kanban },
      { href: '/projects', label: 'Projects', icon: FolderOpen },
      { href: '/estimating', label: 'Estimating', icon: Calculator },
      { href: '/takeoff', label: 'Plan Takeoff', icon: ScanLine },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/predictions', label: 'Cost Predictions', icon: Brain },
      { href: '/auto-count', label: 'Auto-Count', icon: ScanLine },
      { href: '/bid-sniper', label: 'Bid Sniper', icon: Crosshair, badge: '2' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/subcontractors', label: 'Subcontractors', icon: Users },
      { href: '/compliance', label: 'Davis-Bacon', icon: Shield },
      { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + Toggle */}
      <div className="flex h-16 items-center border-b border-gray-200 px-3">
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 pl-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">ON</span>
              <span className="text-lg font-light text-gray-500 ml-1">Estimating</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors',
            collapsed && 'mx-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-600' : 'text-gray-400')} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User / Footer */}
      <div className="border-t border-gray-200 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
              {initials}
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
              {initials}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
