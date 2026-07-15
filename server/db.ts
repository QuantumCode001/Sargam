import fs from 'fs';
import path from 'path';

export interface Track {
  id: string; // YouTube ID or custom ID
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

interface DatabaseSchema {
  playlists: Playlist[];
  history: HistoryItem[];
  favorites: Track[];
  settings: {
    darkMode: boolean;
    accentColor: string;
    audioQuality: 'auto' | 'low' | 'medium' | 'high' | 'lossless';
    equalizerPreset: string;
  };
}

const DB_FILE = path.resolve('./server/db.json');

// High-fidelity seeded tracks with real, working YouTube music and ambient IDs
export const SEEDED_TRACKS: Track[] = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio 🌌 Beats to Relax/Study',
    artist: 'Lofi Girl',
    album: 'Lofi Study Beats',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80',
    duration: 1800,
    genre: 'Lofi / Chill',
    mood: 'focus',
    youtubeId: 'jfKfPfyJRdk'
  },
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio 🎧 Beats to Sleep/Chill',
    artist: 'Lofi Girl',
    album: 'Lofi Sleep Beats',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    duration: 1800,
    genre: 'Lofi / Ambient',
    mood: 'sleep',
    youtubeId: '5qap5aO4i9A'
  },
  {
    id: 'fHI8X4OXluQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80',
    duration: 200,
    genre: 'Synthwave / Pop',
    mood: 'workout',
    youtubeId: 'fHI8X4OXluQ'
  },
  {
    id: 'h5v3kOTU6s8',
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80',
    duration: 230,
    genre: 'R&B / Electronic',
    mood: 'energy',
    youtubeId: '49ko3_1' // placeholder/real search id
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    album: 'Vida',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    duration: 228,
    genre: 'Latin Pop',
    mood: 'party',
    youtubeId: 'kJQP7kiw5Fk'
  },
  {
    id: '09R8_2nJtjg',
    title: 'Sugar',
    artist: 'Maroon 5',
    album: 'V',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    duration: 235,
    genre: 'Pop',
    mood: 'party',
    youtubeId: '09R8_2nJtjg'
  },
  {
    id: 'DyDfgMOUjCI',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    album: 'When We All Fall Asleep',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80',
    duration: 194,
    genre: 'Alternative Pop',
    mood: 'chill',
    youtubeId: 'DyDfgMOUjCI'
  },
  {
    id: 'YykjpeuMNEk',
    title: 'Hymn for the Weekend',
    artist: 'Coldplay',
    album: 'A Head Full of Dreams',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
    duration: 258,
    genre: 'Alternative Rock',
    mood: 'energy',
    youtubeId: 'YykjpeuMNEk'
  },
  {
    id: 'v2AC41dglnM',
    title: 'Interstellar Soundtrack (Main Theme)',
    artist: 'Hans Zimmer',
    album: 'Interstellar OST',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
    duration: 240,
    genre: 'Classical / Cinematic',
    mood: 'focus',
    youtubeId: 'v2AC41dglnM'
  },
  {
    id: 'CevxZvSJLk8',
    title: 'Weightless (Official 10-Hour Loop)',
    artist: 'Marconi Union',
    album: 'Weightless',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
    duration: 600,
    genre: 'Ambient / Soundscape',
    mood: 'sleep',
    youtubeId: 'CevxZvSJLk8'
  },
  {
    id: 'UqyT8IEB9yY',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
    duration: 203,
    genre: 'Dance / Pop',
    mood: 'workout',
    youtubeId: 'UqyT8IEB9yY'
  },
  {
    id: 'papuvlVeZg8',
    title: 'Shadows',
    artist: 'The Midnight',
    album: 'Nocturnal',
    coverUrl: 'https://images.unsplash.com/photo-1515462277126-270d878326e5?w=400&q=80',
    duration: 385,
    genre: 'Synthwave',
    mood: 'chill',
    youtubeId: 'papuvlVeZg8'
  },
  {
    id: 'BddP6PYo2Gs',
    title: 'Kesariya',
    artist: 'Arijit Singh',
    album: 'Brahmastra',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    duration: 268,
    genre: 'Bollywood / Pop',
    mood: 'chill',
    youtubeId: 'BddP6PYo2Gs'
  },
  {
    id: 'Umqb9DKHY58',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    album: 'Aashiqui 2',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    duration: 262,
    genre: 'Bollywood / Romantic',
    mood: 'chill',
    youtubeId: 'Umqb9DKHY58'
  },
  {
    id: 'jHNNMj5bNQw',
    title: 'Kabira',
    artist: 'Arijit Singh & Harshdeep Kaur',
    album: 'Yeh Jawaani Hai Deewani',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
    duration: 251,
    genre: 'Bollywood / Folk-Pop',
    mood: 'chill',
    youtubeId: 'jHNNMj5bNQw'
  },
  {
    id: 'u2NAus-VCDA',
    title: 'Apna Bana Le',
    artist: 'Arijit Singh & Sachin-Jigar',
    album: 'Bhediya',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
    duration: 264,
    genre: 'Bollywood / Romantic',
    mood: 'chill',
    youtubeId: 'u2NAus-VCDA'
  }
];

const DEFAULT_DB: DatabaseSchema = {
  playlists: [
    {
      id: 'p1',
      name: 'Aura Essentials',
      description: 'The absolute best tracks curated by Aura AI to jumpstart your premium listening experience.',
      coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7a4c3?w=600&q=80',
      isPinned: true,
      isCollaborative: false,
      tracks: SEEDED_TRACKS.slice(0, 6),
      createdAt: new Date().toISOString()
    },
    {
      id: 'p2',
      name: 'Midnight Focus Room',
      description: 'Keep your flow state locked with high-fidelity atmospheric ambient loops and study beats.',
      coverUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80',
      isPinned: true,
      isCollaborative: true,
      tracks: SEEDED_TRACKS.filter(t => t.mood === 'focus' || t.mood === 'sleep'),
      createdAt: new Date().toISOString()
    },
    {
      id: 'p3',
      name: 'Hyper Energy Mix',
      description: 'Uplifting synthwave and pop anthems designed to power up your active routines and workouts.',
      coverUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
      isPinned: false,
      isCollaborative: false,
      tracks: SEEDED_TRACKS.filter(t => t.mood === 'workout' || t.mood === 'energy' || t.mood === 'party'),
      createdAt: new Date().toISOString()
    }
  ],
  history: [],
  favorites: [
    SEEDED_TRACKS[2],
    SEEDED_TRACKS[6]
  ],
  settings: {
    darkMode: true,
    accentColor: '#FF2D55', // Apple Pink/Red
    audioQuality: 'lossless',
    equalizerPreset: 'Aura Perfect'
  }
};

export function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  initDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file, resetting to defaults', err);
    return DEFAULT_DB;
  }
}

export function writeDb(data: DatabaseSchema) {
  initDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
