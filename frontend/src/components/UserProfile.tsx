import { useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

export const UserProfile = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  return (
    <div className="relative">
      {/* profile button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors fluent-focus"
      >
        {user.picture_url ? (
          <img
            src={user.picture_url}
            alt={user.name || user.email}
            className="w-8 h-8 rounded-full border-2 border-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <div className="text-left hidden md:block">
          <p className="fluent-body text-sm font-medium text-foreground">
            {user.name || 'User'}
          </p>
          <p className="fluent-caption text-xs text-muted-foreground">{user.email}</p>
        </div>
      </button>

      {/* dropdown menu */}
      {showMenu && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* menu */}
          <div className="absolute right-0 top-full mt-2 w-64 fluent-layer-3 border border-border rounded-lg fluent-shadow-lg z-50">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                {user.picture_url ? (
                  <img
                    src={user.picture_url}
                    alt={user.name || user.email}
                    className="w-12 h-12 rounded-full border-2 border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="fluent-body text-sm font-medium text-foreground truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="fluent-caption text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors fluent-focus"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
                <span className="fluent-body text-sm text-foreground">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
