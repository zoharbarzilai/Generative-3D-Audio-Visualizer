import React, { useState, useRef } from 'react';
import type { Settings, PlaylistTrack, PlaybackState, PlaybackControls } from '../types';
import { PALETTES } from '../constants';

// --- SVG Icons ---
const PlayIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M8 5v14l11-7z"></path></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 6h12v12H6z"></path></svg>;
const PrevIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>;
const NextIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>;
const VolumeIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>;
const SettingsIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>
const CloseIcon = () => <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>;
const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 fill-current transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>
    </svg>
);

interface UIProps {
    isInitialized: boolean;
    audioSourceType: 'file' | 'mic' | null;
    micError: string | null;
    onFileSelectClick: () => void;
    onMicSelectClick: () => void;
    onAddFileClick: () => void;
    playbackState: PlaybackState;
    playbackControls: PlaybackControls;
    playlist: PlaylistTrack[];
    currentTrackIndex: number;
    onPlayTrack: (index: number) => void;
    onPlayNext: () => void;
    onPlayPrev: () => void;
    onRemoveTrack: (index: number) => void;
    onReorderPlaylist: (dragIndex: number, dropIndex: number) => void;
    settings: Settings;
    onSettingsChange: (settings: Settings) => void;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const UI: React.FC<UIProps> = (props) => {
    const { isInitialized, audioSourceType, micError, onFileSelectClick, onMicSelectClick, onAddFileClick } = props;
    const { playlist, currentTrackIndex, onPlayTrack, onPlayNext, onPlayPrev, onRemoveTrack, onReorderPlaylist } = props;
    const { playbackState, playbackControls } = props;
    const { settings, onSettingsChange } = props;
    const [isPlaylistVisible, setPlaylistVisible] = useState(true);
    const [isSettingsVisible, setSettingsVisible] = useState(false);

    const dragItemIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleSettingChange = <K extends keyof Settings,>(key: K, value: Settings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItemIndex.current = index;
        e.currentTarget.classList.add('opacity-40');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
    };

    const handleDrop = (index: number) => {
        if (dragItemIndex.current === null || dragItemIndex.current === index) return;
        onReorderPlaylist(dragItemIndex.current, index);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
        e.currentTarget.classList.remove('opacity-40');
        dragItemIndex.current = null;
        setDragOverIndex(null);
    };

    return (
        <>
            {/* Initial Prompt */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/75 backdrop-blur-sm p-8 sm:p-12 rounded-lg border border-dark-3 text-center transition-opacity duration-500 ${isInitialized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <p className="mb-6 text-lg">Choose an audio source to begin</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={onFileSelectClick} className="px-6 py-3 bg-dark-2 border border-dark-4 rounded-md hover:bg-brand-blue hover:border-brand-blue transition-colors">Upload Audio File(s)</button>
                    <button onClick={onMicSelectClick} className="px-6 py-3 bg-dark-2 border border-dark-4 rounded-md hover:bg-brand-blue hover:border-brand-blue transition-colors">Use Microphone</button>
                </div>
                {micError && <p className="mt-4 text-red-500">{micError}</p>}
            </div>

            {/* Controls Info */}
            <div className="absolute bottom-4 left-4 z-40 bg-black/50 backdrop-blur-sm p-3 rounded-lg border border-dark-3 text-xs text-light-2 pointer-events-none hidden md:block">
                <p className="font-bold">Navigate</p>
                <p><b>Zoom:</b> Scroll Wheel</p>
                <p><b>Pan:</b> Right-Click + Drag</p>
                <p><b>Rotate:</b> Left-Click + Drag</p>
            </div>
            
            {/* Settings Button */}
            <button onClick={() => setSettingsVisible(!isSettingsVisible)} className="absolute top-4 right-4 z-50 text-light-2 hover:text-white transition-colors p-2 bg-black/50 backdrop-blur-sm rounded-full border border-dark-3" title="Settings">
                <SettingsIcon />
            </button>

            {/* Playback Controls */}
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-dark-3 transition-opacity duration-300 ${audioSourceType === 'file' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={onPlayPrev} className="p-2 text-light-2 hover:text-white transition-colors"><PrevIcon /></button>
                <button onClick={playbackControls.togglePlayPause} className="p-2 text-light-2 hover:text-white transition-colors">{playbackState.isPlaying ? <PauseIcon/> : <PlayIcon/>}</button>
                <button onClick={playbackControls.stop} className="p-2 text-light-2 hover:text-white transition-colors"><StopIcon /></button>
                <button onClick={onPlayNext} className="p-2 text-light-2 hover:text-white transition-colors"><NextIcon /></button>
                <div className="flex items-center gap-3 text-xs text-light-2 mx-2">
                    <span>{formatTime(playbackState.currentTime)}</span>
                    <input type="range" min="0" max={playbackState.duration} value={playbackState.currentTime} step="1" onChange={(e) => playbackControls.seek(parseFloat(e.target.value))} className="w-32 sm:w-64 h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-light-2" />
                    <span>{formatTime(playbackState.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <VolumeIcon />
                    <input type="range" min="0" max="1" value={playbackState.volume} step="0.01" onChange={(e) => playbackControls.setVolume(parseFloat(e.target.value))} className="w-16 sm:w-24 h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-light-2" title="Volume"/>
                </div>
            </div>

            {/* Playlist */}
            <div className={`absolute top-4 left-4 z-50 w-80 bg-black/50 backdrop-blur-sm rounded-lg border border-dark-3 overflow-hidden transition-opacity duration-300 ${audioSourceType === 'file' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="p-3 font-bold bg-black/75 border-b border-dark-3 flex justify-between items-center">
                    <div onClick={() => setPlaylistVisible(!isPlaylistVisible)} className="flex items-center gap-2 cursor-pointer select-none">
                        <span>Playlist</span>
                        <ChevronIcon open={isPlaylistVisible} />
                    </div>
                    <button onClick={onAddFileClick} className="w-6 h-6 rounded-full bg-dark-3 text-light-1 flex items-center justify-center text-lg hover:bg-brand-blue transition-colors" title="Add Song(s)">+</button>
                </div>
                <ul className={`list-none p-0 m-0 overflow-y-auto transition-all duration-300 ease-in-out ${isPlaylistVisible ? 'max-h-[calc(40vh-45px)]' : 'max-h-0'}`}>
                    {playlist.map((track, index) => (
                        <li 
                            key={track.url} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                            onDragEnd={handleDragEnd}
                            className={`px-4 py-2 cursor-grab border-b border-dark-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-colors group flex justify-between items-center relative ${index === currentTrackIndex ? 'bg-brand-blue text-white' : 'hover:bg-dark-3'}`}>
                            
                            <div className={`absolute top-0 left-0 h-full bg-brand-cyan transition-all duration-200 ${dragOverIndex === index ? 'w-1' : 'w-0'}`}></div>

                            <span onClick={() => onPlayTrack(index)} className="flex-grow cursor-pointer pr-2">
                                {track.name}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveTrack(index); }} 
                                className="p-1 rounded-full text-light-2 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove track"
                            >
                                <TrashIcon />
                            </button>
                        </li>
                    ))}
                     {playlist.length === 0 && (
                        <li className="px-4 py-3 text-center text-sm text-light-2">Playlist is empty.</li>
                    )}
                </ul>
            </div>
            
            {/* Settings Panel */}
            <div className={`absolute top-0 right-0 z-[60] w-80 h-full bg-dark-1/90 backdrop-blur-md p-4 border-l border-dark-3 transition-transform duration-300 ease-in-out ${isSettingsVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={() => setSettingsVisible(false)} className="text-light-2 hover:text-white"><CloseIcon/></button>
                </div>
                <div className="space-y-4 text-sm">
                    <div className="space-y-2">
                        <label htmlFor="colorPalette">Color Palette</label>
                        <select id="colorPalette" value={settings.colorPalette} onChange={(e) => handleSettingChange('colorPalette', e.target.value as any)} className="w-full p-2 bg-dark-3 border border-dark-4 rounded">
                            {Object.keys(PALETTES).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                     <div className="space-y-2">
                        <label htmlFor="distortionIntensity" className="flex justify-between"><span>Distortion</span> <span>{settings.distortionIntensity.toFixed(2)}</span></label>
                        <input id="distortionIntensity" type="range" min="0" max="2" step="0.01" value={settings.distortionIntensity} onChange={e => handleSettingChange('distortionIntensity', parseFloat(e.target.value))} className="w-full h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue" />
                    </div>
                     <div className="space-y-2">
                        <label htmlFor="organicMotion" className="flex justify-between"><span>Organic Motion</span> <span>{settings.organicMotion.toFixed(2)}</span></label>
                        <input id="organicMotion" type="range" min="0.01" max="1" step="0.01" value={settings.organicMotion} onChange={e => handleSettingChange('organicMotion', parseFloat(e.target.value))} className="w-full h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="bloomIntensity" className="flex justify-between"><span>Bloom</span> <span>{settings.bloomIntensity.toFixed(2)}</span></label>
                        <input id="bloomIntensity" type="range" min="0" max="3" step="0.01" value={settings.bloomIntensity} onChange={e => handleSettingChange('bloomIntensity', parseFloat(e.target.value))} className="w-full h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="autoRotateSpeed" className="flex justify-between"><span>Rotation Speed</span> <span>{settings.autoRotateSpeed.toFixed(2)}</span></label>
                        <input id="autoRotateSpeed" type="range" min="0" max="10" step="0.01" value={settings.autoRotateSpeed} onChange={e => handleSettingChange('autoRotateSpeed', parseFloat(e.target.value))} className="w-full h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="pumpSensitivity" className="flex justify-between"><span>Pump Sensitivity</span> <span>{settings.pumpSensitivity.toFixed(2)}</span></label>
                        <input id="pumpSensitivity" type="range" min="0" max="3" step="0.01" value={settings.pumpSensitivity} onChange={e => handleSettingChange('pumpSensitivity', parseFloat(e.target.value))} className="w-full h-1 bg-dark-4 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue" />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="showStarfield">Show Starfield</label>
                        <button onClick={() => handleSettingChange('showStarfield', !settings.showStarfield)} className={`w-12 h-6 rounded-full flex items-center transition-colors ${settings.showStarfield ? 'bg-brand-blue' : 'bg-dark-3'}`}>
                             <span className={`w-5 h-5 bg-white rounded-full transform transition-transform ${settings.showStarfield ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UI;