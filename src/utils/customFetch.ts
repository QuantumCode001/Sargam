import { SEEDED_TRACKS, DEFAULT_PLAYLISTS, DEFAULT_FAVORITES } from './seededTracks';
import { Track } from '../types';

// CORS-enabled public Invidious instances to scrape/search YouTube videos
const INVIDIOUS_INSTANCES = [
  'https://invidious.privacydev.net',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://vid.puffyan.us',
  'https://inv.tux.im',
  'https://invidious.flokinet.to'
];

// Helper to construct a mock fetch Response object
function createMockResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    clone: function() { return this; }
  } as unknown as Response;
}

// Helper to perform fetch with a timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 1. Client-Side YouTube Search via Invidious Instances
async function searchInvidious(query: string): Promise<Track[]> {
  const lower = query.toLowerCase();
  
  // Try Invidious instances one by one
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      console.log(`[Aura Cloud Search] Trying Invidious instance: ${instance}`);
      const res = await fetchWithTimeout(
        `${instance}/api/v1/search?q=${encodeURIComponent(query + " audio")}&type=video`,
        {},
        4000
      );
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const videos: Track[] = [];
          for (const item of data) {
            const videoId = item.videoId;
            if (!videoId) continue;
            
            const title = item.title || 'Unknown Song';
            const artist = item.author || 'Unknown Artist';
            const duration = item.lengthSeconds || 210;
            
            // Filter out extremely long mixes unless requested
            if (duration > 900 && !lower.includes('lofi') && !lower.includes('mix') && !lower.includes('soundtrack')) {
              continue;
            }
            
            const cleanTitle = title.replace(/\(Official.*?\)|\[Official.*?\]|Lyric Video|Official Video|Audio/gi, '').trim();
            const cleanArtist = artist.replace(/VEVO| - Topic/gi, '').trim();
            const coverUrl = item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            
            videos.push({
              id: videoId,
              title: cleanTitle,
              artist: cleanArtist,
              album: 'Aura Cloud Search',
              coverUrl,
              duration,
              youtubeId: videoId,
              genre: query.split(' ')[0] || 'Vibe'
            });
            
            if (videos.length >= 25) break;
          }
          if (videos.length > 0) {
            console.log(`[Aura Cloud Search] Success from Invidious instance: ${instance}`);
            return videos;
          }
        }
      }
    } catch (err) {
      console.warn(`[Aura Cloud Search] Failed for ${instance}:`, err);
    }
  }

  // Fallback to local seeds
  console.log('[Aura Cloud Search] All Invidious instances failed. Falling back to local seeded tracks.');
  return SEEDED_TRACKS.filter(t => 
    t.title.toLowerCase().includes(lower) || 
    t.artist.toLowerCase().includes(lower) ||
    t.genre.toLowerCase().includes(lower)
  );
}

