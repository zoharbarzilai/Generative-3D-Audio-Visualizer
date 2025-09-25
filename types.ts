
import type { Color } from 'three';

export interface Settings {
    colorPalette: 'Synthwave' | 'Oceanic' | 'Magma' | 'Forest';
    distortionIntensity: number;
    organicMotion: number;
    showStarfield: boolean;
    bloomIntensity: number;
    autoRotateSpeed: number;
    pumpSensitivity: number;
}

export interface Palette {
    bass: Color;
    mid: Color;
    high: Color;
}

export interface Palettes {
    [key: string]: Palette;
}

export interface PlaylistTrack {
    name: string;
    url: string;
}

export interface AudioData {
    bass: number;
    mids: number;
    treble: number;
    overallEnergy: number;
    normalizedPeak: number;
}

export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
}

export interface PlaybackControls {
    togglePlayPause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
}
