import { useState } from 'react';

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { sendPasswordResetCode, resetPassword, loading, error, setError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetCode(email);
      setStep('reset');
    } catch (err) {
      // error is handled in useAuth
      console.error(err);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await resetPassword(code, password);
      toast.success('Password reset successfully. Logging you in...');

      // Add a small delay so user can see the toast before redirecting
      setTimeout(() => {
        navigate({ to: '/' });
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-screen min-h-screen bg-background2 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Back to login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 fluent-focus"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="fluent-title text-2xl text-foreground mb-2">
              {step === 'email' ? 'Forgot password?' : 'Reset password'}
            </h1>
            <p className="fluent-body text-muted-foreground">
              {step === 'email'
                ? 'No worries, we will send you reset instructions.'
                : 'Enter the code sent to your email and your new password.'}
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field>
                  <FieldLabel>
                    Email <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-border"
                    required
                    autoComplete="off"
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Reset password'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <Field>
                  <FieldLabel>
                    Verification Code <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    type="text"
                    placeholder="Enter code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="border border-border"
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    New Password <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border border-border pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>
                    Confirm Password <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border border-border pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </Field>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Resetting...' : 'Set new password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});
