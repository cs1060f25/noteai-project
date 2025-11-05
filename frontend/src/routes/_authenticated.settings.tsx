import { useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { LogOut, Sun, Moon, User, Bell, Lock, CreditCard } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/ui/theme-provider';

export function SettingsComponent() {
  const { theme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [processingNotifications, setProcessingNotifications] = useState(true);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="mb-2">Settings</h1>
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
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl">JD</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="glass-card">
                Change Avatar
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="John Doe" className="glass-card border-border/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue="john.doe@example.com"
                className="glass-card border-border/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                defaultValue="University of Technology"
                className="glass-card border-border/50"
              />
            </div>
          </div>
          <Button className="glass-button">Save Changes</Button>
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
              <div className="flex items-center gap-2">
                <h4>Theme</h4>
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {theme === 'light' ? 'Light' : 'Dark'}
              </span>
              <Switch checked={theme === 'dark'} className="data-[state=checked]:bg-primary" />
            </div>
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
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
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
                onCheckedChange={setProcessingNotifications}
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
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                className="glass-card border-border/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" className="glass-card border-border/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                className="glass-card border-border/50"
              />
            </div>
          </div>
          <Button variant="outline" className="glass-card">
            Update Password
          </Button>
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
