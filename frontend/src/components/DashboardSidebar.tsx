import { useState } from 'react';

import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Upload,
  Library,
  Settings,
  Scissors,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  User,
  ChevronDown,
  Monitor,
  Sun,
  Moon,
  Check,
  Sparkle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/ui/theme-provider';
import { UserDropdownContent } from '@/components/UserDropdown';

import type { UserResource } from '@clerk/types';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
}

interface DashboardSidebarProps {
  user: UserResource;
  onLogout: () => void;
}

export const DashboardSidebar = ({ user, onLogout }: DashboardSidebarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const { theme, setTheme } = useTheme();

  const navigation: NavigationItem[] = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'upload', name: 'Upload', icon: Upload, path: '/upload' },
    { id: 'library', name: 'Library', icon: Library, path: '/library' },
    { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
    { id: 'agent-outputs', name: 'Agent Outputs', icon: Sparkle, path: '/agent-outputs' },
  ];

  const isActivePath = (path: string) => {
    return routerState.location.pathname === path;
  };

  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.emailAddresses[0]?.emailAddress?.[0].toUpperCase() || 'U';

  const userImageUrl = user?.imageUrl;
  const userName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.emailAddresses[0]?.emailAddress;

  const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
    };

    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center overflow-hidden`}
      >
        {userImageUrl ? (
          <img src={userImageUrl} alt="User profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-medium">{userInitials}</span>
        )}
      </div>
    );
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 glass-sidebar">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border/50">
          <motion.div
            className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </motion.div>
          <span className="text-foreground font-semibold">NoteAI</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Link key={item.id} to={item.path}>
                <motion.div
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                    isActivePath(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  whileHover={{ x: isActivePath(item.path) ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full glass-card rounded-lg p-3 border border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <UserAvatar size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm truncate">{userName}</div>
                    <div className="text-xs text-muted-foreground truncate">Pro Plan</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <UserDropdownContent onLogout={onLogout} />
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-header border-b border-border/50 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-foreground font-semibold">NoteAI</span>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer">
                <UserAvatar size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <UserDropdownContent onLogout={onLogout} />
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-foreground font-semibold">NoteAI</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-col h-[calc(100%-4rem)]">
              <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => (
                  <Link key={item.id} to={item.path}>
                    <motion.div
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                        isActivePath(item.path)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                ))}
              </nav>

              {/* Mobile User Menu */}
              <div className="p-4 border-t border-border/50 space-y-3">
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{userName}</div>
                      <div className="text-xs text-muted-foreground truncate">Pro Plan</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Link to="/settings">
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                    </Link>
                    <Link to="/settings">
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                    </Link>
                    <div className="border-t border-border/50 my-2" />
                    <div className="px-3 py-1 text-xs text-muted-foreground font-medium">Theme</div>
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTheme(option.value as 'light' | 'dark' | 'system');
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{option.label}</span>
                          {isActive && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      );
                    })}
                    <div className="border-t border-border/50 my-2" />
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
