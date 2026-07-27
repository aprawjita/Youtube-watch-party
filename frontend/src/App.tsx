import { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { useWebSocket } from './hooks/useWebSocket';
import { Users, MessageSquare, Play, Pause, MonitorPlay, Shield, X, Smile, Crown, VolumeX, Volume2 } from 'lucide-react';

const parseYouTubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url; 
};

function App() {
    const [inRoom, setInRoom] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [currentVideoId, setCurrentVideoId] = useState('');
    const [videoInput, setVideoInput] = useState('');
    const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
    
    // RESTORED: Simple state for player to guarantee React reactivity
    const [player, setPlayer] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [floatingEmojis, setFloatingEmojis] = useState<{id: number, emoji: string, left: number}[]>([]);
    
    const lastTimeRef = useRef<number>(0);

    const { participants, action, sendAction, assignRole, kickUser, syncVideo, kicked, syncData } = useWebSocket(
        inRoom ? roomId : '',
        inRoom ? username : ''
    );

    const safeParticipants = participants || [];
    const currentUser = safeParticipants.find((p: any) => p?.username === username);
    const isHost = currentUser?.role === 'Host';
    const isMod = currentUser?.role === 'Moderator';
    const hasVideoControl = isHost || isMod;

    useEffect(() => {
        if (kicked) {
            setInRoom(false); setRoomId('');
            alert("You have been removed from the room by the Host.");
        }
    }, [kicked]);

    const spawnEmoji = useCallback((emoji: string) => {
        const newEmoji = { id: Date.now() + Math.random(), emoji, left: Math.random() * 80 + 10 };
        setFloatingEmojis((prev) => [...prev, newEmoji]);
        setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id)), 2500); 
    }, []);

    // ==========================================
    // 1. LIVE ACTION LISTENER (Instant playback)
    // ==========================================
    useEffect(() => {
        if (!action) return;

        if (action.type === 'CHAT') {
            if (action.isEmoji && action.username !== username) spawnEmoji(action.message);
            else if (!action.isEmoji) setMessages((prev) => [...prev, { sender: action.username, text: action.message }]);
            return;
        }

        console.log(`[PARTICIPANT] Received socket action:`, action);

        if (action.type === 'CHANGE_VIDEO' && action.videoId) {
            setCurrentVideoId(action.videoId);
        }

        if (!hasVideoControl && player) {
            console.log(`[PARTICIPANT] Applying event ${action.type} to player`);
            if (action.type === 'PLAY') {
                if (typeof action.time === 'number') player.seekTo(action.time, true);
                player.playVideo();
            } else if (action.type === 'PAUSE') {
                if (typeof action.time === 'number') player.seekTo(action.time, true);
                player.pauseVideo();
            } else if (action.type === 'SEEK') {
                if (typeof action.time === 'number') player.seekTo(action.time, true);
            }
        }
    }, [action, player, hasVideoControl, username, spawnEmoji]);

    // ==========================================
    // 2. BACKGROUND SYNC (Late Joiners)
    // ==========================================
    useEffect(() => {
        if (hasVideoControl || !syncData) return;

        // Ensure late joiner loads the video ID
        if (syncData.videoId && syncData.videoId !== currentVideoId) {
            console.log(`[PARTICIPANT] Late Joiner syncData received. Loading video: ${syncData.videoId}`);
            setCurrentVideoId(syncData.videoId);
            return; // Wait for iframe to load and set the 'player' state
        }

        // Apply background drift correction
        if (player && typeof player.getPlayerState === 'function') {
            const localTime = player.getCurrentTime() || 0;
            const localState = player.getPlayerState();

            if (Math.abs(localTime - syncData.currentTime) > 2 && localState !== 3) {
                console.log(`[PARTICIPANT] Sync correction: seeking to ${syncData.currentTime}`);
                player.seekTo(syncData.currentTime, true);
            }

            if (syncData.playState === 'PLAYING' && localState !== 1 && localState !== 3) {
                console.log(`[PARTICIPANT] Sync correction: applying play()`);
                player.playVideo();
            } else if (syncData.playState === 'PAUSED' && localState === 1) {
                console.log(`[PARTICIPANT] Sync correction: applying pause()`);
                player.pauseVideo();
            }
        }
    }, [syncData, player, hasVideoControl, currentVideoId]);

    // ==========================================
    // 3. HOST: NATIVE EVENT EMITTERS
    // ==========================================
    const handlePlayerStateChange = (event: any) => {
        if (!hasVideoControl || !player) return;
        
        const time = player.getCurrentTime() || 0;
        if (event.data === 1) {
            console.log(`[HOST] Native play detected. Emitting PLAY at ${time}`);
            sendAction({ type: 'PLAY', roomId, username, time });
        } else if (event.data === 2) {
            console.log(`[HOST] Native pause detected. Emitting PAUSE at ${time}`);
            sendAction({ type: 'PAUSE', roomId, username, time });
        }
    };

    // HOST CONTINUOUS HEARTBEAT
    useEffect(() => {
        if (!hasVideoControl || !player || !currentVideoId) return;

        const interval = setInterval(() => {
            if (typeof player.getCurrentTime === 'function') {
                const currentTime = player.getCurrentTime() || 0;
                const currentState = player.getPlayerState();
                
                // Scrubbing/Seek detection
                if (Math.abs(currentTime - lastTimeRef.current) > 1.5 && currentState !== 3) {
                    console.log(`[HOST] Timeline scrub detected. Emitting SEEK at ${currentTime}`);
                    sendAction({ type: 'SEEK', time: currentTime, roomId, username });
                }
                lastTimeRef.current = currentTime;

                syncVideo({
                    roomId,
                    videoId: currentVideoId,
                    currentTime: currentTime,
                    playState: currentState === 1 ? 'PLAYING' : 'PAUSED'
                });
            }
        }, 1000); 
        return () => clearInterval(interval);
    }, [player, hasVideoControl, currentVideoId, roomId, username, sendAction, syncVideo]);

    const handlePlayPause = (willPlay: boolean) => {
        if (!hasVideoControl || !player) return;
        if (willPlay) player.playVideo();
        else player.pauseVideo();
    };

    const handleVideoChange = () => {
        if (videoInput.trim() && hasVideoControl) {
            const cleanId = parseYouTubeId(videoInput.trim());
            setCurrentVideoId(cleanId);
            sendAction({ type: 'CHANGE_VIDEO', videoId: cleanId, roomId, username });
            setVideoInput('');
        }
    };

    const toggleMute = () => {
        if (player) {
            if (isMuted) player.unMute();
            else player.mute();
            setIsMuted(!isMuted);
        }
    };

    const sendUserEmoji = (emoji: string) => {
        sendAction({ type: 'CHAT', message: emoji, isEmoji: true, username, roomId });
        spawnEmoji(emoji); 
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim() && username.trim()) {
            setInRoom(true);
        }
    };

    if (!inRoom) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
                <form onSubmit={handleJoin} className="bg-[#141414] p-8 rounded-2xl w-96 flex flex-col gap-6 shadow-2xl border border-gray-800">
                    <h1 className="text-2xl font-bold text-center text-purple-500">Join Watch Party</h1>
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition-colors" required />
                    <input type="text" placeholder="Room Code" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition-colors" required />
                    <button type="submit" className="bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20">Enter Room</button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 font-sans">
            <style>{`
                @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-300px) scale(3.5); opacity: 0; } }
                .emoji-float { animation: floatUp 2.5s ease-out forwards; position: absolute; bottom: 15%; pointer-events: none; z-index: 60; font-size: 2.5rem; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5)); }
            `}</style>
            
            <div className="flex-1 flex flex-col p-6 gap-6 relative">
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-[#000000] relative border border-gray-800">
                    
                    {(floatingEmojis || []).map(e => (
                        <div key={e.id} className="emoji-float" style={{ left: `${e.left}%` }}>{e.emoji}</div>
                    ))}

                    {currentVideoId ? (
                        <>
                            <YouTube
                                videoId={currentVideoId}
                                onReady={(e) => {
                                    console.log(`[PLAYER] Player iframe loaded.`);
                                    setPlayer(e.target);
                                    if (hasVideoControl) {
                                        e.target.unMute();
                                        setIsMuted(false);
                                    }
                                }}
                                onStateChange={handlePlayerStateChange}
                                opts={{
                                    width: '100%', height: '100%',
                                    playerVars: {
                                        autoplay: 1,
                                        controls: hasVideoControl ? 1 : 0, 
                                        disablekb: hasVideoControl ? 0 : 1,
                                        modestbranding: 1, rel: 0,
                                        mute: hasVideoControl ? 0 : 1 // CRITICAL: Forces mute on participants so browser allows autoplay
                                    }
                                }}
                                className="absolute inset-0 w-full h-full"
                                iframeClassName="w-full h-full"
                            />
                            
                            {!hasVideoControl && (
                                <div className="absolute inset-0 z-40 bg-transparent cursor-not-allowed" />
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[#050505]">
                            <MonitorPlay size={64} className="mb-4 opacity-30" />
                            <p className="text-xl font-medium text-gray-400">Waiting for Host to start a video...</p>
                        </div>
                    )}
                </div>

                <div className="bg-[#141414] border border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
                    <div className="flex gap-4 items-center">
                        <button onClick={() => handlePlayPause(true)} disabled={!hasVideoControl || !currentVideoId} className={`p-3 rounded-full ${hasVideoControl && currentVideoId ? 'bg-purple-600 text-white hover:scale-105 shadow-md shadow-purple-900/30' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'} transition-all`}><Play size={24} /></button>
                        <button onClick={() => handlePlayPause(false)} disabled={!hasVideoControl || !currentVideoId} className={`p-3 rounded-full ${hasVideoControl && currentVideoId ? 'bg-purple-600 text-white hover:scale-105 shadow-md shadow-purple-900/30' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'} transition-all`}><Pause size={24} /></button>
                        <button onClick={toggleMute} disabled={!currentVideoId} className={`p-3 ml-4 rounded-full ${currentVideoId ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'} transition-all`} title={isMuted ? "Unmute Audio" : "Mute Audio"}>
                            {isMuted ? <VolumeX size={20} className="text-red-400"/> : <Volume2 size={20} className="text-green-400"/>}
                        </button>
                    </div>
                    {hasVideoControl && (
                        <div className="flex gap-2">
                            <input type="text" placeholder="Paste YouTube URL or ID..." value={videoInput} onChange={(e) => setVideoInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleVideoChange(); }} className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-purple-500 w-64 transition-colors" />
                            <button onClick={handleVideoChange} className="bg-purple-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-purple-700 transition-all shadow-md shadow-purple-900/30">Start</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-80 bg-[#141414] flex flex-col h-full border-l border-gray-800 shadow-2xl relative z-10">
                <div className="p-5 border-b border-gray-800 flex items-center gap-3">
                    <Users className="text-purple-500" size={20} />
                    <h2 className="font-semibold text-gray-200">Room: {roomId}</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {safeParticipants.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-colors">
                            <span className="font-medium text-sm text-gray-200">{p?.username}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${p?.role === 'Host' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : p?.role === 'Moderator' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-gray-800 text-gray-400'}`}>
                                    {p?.role}
                                </span>
                                {isHost && p?.username !== username && (
                                    <div className="flex gap-1 ml-1">
                                        <button onClick={() => assignRole(p.username, 'Host')} className="p-1.5 hover:bg-yellow-500/10 rounded-lg text-yellow-500 transition-colors" title="Transfer Host"><Crown size={14} /></button>
                                        {p?.role !== 'Moderator' && <button onClick={() => assignRole(p.username, 'Moderator')} className="p-1.5 hover:bg-gray-800 rounded-lg text-blue-400 transition-colors" title="Make Moderator"><Shield size={14} /></button>}
                                        {p?.role === 'Moderator' && <button onClick={() => assignRole(p.username, 'Participant')} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 transition-colors" title="Remove Moderator"><Shield size={14} /></button>}
                                        <button onClick={() => kickUser(p.username)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors" title="Kick User"><X size={14} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-[22rem] border-t border-gray-800 flex flex-col bg-[#111111]">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#141414]">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="text-purple-500" size={18} />
                            <h2 className="font-semibold text-gray-200 text-sm">Room Chat</h2>
                        </div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto text-sm">
                        {(messages || []).map((msg: any, i: number) => (
                            <div key={i} className="bg-[#1a1a1a] p-2.5 rounded-lg border border-gray-800/50 break-words shadow-sm">
                                <span className="font-bold text-purple-400 mr-2 text-xs">{msg?.sender}</span>
                                <span className="text-gray-300 leading-relaxed">{msg?.text}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-[#141414] border-t border-gray-800 relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-16 left-4 bg-[#1a1a1a] border border-gray-700 p-2 rounded-xl grid grid-cols-4 gap-2 shadow-2xl z-20">
                                {['❤️', '🔥', '😂', '👍', '🎉', '😮', '😢', '🚀'].map((emoji) => (
                                    <button key={emoji} onClick={() => sendUserEmoji(emoji)} className="text-xl p-2 hover:bg-gray-800 rounded-lg transition-colors">{emoji}</button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2.5 bg-[#0a0a0a] border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors"><Smile size={18} /></button>
                            <input type="text" placeholder="Type a message..." className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500 text-sm transition-colors" onKeyDown={(e) => { if (e.key === 'Enter') { const t = e.target as HTMLInputElement; if (t.value.trim()) { sendAction({ type: 'CHAT', message: t.value.trim(), username, roomId }); t.value = ''; } } }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;