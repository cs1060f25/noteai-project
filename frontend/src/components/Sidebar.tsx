import { Link, useRouterState } from '@tanstack/react-router';
import { Brain, FolderOpen, Home, Settings, Upload, Video } from 'lucide-react';

import { CustomUserProfile } from './CustomUserProfile';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview', to: '/dashboard' },
  { id: 'upload', label: 'Upload', icon: Upload, description: 'Upload new videos', to: '/upload' },
  {
    id: 'library',
    label: 'Library',
    icon: FolderOpen,
    description: 'Browse videos',
    to: '/library',
  },
  {
    id: 'agent-outputs',
    label: 'Agent Outputs',
    icon: Brain,
    description: 'Debug agent results',
    to: '/agent-outputs',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Preferences',
    to: '/settings',
  },
];

export const Sidebar = () => {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside className="w-64 fluent-layer-2 border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Video className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="fluent-title text-lg">NoteAI</h1>
            <p className="fluent-caption">Lecture Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to;

            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left fluent-focus fluent-reveal group ${
                    isActive
                      ? 'bg-primary text-primary-foreground fluent-shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <div className="flex-1">
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs opacity-75 mt-0.5">{item.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* user profile at bottom */}
      <div className="p-4 border-t border-border">
        <CustomUserProfile />
      </div>
    </aside>
  );
};
