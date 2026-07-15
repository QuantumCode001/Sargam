import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  Home,
  Compass,
  Search,
  Library,
  Sparkles,
  Settings,
  User,
  Sliders,
  Music,
  Heart,
  Volume2,
  Lock,
  Headphones,
  Check
} from 'lucide-react';
import { Track, Playlist, UserSettings } from '../types';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  playlists: Playlist[];
  favoritesCount: number;
  onPlayTrack: (track: Track) => void;
  showToastNotification: (msg: string, sub?: string) => void;
}

export default function MenuDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  settings,
  setSettings,
  playlists,
  favoritesCount,
  onPlayTrack,
  showToastNotification
}: MenuDrawerProps) {
  if (!isOpen) return null;

  const tabs = [
    { id: 'home', label: 'Listen Now', icon: Home, color: 'text-rose-500' },
    { id: 'browse', label: 'Browse', icon: Compass, color: 'text-blue-500' },
    { id: 'search', label: 'Search', icon: Search, color: 'text-amber-500' },
    { id: 'library', label: 'Library', icon: Library, color: 'text-emerald-500' },
    { id: 'ai', label: 'Osan AI Companion', icon: Sparkles, color: 'text-purple-500' },
    { id: 'settings', label: 'System Settings', icon: Settings, color: 'text-zinc-500' },
    { id: 'about', label: 'About', icon: User, color: 'text-rose-400' }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Sheet Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 220 }}
        className={`relative w-full max-h-[85vh] overflow-y-auto rounded-t-[32px] ${
          settings.darkMode
            ? 'bg-zinc-950/95 border-t border-white/10 text-white'
            : 'bg-white border-t border-zinc-200 text-zinc-800'
        } shadow-2xl p-6 z-10 flex flex-col space-y-6 pb-12`}
      >
        {/* Pull Handle Indicator */}
        <div
          className={`w-12 h-1.5 ${
            settings.darkMode ? 'bg-zinc-800' : 'bg-zinc-300'
          } rounded-full mx-auto -mt-2 mb-2 flex-shrink-0 cursor-pointer`}
          onClick={onClose}
        />

        {/* Header */}
        <div className={`flex items-center justify-between border-b ${settings.darkMode ? 'border-white/5' : 'border-zinc-100'} pb-4`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-rose-500 to-amber-500 flex items-center justify-center p-[2px] shadow-lg">
              <div className={`w-full h-full ${settings.darkMode ? 'bg-zinc-950' : 'bg-white'} rounded-full flex items-center justify-center`}>
                <User size={18} className={settings.darkMode ? 'text-white' : 'text-zinc-700'} />
              </div>
            </div>
            <div>
              <h3 className={`text-sm font-extrabold ${settings.darkMode ? 'text-white' : 'text-zinc-800'} flex items-center gap-1.5`}>
                Premium Listener <Lock size={12} className="text-amber-500" />
              </h3>
              <p className={`text-[10px] ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-550'} font-medium`}>Sargam Hi-Res Audio System Active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2.5 ${
              settings.darkMode
                ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800'
            } active:scale-90 transition rounded-full`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu Navigation Links */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-2">Navigation</h4>
          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-3 p-3.5 rounded-2xl text-left border transition-all duration-300 ${
                    active
                      ? settings.darkMode
                        ? 'bg-white/10 text-white border-white/10 shadow-inner'
                        : 'bg-black/5 text-zinc-900 border-zinc-200 shadow-inner'
                      : settings.darkMode
                        ? 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'
                        : 'bg-zinc-50 text-zinc-500 border-transparent hover:bg-zinc-100'
                  }`}
                  style={{ borderColor: active ? settings.accentColor + '33' : undefined }}
                >
                  <Icon size={16} className={active ? '' : 'text-zinc-500'} style={{ color: active ? settings.accentColor : undefined }} />
                  <span className="text-xs font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Audio Controls Section */}
        <div className={`border rounded-3xl p-5 space-y-5 ${settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-1">
            <Sliders size={12} /> Live Settings
          </h4>

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div>
              <h5 className={`text-xs font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Dark Canvas</h5>
              <p className={`text-[10px] ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Toggle dark / light display rules</p>
            </div>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }))}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ${
                settings.darkMode ? 'bg-rose-500' : 'bg-zinc-300'
              }`}
              style={{ backgroundColor: settings.darkMode ? settings.accentColor : undefined }}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                  settings.darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Accent Color picker inside mobile drawer */}
          <div className={`space-y-2 border-t ${settings.darkMode ? 'border-white/5' : 'border-zinc-200/60'} pt-4`}>
            <div>
              <h5 className={`text-xs font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Accent Palette</h5>
              <p className={`text-[10px] ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Match app buttons to your design taste</p>
            </div>
            <div className="flex space-x-2.5 mt-2.5 overflow-x-auto py-1">
              {[
                { name: 'Apple Pink', value: '#FF2D55' },
                { name: 'Apple Blue', value: '#007AFF' },
                { name: 'Sargam Purple', value: '#A855F7' },
                { name: 'Amber Glow', value: '#F59E0B' },
                { name: 'Emerald', value: '#10B981' }
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSettings((prev) => ({ ...prev, accentColor: color.value }))}
                  className="w-7 h-7 rounded-full border-2 flex-shrink-0 transition active:scale-90"
                  style={{
                    backgroundColor: color.value,
                    borderColor: settings.accentColor === color.value ? (settings.darkMode ? '#FFFFFF' : '#1F2937') : 'transparent'
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Audio Quality Levels */}
          <div className={`space-y-2 border-t ${settings.darkMode ? 'border-white/5' : 'border-zinc-200/60'} pt-4`}>
            <div>
              <h5 className={`text-xs font-bold ${settings.darkMode ? 'text-white' : 'text-zinc-800'}`}>Audio Quality Preset</h5>
              <p className={`text-[10px] ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Vary bitrates dynamically based on connection</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {[
                { id: 'high', label: 'High (256kbps)' },
                { id: 'lossless', label: 'Lossless ALAC' }
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, audioQuality: q.id as any }));
                    showToastNotification('Audio Quality Updated', q.label);
                  }}
                  className={`py-2 px-3 rounded-xl border text-[10px] font-semibold text-center transition ${
                    settings.audioQuality === q.id
                      ? settings.darkMode
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-zinc-800 text-white keep-white border-zinc-700'
                      : settings.darkMode
                        ? 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 shadow-sm'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playlists & Loved Songs Shortcut inside drawer */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-2 flex items-center gap-1.5">
            <Library size={12} /> Quick Library
          </h4>
          <div className={`space-y-1 border rounded-3xl p-3 ${settings.darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
            {/* Loved Songs Row */}
            <div
              onClick={() => handleTabClick('library')}
              className={`flex items-center justify-between p-2.5 ${
                settings.darkMode ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
              } rounded-xl cursor-pointer transition`}
            >
              <div className="flex items-center space-x-2.5">
                <Heart size={14} className="text-rose-500 animate-pulse" fill={settings.accentColor} style={{ color: settings.accentColor }} />
                <span className="text-xs font-semibold">Loved Songs</span>
              </div>
              <span className={`text-[10px] ${
                settings.darkMode ? 'bg-white/10 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
              } px-2 py-0.5 rounded-full font-bold`}>{favoritesCount}</span>
            </div>

            {/* Playlists shortcut lists */}
            {playlists.slice(0, 3).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  handleTabClick('library');
                  if (p.tracks.length > 0) {
                    onPlayTrack(p.tracks[0]);
                  }
                }}
                className={`flex items-center justify-between p-2.5 ${
                  settings.darkMode ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                } rounded-xl cursor-pointer transition`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Music size={14} className="text-zinc-500 flex-shrink-0" />
                  <span className="text-xs font-semibold truncate">{p.name}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium flex-shrink-0">{p.tracks.length} songs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="flex flex-col items-center justify-center pt-2 space-y-1 opacity-60">
          <p className={`text-[10px] font-semibold tracking-wider ${settings.darkMode ? 'text-zinc-400' : 'text-zinc-500'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>SARGAM v1.0.0</p>
          <p className="text-[8px] text-zinc-500">Designed with Apple Aesthetics & Sound Science</p>
        </div>
      </motion.div>
    </div>
  );
}
