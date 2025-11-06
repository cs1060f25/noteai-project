import { useState, useEffect } from 'react';

import { useUser, useClerk } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Sun, Moon, User, Bell, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/ui/theme-provider';
import { userService } from '@/services/userService';
import type { UserResponse } from '@/types/api';

export function SettingsComponent() {
  const { theme, setTheme } = useTheme();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [processingNotifications, setProcessingNotifications] = useState(true);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await userService.getCurrentUser();
        setUserProfile(profile);
        setName(profile.name || '');
        setOrganization(profile.organization || '');
        setEmailNotifications(profile.email_notifications);
        setProcessingNotifications(profile.processing_notifications);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        toast.error('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  console.log('ORG', organization);

  // Handle profile save
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await userService.updateCurrentUser({
        name: name || undefined,
        organization: organization || undefined,
      });
      setUserProfile(updated);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notification settings save
  const handleSaveNotifications = async (field: string, value: boolean) => {
    try {
      const updated = await userService.updateCurrentUser({
        [field]: value,
      });
      setUserProfile(updated);
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast.error('Failed to update notification settings');
      // Revert on error
      if (field === 'email_notifications') {
        setEmailNotifications(!value);
      } else if (field === 'processing_notifications') {
        setProcessingNotifications(!value);
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    signOut();
    navigate({ to: '/login' });
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (clerkUser?.firstName && clerkUser?.lastName) {
      return `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`.toUpperCase();
    }
    if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return clerkUser.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return 'U';
  };

  // Check if user is using OAuth (external accounts like Google, GitHub, etc.)
  const isOAuthUser = () => {
    // Clerk stores external accounts for OAuth providers
    return clerkUser?.externalAccounts && clerkUser.externalAccounts.length > 0;
  };

  // Get OAuth provider name
  const getOAuthProvider = () => {
    if (!clerkUser?.externalAccounts || clerkUser.externalAccounts.length === 0) {
      return null;
    }
    const provider = clerkUser.externalAccounts[0]?.provider;
    // Capitalize first letter
    return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const changeTheme = (t: string) => {
    if (t == 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };
  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="mb-2 font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="glass-card rounded-xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <h2>Profile</h2>
          </div>
          <Separator />
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={clerkUser?.imageUrl} />
              <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Profile photo managed through your account provider
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="user-fullname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-card border-border/50"
                autoComplete="off"
                data-lpignore="true"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="user-email-display"
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="glass-card border-border/50 opacity-60"
                autoComplete="off"
                data-lpignore="true"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="grid gap-2">
              <form autoComplete="off">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  name="organization-name"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="glass-card border-border/50"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </form>
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving} className="glass-button">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Appearance Section */}
        <div className="glass-card rounded-xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-muted-foreground" />
            <h2>Appearance</h2>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4>Theme</h4>
              <p className="text-sm text-muted-foreground">Choose between light and dark mode</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeTheme(theme)}
              className="glass-card overflow-hidden cursor-pointer"
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    exit={{ rotate: 90, scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    exit={{ rotate: -90, scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="glass-card rounded-xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2>Notifications</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4>Email Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your videos
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  handleSaveNotifications('email_notifications', checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4>Processing Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified when video processing completes
                </p>
              </div>
              <Switch
                checked={processingNotifications}
                onCheckedChange={(checked) => {
                  setProcessingNotifications(checked);
                  handleSaveNotifications('processing_notifications', checked);
                }}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="glass-card rounded-xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <h2>Security</h2>
          </div>
          <Separator />
          {isOAuthUser() ? (
            // OAuth user - cannot change password
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1 font-medium text-blue-900 dark:text-blue-100">
                      OAuth Authentication
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      You're signed in with {getOAuthProvider() || 'an external provider'}. Your
                      password is managed by your authentication provider and cannot be changed
                      here.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  To manage your account security, please visit your{' '}
                  {getOAuthProvider() || 'OAuth provider'}'s account settings.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Two-factor authentication</li>
                  <li>Password changes</li>
                  <li>Security alerts</li>
                  <li>Connected devices</li>
                </ul>
              </div>
            </div>
          ) : (
            // Email/password user - can change password
            <>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    className="glass-card border-border/50"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    className="glass-card border-border/50"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    className="glass-card border-border/50"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button variant="outline" className="glass-card" disabled>
                Update Password
              </Button>
              <p className="text-xs text-muted-foreground">
                Password changes are currently disabled. Please contact support if you need to reset
                your password.
              </p>
            </>
          )}
        </div>

        {/* Billing Section */}
        <div className="glass-card rounded-xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h2>Billing</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4>Current Plan</h4>
                <p className="text-sm text-muted-foreground">Pro Plan - $29/month</p>
              </div>
              <Button variant="outline" className="glass-card">
                Upgrade
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4>Usage This Month</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="text-2xl mb-1">24</div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="text-2xl mb-1">186</div>
                  <div className="text-xs text-muted-foreground">Clips</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="text-2xl mb-1">3.2 GB</div>
                  <div className="text-xs text-muted-foreground">Storage</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-xl border border-destructive/50 p-6 space-y-6">
          <div>
            <h2 className="text-destructive">Danger Zone</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4>Log Out</h4>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-destructive">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="destructive"
                disabled
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsComponent,
});
