import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ListMusic, Heart, Sparkles, Download, Trash, Plus } from 'lucide-react';
import { Track, Playlist } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  track: Track;
  playlists: Playlist[];
  isLiked: boolean;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onDownload: (track: Track) => void;
  onOsanAnalyze: (track: Track) => void;
  onRemoveFromHistory?: (trackId: string) => void;
  onOpenCreatePlaylistModal?: () => void;
  darkMode?: boolean;
}

export default function ContextMenu({
  x,
  y,
  track,
  playlists,
  isLiked,
  onClose,
  onPlay,
  onAddToQueue,
  onToggleLike,
  onAddToPlaylist,
  onDownload,
  onOsanAnalyze,
  onRemoveFromHistory,
  onOpenCreatePlaylistModal,
  darkMode = true
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust positioning to avoid screen overflows
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  // Dynamic Theme Styling
  const bgClass = darkMode 
    ? 'bg-zinc-950/85 border-white/10 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
    : 'bg-white/95 border-zinc-200/80 text-zinc-800 shadow-[0_15px_30px_rgba(0,0,0,0.12)]';
  
  const itemClass = `w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-xl transition text-left ${
    darkMode 
      ? 'text-zinc-100 hover:bg-white/10 active:bg-white/20' 
      : 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
  }`;

  const iconClass = darkMode ? 'text-zinc-400' : 'text-zinc-500';
  const borderClass = darkMode ? 'border-white/5' : 'border-zinc-200/60';

  return (
    <div
      className="fixed z-[1000] pointer-events-auto"
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
    >
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`w-56 backdrop-blur-2xl border rounded-2xl p-1.5 flex flex-col space-y-[2px] ${bgClass}`}
      >
        {/* Play Now */}
        <button
          onClick={() => {
            onPlay(track);
            onClose();
          }}
          className={itemClass}
        >
          <Play size={15} fill={darkMode ? "white" : "#3f3f46"} className={darkMode ? "text-white" : "text-zinc-600"} />
          <span>Play Now</span>
        </button>

        {/* Add to Queue */}
        <button
          onClick={() => {
            onAddToQueue(track);
            onClose();
          }}
          className={itemClass}
        >
          <ListMusic size={15} className={iconClass} />
          <span>Play Next</span>
        </button>

        {/* Favorite / Liked */}
        <button
          onClick={() => {
            onToggleLike(track);
            onClose();
          }}
          className={itemClass}
        >
          <Heart size={15} className={isLiked ? "text-rose-500" : iconClass} fill={isLiked ? "currentColor" : "none"} />
          <span>{isLiked ? 'Loved' : 'Love'}</span>
        </button>

        {/* AI Analysis */}
        <button
          onClick={() => {
            onOsanAnalyze(track);
            onClose();
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-xl transition text-left border-t mt-1 pt-2 ${
            darkMode 
              ? 'text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20 border-white/5' 
              : 'text-rose-600 hover:bg-rose-50 active:bg-rose-100 border-zinc-200/60'
          }`}
        >
          <Sparkles size={15} className="text-rose-400 animate-pulse" />
          <span className="font-medium">Aura AI Insight</span>
        </button>

        {/* Simulated Download */}
        <button
          onClick={() => {
            onDownload(track);
            onClose();
          }}
          className={itemClass}
        >
          <Download size={15} className={iconClass} />
          <span>Download Offline</span>
        </button>

        {/* Remove from History */}
        {onRemoveFromHistory && (
          <button
            onClick={() => {
              onRemoveFromHistory(track.id);
              onClose();
            }}
            className={`${itemClass} text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20`}
          >
            <Trash size={15} className="text-rose-500" />
            <span>Remove from History</span>
          </button>
        )}

        {/* Add To Playlist Section */}
        <div className={`border-t ${borderClass} mt-1 pt-1`}>
          <div className="px-3 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Add to Playlist
          </div>
          <div className="max-h-28 overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenCreatePlaylistModal) {
                    onOpenCreatePlaylistModal();
                  }
                }}
                className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs rounded-lg transition text-left ${
                  darkMode 
                    ? 'text-zinc-400 hover:bg-white/5 hover:text-white' 
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                }`}
              >
                <Plus size={11} className="text-zinc-500" />
                <span className="font-semibold">Create Playlist...</span>
              </button>
            ) : (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    onAddToPlaylist(playlist.id, track);
                    onClose();
                  }}
                  className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs rounded-lg transition text-left truncate ${
                    darkMode 
                      ? 'text-zinc-300 hover:bg-white/5' 
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <Plus size={11} className="text-zinc-500" />
                  <span className="truncate">{playlist.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
