export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // in seconds
  genre: string;
  mood?: 'focus' | 'sleep' | 'workout' | 'party' | 'chill' | 'energy';
  youtubeId: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  isPinned: boolean;
  isCollaborative: boolean;
  tracks: Track[];
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  track: Track;
  playedAt: string;
}

export interface LyricLine {
  time: number; // starts at (seconds)
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface UserSettings {
  darkMode: boolean;
  accentColor: string; // Hex color code
  audioQuality: 'auto' | 'low' | 'medium' | 'high' | 'lossless' | 'hires';
  equalizerPreset: string;
  crossfade: number; // in seconds
  speed: number; // playback speed: 0.5, 1, 1.25, 1.5, 2
}
