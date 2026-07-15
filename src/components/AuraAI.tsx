import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, Smile, Loader2, Music, Mic, Volume2 } from 'lucide-react';
import { Track, ChatMessage } from '../types';
import { customFetch as fetch } from '../utils/customFetch';

interface AuraAIProps {
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  accentColor: string;
  darkMode?: boolean;
}

export default function AuraAI({ currentTrack, onPlayTrack, accentColor, darkMode = true }: AuraAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Greetings. I am Osan, your bespoke music curator. I can tailor playlists, analyze your listening aura, discover rare gems, or dial in the perfect soundscape. What style or frequency matches your soul today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentTrack,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        text: data.reply || "I'm having trouble connecting to the Osan server. Try checking your network.",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Aura AI connection failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'error_' + Date.now(),
          role: 'assistant',
          text: "Forgive me, the audio wave has been interrupted. Let's try searching again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceAssistant = () => {
    setIsListening(true);
    // Simulate real speech to text listening
    setTimeout(() => {
      setIsListening(false);
      setInput("Recommend a majestic space ambient soundtrack");
    }, 2500);
  };

  // Extract song titles in reply for quick-play links
  const renderMessageText = (text: string) => {
    // Regex to match "Song Title" by Artist or Title - Artist
    return (
      <div className="space-y-2 leading-relaxed">
        <p className="whitespace-pre-wrap">{text}</p>
        
        {/* Dynamic Interactive Music Cards parsed from Gemini reply */}
        {text.includes('"') && (
          <div className="mt-2 flex flex-col space-y-1.5 border-t border-white/10 pt-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} className="text-purple-400" /> Inspired Suggestions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Parse track patterns: "Track Name" by Artist */}
              {Array.from(text.matchAll(/"([^"]+)"\s*(?:by|by\s+artist)?\s*([A-Za-z0-9\s,&.ft]+)/g))
                .slice(0, 3)
                .map((match, i) => {
                  const title = match[1];
                  const artist = match[2].split('\n')[0].trim();
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        // Quick search and play simulation
                        fetch(`/api/search?q=${encodeURIComponent(title + " " + artist)}`)
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.results && data.results.length > 0) {
                              onPlayTrack(data.results[0]);
                            }
                          });
                      }}
                      className={`flex items-center space-x-2 p-1.5 border rounded-xl transition text-left text-xs active:scale-95 ${
                        darkMode 
                          ? 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300' 
                          : 'bg-zinc-100 hover:bg-zinc-200/60 border-zinc-200/50 text-zinc-600 shadow-sm'
                      }`}
                    >
                      <div className="w-7 h-7 bg-purple-500/20 flex items-center justify-center rounded-lg flex-shrink-0">
                        <Music size={12} className="text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-zinc-800'}`}>{title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{artist}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="aura-ai-interface" className={`flex flex-col h-full ${darkMode ? 'bg-zinc-950/20 border-white/5 text-white' : 'bg-white/70 border-zinc-200 text-zinc-800'} rounded-3xl overflow-hidden border backdrop-blur-3xl`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-white/5 bg-black/35' : 'border-zinc-200 bg-zinc-50/50'} flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
            <img src="/osan-ai-logo.png" alt="Osan AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-zinc-800'} flex items-center gap-1.5`}>
              Osan AI <span className={`text-[9px] ${darkMode ? 'bg-white/10 text-zinc-400' : 'bg-zinc-200/80 text-zinc-600'} px-1.5 py-0.5 rounded-full font-normal uppercase tracking-wider`}>PRO</span>
            </h3>
          </div>
        </div>

        {currentTrack && (
          <div className={`hidden sm:flex items-center space-x-2 ${darkMode ? 'bg-white/5 text-zinc-300' : 'bg-zinc-100 text-zinc-700'} px-3 py-1.5 rounded-full text-xs`}>
            <Volume2 size={12} className="text-purple-400 animate-bounce" />
            <span className="truncate max-w-[120px] font-medium">{currentTrack.title}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin ${darkMode ? 'scrollbar-track-transparent scrollbar-thumb-zinc-800' : 'scrollbar-track-transparent scrollbar-thumb-zinc-300'}`}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md transition-all ${
                  msg.role === 'user'
                    ? (darkMode ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-zinc-200 text-zinc-800 rounded-tr-none')
                    : (darkMode 
                        ? 'bg-white/5 border border-white/10 text-zinc-100 rounded-tl-none backdrop-blur-xl' 
                        : 'bg-white border border-zinc-200/80 text-zinc-800 rounded-tl-none backdrop-blur-xl')
                }`}
              >
                {msg.role === 'assistant' ? renderMessageText(msg.text) : <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                <span className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1 block text-right`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className={`border rounded-2xl rounded-tl-none px-5 py-3 text-xs flex items-center space-x-3 shadow-md backdrop-blur-xl ${
                darkMode 
                  ? 'bg-white/5 border-white/10 text-zinc-300' 
                  : 'bg-white border-zinc-200 text-zinc-700'
              }`}>
                <Loader2 size={14} className="animate-spin text-rose-500" />
                <span className="animate-pulse tracking-wide font-medium">Osan AI is reading the musical waves...</span>
              </div>
            </motion.div>
          )}

          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-4"
            >
              <div className={`border px-6 py-3 rounded-full flex items-center space-x-4 shadow-lg ${
                darkMode 
                  ? 'bg-purple-900/40 border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] text-purple-200' 
                  : 'bg-purple-50 border-purple-200 shadow-[0_5px_15px_rgba(168,85,247,0.08)] text-purple-800'
              }`}>
                <div className="flex space-x-1.5 items-center">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <motion.div
                      key={b}
                      animate={{ height: [6, 24, 6] }}
                      transition={{ duration: 0.6 + b * 0.1, repeat: Infinity }}
                      className={`w-[3px] ${darkMode ? 'bg-purple-400' : 'bg-purple-600'} rounded-full`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest animate-pulse">Listening...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <div className={`p-4 border-t ${darkMode ? 'border-white/5 bg-black/45' : 'border-zinc-200 bg-zinc-50/50'} flex items-center space-x-2`}>
        <button
          onClick={startVoiceAssistant}
          title="Voice Search"
          className={`p-3 active:scale-90 transition rounded-xl ${
            darkMode 
              ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white' 
              : 'bg-zinc-100 hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-800 shadow-sm'
          }`}
        >
          <Mic size={16} className={isListening ? "text-purple-400 animate-ping" : ""} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
          placeholder="Ask Osan to recommend, curate, or analyze..."
          className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all ${
            darkMode 
              ? 'bg-white/5 border-white/10 text-white focus:border-purple-500 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-200 text-zinc-900 focus:border-purple-600 placeholder:text-zinc-400 shadow-inner'
          }`}
        />

        <button
          onClick={() => handleSendMessage(input)}
          className="p-3 rounded-xl transition text-white active:scale-90 shadow-md"
          style={{ backgroundColor: accentColor }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
