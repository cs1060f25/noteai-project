import { useRef, useEffect, useState } from 'react';

import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/components/ui/button';
import { usePlayer } from '@/context/PlayerContext';

export function AudioPlayer() {
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, closePlayer } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);


  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  if (!currentTrack) return null;

  const togglePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-4xl mx-auto">
            <div className="glass-card border-border/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl bg-background/80 supports-[backdrop-filter]:bg-background/40">
              {/* Progress Bar - Top Edge */}
              <div className="relative h-1 w-full bg-primary/10 cursor-pointer group">
                <div 
                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-100"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <div className="absolute inset-y-0 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                </div>
              </div>

              <div className="p-4 flex items-center gap-4 sm:gap-6">
                {/* Track Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-6 h-6 text-primary animate-pulse">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 6V18M12 6C12 6 16 8 16 12C16 16 12 18 12 18M12 6C12 6 8 8 8 12C8 16 12 18 12 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate text-sm sm:text-base">{currentTrack.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">AI Podcast • {formatTime(currentTime)} / {formatTime(duration)}</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    onClick={() => skip(-10)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    onClick={() => skip(10)}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Volume & Actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2 group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    
                    <div className="w-0 overflow-hidden group-hover:w-20 transition-all duration-300 ease-in-out">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setVolume(newVolume);
                          if (audioRef.current) {
                            audioRef.current.volume = newVolume;
                          }
                          setIsMuted(newVolume === 0);
                        }}
                        className="w-20 h-1 accent-primary cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="h-8 w-px bg-border/50 hidden sm:block" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={closePlayer}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={currentTrack.url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              // Optional: Auto-close or just stop
              // closePlayer();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
