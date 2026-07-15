import { Track, LyricLine } from '../types';

interface LiveLyricsProps {
  currentTrack: Track | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  accentColor: string;
}

export default function LiveLyrics({ currentTrack, currentTime, onSeek, accentColor }: LiveLyricsProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }

    const trackId = currentTrack.id;
    const trackTitle = currentTrack.title;
    const trackArtist = currentTrack.artist;
    const trackDuration = currentTrack.duration;

    let isSubscribed = true;
    setIsLoading(true);

    // Fetch synchronized lyrics dynamically from Gemini server-side API!
    fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: trackTitle,
        artist: trackArtist,
        duration: trackDuration
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && currentTrack.id === trackId) {
          setLyrics(data.lyrics || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching lyrics:', err);
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentTrack?.id]);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smoothly center the active lyric line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const line = activeLineRef.current;

      const offsetTop = line.offsetTop;
      const containerHeight = container.clientHeight;
      const lineHeight = line.clientHeight;

      container.scrollTo({
        top: offsetTop - containerHeight / 2 + lineHeight / 2,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center px-4">
        <Music size={40} className="stroke-[1.5] mb-3 opacity-60" />
        <p className="text-sm">Select a song to display synchronized lyrics.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center px-4">
        <Loader2 size={30} className="animate-spin text-rose-500 mb-3" />
        <p className="text-sm font-medium animate-pulse tracking-wide">Syncing cosmic lyrics via Aura AI...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Visual Overlay gradients for elegant fade effect */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-zinc-950/80 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none z-10" />

      <div
        ref={containerRef}
        id="lyrics-container"
        className="flex-1 overflow-y-auto px-6 py-20 space-y-6 scrollbar-none scroll-smooth"
      >
        {lyrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-zinc-500 h-full">
            <Sparkles size={24} className="text-amber-400/60 mb-2" />
            <p className="text-sm">No lyrics found for this track.</p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPassed = idx < activeIndex;

            return (
              <motion.button
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`w-full text-left font-bold text-lg sm:text-2xl transition-all duration-300 focus:outline-none block select-none cursor-pointer ${
                  isActive
                    ? 'scale-[1.03] origin-left shadow-sm'
                    : 'scale-100 hover:text-zinc-200'
                }`}
                style={{
                  color: isActive ? accentColor : isPassed ? '#FFFFFF80' : '#FFFFFF40',
                }}
              >
                {line.text}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
