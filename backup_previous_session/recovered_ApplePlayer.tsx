import AudioVisualizer from './AudioVisualizer';

interface ApplePlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  accentColor: string;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onOpenAI: () => void;
  darkMode?: boolean;
}

export default function ApplePlayer({
  currentTrack,
  isPlaying,
  currentTime,
  volume,
  shuffle,
  repeat,
  accentColor,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  speed,
  onSpeedChange,
  onOpenAI,
  darkMode = true
}: ApplePlayerProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'lyrics'>('visual');
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [localTime, setLocalTime] = useState(currentTime);

  useEffect(() => {
    if (!isDragging) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isDragging]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalRelease = () => {
        setIsDragging(false);
        onSeek(localTime);
      };
      window.addEventListener('mouseup', handleGlobalRelease);
      window.addEventListener('touchend', handleGlobalRelease);
      return () => {
        window.removeEventListener('mouseup', handleGlobalRelease);
        window.removeEventListener('touchend', handleGlobalRelease);
      };
    }
  }, [isDragging, localTime, onSeek]);

  if (!currentTrack) return null;

  // Format seconds into mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTime(Number(e.target.value));
  };

  const startSleepTimer = (minutes: number) => {
    setSleepTimeRemaining(minutes * 60);
    setShowSleepTimer(false);
    
    const interval = setInterval(() => {
      setSleepTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (isPlaying) onTogglePlay(); // Pause
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      className={`fixed inset-0 z-[500] ${
        darkMode ? 'bg-zinc-950/95 text-white' : 'bg-white/95 text-zinc-900'
      } backdrop-blur-3xl flex flex-col pointer-events-auto overflow-hidden select-none`}
    >
      {/* Background Album Art Blur Backdrop */}
      <div className={`absolute inset-0 -z-10 overflow-hidden ${darkMode ? 'opacity-30' : 'opacity-45'} select-none pointer-events-none`}>
        <img
          src={currentTrack.coverUrl}
          alt=""
          className="w-full h-full object-cover scale-150 blur-[100px]"
        />
        <div className={`absolute inset-0 ${darkMode ? 'bg-black/60' : 'bg-white/70'}`} />
      </div>

      {/* Header */}
      <div className={`h-16 border-b ${darkMode ? 'border-white/5' : 'border-zinc-200'} flex items-center justify-between px-6 z-20`}>
        <button
          onClick={onClose}
          className={`p-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'} active:scale-95 transition rounded-full`}
        >
          <ChevronDown size={22} className={darkMode ? 'text-zinc-300' : 'text-zinc-600'} />
        </button>

        {/* View Switcher */}
        <div className={`flex space-x-1 ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.03] border-black/[0.05]'} border p-1 rounded-full text-xs font-semibold`}>
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
              activeTab === 'visual'
                ? darkMode
                  ? 'bg-white/15 text-white'
                  : 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                : darkMode
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
              activeTab === 'lyrics'
                ? darkMode
                  ? 'bg-white/15 text-white'
                  : 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                : darkMode
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Live Lyrics
          </button>
        </div>

        <button
          onClick={onOpenAI}
          title="Aura AI Assistant"
          className={`p-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'} active:scale-95 transition rounded-full text-purple-500`}
        >
          <Sparkles size={18} className="animate-pulse" />
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-12 items-center overflow-hidden">
        {/* Left/Center Column - Album Art or Visualizer */}
        <div className="flex flex-col items-center justify-center h-full max-h-[480px] md:max-h-none">
          <AnimatePresence mode="wait">
            {activeTab === 'visual' ? (
              <motion.div
                key="art"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] aspect-square"
              >
                {/* Visualizer Canvas under the cover art */}
                <div className="absolute inset-0 z-0">
                  <AudioVisualizer isPlaying={isPlaying} volume={volume} accentColor={accentColor} />
                </div>

                {/* Cover Art Wrapper with 3D Tilt Glow and Rotating Disc Vinyl style */}
                <motion.div
                  className={`relative w-[70%] aspect-square rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-10 border-[6px] border-zinc-900 overflow-hidden flex-shrink-0 animate-spin-slow ${
                    isPlaying ? '' : 'animation-paused'
                  }`}
                  style={{
                    boxShadow: isPlaying ? `0 0 40px ${accentColor}44` : 'none',
                    scale: isPlaying ? 1.05 : 0.95,
                    transition: 'transform 0.5s ease-out, scale 0.5s ease-out, box-shadow 0.5s ease-out',
                    animationDuration: `${20 / speed}s`
                  }}
                >
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover select-none"
                  />
                  {/* Center pin-hole of a record */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border-4 border-zinc-950 flex items-center justify-center shadow-inner">
                    <div className="w-2.5 h-2.5 bg-zinc-950 rounded-full" />
                  </div>
                </motion.div>
                
                {/* Simulated playback details below cover art */}
                <div className={`mt-6 text-center z-10 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white/50 border-zinc-200'} backdrop-blur-md px-4 py-2.5 rounded-2xl border shadow-md flex items-center gap-2`}>
                  <Radio size={13} className="text-zinc-400 animate-pulse" />
                  <span className={`text-[10px] ${darkMode ? 'text-zinc-300' : 'text-zinc-600'} font-semibold tracking-wider uppercase`}>
                    Lossless Hi-Res • 24-bit/192kHz ALAC
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lyrics-pane"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`w-full h-full max-h-[420px] md:max-h-none rounded-3xl overflow-hidden border ${
                  darkMode ? 'border-white/5 bg-black/25' : 'border-zinc-200 bg-white/40'
                } backdrop-blur-lg`}
              >
                <LiveLyrics
                  currentTrack={currentTrack}
                  currentTime={currentTime}
                  onSeek={onSeek}
                  accentColor={accentColor}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right/Bottom Column - Full Controls Panel */}
        <div className="flex flex-col justify-center space-y-6 md:space-y-8 h-full">
          {/* Metadata */}
          <div>
            <h1 className={`text-xl sm:text-3xl font-extrabold truncate ${darkMode ? 'text-white' : 'text-zinc-800'}`}>{currentTrack.title}</h1>
            <p className="text-sm sm:text-lg text-zinc-400 truncate font-semibold mt-1" style={{ color: accentColor + 'ee' }}>
              {currentTrack.artist}
            </p>
          </div>

          {/* Scrubber Progress Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={currentTrack.duration || 180}
              value={localTime}
              onChange={handleScrubberChange}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              onMouseUp={() => {
                setIsDragging(false);
                onSeek(localTime);
              }}
              onTouchEnd={() => {
                setIsDragging(false);
                onSeek(localTime);
              }}
              onKeyDown={() => setIsDragging(true)}
              onKeyUp={() => {
                setIsDragging(false);
                onSeek(localTime);
              }}
              className={`w-full h-1 ${
                darkMode ? 'bg-zinc-850 accent-white' : 'bg-zinc-200 accent-zinc-800'
              } hover:h-1.5 transition-all rounded-lg appearance-none cursor-pointer`}
              style={{
                background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${
                  (localTime / (currentTrack.duration || 180)) * 100
                }%, ${darkMode ? '#27272a' : '#e4e4e7'} ${(localTime / (currentTrack.duration || 180)) * 100}%, ${
                  darkMode ? '#27272a' : '#e4e4e7'
                } 100%)`,
              }}
            />
            <div className="flex justify-between text-xs font-semibold text-zinc-400">
              <span>{formatTime(localTime)}</span>
              <span>{formatTime(currentTrack.duration || 180)}</span>
            </div>
          </div>

          {/* Core Player Buttons */}
          <div className="flex items-center justify-center space-x-8 sm:space-x-12">
            <button
              onClick={onToggleShuffle}
              className={`p-2 transition active:scale-90 ${
                shuffle ? 'text-rose-500' : darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-800'
              }`}
            >
              <Shuffle size={20} style={{ color: shuffle ? accentColor : undefined }} />
            </button>

            <button
              onClick={onPrev}
              className={`p-3 active:scale-90 transition rounded-full ${
                darkMode ? 'bg-white/5 hover:bg-white/15 text-white' : 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700'
              }`}
            >
              <SkipBack size={24} fill={darkMode ? 'white' : '#3f3f46'} className={darkMode ? 'text-white' : 'text-zinc-700'} />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-6 transition-all active:scale-95 duration-200 rounded-full text-black shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              {isPlaying ? <Pause size={30} fill="black" /> : <Play size={30} fill="black" className="translate-x-[2px]" />}
            </button>

            <button
              onClick={onNext}
              className={`p-3 active:scale-90 transition rounded-full ${
                darkMode ? 'bg-white/5 hover:bg-white/15 text-white' : 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700'
              }`}
            >
              <SkipForward size={24} fill={darkMode ? 'white' : '#3f3f46'} className={darkMode ? 'text-white' : 'text-zinc-700'} />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`p-2 transition active:scale-90 relative ${
                repeat !== 'off' ? 'text-rose-500' : darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-800'
              }`}
            >
              {repeat === 'one' ? (
                <Repeat1 size={20} style={{ color: accentColor }} />
              ) : (
                <Repeat size={20} style={{ color: repeat === 'all' ? accentColor : undefined }} />
              )}
            </button>
          </div>

          {/* Volume Control bar */}
          <div className={`flex items-center space-x-3 ${
            darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'
          } p-3 rounded-2xl border`}>
            <Volume2 size={16} className="text-zinc-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${volume}%, ${
                  darkMode ? '#27272a' : '#e4e4e7'
                } ${volume}%, ${darkMode ? '#27272a' : '#e4e4e7'} 100%)`,
              }}
            />
            <span className="text-xs font-semibold text-zinc-400 w-8 text-right">{volume}%</span>
          </div>

          {/* Extra utility rows */}
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-2">
            {/* Speed selection */}
            <div className="flex items-center space-x-1">
              <span className="text-zinc-500 uppercase tracking-widest">Speed:</span>
              <select
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className={`bg-transparent ${darkMode ? 'text-white' : 'text-zinc-800'} border-none focus:outline-none focus:ring-0 cursor-pointer`}
              >
                <option value="0.5" className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}>0.5x</option>
                <option value="1" className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}>1.0x (Normal)</option>
                <option value="1.25" className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}>1.25x</option>
                <option value="1.5" className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}>1.5x</option>
                <option value="2" className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}>2.0x</option>
              </select>
            </div>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                onClick={() => setShowSleepTimer(!showSleepTimer)}
                className={`flex items-center space-x-1 ${darkMode ? 'hover:text-white' : 'hover:text-zinc-900'} transition`}
              >
                <Timer size={14} />
                <span>{sleepTimeRemaining !== null ? `Sleep: ${formatTime(sleepTimeRemaining)}` : 'Sleep Timer'}</span>
              </button>

              <AnimatePresence>
                {showSleepTimer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`absolute bottom-6 right-0 w-40 ${
                      darkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-white border-zinc-200'
                    } backdrop-blur-xl border rounded-xl p-1.5 shadow-xl z-50 flex flex-col space-y-[2px]`}
                  >
                    {[5, 15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => startSleepTimer(mins)}
                        className={`w-full text-left px-3 py-1.5 ${
                          darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                        } text-xs rounded-lg transition`}
                      >
                        {mins} minutes
                      </button>
                    ))}
                    {sleepTimeRemaining !== null && (
                      <button
                        onClick={() => setSleepTimeRemaining(null)}
                        className={`w-full text-left text-red-500 px-3 py-1.5 ${
                          darkMode ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
                        } text-xs rounded-lg transition border-t ${
                          darkMode ? 'border-white/5' : 'border-zinc-200'
                        } mt-1 pt-1.5`}
                      >
                        Cancel Timer
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
