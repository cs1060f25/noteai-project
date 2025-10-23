import { useState } from 'react';

import { AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { AuthLayout } from './AuthLayout';

interface VerificationFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onBack: () => void;
  error: string | null;
}

export const VerificationForm = ({ email, onVerify, onBack, error }: VerificationFormProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onVerify(code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout className="w-full">
      <form onSubmit={handleSubmit} className={cn('flex flex-col gap-6')}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-muted-foreground text-sm text-balance">
              We've sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="code">Verification Code</FieldLabel>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
            />
          </Field>

          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>
          </Field>

          <Field>
            <Button type="button" variant="outline" onClick={onBack} className="w-full">
              Back
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
};
