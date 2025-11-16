import { Key, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function InstructionsCard() {
  const items = [
    'Visit Google AI Studio using the button below',
    'Sign in with your Google account (it is completely free)',
    'Click "Create API Key" and copy the generated key',
    'Come back here and paste your key in the next step',
  ];

  return (
    <div className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/50 p-8 shadow-xl">
      <div className="flex items-start gap-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Key className="w-7 h-7 text-white" />
        </div>

        <div className="flex-1">
          <h2 className="mb-3">How to Get Your Gemini API Key</h2>

          <ul className="space-y-3">
            {items.map((text, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_1fr] items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs text-primary">{i + 1}</span>
                </div>

                <p className="text-sm leading-[1.75rem]">{text}</p>
              </li>
            ))}
          </ul>

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
  );
}