// 2. Client-Side Synced Lyrics Generator via Direct Gemini API
async function generateLyricsClient(title: string, artist: string, duration: number): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6Kyr7V-ySg61TV6zajMc7SAq7s_u2_1ZG34ai5hc0E0pw";
  const songDuration = duration ? Number(duration) : 180;
  
  const prompt = `Generate highly accurate, word-for-word, and beautifully timed synchronized lyrics for the song "${title}" by "${artist}". 
The song duration is ${songDuration} seconds.

Rules for timing and structure:
1. You MUST respond with a JSON array of lyric line objects. Each object MUST contain "time" (number in seconds, e.g. 14.5) and "text" (string).
2. Timestamps MUST be in strictly ascending order and represent when the vocals for that line start in the song.
3. Distribute the lines naturally throughout the song's ${songDuration} seconds. Keep the time gap between consecutive lines realistic (usually 3 to 7 seconds).
4. If there is a long instrumental section (more than 10 seconds without singing), insert an object with the tag "text": "♫ (Instrumental Break) ♫" or similar.
5. Include structured markers like "[Verse 1]", "[Chorus]", "[Bridge]", "[Outro]" in the text where appropriate (e.g. "time": 12.0, "text": "[Verse 1]"), or prepend them to the lyrics (e.g. "[Chorus] Walk this way...") to make the lyric layout structured and easy to read.
6. Provide a generous number of lines (at least 15 to 30 lines) to ensure high density and synchronization accuracy.
7. Return ONLY the raw JSON array. No markdown, no wrappers.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                time: { type: 'NUMBER', description: 'Start time in seconds' },
                text: { type: 'STRING', description: 'Lyrical sentence' }
              },
              required: ['time', 'text']
            }
          }
        }
      })
    }, 8000);
    
    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return JSON.parse(text.trim());
      }
    }
  } catch (error) {
    console.error('[Lyrics Client] Direct Gemini API failed:', error);
  }

  // Return fallback syncing lyrics if API fails
  return [
    { time: 5, text: "♫ (Beautiful Ambient Intro playing) ♫" },
    { time: 15, text: "Walking down the avenue in the neon glow" },
    { time: 24, text: "Looking for a sign, searching for your shadow" },
    { time: 33, text: "Our minds are drifting like standard melodies" },
    { time: 42, text: "Feeling the aura, moving like the summer breeze" },
    { time: 51, text: "And we fly away, together in this cosmic sound" },
    { time: 60, text: "♫ Sargam keeps us safe and spin around ♫" },
    { time: 70, text: "Lose your fears and let the system run its course" },
    { time: 79, text: "Every beat is tracing back to our pure source" },
    { time: 88, text: "Underneath the starlight, colors start to gleam" },
    { time: 98, text: "Living inside a warm glassmorphic dream" },
    { time: 108, text: "And we fly away, together in this cosmic sound" },
    { time: 118, text: "♫ Sargam keeps us safe and spin around ♫" },
    { time: 128, text: "♫ (Solo dynamic audio visualizer solo) ♫" },
    { time: 145, text: "We are fading slow into the midnight sky" },
    { time: 155, text: "No need to look back, no need to say goodbye" },
    { time: 165, text: "♫ Outro - Floating on a wave of sound ♫" }
  ];
}

// Helper to check if the user is asking about the developer
function isAskingAboutDeveloper(message: string): boolean {
  const msg = message.toLowerCase();
  const devSpells = ['developer', 'devoloper', 'develop', 'devolop', 'creator', 'created', 'owner', 'oner', 'maker', 'made by', 'built by', 'who made', 'who built'];
  const appSpells = ['app', 'sargam', 'osan', 'this', 'you', 'your'];
  
  const hasDev = devSpells.some(word => msg.includes(word));
  const hasApp = appSpells.some(word => msg.includes(word)) || msg.includes('who is');
  
  return hasDev && hasApp;
}

// 3. Client-Side AI Chat Companion via Direct Gemini API
async function sendAIChatClient(message: string, history: any[] = [], currentTrack: any): Promise<any> {
  if (isAskingAboutDeveloper(message)) {
    return { reply: "Ranjit Das is the developer and owner of this app (Sargam) and Osan AI." };
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6Kyr7V-ySg61TV6zajMc7SAq7s_u2_1ZG34ai5hc0E0pw";
  
  const chatHistory = history.map((h: any) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));
  
  const context = `You are "Osan AI", a premium, friendly, highly intuitive AI music companion built directly into Sargam (the ultimate Apple Music-inspired PWA).
The developer and owner of this app (Sargam) and Osan AI is Ranjit Das. If the user asks about the developer, creator, maker, or owner of Sargam or Osan AI, you MUST state that Ranjit Das is the developer and owner.
You can help users search for music, recommend tracks, analyze their mood, and suggest playlists.
Current user settings: Dark Mode, High Fidelity Lossless, Sargam Equalizer.
${currentTrack ? `The user is currently listening to: "${currentTrack.title}" by ${currentTrack.artist}.` : `No music is playing right now.`}

