
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Visualizer from './components/Visualizer';
import UI from './components/UI';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import type { Settings, PlaylistTrack } from './types';
import { PALETTES } from './constants';

const App: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({
        colorPalette: 'Synthwave',
        distortionIntensity: 0.75,
        organicMotion: 0.25,
        showStarfield: true,
        bloomIntensity: 0.25,
        autoRotateSpeed: 2.5,
        pumpSensitivity: 1.0,
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [audioSourceType, setAudioSourceType] = useState<'file' | 'mic' | null>(null);
    const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
    const [micError, setMicError] = useState<string | null>(null);

    const [audioElement] = useState(() => new Audio());
    const audioElementRef = useRef(audioElement);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const addFileInputRef = useRef<HTMLInputElement>(null);

    const { 
        audioDataRef, 
        initFileAnalyzer, 
        initMicAnalyzer, 
        playbackState,
        controls 
    } = useAudioAnalyzer(audioElementRef);

    const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        playlist.forEach(track => URL.revokeObjectURL(track.url));
        const newPlaylist = Array.from(files).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file)
        }));

        setPlaylist(newPlaylist);
        setCurrentTrackIndex(0);
        setAudioSourceType('file');
        setIsInitialized(true);
    }, [playlist]);

    const handleAddFiles = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newTracks = Array.from(files).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file)
        }));
        
        setPlaylist(prev => [...prev, ...newTracks]);
        
        if (currentTrackIndex === -1 && newTracks.length > 0) {
            setCurrentTrackIndex(playlist.length);
        }

        if (event.target) {
            event.target.value = '';
        }
    }, [playlist, currentTrackIndex]);

    const handleMicSelect = useCallback(async () => {
        try {
            await initMicAnalyzer();
            setAudioSourceType('mic');
            setIsInitialized(true);
            setMicError(null);
        } catch (err) {
            console.error('Microphone access denied:', err);
            setMicError('Microphone access was denied. Please check your browser and system permissions.');
        }
    }, [initMicAnalyzer]);

    const playTrack = useCallback((index: number) => {
        if (index < 0 || index >= playlist.length) return;
        setCurrentTrackIndex(index);
    }, [playlist.length]);

    const playNextTrack = useCallback(() => {
        if (playlist.length === 0) return;
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        playTrack(nextIndex);
    }, [currentTrackIndex, playlist.length, playTrack]);
    
    const playPrevTrack = useCallback(() => {
        if (playlist.length === 0) return;
        const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        playTrack(prevIndex);
    }, [currentTrackIndex, playlist.length, playTrack]);

    const handleRemoveTrack = useCallback((indexToRemove: number) => {
        const trackToRemove = playlist[indexToRemove];
        if (!trackToRemove) return;

        URL.revokeObjectURL(trackToRemove.url);

        const newPlaylist = playlist.filter((_, index) => index !== indexToRemove);
        let newCurrentTrackIndex = currentTrackIndex;

        if (indexToRemove === currentTrackIndex) {
            const audioEl = audioElementRef.current;
            if (newPlaylist.length === 0) {
                if (audioEl) {
                    audioEl.pause();
                    audioEl.src = '';
                }
                newCurrentTrackIndex = -1;
            } else {
                // Stay at the same index, which is now the next song.
                // If it was the last song, move to the new last song.
                newCurrentTrackIndex = Math.min(currentTrackIndex, newPlaylist.length - 1);
            }
        } else if (indexToRemove < currentTrackIndex) {
            newCurrentTrackIndex = currentTrackIndex - 1;
        }
        
        setPlaylist(newPlaylist);
        // We set a new index, which will trigger the useEffect for playback.
        setCurrentTrackIndex(newCurrentTrackIndex);

    }, [playlist, currentTrackIndex, audioElementRef]);

    const handleReorderPlaylist = useCallback((dragIndex: number, dropIndex: number) => {
        if (dragIndex === dropIndex) return;
        
        const currentTrack = currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;

        const newPlaylist = [...playlist];
        const [draggedItem] = newPlaylist.splice(dragIndex, 1);
        newPlaylist.splice(dropIndex, 0, draggedItem);
        
        setPlaylist(newPlaylist);

        if (currentTrack) {
            const newIndex = newPlaylist.findIndex(track => track.url === currentTrack.url);
            setCurrentTrackIndex(newIndex);
        }
    }, [playlist, currentTrackIndex]);


    useEffect(() => {
        const audioEl = audioElement;
        // Check if the source type is file and we have a valid track.
        if (audioSourceType === 'file' && currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
            const newSrc = playlist[currentTrackIndex].url;
            // Only update src if it's different to prevent re-loading
            if (audioEl.src !== newSrc) {
                audioEl.src = newSrc;
                audioEl.load(); // Explicitly load the new source
                audioEl.play().catch(e => console.error("Audio playback failed:", e));
            }
            initFileAnalyzer();
        } else if (audioSourceType === 'file' && playlist.length === 0) {
            // Stop playback if playlist is empty
            audioEl.pause();
            audioEl.src = '';
        }
        
        const handleEnded = () => playNextTrack();
        audioEl.addEventListener('ended', handleEnded);
        return () => {
            audioEl.removeEventListener('ended', handleEnded);
        };

    }, [currentTrackIndex, playlist, audioSourceType, initFileAnalyzer, playNextTrack, audioElement]);

    return (
        <div className="w-screen h-screen overflow-hidden bg-black">
            <Visualizer 
                audioDataRef={audioDataRef} 
                settings={settings}
                palette={PALETTES[settings.colorPalette]}
            />
            <UI
                isInitialized={isInitialized}
                audioSourceType={audioSourceType}
                micError={micError}
                onFileSelectClick={() => fileInputRef.current?.click()}
                onMicSelectClick={handleMicSelect}
                onAddFileClick={() => addFileInputRef.current?.click()}
                playbackState={playbackState}
                playbackControls={controls}
                playlist={playlist}
                currentTrackIndex={currentTrackIndex}
                onPlayTrack={playTrack}
                onPlayNext={playNextTrack}
                onPlayPrev={playPrevTrack}
                onRemoveTrack={handleRemoveTrack}
                onReorderPlaylist={handleReorderPlaylist}
                settings={settings}
                onSettingsChange={setSettings}
            />
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="audio/*"
                multiple
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={addFileInputRef}
                onChange={handleAddFiles}
                accept="audio/*"
                multiple
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default App;
