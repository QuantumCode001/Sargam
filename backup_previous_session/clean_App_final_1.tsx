import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Compass,
  Search,
  Library,
  Sparkles,
  Settings,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Volume2,
  Download,
  Clock,
  User,
  Music,
  ArrowRight,
  ArrowUpRight,
  Maximize2,
  Trash2,
  Share2,
  MoreVertical,
  Check,
  Disc3,
  ListMusic,
  Mic,
  Menu,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Edit,
  Upload
} from 'lucide-react';
import { Track, Playlist, HistoryItem, UserSettings } from './types';
import DynamicIsland from './components/DynamicIsland';
import ContextMenu from './components/ContextMenu';
import AuraAI from './components/AuraAI';
import ApplePlayer from './components/ApplePlayer';
import MenuDrawer from './components/MenuDrawer';

// Declare YT global variables
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
    YTPlayer?: any;
  }
}

export default function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'search' | 'library' | 'settings' | 'ai' | 'artist' | 'album'>('home');
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; bio: string; cover: string } | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<{ id: string; name: string; artist: string; coverUrl: string; tracks: Track[] } | null>(null);

  // Music Player Core State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [speed, setSpeed] = useState(1);
  const [isPlayerMaximized, setIsPlayerMaximized] = useState(false);

  // Library & Playlist States
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistAutoplay, setPlaylistAutoplay] = useState(true);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showEditCoverModal, setShowEditCoverModal] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [downloads, setDownloads] = useState<Track[]>([]);

  // Search Page States
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedSearchQuery, setDisplayedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Lofi study beats', 'The Weeknd Blinding Lights', 'Interstellar Soundtracks']);

  // Mobile Menu Drawer State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Hover states for Featured Artists
  const [hoveredArtist, setHoveredArtist] = useState<number | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);

  // App Level Settings State
  const [settings, setSettings] = useState<UserSettings>({
    darkMode: true,
    accentColor: '#FF2D55', // Apple Rose Red
    audioQuality: 'lossless',
    equalizerPreset: 'Sargam Perfect',
    crossfade: 2,
    speed: 1
  });

  // UI Interactive Notifications
  const [notification, setNotification] = useState<{ message: string; sub?: string; progress?: number } | null>(null);

  // Pre-seeded home data
  const [seededTracks, setSeededTracks] = useState<Track[]>([]);

  // Unique tracks from listening history
  const uniqueHistoryTracks = history
    .map((item) => item.track)
    .filter((track, index, self) => self.findIndex((t) => t.id === track.id) === index);

  const ytPlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);
  const fadeOutIntervalRef = useRef<any>(null);
  const fadeInIntervalRef = useRef<any>(null);
  const handleNextTrackRef = useRef<any>(null);
  const settingsRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);
  const artistsScrollRef = useRef<HTMLDivElement>(null);

  // Sync refs to avoid stale closures inside event listeners
  useEffect(() => {
    handleNextTrackRef.current = handleNextTrack;
  });
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // 1. Initial Data Load & Seeding Fetch
  useEffect(() => {
    // Fetch seed tracks
    fetch('/api/tracks/seeded')
      .then((res) => res.json())
      .then((data) => {
        setSeededTracks(data.tracks || []);
        if (data.tracks && data.tracks.length > 0) {
          // Set standard starting queue
          setQueue(data.tracks);
        }
      })
      .catch((err) => console.error('Seeded tracks failed', err));

    // Fetch user playlists
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists || []));

    // Fetch Loved songs
    fetch('/api/favorites')
      .then((res) => res.json())
      .then((data) => setFavorites(data.favorites || []));

    // Fetch listening history
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => setHistory(data.history || []));
  }, []);

  // Reset selected playlist when active tab changes
  useEffect(() => {
    setSelectedPlaylist(null);
  }, [activeTab]);

  // 2. Load YouTube Player IFrame API with safety guards
  useEffect(() => {
    const loadYT = () => {
      if (window.YT && window.YT.Player) {
        initYTPlayer();
        return;
      }
      
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const previousOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousOnReady) previousOnReady();
        initYTPlayer();
      };
    };

    loadYT();

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const initYTPlayer = () => {
    // Prevent double instantiations under StrictMode
    if (window.YTPlayer) {
      ytPlayerRef.current = window.YTPlayer;
      return;
    }

    let container = document.getElementById('yt-player-container');
    if (container && container.tagName === 'IFRAME') {
      container.parentNode?.removeChild(container);
      container = null;
    }

    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.position = 'fixed';
      container.style.top = '-500px';
      container.style.left = '-500px';
      container.style.width = '200px';
      container.style.height = '200px';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
    }

    try {
      if (!window.YT || !window.YT.Player) return;
      window.YTPlayer = new window.YT.Player('yt-player-container', {
        height: '200',
        width: '300',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event: any) => {
            ytPlayerRef.current = event.target;
            window.YTPlayer = event.target;
            ytPlayerRef.current.setVolume(volume);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              if (!isTransitioningRef.current) {
                handleNextTrackRef.current?.();
              }
            }
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              setIsPlaying(true);
              startProgressPolling();
            } else {
              setIsPlaying(false);
              stopProgressPolling();
            }
          }
        }
      });
    } catch (e) {
      console.error('Error instantiating YouTube IFrame Player', e);
    }
  };

  const performCrossfadeTransition = () => {
    if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
    
    const steps = 10;
    const intervalDuration = ((settingsRef.current?.crossfade || 2) * 1000) / steps;
    let currentStep = 0;
    const startVolume = volumeRef.current || 80;
    
    fadeOutIntervalRef.current = setInterval(() => {
      currentStep++;
      const targetVol = Math.max(0, startVolume * (1 - currentStep / steps));
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(targetVol);
      }
      
      if (currentStep >= steps) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
        handleNextTrackRef.current?.();
      }
    }, intervalDuration);
  };

  // Playback timer tick pollers
  const startProgressPolling = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const time = ytPlayerRef.current.getCurrentTime();
        setCurrentTime(time);

        // Dynamically sync actual video duration to prevent scrubber jumps
        if (typeof ytPlayerRef.current.getDuration === 'function') {
          const duration = ytPlayerRef.current.getDuration();
          if (duration > 0) {
            setCurrentTrack((prev) => {
              if (prev && prev.duration !== duration) {
                return { ...prev, duration };
              }
              return prev;
            });

            // Smooth Crossfade triggers close to song end
            const remainingTime = duration - time;
            const crossfadeSecs = settingsRef.current?.crossfade || 0;
            if (
              crossfadeSecs > 0 &&
              remainingTime <= crossfadeSecs &&
              remainingTime > 0 &&
              !isTransitioningRef.current
            ) {
              isTransitioningRef.current = true;
              performCrossfadeTransition();
            }
          }
        }
      }
    }, 200);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  // 3. Audio Controller Callbacks
  const handlePlayTrack = (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);

    // Reset crossfading states
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }
    isTransitioningRef.current = false;

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      ytPlayerRef.current.loadVideoById(track.id);
      ytPlayerRef.current.setPlaybackRate(speed);
      
      const crossfadeSecs = settingsRef.current?.crossfade || 0;
      const targetVolume = volumeRef.current || 80;
      if (crossfadeSecs > 0) {
        ytPlayerRef.current.setVolume(0);
        ytPlayerRef.current.playVideo();
        
        const steps = 10;
        const intervalDuration = (crossfadeSecs * 1000) / steps;
        let currentStep = 0;
        
        fadeInIntervalRef.current = setInterval(() => {
          currentStep++;
          const targetVol = Math.min(targetVolume, targetVolume * (currentStep / steps));
          if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
            ytPlayerRef.current.setVolume(targetVol);
          }
          
          if (currentStep >= steps) {
            clearInterval(fadeInIntervalRef.current);
            fadeInIntervalRef.current = null;
          }
        }, intervalDuration);
      } else {
        ytPlayerRef.current.setVolume(targetVolume);
        ytPlayerRef.current.playVideo();
      }
    }

    // Save to server-side user history
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track })
    })
      .then((res) => res.json())
      .then((data) => setHistory(data.history || []));

    // Handle queue updates directly to prevent async batching state race conditions
    if (newQueue) {
      setQueue(newQueue);
    } else {
      if (!queue.some((q) => q.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }
    }
  };

  const handleDeleteFromHistory = async (trackId: string) => {
    try {
      const response = await fetch(`/api/history/${trackId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        showToastNotification('Removed from History', 'Song removed from Recently Played');
      } else {
        console.error('Failed to delete history track');
      }
    } catch (error) {
      console.error('Error deleting history track:', error);
    }
  };

  const handleTogglePlay = () => {
    if (!currentTrack && seededTracks.length > 0) {
      handlePlayTrack(seededTracks[0]);
      return;
    }
    if (!ytPlayerRef.current) return;

    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;

    // Repeat One overrides queue progression
    if (repeatMode === 'one' && currentTrack) {
      handlePlayTrack(currentTrack, queue);
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let nextIndex = currentIndex + 1;

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // end of queue
      }
    }

    handlePlayTrack(queue[nextIndex], queue);
  };

  const handlePrevTrack = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    handlePlayTrack(queue[prevIndex], queue);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(seconds, true);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    // If we're not currently crossfading, update standard player volume directly
    if (!fadeOutIntervalRef.current && !fadeInIntervalRef.current) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(vol);
      }
    }
  };

  const handleSpeedChange = (playbackSpeed: number) => {
    setSpeed(playbackSpeed);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
      ytPlayerRef.current.setPlaybackRate(playbackSpeed);
    }
  };

  // 4. Custom Library Actions (Favorites, Downloads, Playlists)
  const handleToggleLike = (track: Track) => {
    const isLiked = favorites.some((f) => f.id === track.id);
    if (isLiked) {
      fetch(`/api/favorites/${track.id}`, { method: 'DELETE' })
        .then((res) => res.json())
        .then((data) => setFavorites(data.favorites || []));
      showToastNotification('Removed from Loved Songs', track.title);
    } else {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track })
      })
        .then((res) => res.json())
        .then((data) => setFavorites(data.favorites || []));
      showToastNotification('Loved and Synced', track.title);
    }
  };

  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
    showToastNotification('Added to Play Next', track.title);
  };

  const handleDownloadTrack = (track: Track) => {
    if (downloads.some((d) => d.id === track.id)) {
      showToastNotification('Already Downloaded Offline', track.title);
      return;
    }

    // Elegant animated download simulation mimicking iOS status bars
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setNotification({
        message: `Offline Syncing "${track.title}"`,
        sub: `Transcoding lossless stream... ${progress}%`,
        progress
      });

      if (progress >= 100) {
        clearInterval(interval);
        setDownloads((prev) => [...prev, track]);
        setNotification({
          message: 'Offline Download Complete',
          sub: `${track.title} has been cached legally to client sandbox.`,
          progress: 100
        });
        setTimeout(() => setNotification(null), 3500);
      }
    }, 300);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPlaylistName,
        description: newPlaylistDesc
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaylists((prev) => [...prev, data.playlist]);
        setShowCreatePlaylistModal(false);
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        showToastNotification('Created Playlist', data.playlist.name);
      });
  };

  const handleAddTrackToPlaylist = (playlistId: string, track: Track) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    if (playlist.tracks.some((t) => t.id === track.id)) {
      showToastNotification('Song already exists in playlist', playlist.name);
      return;
    }

    const updatedTracks = [...playlist.tracks, track];
    fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: updatedTracks })
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? data.playlist : p)));
        showToastNotification(`Added to ${playlist.name}`, track.title);
      });
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const updatedTracks = playlist.tracks.filter((t) => t.id !== trackId);
    fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: updatedTracks })
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? data.playlist : p)));
        // If this playlist is currently open, update selectedPlaylist to reflect the change
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(data.playlist);
        }
        showToastNotification('Removed from Playlist', playlist.name);
      });
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    fetch(`/api/playlists/${playlistId}`, {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then(() => {
        setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(null);
        }
        showToastNotification('Playlist Deleted', playlist.name);
      });
  };

  const handleMoveTrackInPlaylist = (playlistId: string, trackId: string, direction: 'up' | 'down') => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const idx = playlist.tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= playlist.tracks.length) return;

    const updatedTracks = [...playlist.tracks];
    // Swap tracks
    const temp = updatedTracks[idx];
    updatedTracks[idx] = updatedTracks[targetIdx];
    updatedTracks[targetIdx] = temp;

    fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: updatedTracks })
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? data.playlist : p)));
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(data.playlist);
        }
        showToastNotification('Playlist Reordered', playlist.name);
      });
  };

  const handleUpdatePlaylistCover = (playlistId: string, url: string) => {
    if (!url.trim()) return;

    fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverUrl: url })
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? data.playlist : p)));
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(data.playlist);
        }
        setShowEditCoverModal(false);
        showToastNotification('Playlist Cover Updated', data.playlist.name);
      });
  };



  const handleOsanAnalyze = (track: Track) => {
    setActiveTab('ai');
    setIsPlayerMaximized(false);
    // Deep integration: Pre-prompts Osan AI to analyze this specific track
    setTimeout(() => {
      const widget = document.getElementById('aura-ai-interface');
      if (widget) {
        const inputField = widget.querySelector('input');
        if (inputField) {
          inputField.value = `Deeply analyze the artist "${track.artist}" and the sonic context/mood behind "${track.title}". Recommendation options?`;
          // Trigger enter click simulator
          const sendBtn = widget.querySelector('button:last-of-type') as HTMLButtonElement;
          sendBtn?.click();
        }
      }
    }, 800);
  };

  const showToastNotification = (message: string, sub?: string) => {
    setNotification({ message, sub });
    setTimeout(() => setNotification(null), 3000);
  };

  // 5. Search Handlers
  const handleSearchSubmit = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setIsSearching(true);
    setActiveTab('search');

    if (!recentSearches.includes(queryStr)) {
      setRecentSearches((prev) => [queryStr, ...prev.slice(0, 5)]);
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setDisplayedSearchQuery(queryStr);
      setSearchQuery(''); // clear the search word so user can write the next song
    } catch (e) {
      console.error('Search request failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`min-h-screen select-none ${settings.darkMode ? 'bg-[#050505] text-white dark-theme' : 'bg-[#F2F2F7] text-zinc-800 light-theme'} font-sans antialiased pb-28 md:pb-32 transition-colors duration-500`}>
      
      {/* 1. Universal Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100] w-[90%] max-w-sm bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col space-y-2 pointer-events-auto"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20">
                <Check size={16} className="text-rose-500 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{notification.message}</p>
                {notification.sub && <p className="text-[10px] text-zinc-400 truncate mt-0.5">{notification.sub}</p>}
              </div>
            </div>
            {notification.progress !== undefined && (
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${notification.progress}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Apple Dynamic Island */}
      <DynamicIsland
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onMaximizePlayer={() => setIsPlayerMaximized(true)}
        onOpenAI={() => setActiveTab('ai')}
        accentColor={settings.accentColor}
      />

      {/* 3. Outer Grid Layout: Desktop Sidebar / Floating Bottom Mobile Bar */}
      <div className="max-w-7xl mx-auto flex">
        
        {/* Left Sidebar on Large Screens */}
        <aside id="sidebar-layout" className={`hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r p-6 justify-between select-none ${
          settings.darkMode 
            ? 'bg-black/25 border-white/5 backdrop-blur-2xl' 
            : 'bg-white/70 border-zinc-200 shadow-sm backdrop-blur-2xl'
        }`}>
          <div className="space-y-8">
            {/* Branding Logo */}
            <div className="flex items-center space-x-3 px-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg border border-white/5 flex-shrink-0">
                <img src="/sargam-logo.png" alt="Sargam Logo" className="w-full h-full object-cover select-none pointer-events-none" />
              </div>
              <span 
                className={`font-semibold text-lg tracking-wide ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif' }}
              >
                Sargam
              </span>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col space-y-1.5">
              {[
                { id: 'home', label: 'Listen Now', icon: Home },
                { id: 'browse', label: 'Browse', icon: Compass },
                { id: 'search', label: 'Search', icon: Search },
                { id: 'library', label: 'Library', icon: Library },
                { id: 'ai', label: 'Osan AI', icon: Sparkles },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((link) => {
                const Icon = link.icon;
                const active = activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      setActiveTab(link.id as any);
                      setSelectedArtist(null);
                      setSelectedAlbum(null);
                    }}
                    className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-semibold relative transition-all duration-300 ${
                      active
                        ? settings.darkMode ? 'text-white' : 'text-zinc-900 font-extrabold'
                        : settings.darkMode ? 'text-zinc-450 hover:text-white hover:bg-white/5' : 'text-zinc-550 hover:text-zinc-900 hover:bg-black/[0.03]'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-sidebar-highlight"
                        className={`absolute inset-0 rounded-xl z-0 ${
                          settings.darkMode ? 'bg-white/10 shadow-inner' : 'bg-zinc-950/[0.06] shadow-sm'
                        }`}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="z-10 flex items-center space-x-4">
                      <Icon size={16} className={active ? "text-rose-500" : "text-zinc-500"} style={{ color: active ? settings.accentColor : undefined }} />
                      <span>{link.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Recently Played Section */}
            {uniqueHistoryTracks.length > 0 && (
              <div className={`pt-4 border-t ${settings.darkMode ? 'border-white/5' : 'border-black/5'} space-y-2 mt-4`}>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-4 flex items-center gap-1.5">
                  <Clock size={10} style={{ color: settings.accentColor }} />
                  <span>Recently Played</span>
                </span>
                <div className="max-h-36 overflow-y-auto px-2 space-y-1 scrollbar-thin">
                  {uniqueHistoryTracks.slice(0, 5).map(track => (
                    <button
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left ${settings.darkMode ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-black/5 text-zinc-600 hover:text-zinc-900'} transition group`}
                    >
                      <img src={track.coverUrl} className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                      <span className="text-xs font-semibold truncate flex-1">{track.title}</span>
                    </button>
                  ))}
                  {uniqueHistoryTracks.length > 5 && (
                    <button
                      onClick={() => setActiveTab('home')}
                      className={`w-full text-center text-[10px] font-bold ${settings.darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'} py-1 transition`}
                    >
                      View all {uniqueHistoryTracks.length} songs
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Connected User Badge */}
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-400 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Premium Listener</p>
              <p className="text-[9px] text-zinc-500 truncate mt-0.5">Hi-Res Lossless Active</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 pt-6 pb-24 lg:pt-8 lg:pb-32">
          {/* Global Header with Search Bar */}
          <div className={`mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${settings.darkMode ? 'border-white/5' : 'border-black/5'} pb-6`}>
            <div className="flex items-center space-x-3 lg:hidden">
              {/* Logo for mobile view */}
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg border border-white/5 flex-shrink-0">
                <img src="/sargam-logo.png" alt="Sargam Logo" className="w-full h-full object-cover select-none pointer-events-none" />
              </div>
              <span 
                className={`font-semibold text-base tracking-wide ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif' }}
              >
                Sargam
              </span>
            </div>
            
            {/* Global Search Input Box */}
            <div className="relative w-full max-w-md mx-auto md:mr-0 md:ml-auto">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'search') {
                    setActiveTab('search');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit(searchQuery);
                  }
                }}
                placeholder="Search songs, artists, genres..."
                className={`w-full pl-10 pr-24 py-2.5 rounded-2xl text-xs font-medium border outline-none transition-all duration-300 ${
                  settings.darkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder-zinc-500 focus:bg-white/10 focus:border-white/20'
                    : 'bg-black/[0.03] border-black/10 text-zinc-800 placeholder-zinc-400 focus:bg-black/[0.05] focus:border-black/20'
                }`}
              />
              <button
                onClick={() => handleSearchSubmit(searchQuery)}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl text-[10px] font-bold text-white transition active:scale-95"
                style={{ backgroundColor: settings.accentColor }}
              >
                Search
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* TAB: LISTEN NOW (HOME) */}
            {activeTab === 'home' && !selectedArtist && !selectedAlbum && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-12"
              >
                {/* Greeting section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className={`text-3xl sm:text-4xl font-black ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Listen Now</h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">Your aura sounds vibrant today. Here is your editorial digest.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className="p-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/15 rounded-2xl flex items-center space-x-2 text-xs font-bold transition shadow-md"
                  >
                    <Sparkles size={13} className="animate-pulse" />
                    <span className="hidden sm:inline">Ask Osan AI</span>
                  </button>
                </div>

                {/* Spotlight Banner (Made For You Carousel) */}
                <div className="relative h-60 sm:h-72 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 z-0">
                    <img
                      src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&q=80"
                      alt=""
                      className="w-full h-full object-cover scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="max-w-md">
                      <span className="text-[10px] uppercase font-black tracking-widest bg-rose-500 px-2 py-0.5 rounded-md text-white keep-white mb-2 inline-block">
                        Made For You
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white keep-white">Curated Weekly Discovery</h2>
                      <p className="text-xs text-zinc-300 keep-white mt-1">Osan AI tailored this mix of high-fidelity beats to match your focused study loops.</p>
                    </div>
                    <button
                      onClick={() => seededTracks[0] && handlePlayTrack(seededTracks[0])}
                      className="px-6 py-3 rounded-full font-bold text-xs text-black transition active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      <Play size={13} fill="black" />
                      <span>Listen Now</span>
                    </button>
                  </div>
                </div>

                {/* Recently Played Row in Home Tab */}
                {uniqueHistoryTracks.length > 0 && (
                  <div className="space-y-4">
                    <h3 className={`text-lg font-extrabold flex items-center space-x-2 ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      <Clock size={16} style={{ color: settings.accentColor }} className="animate-pulse" />
                      <span>Recently Played</span>
                      <span className="text-xs font-medium text-zinc-500">({uniqueHistoryTracks.length})</span>
                    </h3>
                    <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {uniqueHistoryTracks.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => handlePlayTrack(track)}
                          className={`flex-shrink-0 w-36 ${settings.darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/[0.03] border-black/[0.05] hover:bg-black/[0.06]'} border rounded-2xl p-3 active:scale-[0.98] transition cursor-pointer group`}
                        >
                          <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                            <img src={track.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play size={14} fill="white" className="text-white" />
                            </div>
                            {/* Delete/Remove button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFromHistory(track.id);
                              }}
                              className="absolute top-2 left-2 p-1 bg-red-500/80 hover:bg-red-600 rounded-full border border-red-400/25 text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              title="Remove from Recently Played"
                            >
                              <Trash2 size={11} />
                            </button>
                            {/* Ellipsis button to trigger context menu */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, track });
                              }}
                              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded-full border border-white/10 text-white z-20"
                            >
                              <MoreVertical size={11} />
                            </button>
                          </div>
                          <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recently Played / Featured Tracks Horizontal Row */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-extrabold flex items-center space-x-2 ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    <span>Trending Hits</span>
                    <ArrowRight size={14} className="text-zinc-500" />
                  </h3>
                  <div id="songs-horizontal-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {seededTracks.slice(0, 4).map((track) => (
                      <div
                        key={track.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, track });
                        }}
                        className="group relative bg-white/5 border border-white/5 rounded-2xl p-3 hover:bg-white/10 active:scale-[0.98] transition-all duration-300 cursor-pointer"
                        onClick={() => handlePlayTrack(track)}
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="p-3 bg-white/15 backdrop-blur-md rounded-full border border-white/25">
                              <Play size={16} fill="white" className="text-white" />
                            </div>
                          </div>
                          {/* Elipis helper button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenu({ x: e.clientX, y: e.clientY, track });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 rounded-full border border-white/10 text-white z-20"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Artists Row */}
                <div className="space-y-4 relative group/scroll-container">
                  <h3 className={`text-lg font-extrabold flex items-center space-x-2 ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    <span>Featured Artists</span>
                    <ArrowRight size={14} className="text-zinc-500" />
                  </h3>
                  
                  <div className="relative">
                    {/* Left Scroll Button */}
                    <button
                      onClick={() => {
                        if (artistsScrollRef.current) {
                          artistsScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                        }
                      }}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 p-2.5 rounded-full border shadow-xl opacity-0 group-hover/scroll-container:opacity-100 transition-all duration-300 active:scale-90 cursor-pointer hidden md:flex items-center justify-center ${
                        settings.darkMode 
                          ? 'bg-zinc-900/90 border-white/10 text-white hover:bg-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
                          : 'bg-white/95 border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-[0_4px_15px_rgba(0,0,0,0.08)]'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Right Scroll Button */}
                    <button
                      onClick={() => {
                        if (artistsScrollRef.current) {
                          artistsScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                        }
                      }}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 p-2.5 rounded-full border shadow-xl opacity-0 group-hover/scroll-container:opacity-100 transition-all duration-300 active:scale-90 cursor-pointer hidden md:flex items-center justify-center ${
                        settings.darkMode 
                          ? 'bg-zinc-900/90 border-white/10 text-white hover:bg-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
                          : 'bg-white/95 border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-[0_4px_15px_rgba(0,0,0,0.08)]'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>

                    <div 
                      ref={artistsScrollRef}
                      className="flex space-x-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                    >
                      {[
                        { name: 'Arijit Singh', query: 'Arijit Singh', img: '/arijit-singh.jpg' },
                        { name: 'Shreya Ghoshal', query: 'Shreya Ghoshal', img: '/shreya-ghoshal.jpg' },
                        { name: 'Rahat Fateh Ali Khan', query: 'Rahat Fateh Ali Khan', img: '/rahat-fateh-ali-khan.jpg' },
                        { name: 'KK', query: 'KK singer', img: '/kk.jpg' },
                        { name: 'Kishore Kumar', query: 'Kishore Kumar', img: '/kishore-kumar.jpg' },
                        { name: 'Atif Aslam', query: 'Atif Aslam', img: '/atif-aslam.jpg' },
                        { name: 'Darshan Raval', query: 'Darshan Raval', img: '/darshan-raval.jpg' },
                        { name: 'Armaan Malik', query: 'Armaan Malik', img: '/armaan-malik.jpg' },
                        { name: 'Kumar Sanu', query: 'Kumar Sanu', img: '/kumar-sanu.jpg' },
                        { name: 'Kailash Kher', query: 'Kailash Kher', img: '/kailash-kher.jpg' },
                        { name: 'Sonu Nigam', query: 'Sonu Nigam', img: '/sonu-nigam.jpg' }
                      ].map((artist, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveTab('search');
                            handleSearchSubmit(artist.query);
                          }}
                          onMouseEnter={() => setHoveredArtist(idx)}
                          onMouseLeave={() => setHoveredArtist(null)}
                          className="group flex flex-col items-center flex-shrink-0 cursor-pointer focus:outline-none"
                        >
                          <div 
                            className={`rounded-full p-[3px] border-2 transition-all duration-300 ${
                              settings.darkMode 
                                ? 'w-24 h-24 sm:w-28 sm:h-28 shadow-[0_12px_24px_rgba(0,0,0,0.5)]' 
                                : 'w-21 h-21 sm:w-25 sm:h-25 shadow-[0_6px_15px_rgba(0,0,0,0.06)]'
                            }`}
                            style={{
                              borderColor: hoveredArtist === idx 
                                ? settings.accentColor 
                                : (settings.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                            }}
                          >
                            <img
                              src={artist.img}
                              alt={artist.name}
                              className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <span 
                            className={`text-center mt-2.5 transition-colors duration-300 ${
                              settings.darkMode 
                                ? 'text-xs sm:text-sm font-semibold' 
                                : 'text-[11px] sm:text-xs font-bold'
                            }`}
                            style={{
                              color: hoveredArtist === idx 
                                ? settings.accentColor 
                                : (settings.darkMode ? '#d4d4d8' : '#3f3f46')
                            }}
                          >
                            {artist.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mood Bento Grid Section */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-extrabold ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Browse by Moods</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'Focus Chamber', bg: settings.darkMode ? 'from-indigo-950/80 to-indigo-900/30 border-indigo-500/20 text-indigo-200' : 'from-indigo-300 to-violet-200 border-indigo-400 text-black shadow-md', icon: '🧘', desc: 'Study, design & code loops', mood: 'focus study lofi' },
                      { name: 'Deep Sleep', bg: settings.darkMode ? 'from-blue-950/80 to-slate-900/30 border-blue-500/20 text-blue-200' : 'from-sky-300 to-blue-200 border-sky-400 text-black shadow-md', icon: '🌙', desc: 'Ambient and sleep soundtracks', mood: 'deep sleep ambient sleep' },
                      { name: 'Workout Power', bg: settings.darkMode ? 'from-rose-950/80 to-rose-900/30 border-rose-500/20 text-rose-200' : 'from-rose-300 to-orange-200 border-rose-400 text-black shadow-md', icon: '⚡', desc: 'High energy pump list', mood: 'workout energy gym pop' },
                      { name: 'Midnight Chill', bg: settings.darkMode ? 'from-purple-950/80 to-purple-900/30 border-purple-500/20 text-purple-200' : 'from-purple-300 to-pink-200 border-purple-400 text-black shadow-md', icon: '🌌', desc: 'Soft lounge vibrations', mood: 'lofi chill jazz lounge' }
                    ].map((mood, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab('search');
                          handleSearchSubmit(mood.mood);
                        }}
                        className={`group relative overflow-hidden rounded-3xl p-5 border text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between h-36 bg-gradient-to-br ${mood.bg}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-3xl">{mood.icon}</span>
                          <ArrowUpRight size={15} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs tracking-tight">{mood.name}</h4>
                          <p className="text-[9px] mt-1 line-clamp-1 opacity-85 font-medium">{mood.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: BROWSE */}
            {activeTab === 'browse' && (
              <motion.div
                key="browse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12"
              >
                <div>
                  <h1 className={`text-3xl font-black ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Browse</h1>
                  <p className="text-sm text-zinc-400 mt-1">Explore your liked songs and current musical vibes.</p>
                </div>

                {/* Currently Listening Card */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-extrabold ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Currently Playing</h3>
                  {currentTrack ? (
                    <div className={`p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden ${settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.03] border-black/[0.05]'}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-transparent pointer-events-none" />
                      <div className="flex flex-col sm:flex-row items-center gap-6 z-10 relative">
                        <div 
                          className={`relative w-24 h-24 overflow-hidden shadow-xl flex-shrink-0 group transition-all duration-700 ${isPlaying ? 'rounded-full' : 'rounded-2xl'}`}
                          style={{
                            boxShadow: isPlaying 
                              ? `0 0 ${24 + 10 * Math.sin(currentTime * 2.5)}px ${settings.accentColor}80` 
                              : undefined,
                            transform: isPlaying 
                              ? `scale(${1 + 0.03 * Math.sin(currentTime * 2.5)})` 
                              : undefined,
                            transition: 'all 0.5s ease-out'
                          }}
                        >
                          <img 
                            src={currentTrack.coverUrl} 
                            alt="" 
                            className={`w-full h-full object-cover animate-spin-slow ${isPlaying ? '' : 'animation-paused'}`}
                            style={{
                              animationDuration: `${20 / speed}s`
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={handleTogglePlay} className="p-2.5 bg-white/10 rounded-full border border-white/20 text-white">
                              {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="translate-x-[1px]" />}
                            </button>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <h4 className={`text-lg font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{currentTrack.title}</h4>
                          <p className="text-xs text-zinc-400 truncate mt-1">{currentTrack.artist}</p>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                            <button
                              onClick={handleTogglePlay}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition active:scale-95 flex items-center gap-1.5"
                              style={{ backgroundColor: settings.accentColor }}
                            >
                              {isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
                              <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </button>
                            <button
                              onClick={() => handleToggleLike(currentTrack)}
                              className={`p-2.5 rounded-xl border transition active:scale-95 flex items-center justify-center ${settings.darkMode ? 'bg-white/5 border-white/10 text-rose-500 hover:bg-white/10' : 'bg-black/[0.03] border-black/10 text-rose-500 hover:bg-black/[0.05]'}`}
                            >
                              <Heart size={14} fill={favorites.some(f => f.id === currentTrack.id) ? settings.accentColor : 'none'} style={{ color: favorites.some(f => f.id === currentTrack.id) ? settings.accentColor : undefined }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-6 rounded-3xl border text-center transition-all duration-300 ${settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.03] border-black/[0.05]'}`}>
                      <Music size={28} className="mx-auto text-zinc-500 mb-3" />
                      <h4 className={`text-sm font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Not Playing</h4>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">Select a track from the library or home tab to begin your musical journey.</p>
                      <button
                        onClick={() => seededTracks[0] && handlePlayTrack(seededTracks[0])}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white transition active:scale-95"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        Play Recommended
                      </button>
                    </div>
                  )}
                </div>

                {/* Liked Songs Row */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-bold flex items-center space-x-2 ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    <Heart size={16} fill={settings.accentColor} style={{ color: settings.accentColor }} />
                    <span>Liked Songs</span>
                    <span className="text-xs font-medium text-zinc-500">({favorites.length})</span>
                  </h3>
                  {favorites.length === 0 ? (
                    <div className={`p-8 rounded-3xl border border-dashed text-center ${settings.darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/[0.02] border-black/10 text-zinc-500'}`}>
                      <p className="text-xs mb-6">No liked songs yet. Start liking tracks to see them here!</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                        {seededTracks.slice(0, 6).map((track, idx) => (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`flex items-center space-x-4 p-3 ${settings.darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/[0.03] hover:bg-black/[0.06]'} active:scale-98 transition rounded-2xl border ${settings.darkMode ? 'border-white/5' : 'border-black/[0.05]'} cursor-pointer group`}
                          >
                            <img
                              src={track.coverUrl}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(track);
                                }}
                                className="text-zinc-400 hover:text-rose-500 p-2"
                              >
                                <Heart
                                  size={14}
                                  fill={favorites.some((f) => f.id === track.id) ? settings.accentColor : 'none'}
                                  style={{ color: favorites.some((f) => f.id === track.id) ? settings.accentColor : undefined }}
                                />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenu({ x: e.clientX, y: e.clientY, track });
                                }}
                                className={`p-2 ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500 hover:text-zinc-900'} transition`}
                              >
                                <MoreVertical size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favorites.map((track, idx) => (
                        <div
                          key={track.id}
                          onClick={() => handlePlayTrack(track)}
                          className={`flex items-center space-x-4 p-3 ${settings.darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/[0.03] hover:bg-black/[0.06]'} active:scale-98 transition rounded-2xl border ${settings.darkMode ? 'border-white/5' : 'border-black/[0.05]'} cursor-pointer group`}
                        >
                          <span className="text-xs font-extrabold text-zinc-500 w-4 text-center group-hover:text-rose-500">
                            {idx + 1}
                          </span>
                          <img
                            src={track.coverUrl}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(track);
                              }}
                              className="text-rose-500 p-2"
                            >
                              <Heart
                                size={14}
                                fill={settings.accentColor}
                                style={{ color: settings.accentColor }}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, track });
                              }}
                              className={`p-2 ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500 hover:text-zinc-900'} transition`}
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: SEARCH */}
            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div>
                  <h1 className={`text-3xl font-black ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Search</h1>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">Search millions of songs, playlists, or albums globally.</p>
                </div>

                {/* Voice Search indicator or suggestions */}
                {displayedSearchQuery.length === 0 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Searches</h4>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              handleSearchSubmit(term);
                            }}
                            className={`text-xs ${settings.darkMode ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-black/[0.03] hover:bg-black/[0.06] text-zinc-700'} border ${settings.darkMode ? 'border-white/5' : 'border-black/[0.05]'} px-3 py-1.5 rounded-full transition`}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Featured Genres</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['Lofi Hip Hop', 'Synthwave', 'Epic Orchestral', 'Dance Pop', 'Jazz Lounge', 'Heavy Rock'].map((genre) => (
                          <button
                            key={genre}
                            onClick={() => {
                              handleSearchSubmit(genre);
                            }}
                            className={`p-4 ${settings.darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/[0.03] border-black/[0.05] hover:bg-black/[0.06]'} border rounded-2xl transition text-left text-xs font-bold`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Displaying Search Results */}
                {displayedSearchQuery.length > 0 && (
                  <div className="space-y-4">
                    <h3 className={`text-lg font-extrabold ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'} flex items-center justify-between`}>
                      <span>{isSearching ? 'Scanning stardust catalogs...' : `Search Results for "${displayedSearchQuery}"`}</span>
                      <button
                        onClick={() => {
                          setDisplayedSearchQuery('');
                          setSearchResults([]);
                        }}
                        className={`text-xs ${settings.darkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'} underline transition`}
                      >
                        Clear Results
                      </button>
                    </h3>

                    {isSearching ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium animate-pulse">Gathering stream sources...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-zinc-500 text-sm py-8 text-center">No results found. Sargam could not locate any active frequencies.</p>
                    ) : (
                      <div className="flex flex-col space-y-[4px]">
                        {searchResults.map((track) => (
                          <div
                            key={track.id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, track });
                            }}
                            onClick={() => handlePlayTrack(track)}
                            className={`flex items-center space-x-4 p-3 ${settings.darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/[0.03] hover:bg-black/[0.06]'} active:scale-[0.99] transition rounded-2xl cursor-pointer group border ${settings.darkMode ? 'border-white/5' : 'border-black/[0.05]'}`}
                          >
                            <img
                              src={track.coverUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(track);
                                }}
                                className="p-2 text-zinc-400 hover:text-rose-500 transition"
                              >
                                <Heart
                                  size={13}
                                  fill={favorites.some((f) => f.id === track.id) ? settings.accentColor : 'none'}
                                  style={{ color: favorites.some((f) => f.id === track.id) ? settings.accentColor : undefined }}
                                />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenu({ x: e.clientX, y: e.clientY, track });
                                }}
                                className="p-2 text-zinc-400 hover:text-white transition"
                              >
                                <MoreVertical size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: LIBRARY */}
            {activeTab === 'library' && (
              <AnimatePresence mode="wait">
                {selectedPlaylist ? (
                  <motion.div
                    key="playlist-detail"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Back header */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedPlaylist(null)}
                        className={`p-2.5 rounded-full border transition active:scale-95 flex items-center justify-center ${
                          settings.darkMode 
                            ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white' 
                            : 'bg-black/[0.03] border-black/10 text-zinc-600 hover:bg-black/[0.05] hover:text-zinc-900'
                        }`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className={`text-xs font-semibold ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-505'}`}>
                        Back to Library
                      </span>
                    </div>

                    {/* Playlist details banner */}
                    <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end ${
                      settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.03] border-black/[0.05]'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent pointer-events-none" />
                      
                      {/* Cover art with hover Edit overlay */}
                      <div 
                        onClick={() => {
                          setCustomCoverUrl(selectedPlaylist.coverUrl);
                          setShowEditCoverModal(true);
                        }}
                        className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group/cover cursor-pointer"
                        title="Change Playlist Cover"
                      >
                        <img src={selectedPlaylist.coverUrl} alt="" className="w-full h-full object-cover transition duration-300 group-hover/cover:scale-105" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white gap-2">
                          <Edit size={18} />
                          <span className="text-[9px] font-black tracking-wider uppercase">Change Cover</span>
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex-1 min-w-0 text-center md:text-left z-10">
                        <span className="text-[10px] uppercase font-black tracking-widest bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md mb-2 inline-block">
                          Custom Playlist
                        </span>
                        <h2 className={`text-2xl md:text-4xl font-black truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>
                          {selectedPlaylist.name}
                        </h2>
                        <p className="text-xs text-zinc-450 mt-2 line-clamp-2 max-w-xl">
                          {selectedPlaylist.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center justify-center md:justify-start space-x-3 mt-4 text-[11px] text-zinc-400 font-medium">
                          <span>{selectedPlaylist.tracks.length} Songs</span>
                          <span>•</span>
                          <span>Created {new Date(selectedPlaylist.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-2.5 mt-6">
                          <button
                            onClick={() => {
                              if (selectedPlaylist.tracks.length > 0) {
                                handlePlayTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks);
                              } else {
                                showToastNotification('Playlist is empty', selectedPlaylist.name);
                              }
                            }}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 flex items-center gap-1.5 shadow-md"
                            style={{ backgroundColor: settings.accentColor }}
                          >
                            <Play size={12} fill="white" />
                            <span>Play All</span>
                          </button>
                          <button
                            onClick={() => {
                              if (selectedPlaylist.tracks.length > 0) {
                                const shuffled = [...selectedPlaylist.tracks].sort(() => Math.random() - 0.5);
                                handlePlayTrack(shuffled[0], shuffled);
                              } else {
                                showToastNotification('Playlist is empty', selectedPlaylist.name);
                              }
                            }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border ${
                              settings.darkMode 
                                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                                : 'bg-black/[0.03] border-black/10 text-zinc-900 hover:bg-black/[0.05]'
                            }`}
                          >
                            <Shuffle size={12} />
                            <span>Shuffle</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the playlist "${selectedPlaylist.name}"?`)) {
                                handleDeletePlaylist(selectedPlaylist.id);
                              }
                            }}
                            className={`p-2.5 rounded-xl transition active:scale-95 flex items-center justify-center text-rose-500 border ${
                              settings.darkMode 
                                ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                                : 'bg-black/[0.03] border-black/10 hover:bg-black/[0.05]'
                            }`}
                            title="Delete Playlist"
                          >
                            <Trash2 size={13} />
                          </button>

                          <div className="flex items-center space-x-2 border-l border-white/10 pl-4 ml-2">
                            <button
                              onClick={() => setPlaylistAutoplay(!playlistAutoplay)}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                playlistAutoplay ? 'bg-purple-500' : settings.darkMode ? 'bg-zinc-700' : 'bg-zinc-300'
                              }`}
                              title={playlistAutoplay ? "Autoplay is Enabled" : "Autoplay is Disabled"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  playlistAutoplay ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Autoplay
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Songs List */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Tracks</h3>
                      <div className={`border rounded-3xl overflow-hidden ${
                        settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'
                      }`}>
                        {selectedPlaylist.tracks.length === 0 ? (
                          <div className="p-12 text-center flex flex-col items-center justify-center">
                            <Music size={32} className="text-zinc-550 mb-3" />
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                              This playlist is empty. Search for songs or browse the library, then right-click them to add them here!
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {/* Tracks header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 border-b border-white/5">
                              <span className="col-span-1 text-center">#</span>
                              <span className="col-span-6 sm:col-span-5">Title</span>
                              <span className="hidden sm:inline sm:col-span-4">Album</span>
                              <span className="col-span-3 sm:col-span-1 text-center">Time</span>
                              <span className="col-span-2 sm:col-span-1 text-right">Actions</span>
                            </div>

                            {selectedPlaylist.tracks.map((track, idx) => {
                              const formatSongTime = (secs: number) => {
                                const m = Math.floor(secs / 60);
                                const s = Math.floor(secs % 60);
                                return `${m}:${s < 10 ? '0' : ''}${s}`;
                              };
                              return (
                                <div
                                  key={track.id}
                                  onClick={() => {
                                    const queueToSet = playlistAutoplay ? selectedPlaylist.tracks : [track];
                                    handlePlayTrack(track, queueToSet);
                                  }}
                                  className={`grid grid-cols-12 gap-4 px-6 py-3.5 items-center transition cursor-pointer group ${
                                    settings.darkMode ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
                                  }`}
                                >
                                  {/* Track index / Play Icon */}
                                  <div className="col-span-1 flex items-center justify-center text-xs text-zinc-505 font-bold">
                                    <span className="group-hover:hidden">{idx + 1}</span>
                                    <Play size={10} fill="currentColor" className="hidden group-hover:block text-white" />
                                  </div>

                                  {/* Title & Artist & Art */}
                                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                                    <img src={track.coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                    <div className="min-w-0">
                                      <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>
                                        {track.title}
                                      </h4>
                                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                        {track.artist}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Album */}
                                  <div className="hidden sm:inline sm:col-span-4 text-xs text-zinc-400 truncate">
                                    {track.album}
                                  </div>

                                  {/* Time */}
                                  <div className="col-span-3 sm:col-span-1 text-center text-xs text-zinc-400 font-medium">
                                    {formatSongTime(track.duration)}
                                  </div>

                                  {/* Actions */}
                                  <div className="col-span-2 sm:col-span-1 flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => handleMoveTrackInPlaylist(selectedPlaylist.id, track.id, 'up')}
                                      className={`p-1 transition ${idx === 0 ? 'text-zinc-650 opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                                      title="Move Up"
                                    >
                                      <ChevronUp size={13} />
                                    </button>
                                    <button
                                      disabled={idx === selectedPlaylist.tracks.length - 1}
                                      onClick={() => handleMoveTrackInPlaylist(selectedPlaylist.id, track.id, 'down')}
                                      className={`p-1 transition ${idx === selectedPlaylist.tracks.length - 1 ? 'text-zinc-650 opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                                      title="Move Down"
                                    >
                                      <ChevronDown size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleToggleLike(track)}
                                      className="p-1 text-zinc-400 hover:text-rose-500 transition"
                                      title={favorites.some(f => f.id === track.id) ? "Unlike" : "Like"}
                                    >
                                      <Heart 
                                        size={12} 
                                        fill={favorites.some(f => f.id === track.id) ? settings.accentColor : 'none'} 
                                        style={{ color: favorites.some(f => f.id === track.id) ? settings.accentColor : undefined }}
                                      />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveTrackFromPlaylist(selectedPlaylist.id, track.id)}
                                      className="p-1 text-zinc-400 hover:text-rose-500 transition"
                                      title="Remove from Playlist"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-12"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className={`text-3xl font-black ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Library</h1>
                        <p className="text-sm text-zinc-400 mt-1">Manage your custom playlists, loved songs, and offline tracks.</p>
                      </div>
                      <button
                        onClick={() => setShowCreatePlaylistModal(true)}
                        className="p-3 rounded-2xl flex items-center space-x-2 text-xs font-extrabold text-white active:scale-95 transition"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        <Plus size={14} />
                        <span>New Playlist</span>
                      </button>
                    </div>

                    {/* Library Sections - Custom Playlists Grid */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-lg font-extrabold ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Custom Playlists</h3>
                      </div>
                      
                      {playlists.length === 0 ? (
                        <div className={`p-12 text-center flex flex-col items-center justify-center border rounded-3xl ${
                          settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'
                        }`}>
                          <Music size={32} className="text-zinc-550 mb-3" />
                          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                            No custom playlists created yet. Click "New Playlist" to design yours!
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                          {playlists.map((playlist) => (
                            <div
                              key={playlist.id}
                              onClick={() => setSelectedPlaylist(playlist)}
                              className={`group relative flex flex-col justify-between p-4 rounded-3xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                                settings.darkMode 
                                  ? 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 shadow-lg' 
                                  : 'bg-white border-zinc-200/60 hover:shadow-lg shadow-sm'
                              }`}
                            >
                              {/* Playlist Image Container */}
                              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300 mb-4 bg-zinc-800">
                                <img 
                                  src={playlist.coverUrl} 
                                  alt={playlist.name} 
                                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                                />
                                {/* Apple-style Play Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (playlist.tracks.length > 0) {
                                        handlePlayTrack(playlist.tracks[0], playlist.tracks);
                                      } else {
                                        showToastNotification('Playlist is empty', playlist.name);
                                      }
                                    }}
                                    className="p-3.5 bg-white/90 hover:bg-white text-zinc-900 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 active:scale-90"
                                  >
                                    <Play size={18} fill="currentColor" className="ml-0.5 text-zinc-900" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Playlist Details */}
                              <div className="flex-1 flex flex-col justify-between px-1">
                                <div>
                                  <h4 className={`text-xs sm:text-sm font-black truncate leading-snug ${settings.darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                    {playlist.name}
                                  </h4>
                                  <p className="text-[10px] sm:text-xs text-zinc-400 font-medium mt-1 truncate">
                                    {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Offline Downloads Offline library */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center space-x-2">
                        <Download size={16} className="text-zinc-400" />
                        <span>Downloaded Offline ({downloads.length})</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {downloads.map((track) => (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className="bg-white/5 border border-white/5 p-4 rounded-3xl hover:bg-white/10 transition cursor-pointer"
                          >
                            <img src={track.coverUrl} alt="" className="w-full aspect-square object-cover rounded-2xl mb-3" />
                            <h4 className={`text-xs font-bold truncate ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                          </div>
                        ))}
                        {downloads.length === 0 && (
                          <div className="col-span-full py-8 text-center bg-white/5 rounded-3xl border border-white/5">
                            <p className="text-xs text-zinc-500">No cached tracks. Right-click any song to make it available offline!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* TAB: AURA AI COMPANION */}
            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-220px)] flex flex-col"
              >
                <AuraAI
                  currentTrack={currentTrack}
                  onPlayTrack={handlePlayTrack}
                  accentColor={settings.accentColor}
                  darkMode={settings.darkMode}
                />
              </motion.div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 max-w-2xl mx-auto"
              >
                <div>
                  <h1 className={`text-3xl font-black ${settings.darkMode ? 'text-white' : 'text-zinc-900'}`}>Settings</h1>
                  <p className="text-sm text-zinc-400 mt-1">Configure your full-stack Sargam listening settings.</p>
                </div>

                <div className={`${settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-200'} border rounded-3xl p-6 space-y-6 shadow-sm`}>
                  {/* Theme Selectors */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`text-sm font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Dark mode</h4>
                      <p className="text-xs text-zinc-400 mt-1">Utilize high-contrast black/dark canvas profiles.</p>
                    </div>
                    <button
                      onClick={() => setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }))}
                      className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                        settings.darkMode ? 'bg-rose-500' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                          settings.darkMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Accent Colors */}
                  <div className={`space-y-2 border-t ${settings.darkMode ? 'border-white/5' : 'border-zinc-200'} pt-4`}>
                    <h4 className={`text-sm font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Accent color</h4>
                    <p className="text-xs text-zinc-400">Select your active Apple design accent highlight.</p>
                    <div className="flex space-x-3 mt-3">
                      {[
                        { name: 'Apple Pink/Red', value: '#FF2D55' },
                        { name: 'Apple Blue', value: '#007AFF' },
                        { name: 'Neon Purple', value: '#A855F7' },
                        { name: 'Sunset Amber', value: '#F59E0B' },
                        { name: 'Emerald', value: '#10B981' }
                      ].map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSettings((prev) => ({ ...prev, accentColor: color.value }))}
                          className="w-8 h-8 rounded-full border-2 transition active:scale-90"
                          style={{
                            backgroundColor: color.value,
                            borderColor: settings.accentColor === color.value ? '#FFFFFF' : 'transparent'
                          }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Audio Quality Levels */}
                  <div className={`space-y-2 border-t ${settings.darkMode ? 'border-white/5' : 'border-zinc-200'} pt-4`}>
                    <h4 className={`text-sm font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Audio playback quality</h4>
                    <p className="text-xs text-zinc-400">Choose streaming depth. Lossless requires solid bandwidth.</p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { id: 'low', label: '64 kbps (HE-AAC)' },
                        { id: 'medium', label: '128 kbps (AAC)' },
                        { id: 'high', label: '256 kbps (AAC Pro)' },
                        { id: 'lossless', label: '24-bit/48kHz ALAC' },
                        { id: 'hires', label: '24-bit/192kHz ALAC' }
                      ].map((q) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            setSettings((prev) => ({ ...prev, audioQuality: q.id as any }));
                            showToastNotification('Audio Quality Updated', q.label);
                          }}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition ${
                            settings.audioQuality === q.id
                              ? settings.darkMode
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-zinc-800 text-white keep-white border-zinc-700 shadow-sm'
                              : settings.darkMode
                                ? 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'
                                : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crossfade Selector */}
                  <div className={`space-y-2 border-t ${settings.darkMode ? 'border-white/5' : 'border-zinc-200'} pt-4`}>
                    <h4 className={`text-sm font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Crossfade duration</h4>
                    <p className="text-xs text-zinc-400">Specify transition overlap between ending and starting tracks.</p>
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {[
                        { id: 0, label: 'Off' },
                        { id: 2, label: '2s' },
                        { id: 5, label: '5s' },
                        { id: 8, label: '8s' },
                        { id: 12, label: '12s' }
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSettings((prev) => ({ ...prev, crossfade: c.id }));
                            showToastNotification('Crossfade Updated', c.label);
                          }}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition ${
                            settings.crossfade === c.id
                              ? settings.darkMode
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-zinc-800 text-white keep-white border-zinc-700 shadow-sm'
                              : settings.darkMode
                                ? 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'
                                : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* 4. Bottom Music Mini Player (Persistently mounted at the bottom of the viewport) */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-20 left-4 right-4 lg:bottom-0 lg:left-0 lg:right-0 z-[400] bg-zinc-900/90 lg:bg-zinc-950/80 backdrop-blur-2xl lg:backdrop-blur-3xl border border-white/10 lg:border-t lg:border-white/5 py-2.5 px-4 lg:py-3 lg:px-6 flex items-center justify-between select-none max-w-7xl mx-auto rounded-2xl lg:rounded-none lg:rounded-t-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] lg:shadow-[0_-15px_30px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer"
            onClick={() => setIsPlayerMaximized(true)}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className={`w-11 h-11 rounded-full object-cover shadow-md animate-spin-slow ${
                  isPlaying ? '' : 'animation-paused'
                }`}
                style={{
                  animationDuration: `${20 / speed}s`
                }}
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handlePrevTrack}
                className="p-2 text-zinc-400 hover:text-white transition"
              >
                <SkipBack size={18} fill="white" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleTogglePlay}
                className="p-3 rounded-full text-black transition"
                style={{ backgroundColor: settings.accentColor }}
              >
                {isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="translate-x-[1px]" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleNextTrack}
                className="p-2 text-zinc-400 hover:text-white transition"
              >
                <SkipForward size={18} fill="white" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setIsPlayerMaximized(true)}
                className="p-2 text-zinc-400 hover:text-white transition hidden sm:inline"
              >
                <Maximize2 size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Apple immersive full-screen presentation sheet */}
      <AnimatePresence>
        {isPlayerMaximized && currentTrack && (
          <ApplePlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            volume={volume}
            shuffle={shuffle}
            repeat={repeatMode}
            accentColor={settings.accentColor}
            onClose={() => setIsPlayerMaximized(false)}
            onTogglePlay={handleTogglePlay}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleShuffle={() => setShuffle(!shuffle)}
            onToggleRepeat={handleToggleRepeat}
            speed={speed}
            onSpeedChange={handleSpeedChange}
            onOpenAI={() => {
              setActiveTab('ai');
              setIsPlayerMaximized(false);
            }}
            darkMode={settings.darkMode}
          />
        )}
      </AnimatePresence>

      {/* 6. Apple Fixed Bottom Navigation Bar on Mobile Viewports */}
      <div className={`fixed bottom-0 left-0 right-0 z-[450] lg:hidden backdrop-blur-3xl border-t px-4 py-2 shadow-2xl flex justify-around items-center select-none h-16 pb-safe transition-colors duration-300 ${
        settings.darkMode 
          ? 'bg-zinc-950/90 border-white/5' 
          : 'bg-white/90 border-black/5'
      }`}>
        {[
          { id: 'home', label: 'Listen Now', icon: Home },
          { id: 'browse', label: 'Browse', icon: Compass },
          { id: 'ai', label: 'Osan AI', icon: Sparkles },
          { id: 'library', label: 'Library', icon: Library },
          { id: 'menu', label: 'Menu', icon: Menu }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === 'menu' ? isMenuOpen : (activeTab === tab.id);
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                if (tab.id === 'menu') {
                  setIsMenuOpen(true);
                } else {
                  setActiveTab(tab.id as any);
                  setSelectedArtist(null);
                  setSelectedAlbum(null);
                }
              }}
              className={`flex flex-col items-center justify-center w-14 h-12 relative transition-colors ${
                active 
                  ? settings.darkMode ? 'text-white font-extrabold' : 'text-zinc-900 font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="active-tab-highlight"
                  className={`absolute inset-0 rounded-xl z-0 ${
                    settings.darkMode ? 'bg-white/10 shadow-inner' : 'bg-zinc-950/[0.06] shadow-sm'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="z-10 flex flex-col items-center justify-center">
                <Icon size={20} style={{ color: active ? settings.accentColor : undefined }} />
                <span className="text-[9px] font-bold mt-1">{tab.label}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 7. Apple-style Ellipsis Context Menu overlay */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            track={contextMenu.track}
            playlists={playlists}
            isLiked={favorites.some((f) => f.id === contextMenu.track.id)}
            onClose={() => setContextMenu(null)}
            onPlay={handlePlayTrack}
            onAddToQueue={handleAddToQueue}
            onToggleLike={handleToggleLike}
            onAddToPlaylist={handleAddTrackToPlaylist}
            onDownload={handleDownloadTrack}
            onOsanAnalyze={handleOsanAnalyze}
            onOpenCreatePlaylistModal={() => setShowCreatePlaylistModal(true)}
            darkMode={settings.darkMode}
          />
        )}
      </AnimatePresence>

      {/* 8. Glass presentation modal sheet for Creating Playlists */}
      <AnimatePresence>
        {showCreatePlaylistModal && (
          <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreatePlaylistModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 border transition-all duration-300 ${
                settings.darkMode 
                  ? 'bg-zinc-900/90 border-white/10 text-white backdrop-blur-2xl' 
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
              }`}
            >
              <h3 className="text-lg font-bold">Create custom playlist</h3>
              <p className="text-xs text-zinc-400 mt-1">Design your own curated musical atmosphere.</p>

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Playlist Name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border ${
                    settings.darkMode 
                      ? 'bg-white/5 border-white/5 focus:border-zinc-500 text-white' 
                      : 'bg-black/[0.03] border-black/10 focus:border-zinc-400 text-zinc-800 placeholder-zinc-400'
                  }`}
                />
                <textarea
                  placeholder="Description (Optional)"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition resize-none border ${
                    settings.darkMode 
                      ? 'bg-white/5 border-white/5 focus:border-zinc-500 text-white' 
                      : 'bg-black/[0.03] border-black/10 focus:border-zinc-400 text-zinc-800 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl active:scale-95 transition ${
                    settings.darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl text-white active:scale-95 transition"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8b. Glass presentation modal sheet for Changing Playlist Cover */}
      <AnimatePresence>
        {showEditCoverModal && selectedPlaylist && (
          <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditCoverModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 border transition-all duration-300 ${
                settings.darkMode 
                  ? 'bg-zinc-900/90 border-white/10 text-white backdrop-blur-2xl' 
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
              }`}
            >
              <h3 className="text-lg font-bold">Change Playlist Cover</h3>
              <p className="text-xs text-zinc-400 mt-1">Specify custom artwork for "{selectedPlaylist.name}".</p>

              <div className="mt-4 space-y-4">
                {/* Preset Art Grid */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">Preset artworks</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Synthwave', url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&h=400&fit=crop' },
                      { name: 'Vinyl', url: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=400&h=400&fit=crop' },
                      { name: 'Acoustic', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=400&h=400&fit=crop' },
                      { name: 'Headphones', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&h=400&fit=crop' },
                      { name: 'Mesh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&h=400&fit=crop' },
                      { name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&h=400&fit=crop' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setCustomCoverUrl(preset.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition active:scale-95 group/preset ${
                          customCoverUrl === preset.url ? 'border-purple-500' : 'border-transparent'
                        }`}
                      >
                        <img src={preset.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity">
                          <span className="text-[8px] font-bold text-white uppercase">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local File Uploader */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">Or upload local image</label>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="playlist-cover-upload"
                      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 cursor-pointer transition active:scale-[0.98] ${
                        settings.darkMode
                          ? 'border-white/10 hover:border-zinc-500 bg-white/5 hover:bg-white/10 text-zinc-300'
                          : 'border-zinc-350 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-105 text-zinc-650'
                      }`}
                    >
                      <Upload size={18} className="mb-1.5" />
                      <span className="text-xs font-bold">Select from gallery</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5">Supports PNG, JPG, WebP</span>
                    </label>
                    <input
                      type="file"
                      id="playlist-cover-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setCustomCoverUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {customCoverUrl && customCoverUrl.startsWith('data:') && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border border-white/10 flex-shrink-0 relative group">
                        <img src={customCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] font-black text-white uppercase">Preview</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom URL Input */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">Or custom image url</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border ${
                      settings.darkMode 
                        ? 'bg-white/5 border-white/5 focus:border-zinc-500 text-white' 
                        : 'bg-black/[0.03] border-black/10 focus:border-zinc-400 text-zinc-800 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => setShowEditCoverModal(false)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl active:scale-95 transition ${
                    settings.darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdatePlaylistCover(selectedPlaylist.id, customCoverUrl)}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl text-white active:scale-95 transition"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <MenuDrawer
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            settings={settings}
            setSettings={setSettings}
            playlists={playlists}
            favoritesCount={favorites.length}
            onPlayTrack={handlePlayTrack}
            showToastNotification={showToastNotification}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