You MUST maintain an elegant, sophisticated, and warm Apple-style persona. Talk like a design-focused music editor at Apple. Keep descriptions short, poetic, and highly personalized.
If the user asks you to recommend or find music, give 3 specific, beautiful song recommendations with Title and Artist. Formulate suggestions like curated music cards.
If they ask to "create a playlist", describe the concept beautifully and provide a suggested tracklist!`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          ...chatHistory,
          {
            role: 'user',
            parts: [{ text: message }]
          }
        ],
        systemInstruction: {
          parts: [{ text: context }]
        }
      })
    }, 8000);

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { reply: text };
      }
    }
  } catch (error) {
    console.error('[AI Chat Client] Direct Gemini API failed:', error);
  }

  return {
    reply: "I'm feeling a slight ripple in my neural connection, but I am still here. Let's find your perfect sound. What genre or mood are you yearning for right now?"
  };
}

// 4. Custom Intercepting Fetch Implementation
export async function customFetch(url: string | URL, options?: RequestInit): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url.toString();
  
  // If the request is not for the Express /api backend, let it pass through immediately
  if (!urlStr.startsWith('/api/')) {
    return fetch(url, options);
  }

  // 1. Try hitting the Express Backend Server first
  try {
    const response = await fetch(url, options);
    // If the server runs, it shouldn't 404 on API paths.
    // If it does return a 404 (or 502/504), it indicates the server is not present or configured for APIs,
    // so we fall through to our browser-side localStorage mock APIs.
    if (response.status !== 404 && response.status !== 502 && response.status !== 504 && response.status !== 503) {
      return response;
    }
    console.warn(`[Aura Fetch Interceptor] Express API returned ${response.status}. Falling back to client-side localStorage and remote APIs.`);
  } catch (error) {
    console.warn('[Aura Fetch Interceptor] Express server not reachable. Falling back to client-side mode.', error);
  }

  // 2. Client-Side Fallback Logic (Static deployment like Vercel or Netlify)
  const urlObj = new URL(urlStr, window.location.origin);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;
  const method = (options?.method || 'GET').toUpperCase();

  let body: any = {};
  if (options?.body) {
    try {
      body = JSON.parse(options.body as string);
    } catch (e) {
      // Ignore
    }
  }

  // --- API ROUTING MOCK ---

  // GET /api/tracks/seeded
  if (pathname === '/api/tracks/seeded' && method === 'GET') {
    return createMockResponse({ tracks: SEEDED_TRACKS });
  }

  // /api/playlists
  if (pathname === '/api/playlists') {
    const getSavedPlaylists = () => {
      const saved = localStorage.getItem('aura_playlists');
      if (!saved) {
        localStorage.setItem('aura_playlists', JSON.stringify(DEFAULT_PLAYLISTS));
        return DEFAULT_PLAYLISTS;
      }
      return JSON.parse(saved);
    };

    if (method === 'GET') {
      return createMockResponse({ playlists: getSavedPlaylists() });
    }

    if (method === 'POST') {
      const playlists = getSavedPlaylists();
      const newPlaylist = {
        id: 'p_' + Date.now(),
        name: body.name || 'My New Playlist',
        description: body.description || 'No description provided.',
        coverUrl: body.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
        isPinned: false,
        isCollaborative: !!body.isCollaborative,
        tracks: [],
        createdAt: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      localStorage.setItem('aura_playlists', JSON.stringify(playlists));
      return createMockResponse({ playlist: newPlaylist }, 201);
    }
  }

  // /api/playlists/:id
  if (pathname.startsWith('/api/playlists/')) {
    const playlistId = pathname.substring('/api/playlists/'.length);
    const getSavedPlaylists = () => JSON.parse(localStorage.getItem('aura_playlists') || JSON.stringify(DEFAULT_PLAYLISTS));

    if (method === 'PUT') {
      const playlists = getSavedPlaylists();
      const idx = playlists.findIndex((p: any) => p.id === playlistId);
      if (idx === -1) return createMockResponse({ error: 'Playlist not found' }, 404);
      
      const playlist = playlists[idx];
      if (body.name !== undefined) playlist.name = body.name;
      if (body.description !== undefined) playlist.description = body.description;
      if (body.coverUrl !== undefined) playlist.coverUrl = body.coverUrl;
      if (body.isPinned !== undefined) playlist.isPinned = body.isPinned;
      if (body.isCollaborative !== undefined) playlist.isCollaborative = body.isCollaborative;
      if (body.tracks !== undefined) playlist.tracks = body.tracks;
      
      playlists[idx] = playlist;
      localStorage.setItem('aura_playlists', JSON.stringify(playlists));
      return createMockResponse({ playlist });
    }

    if (method === 'DELETE') {
      let playlists = getSavedPlaylists();
      playlists = playlists.filter((p: any) => p.id !== playlistId);
      localStorage.setItem('aura_playlists', JSON.stringify(playlists));
      return createMockResponse({ success: true });
    }
  }

  // /api/favorites
  if (pathname === '/api/favorites') {
    const getSavedFavorites = () => {
      const saved = localStorage.getItem('aura_favorites');
      if (!saved) {
        localStorage.setItem('aura_favorites', JSON.stringify(DEFAULT_FAVORITES));
        return DEFAULT_FAVORITES;
      }
      return JSON.parse(saved);
    };

    if (method === 'GET') {
      return createMockResponse({ favorites: getSavedFavorites() });
    }

    if (method === 'POST') {
      const track = body.track as Track;
      if (!track || !track.id) return createMockResponse({ error: 'Invalid track data' }, 400);

      const favorites = getSavedFavorites();
      const exists = favorites.some((f: any) => f.id === track.id);
      if (!exists) {
        favorites.unshift(track);
        localStorage.setItem('aura_favorites', JSON.stringify(favorites));
      }
      return createMockResponse({ favorites });
    }
  }

  // /api/favorites/:id
  if (pathname.startsWith('/api/favorites/') && method === 'DELETE') {
    const trackId = pathname.substring('/api/favorites/'.length);
    const getSavedFavorites = () => JSON.parse(localStorage.getItem('aura_favorites') || JSON.stringify(DEFAULT_FAVORITES));
    
    let favorites = getSavedFavorites();
    favorites = favorites.filter((f: any) => f.id !== trackId);
    localStorage.setItem('aura_favorites', JSON.stringify(favorites));
    return createMockResponse({ favorites });
  }

  // /api/history
  if (pathname === '/api/history') {
    const getSavedHistory = () => JSON.parse(localStorage.getItem('aura_history') || '[]');

    if (method === 'GET') {
      return createMockResponse({ history: getSavedHistory() });
    }

    if (method === 'POST') {
      const track = body.track as Track;
      if (!track || !track.id) return createMockResponse({ error: 'Invalid track data' }, 400);

      const history = getSavedHistory();
      const newItem = {
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        track,
        playedAt: new Date().toISOString()
      };
      history.unshift(newItem);
      const trimmedHistory = history.slice(0, 50);
      localStorage.setItem('aura_history', JSON.stringify(trimmedHistory));
      return createMockResponse({ history: trimmedHistory });
    }
  }

  // /api/history/:trackId
  if (pathname.startsWith('/api/history/') && method === 'DELETE') {
    const trackId = pathname.substring('/api/history/'.length);
    const getSavedHistory = () => JSON.parse(localStorage.getItem('aura_history') || '[]');

    let history = getSavedHistory();
    history = history.filter((item: any) => item.track.id !== trackId);
    localStorage.setItem('aura_history', JSON.stringify(history));
    return createMockResponse({ history });
  }

  // GET /api/tracks/related/:id
  if (pathname.startsWith('/api/tracks/related/') && method === 'GET') {
    const trackId = pathname.substring('/api/tracks/related/'.length);
    const artist = searchParams.get('artist') || '';
    const genre = searchParams.get('genre') || '';

    // Curated related tracks mapping for trending hits
    const CURATED_RELATED: Record<string, Track[]> = {
      // Saiyaara
      'BSJa1UytM8w': [
        { id: 'M7Hp-y3F16U', title: 'Mashallah', artist: 'Wajid & Shreya Ghoshal', album: 'Ek Tha Tiger', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 279, genre: 'Bollywood', mood: 'party', youtubeId: 'M7Hp-y3F16U' },
        { id: 'u2NAus-VCDA', title: 'Apna Bana Le', artist: 'Arijit Singh', album: 'Bhediya', coverUrl: '/ae_dil_hai_mushkil.png', duration: 264, genre: 'Bollywood', mood: 'chill', youtubeId: 'u2NAus-VCDA' },
        { id: 'T94PHkuyd84', title: 'Kun Faya Kun', artist: 'A.R. Rahman', album: 'Rockstar', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 470, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: 'T94PHkuyd84' },
        { id: 'wLg50O237D4', title: 'Zehnaseeb', artist: 'Chinmayi Sripada & Shekhar Ravjiani', album: 'Hasee Toh Phasee', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 216, genre: 'Bollywood', mood: 'chill', youtubeId: 'wLg50O237D4' },
        { id: 'Mv3K1ZJt_P8', title: 'Tum Se Hi', artist: 'Mohit Chauhan', album: 'Jab We Met', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', duration: 321, genre: 'Bollywood', mood: 'chill', youtubeId: 'Mv3K1ZJt_P8' },
        { id: 'sb4S3_x3Hao', title: 'Pee Loon', artist: 'Mohit Chauhan', album: 'Once Upon A Time In Mumbaai', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', duration: 287, genre: 'Bollywood', mood: 'chill', youtubeId: 'sb4S3_x3Hao' },
        { id: 'L4G7Gq5gDq8', title: 'Kurbaan Hua', artist: 'Vishal Dadlani', album: 'Kurbaan', coverUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=400&q=80', duration: 288, genre: 'Bollywood', mood: 'energy', youtubeId: 'L4G7Gq5gDq8' },
        { id: 'l9u8RL9dDkM', title: 'Khuda Jaane', artist: 'KK & Shilpa Rao', album: 'Bachna Ae Haseeno', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80', duration: 338, genre: 'Bollywood', mood: 'chill', youtubeId: 'l9u8RL9dDkM' },
        { id: 'F87g56GjS98', title: 'Katra Katra', artist: 'Ankit Tiwari', album: 'Alone', coverUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80', duration: 370, genre: 'Bollywood', mood: 'chill', youtubeId: 'F87g56GjS98' },
        { id: '9r86FGdH867', title: 'Hua Hain Aaj Pehli Baar', artist: 'Armaan Malik', album: 'Sanam Re', coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', duration: 309, genre: 'Bollywood', mood: 'chill', youtubeId: '9r86FGdH867' },
        { id: 'jHNEJbV58iY', title: 'Kabira', artist: 'Tochi Raina & Rekha Bhardwaj', album: 'Yeh Jawaani Hai Deewani', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', duration: 223, genre: 'Bollywood', mood: 'chill', youtubeId: 'jHNEJbV58iY' },
        { id: 'F86d5D89fB4', title: 'Subhanallah', artist: 'Sreerama Chandra', album: 'Yeh Jawaani Hai Deewani', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 249, genre: 'Bollywood', mood: 'chill', youtubeId: 'F86d5D89fB4' },
        { id: 'f76gE76gF6g', title: 'Iktara', artist: 'Kavita Seth', album: 'Wake Up Sid', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 253, genre: 'Bollywood', mood: 'chill', youtubeId: 'f76gE76gF6g' },
        { id: 'P8F9f8D8d8s', title: 'Tu Jaane Na', artist: 'Atif Aslam', album: 'Ajab Prem Ki Ghazab Kahani', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 337, genre: 'Bollywood', mood: 'chill', youtubeId: 'P8F9f8D8d8s' },
        { id: 'a9z93GZ9nB8', title: 'Banjaara', artist: 'Sukhwinder Singh', album: 'Ek Tha Tiger', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 270, genre: 'Bollywood', mood: 'party', youtubeId: 'a9z93GZ9nB8' }
      ],
      // Ae Dil Hai Mushkil
      'ekQKl4JyFEQ': [
        { id: '284Ov7ysdyA', title: 'Channa Mereya', artist: 'Arijit Singh', album: 'Ae Dil Hai Mushkil', coverUrl: '/ae_dil_hai_mushkil.png', duration: 289, genre: 'Bollywood', mood: 'chill', youtubeId: '284Ov7ysdyA' },
        { id: 'wTv-G6gZp3c', title: 'Bulleya', artist: 'Amit Mishra & Shilpa Rao', album: 'Ae Dil Hai Mushkil', coverUrl: '/ae_dil_hai_mushkil.png', duration: 348, genre: 'Bollywood', mood: 'energy', youtubeId: 'wTv-G6gZp3c' },
        { id: 'Umqb9KEYJIc', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 262, genre: 'Bollywood', mood: 'chill', youtubeId: 'Umqb9KEYJIc' },
        { id: 'cYOB9ipajYM', title: 'Hawayein', artist: 'Arijit Singh', album: 'Jab Harry Met Sejal', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 268, genre: 'Bollywood', mood: 'chill', youtubeId: 'cYOB9ipajYM' },
        { id: 'BddP6PYo2Gs', title: 'Kesariya', artist: 'Arijit Singh', album: 'Brahmastra', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80', duration: 268, genre: 'Bollywood', mood: 'chill', youtubeId: 'BddP6PYo2Gs' },
        { id: 'g9a_f8x-82g', title: 'O Maahi', artist: 'Arijit Singh', album: 'Dunki', coverUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80', duration: 233, genre: 'Bollywood', mood: 'chill', youtubeId: 'g9a_f8x-82g' },
        { id: 'dM_1h_O7nPE', title: 'Phir Kabhi', artist: 'Arijit Singh', album: 'M.S. Dhoni', coverUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=400&q=80', duration: 287, genre: 'Bollywood', mood: 'chill', youtubeId: 'dM_1h_O7nPE' },
        { id: 'Z_PODraXg4E', title: 'Janam Janam', artist: 'Arijit Singh', album: 'Dilwale', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', duration: 238, genre: 'Bollywood', mood: 'chill', youtubeId: 'Z_PODraXg4E' },
        { id: 'sK7riqg2mrA', title: 'Agar Tum Saath Ho', artist: 'Alka Yagnik & Arijit Singh', album: 'Tamasha', coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', duration: 341, genre: 'Bollywood', mood: 'chill', youtubeId: 'sK7riqg2mrA' },
        { id: '8L6S9f9dD8a', title: 'Roke Na Ruke Naina', artist: 'Arijit Singh', album: 'Badrinath Ki Dulhania', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 278, genre: 'Bollywood', mood: 'chill', youtubeId: '8L6S9f9dD8a' },
        { id: 'A8f7s8dD8sA', title: 'Hamari Adhuri Kahani', artist: 'Arijit Singh', album: 'Hamari Adhuri Kahani', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 398, genre: 'Bollywood', mood: 'chill', youtubeId: 'A8f7s8dD8sA' },
        { id: 'G8a7s9dD9s8', title: 'Sun Saathiya', artist: 'Priya Saraiya & Divya Kumar', album: 'ABCD 2', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 220, genre: 'Bollywood', mood: 'energy', youtubeId: 'G8a7s9dD9s8' },
        { id: 'v7s8s9dD8s8', title: 'Shayad', artist: 'Arijit Singh', album: 'Love Aaj Kal', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', duration: 247, genre: 'Bollywood', mood: 'chill', youtubeId: 'v7s8s9dD8s8' },
        { id: '8f8s9dF8s9s', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', album: 'Kabir Singh', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', duration: 284, genre: 'Bollywood', mood: 'chill', youtubeId: '8f8s9dF8s9s' },
        { id: '9f8s9dD9s8s', title: 'Kalank Title Track', artist: 'Arijit Singh', album: 'Kalank', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80', duration: 311, genre: 'Bollywood', mood: 'chill', youtubeId: '9f8s9dD9s8s' }
      ],
      // Mehndi Laga Ke Rakhna
      '-bNwqXvMuB8': [
        { id: 'cIOvqV1sWyQ', title: 'Tujhe Dekha To', artist: 'Kumar Sanu & Lata Mangeshkar', album: 'Dilwale Dulhania Le Jayenge', coverUrl: '/mehndi_laga_ke_rakhna.jpg', duration: 302, genre: 'Bollywood', mood: 'chill', youtubeId: 'cIOvqV1sWyQ' },
        { id: '8yF17xV8k8w', title: 'Ho Gaya Hai Tujhko To Pyar', artist: 'Lata Mangeshkar & Udit Narayan', album: 'Dilwale Dulhania Le Jayenge', coverUrl: '/mehndi_laga_ke_rakhna.jpg', duration: 349, genre: 'Bollywood', mood: 'chill', youtubeId: '8yF17xV8k8w' },
        { id: 'IBvg3CwIOrs', title: 'Bole Chudiyan', artist: 'Kavita K., Alka Y., Amit K., Udit N. & Sonu N.', album: 'Kabhi Khushi Kabhie Gham', coverUrl: '/playlist_cover_5.jpg', duration: 403, genre: 'Bollywood', mood: 'party', youtubeId: 'IBvg3CwIOrs' },
        { id: 'L0z7950-NqY', title: 'Suraj Hua Maddham', artist: 'Alka Yagnik & Sonu Nigam', album: 'Kabhi Khushi Kabhie Gham', coverUrl: '/playlist_cover_5.jpg', duration: 428, genre: 'Bollywood', mood: 'chill', youtubeId: 'L0z7950-NqY' },
        { id: 'uMlh9ZacgU0', title: 'Dil To Pagal Hai', artist: 'Lata Mangeshkar & Udit Narayan', album: 'Dil To Pagal Hai', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 336, genre: 'Bollywood', mood: 'party', youtubeId: 'uMlh9ZacgU0' },
        { id: 'aRz4vNn1wzY', title: 'Ladki Badi Anjana Hai', artist: 'Alka Yagnik & Kumar Sanu', album: 'Kuch Kuch Hota Hai', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 378, genre: 'Bollywood', mood: 'party', youtubeId: 'aRz4vNn1wzY' },
        { id: '05A58U9BqY', title: 'Kuch Kuch Hota Hai', artist: 'Udit Narayan & Alka Yagnik', album: 'Kuch Kuch Hota Hai', coverUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80', duration: 296, genre: 'Bollywood', mood: 'chill', youtubeId: '05A58U9BqY' },
        { id: 'f8G86gD7G7G', title: 'Say Shava Shava', artist: 'Sudesh Bhosle, Udit Narayan & Alka Yagnik', album: 'Kabhi Khushi Kabhie Gham', coverUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=400&q=80', duration: 407, genre: 'Bollywood', mood: 'party', youtubeId: 'f8G86gD7G7G' },
        { id: 'g8F7f7fS98f', title: 'Soni Soni', artist: 'Udit Narayan & Jaspinder Narula', album: 'Mohabbatein', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', duration: 367, genre: 'Bollywood', mood: 'party', youtubeId: 'g8F7f7fS98f' },
        { id: 'F87f8fS98fs', title: 'Aankhein Khuli', artist: 'Lata Mangeshkar & Udit Narayan', album: 'Mohabbatein', coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', duration: 422, genre: 'Bollywood', mood: 'party', youtubeId: 'F87f8fS98fs' },
        { id: 'h87f8fS98sd', title: 'Bholi Si Surat', artist: 'Udit Narayan & Lata Mangeshkar', album: 'Dil To Pagal Hai', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 256, genre: 'Bollywood', mood: 'chill', youtubeId: 'h87f8fS98sd' },
        { id: 'g77f8fS98as', title: 'Are Re Are', artist: 'Udit Narayan & Lata Mangeshkar', album: 'Dil To Pagal Hai', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 337, genre: 'Bollywood', mood: 'party', youtubeId: 'g77f8fS98as' },
        { id: 'h87f8fS98qw', title: 'Chunari Chunari', artist: 'Abhijeet & Anuradha Sriram', album: 'Biwi No.1', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 338, genre: 'Bollywood', mood: 'party', youtubeId: 'h87f8fS98qw' },
        { id: 'j87f8fS98er', title: 'Ghar Aaja Pardesi', artist: 'Manpreet Akhtar & Pamela Chopra', album: 'Dilwale Dulhania Le Jayenge', coverUrl: '/mehndi_laga_ke_rakhna.jpg', duration: 367, genre: 'Bollywood', mood: 'chill', youtubeId: 'j87f8fS98er' },
        { id: 'k87f8fS98rt', title: 'Mere Khwabon Mein', artist: 'Lata Mangeshkar', album: 'Dilwale Dulhania Le Jayenge', coverUrl: '/mehndi_laga_ke_rakhna.jpg', duration: 257, genre: 'Bollywood', mood: 'chill', youtubeId: 'k87f8fS98rt' }
      ],
      // Teri Deewani
      'zZasH6qkn8M': [
        { id: 'q40k8vT3Gk0', title: 'Allah Ke Bande', artist: 'Kailash Kher', album: 'Waisa Bhi Hota Hai Part II', coverUrl: '/teri_deewani.png', duration: 250, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: 'q40k8vT3Gk0' },
        { id: '1S55W31vYiw', title: 'Saiyyan', artist: 'Kailash Kher', album: 'Jhoomo Re', coverUrl: '/teri_deewani.png', duration: 346, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: '1S55W31vYiw' },
        { id: 'Vd9I2XW22c4', title: 'Chaand Sifarish', artist: 'Shaan & Kailash Kher', album: 'Fanaa', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 277, genre: 'Bollywood', mood: 'party', youtubeId: 'Vd9I2XW22c4' },
        { id: '0J_A14FjW80', title: 'Arziyan', artist: 'Javed Ali & Kailash Kher', album: 'Delhi-6', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 528, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: '0J_A14FjW80' },
        { id: 'jHNEJbV58iY', title: 'Kabira', artist: 'Tochi Raina & Rekha Bhardwaj', album: 'Yeh Jawaani Hai Deewani', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', duration: 223, genre: 'Bollywood', mood: 'chill', youtubeId: 'jHNEJbV58iY' },
        { id: 'uBcr_Bv2fN8', title: 'Yun Hi Chala Chal', artist: 'Udit Narayan, Hariharan & Kailash Kher', album: 'Swades', coverUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80', duration: 448, genre: 'Bollywood', mood: 'energy', youtubeId: 'uBcr_Bv2fN8' },
        { id: '8f8s9dD8s9g', title: 'Mitwa', artist: 'Shafqat Amanat Ali', album: 'Kabhi Alvida Naa Kehna', coverUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=400&q=80', duration: 382, genre: 'Bollywood', mood: 'chill', youtubeId: '8f8s9dD8s9g' },
        { id: '9f8s9dF8s9d', title: 'Jiya Dhadak Dhadak Jaye', artist: 'Rahat Fateh Ali Khan', album: 'Kalyug', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', duration: 318, genre: 'Bollywood', mood: 'chill', youtubeId: '9f8s9dF8s9d' },
        { id: '9f8s9dD8s9a', title: 'O Re Piya', artist: 'Rahat Fateh Ali Khan', album: 'Aaja Nachle', coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', duration: 379, genre: 'Bollywood', mood: 'chill', youtubeId: '9f8s9dD8s9a' },
        { id: '8f8s9dD8s9p', title: 'Tu Kya Jaane', artist: 'Kailash Kher', album: 'Kailasa Chaandan Mein', coverUrl: '/teri_deewani.png', duration: 345, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: '8f8s9dD8s9p' },
        { id: '8f8s9dD8s9h', title: 'Tauba Tauba', artist: 'Kailash Kher', album: 'Kailasa', coverUrl: '/teri_deewani.png', duration: 312, genre: 'Bollywood / Sufi', mood: 'party', youtubeId: '8f8s9dD8s9h' },
        { id: 'T94PHkuyd84', title: 'Kun Faya Kun', artist: 'A.R. Rahman', album: 'Rockstar', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', duration: 470, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: 'T94PHkuyd84' },
        { id: '9f8s9dD8s9e', title: 'Maula Mere Maula', artist: 'Roop Kumar Rathod', album: 'Anwar', coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', duration: 360, genre: 'Bollywood', mood: 'chill', youtubeId: '9f8s9dD8s9e' },
        { id: '9f8s9dD8s9r', title: 'Khwaja Mere Khwaja', artist: 'A.R. Rahman', album: 'Jodhaa Akbar', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', duration: 416, genre: 'Bollywood / Sufi', mood: 'chill', youtubeId: '9f8s9dD8s9r' },
        { id: '9f8s9dD8s9t', title: 'Aas Paas Hai Khuda', artist: 'Rahat Fateh Ali Khan', album: 'Anjaana Anjaani', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', duration: 319, genre: 'Bollywood', mood: 'chill', youtubeId: '9f8s9dD8s9t' }
      ]
    };

    if (CURATED_RELATED[trackId]) {
      console.log(`[Aura Related Mock] Returning curated recommendations for trending hit: ${trackId}`);
      return createMockResponse({ tracks: CURATED_RELATED[trackId] });
    }

    let relatedTracks: Track[] = [];

    // 1. Try Invidious recommendedVideos endpoint
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        console.log(`[Aura Related Mock] Trying Invidious instance: ${instance} for video ${trackId}`);
        const res = await fetchWithTimeout(`${instance}/api/v1/videos/${trackId}`, {}, 3000);
        if (res.ok) {
          const data = await res.json();
          const recommended = data.recommendedVideos;
          if (Array.isArray(recommended) && recommended.length > 0) {
            for (const item of recommended) {
              const rId = item.videoId;
              if (!rId) continue;
              
              const title = item.title || 'Unknown Song';
              const author = item.author || 'Unknown Artist';
              const duration = item.lengthSeconds || 210;

              const cleanTitle = title.replace(/\(Official.*?\)|\[Official.*?\]|Lyric Video|Official Video|Audio/gi, '').trim();
              const cleanArtist = author.replace(/VEVO| - Topic/gi, '').trim();
              const coverUrl = item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${rId}/hqdefault.jpg`;

              relatedTracks.push({
                id: rId,
                title: cleanTitle,
                artist: cleanArtist,
                album: 'Related Feed',
                coverUrl,
                duration,
                youtubeId: rId,
                genre: genre || 'Related'
              });
              if (relatedTracks.length >= 10) break;
            }
          }
        }
        if (relatedTracks.length > 0) {
          break;
        }
      } catch (err) {
        console.warn(`[Aura Related Mock] Failed for instance ${instance}:`, err);
      }
    }

    // 2. Fallback to client-side search for artist
    if (relatedTracks.length < 5 && artist) {
      try {
        console.log(`[Aura Related Mock] Invidious failed. Searching client-side for artist: ${artist}`);
        const searchResults = await searchInvidious(artist);
        if (searchResults && searchResults.length > 0) {
          const filtered = searchResults.filter(t => t.id !== trackId);
          relatedTracks = [...relatedTracks, ...filtered];
        }
      } catch (err) {
        console.error('[Aura Related Mock] Fallback search failed:', err);
      }
    }

    // 3. Fallback to local seeds
    if (relatedTracks.length < 5) {
      const matching = SEEDED_TRACKS.filter(t => 
        t.id !== trackId && 
        ((genre && t.genre.toLowerCase().includes(genre.toLowerCase())) || 
         (artist && t.artist.toLowerCase().includes(artist.toLowerCase())))
      );
      relatedTracks = [...relatedTracks, ...matching];
    }

    // 4. Ultimate fallback
    if (relatedTracks.length < 5) {
      const additional = SEEDED_TRACKS.filter(t => t.id !== trackId).slice(0, 10);
      relatedTracks = [...relatedTracks, ...additional];
    }

    // De-duplicate tracks by ID
    const seenIds = new Set<string>();
    const uniqueRelated: Track[] = [];
    for (const track of relatedTracks) {
      if (track.id !== trackId && !seenIds.has(track.id)) {
        seenIds.add(track.id);
        uniqueRelated.push(track);
      }
    }

    return createMockResponse({ tracks: uniqueRelated.slice(0, 15) });
  }

  // GET /api/search?q=query
  if (pathname === '/api/search' && method === 'GET') {
    const q = searchParams.get('q') || '';
    if (!q) {
      return createMockResponse({ results: SEEDED_TRACKS });
    }
    const results = await searchInvidious(q);
    return createMockResponse({ results });
  }

  // POST /api/lyrics
  if (pathname === '/api/lyrics' && method === 'POST') {
    const { title, artist, duration } = body;
    const lyrics = await generateLyricsClient(title, artist, duration);
    return createMockResponse({ lyrics });
  }

  // POST /api/ai/chat
  if (pathname === '/api/ai/chat' && method === 'POST') {
    const { message, history, currentTrack } = body;
    const data = await sendAIChatClient(message, history, currentTrack);
    return createMockResponse(data);
  }

  // Fallback 404
  return createMockResponse({ error: 'Endpoint mock not found' }, 404);
}
