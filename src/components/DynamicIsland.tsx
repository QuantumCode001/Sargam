import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, Sparkles, Music } from 'lucide-react';
import { Track } from '../types';

interface DynamicIslandProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onMaximizePlayer: () => void;
  onOpenAI: () => void;
  accentColor: string;
}

export default function DynamicIsland({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onMaximizePlayer,
  onOpenAI,
  accentColor
}: DynamicIslandProps) {
  const [islandState, setIslandState] = useState<'collapsed' | 'hovered' | 'expanded'>('collapsed');

  const handleIslandClick = () => {
    if (islandState === 'collapsed' || islandState === 'hovered') {
      if (currentTrack) {
        setIslandState('expanded');
      } else {
        onOpenAI();
      }
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
      <motion.div
        layout
        id="dynamic-island-pill"
        onMouseEnter={() => currentTrack && islandState === 'collapsed' && setIslandState('hovered')}
        onMouseLeave={() => islandState === 'hovered' && setIslandState('collapsed')}
        onClick={handleIslandClick}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-full text-white cursor-pointer select-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-between"
        style={{
          width: islandState === 'expanded' ? '340px' : islandState === 'hovered' ? '220px' : currentTrack ? '170px' : '120px',
          height: islandState === 'expanded' ? '80px' : '36px',
        }}
      >
        <AnimatePresence mode="wait">
          {islandState === 'expanded' && currentTrack ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full px-4 flex items-center justify-between"
            >
              {/* Cover Art and Info */}
              <div className="flex items-center space-x-3 min-w-0 flex-1" onClick={onMaximizePlayer}>
                <motion.img
                  layoutId="dynamic-island-cover"
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold truncate text-white">{currentTrack.title}</h4>
                  <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Quick Controls */}
              <div className="flex items-center space-x-2 pl-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePlay();
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 active:scale-90 transition rounded-full text-white"
                >
                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 active:scale-90 transition rounded-full text-white"
                >
                  <SkipForward size={16} fill="white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIslandState('collapsed');
                  }}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-white/10 hover:bg-white/20 transition rounded-full"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ) : islandState === 'hovered' && currentTrack ? (
            <motion.div
              key="hover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full px-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <img
                  src={currentTrack.coverUrl}
                  alt=""
                  className="w-5 h-5 rounded-md object-cover flex-shrink-0"
                />
                <span className="text-xs font-medium truncate text-zinc-300">
                  {currentTrack.title}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex-shrink-0 bg-white/10 px-2 py-0.5 rounded-full">
                Expand
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full px-3 flex items-center justify-between"
            >
              {currentTrack ? (
                <>
                  {/* Wave Equalizer Mini Animation */}
                  <div className="flex items-center space-x-1.5 pl-1">
                    <Music size={12} className="text-zinc-400" />
                    <div className="flex items-end space-x-[2px] h-3 w-5">
                      {[1, 2, 3, 4].map((bar) => (
                        <motion.div
                          key={bar}
                          animate={
                            isPlaying
                              ? { height: [3, 12, 4, 10, 3] }
                              : { height: 3 }
                          }
                          transition={{
                            duration: 1 + bar * 0.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="w-[2px] rounded-full bg-rose-500"
                        />
                      ))}
                    </div>
                  </div>
                  {/* Glowing Indicator */}
                  <div
                    className="w-2 h-2 rounded-full animate-pulse-slow"
                    style={{ backgroundColor: accentColor }}
                  />
                </>
              ) : (
                <div className="w-full flex items-center justify-between" onClick={onOpenAI}>
                  <Sparkles size={14} className="text-purple-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-widest pl-1.5">
                    AI
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
