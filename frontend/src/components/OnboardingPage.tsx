import * as React from 'react';
import { useState, useEffect } from 'react';

import { useUser } from '@clerk/clerk-react';
import { AxiosError } from 'axios';
import {
  Key,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { userService } from '@/services/userService';

import InstructionsCard from './onboarding/InstructionCard';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface OnboardingPageProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingPage({ onComplete, onSkip }: OnboardingPageProps) {
  const { user } = useUser();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSkipOnboarding = async () => {
    if (!user) return;

    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          hasCompletedOnboarding: true,
        },
      });

      onSkip?.();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Failed to skip. Please try again.');
    }
  };

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    if (!apiKey.startsWith('AIzaSy')) {
      setValidationError('Invalid Gemini API key format');
      return;
    }

    if (!user) {
      setValidationError('User not found. Please try again.');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Store API key via backend
      await userService.storeApiKey(apiKey);

      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          hasCompletedOnboarding: true,
        },
      });

      toast.success('API key saved securely!');

      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      console.error('Error saving API key:', error);
      const axiosError = error as AxiosError<{ detail: string }>;
      const message =
        axiosError.response?.data?.detail ||
        'Failed to validate and save API key. Please try again.';
      setValidationError(message);
    } finally {
      setIsValidating(false);
    }
  };

  const steps = [
    { number: 1, title: 'Get Your API Key' },
    { number: 2, title: 'Copy & Paste' },
    { number: 3, title: 'Start Creating' },
  ];

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto w-full max-w-4xl h-full grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 p-4 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
          >
            <img src="/logo.png" alt="NoteAI Logo" className="w-full h-full object-contain" />
          </motion.div>

          <h1 className="mb-2 sm:mb-3 text-2xl sm:text-3xl">Welcome to Your AI Lecture Studio</h1>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto px-2">
            To get started, we need your Gemini API key to power the AI features. Do not worry, it
            is stored securely and never shared.
          </p>
        </motion.div>

        {/* Steps Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2 relative z-10"
        >
          <div className="w-full flex justify-center">
            <div className="inline-flex items-center w-full max-w-md justify-between px-4 sm:px-0 sm:justify-center sm:w-auto sm:gap-0">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="relative h-12 flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        currentStep >= step.number
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                      ) : (
                        <span className="font-semibold text-sm sm:text-base">{step.number}</span>
                      )}
                    </motion.div>
                    <p
                      className={`absolute top-full mt-2 sm:mt-3 w-24 sm:w-32 text-center text-[10px] sm:text-xs px-1 ${
                        currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 sm:mx-4 self-center transition-all sm:w-40 ${
                        currentStep > step.number ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-auto pt-6 pb-20 space-y-6 relative z-0 mt-8"
              >
                <InstructionsCard />

                <div className="grid md:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-border/50 p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm mb-2">100% Secure</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your API key is encrypted and stored securely. We never share it with anyone.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-border/50 p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm mb-2">Free Tier</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Gemini offers generous free usage. Perfect for getting started without any
                      cost.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-border/50 p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm mb-2">Powerful AI</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Unlock advanced video analysis, transcription, and content generation
                      features.
                    </p>
                  </motion.div>
                </div>

                <div className="flex items-center justify-between">
                  {onSkip && (
                    <Button
                      variant="ghost"
                      onClick={handleSkipOnboarding}
                      className="rounded-xl h-12"
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button onClick={() => setCurrentStep(2)} className="rounded-xl h-12 px-6">
                    I Have My API Key
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="h-10" />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-auto pt-6 pb-20 relative z-0"
              >
                <div className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-xl p-6 sm:p-8 mt-8">
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Key className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="mb-2">Enter Your API Key</h2>
                      <p className="text-muted-foreground">
                        Paste your Gemini API key below to continue
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setValidationError('');
                          }}
                          placeholder="AIzaSy..."
                          className="h-14 pr-24 rounded-xl text-base border-border/50 bg-background/50"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="rounded-lg h-10 w-10"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          {apiKey && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.readText().then((text) => {
                                  setApiKey(text);
                                  toast.success('Pasted from clipboard');
                                });
                              }}
                              className="rounded-lg h-10 w-10"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {validationError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-3"
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span>{validationError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="text-foreground">Your API key is encrypted</span>
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              We use industry standard encryption to protect your API key. It is
                              stored securely and used only to process your videos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 rounded-xl h-12"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleValidateAndSave}
                        disabled={isValidating || !apiKey}
                        className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90"
                      >
                        {isValidating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                            </motion.div>
                            <span>Validating...</span>
                          </>
                        ) : (
                          <>
                            <span>Continue</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to use your own Gemini API key in compliance with Google terms
            of service
          </p>
        </motion.div>
      </div>
    </div>
  );
}
