import { useState } from 'react';

import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // clerk password reset logic would go here
    console.log('Password reset requested for:', email);
    setSubmitted(true);
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
            <h1 className="fluent-title text-2xl text-foreground mb-2">Forgot password?</h1>
            <p className="fluent-body text-muted-foreground">
              {submitted
                ? 'Check your email for a password reset link.'
                : 'No worries, we will send you reset instructions.'}
            </p>
          </CardHeader>

          <CardContent>
            {!submitted ? (
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
                  />
                </Field>

                <Button type="submit" className="w-full">
                  Reset password
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="fluent-body text-foreground">
                  We've sent a password reset link to <span className="font-medium">{email}</span>
                </p>
                <Link
                  to="/login"
                  className="inline-block text-primary hover:underline fluent-focus"
                >
                  Back to login
                </Link>
              </div>
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
