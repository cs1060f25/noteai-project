import { useState } from 'react';

import {
  Key,
  Sparkles,
  ExternalLink,
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

import { saveGeminiApiKey } from '@/lib/onboarding';

import { Button } from './ui/button';
import { Input } from './ui/input';

interface OnboardingPageProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingPage({ onComplete, onSkip }: OnboardingPageProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    if (!apiKey.startsWith('AIzaSy')) {
      setValidationError('Invalid Gemini API key format');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    // Simulate API key validation
    setTimeout(() => {
      setIsValidating(false);
      toast.success('API key saved securely!');

      // Store the API key (in real app, this would be sent to backend)
      saveGeminiApiKey(apiKey);

      setTimeout(() => {
        onComplete();
      }, 500);
    }, 1500);
  };

  const steps = [
    {
      number: 1,
      title: 'Get Your API Key',
      description: 'Visit Google AI Studio to generate your free Gemini API key',
      action: 'Get API Key',
      link: 'https://aistudio.google.com/app/apikey',
    },
    {
      number: 2,
      title: 'Copy & Paste',
      description: 'Copy your API key and paste it securely below',
      action: 'Enter Key',
    },
    {
      number: 3,
      title: 'Start Creating',
      description: 'Transform your lectures into engaging content with AI',
      action: 'Get Started',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="mb-3">Welcome to Your AI Lecture Studio</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            To get started, we need your Gemini API key to power the AI features. Don't worry, it's
            stored securely and never shared.
          </p>
        </motion.div>

        {/* Steps Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep >= step.number
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span className="font-semibold">{step.number}</span>
                    )}
                  </motion.div>
                  <p
                    className={`text-xs mt-2 text-center ${
                      currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${
                      currentStep > step.number ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Instructions Card */}
              <div className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/50 p-8 shadow-xl">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Key className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-3">How to Get Your Gemini API Key</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary">1</span>
                        </div>
                        <div>
                          <p className="text-sm">
                            Visit <span className="text-primary">Google AI Studio</span> using the
                            button below
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary">2</span>
                        </div>
                        <div>
                          <p className="text-sm">
                            Sign in with your Google account (it's completely free)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary">3</span>
                        </div>
                        <div>
                          <p className="text-sm">
                            Click "Create API Key" and copy the generated key
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary">4</span>
                        </div>
                        <div>
                          <p className="text-sm">
                            Come back here and paste your key in the next step
                          </p>
                        </div>
                      </div>
                    </div>

                    <motion.a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Google AI Studio</span>
                    </motion.a>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
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
                    Gemini offers generous free usage. Perfect for getting started without any cost.
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
                    Unlock advanced video analysis, transcription, and content generation features.
                  </p>
                </motion.div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)} className="rounded-xl h-12 px-6">
                  I Have My API Key
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/50 p-8 shadow-xl">
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
                            We use industry-standard encryption to protect your API key. It's stored
                            securely and used only to process your videos.
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

              {/* Help Section */}
              <div className="rounded-2xl bg-muted/30 border border-border/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm mb-2">Having trouble?</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      Your API key should start with "AIzaSy" followed by alphanumeric characters.
                      If you're having issues, make sure you've created an API key (not an OAuth
                      client).
                    </p>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Go back to Google AI Studio
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12 space-y-4"
        >
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to use your own Gemini API key in compliance with Google's
            terms of service
          </p>
        </motion.div>
      </div>
    </div>
  );
}
