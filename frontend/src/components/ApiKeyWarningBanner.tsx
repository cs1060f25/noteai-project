import { Link } from '@tanstack/react-router';
import { AlertCircle, ArrowRight, Key } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from './ui/button';

interface ApiKeyWarningBannerProps {
  onSetupClick?: () => void;
}

export function ApiKeyWarningBanner({ onSetupClick }: ApiKeyWarningBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              Gemini API Key Required
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              To use AI-powered video processing features, you need to set up your Gemini API key.
              This only takes a minute and unlocks all the powerful features of NoteAI.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/onboarding">
                <Button
                  onClick={onSetupClick}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Set Up API Key
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="border-amber-500/30">
                  Get API Key from Google
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
