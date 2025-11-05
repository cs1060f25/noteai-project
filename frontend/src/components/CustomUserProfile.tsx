import { useState, useRef } from 'react';

import { useUser, useClerk } from '@clerk/clerk-react';
import { User, LogOut, Settings, ChevronDown, Mail, Calendar, Shield, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const CustomUserProfile = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setIsSigningOut(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-accent rounded-lg">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const email = user.primaryEmailAddress?.emailAddress || 'No email';
  const avatarUrl = user.imageUrl;
  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors fluent-focus fluent-hover-lift w-full"
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm ring-2 ring-border">
              {initials}
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="fluent-body text-sm font-medium text-foreground">{fullName}</p>
            <p className="fluent-caption text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && buttonRef.current && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* dropdown - opens upward when at bottom */}
          <div
            className="fixed w-80 max-h-[calc(100vh-120px)] fluent-layer-3 border border-border rounded-lg fluent-shadow-lg z-50 overflow-y-auto overflow-x-hidden"
            style={{
              left: buttonRef.current.getBoundingClientRect().left,
              bottom: window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8,
            }}
          >
            {/* user info section */}
            <div className="p-4 border-b border-border bg-accent/50">
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold ring-2 ring-border">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="fluent-subtitle text-base font-semibold text-foreground truncate">
                    {fullName}
                  </p>
                  <p className="fluent-body text-sm text-muted-foreground truncate">{email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="fluent-caption text-xs text-muted-foreground">
                        Joined {createdAt}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* account details */}
            <div className="p-3 border-b border-border">
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="fluent-caption text-xs text-muted-foreground">Email</p>
                    <p className="fluent-body text-sm text-foreground truncate">{email}</p>
                  </div>
                  {user.primaryEmailAddress?.verification?.status === 'verified' && (
                    <Shield className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {/* menu items */}
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // you can navigate to settings page here
                  console.log('Navigate to settings');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left fluent-focus"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="fluent-body text-sm font-medium text-foreground">Settings</p>
                  <p className="fluent-caption text-xs text-muted-foreground">
                    Manage your account
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  // you can navigate to profile page here
                  console.log('Navigate to profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left fluent-focus"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="fluent-body text-sm font-medium text-foreground">Profile</p>
                  <p className="fluent-caption text-xs text-muted-foreground">View your profile</p>
                </div>
              </button>
            </div>

            {/* sign out */}
            <div className="p-2 border-t border-border">
              <Button
                onClick={handleSignOut}
                disabled={isSigningOut}
                variant="destructive"
                className="w-full justify-start"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
