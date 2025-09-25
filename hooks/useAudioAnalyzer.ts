import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioData, PlaybackState, PlaybackControls } from '../types';

export const useAudioAnalyzer = (audioElementRef: React.RefObject<HTMLAudioElement>) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<AudioNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    
    const audioDataRef = useRef<AudioData>({
        bass: 0, mids: 0, treble: 0, overallEnergy: 0, normalizedPeak: 0
    });

    const [playbackState, setPlaybackState] = useState<PlaybackState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
    });

    // Fix: The ref's type must include `undefined` because it's initialized without a value.
    const animationFrameRef = useRef<number | undefined>();

    const setupAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                // FIX: Pass an empty options object to satisfy the constructor's type signature.
                audioContextRef.current = new AudioContext({});
            } else {
                console.error("AudioContext is not supported in this browser.");
                return;
            }
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (audioContextRef.current && !analyserRef.current) {
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            analyserRef.current.smoothingTimeConstant = 0.8;
        }
        if (audioContextRef.current && !gainNodeRef.current) {
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
        }
    }, []);

    const connectSource = useCallback((sourceNode: AudioNode) => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
        }
        sourceNodeRef.current = sourceNode;
        sourceNodeRef.current.connect(analyserRef.current!);
        sourceNodeRef.current.connect(gainNodeRef.current!);
    }, []);

    const initFileAnalyzer = useCallback(() => {
        setupAudioContext();
        if (!audioElementRef.current) return;

        // CRITICAL FIX: Create the MediaElementAudioSourceNode only ONCE.
        // Attempting to create it more than once throws an error, which was
        // causing the visualizer to go black when adding new songs.
        if (!mediaElementSourceRef.current) {
            try {
                const source = audioContextRef.current!.createMediaElementSource(audioElementRef.current);
                mediaElementSourceRef.current = source;
            } catch (e) {
                console.error("Error creating MediaElementAudioSourceNode:", e);
                return; // Can't proceed if this fails
            }
        }
        // Always ensure the file source is the one connected to the analyser.
        connectSource(mediaElementSourceRef.current);
    }, [setupAudioContext, connectSource, audioElementRef]);

    const initMicAnalyzer = useCallback(async () => {
        setupAudioContext();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            connectSource(source);
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    }, [setupAudioContext, connectSource]);
    
    const analyze = useCallback(() => {
        if (!analyserRef.current) {
            animationFrameRef.current = requestAnimationFrame(analyze);
            return;
        };

        const freqDataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqDataArray);
        
        const timeDomainDataArray = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(timeDomainDataArray);

        const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
            const result = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
            return Math.max(outMin, Math.min(outMax, result));
        };

        const getFrequencyRange = (startIndex: number, endIndex: number) => {
            let sum = 0;
            for (let i = startIndex; i <= endIndex; i++) {
                sum += freqDataArray[i];
            }
            return sum / (endIndex - startIndex + 1);
        };
        
        const bass = getFrequencyRange(0, 5);
        const mids = getFrequencyRange(20, 70);
        const treble = getFrequencyRange(150, 400);

        const normalizedBass = mapRange(bass, 0, 150, 0, 1);
        const normalizedMids = mapRange(mids, 0, 120, 0, 1);
        const normalizedTreble = mapRange(treble, 0, 100, 0, 1);
        const overallEnergy = (normalizedBass + normalizedMids + normalizedTreble) / 3;

        let peak = 0;
        for (let i = 0; i < timeDomainDataArray.length; i++) {
            const value = Math.abs(timeDomainDataArray[i] - 128);
            if (value > peak) peak = value;
        }
        const normalizedPeak = peak / 128.0;

        // CRITICAL FIX: Update ref instead of state to prevent re-renders
        audioDataRef.current = { bass: normalizedBass, mids: normalizedMids, treble: normalizedTreble, overallEnergy, normalizedPeak };
        
        animationFrameRef.current = requestAnimationFrame(analyze);
    }, []);

    useEffect(() => {
        analyze();
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [analyze]);

    useEffect(() => {
        const audioEl = audioElementRef.current;
        if (!audioEl) return;
        
        const updateState = () => {
            setPlaybackState(prev => ({
                ...prev,
                isPlaying: !audioEl.paused,
                currentTime: audioEl.currentTime,
                duration: audioEl.duration || 0,
            }));
        };

        audioEl.addEventListener('play', updateState);
        audioEl.addEventListener('pause', updateState);
        audioEl.addEventListener('timeupdate', updateState);
        audioEl.addEventListener('loadedmetadata', updateState);

        return () => {
            audioEl.removeEventListener('play', updateState);
            audioEl.removeEventListener('pause', updateState);
            audioEl.removeEventListener('timeupdate', updateState);
            audioEl.removeEventListener('loadedmetadata', updateState);
        };
    }, [audioElementRef]);
    
    const controls: PlaybackControls = {
        togglePlayPause: () => {
            const audioEl = audioElementRef.current;
            if (audioEl) {
                audioEl.paused ? audioEl.play() : audioEl.pause();
            }
        },
        stop: () => {
            const audioEl = audioElementRef.current;
            if(audioEl) {
                audioEl.pause();
                audioEl.currentTime = 0;
            }
        },
        seek: (time) => {
            const audioEl = audioElementRef.current;
            if(audioEl && isFinite(time)) {
                audioEl.currentTime = time;
            }
        },
        setVolume: (volume) => {
            if (gainNodeRef.current) {
                gainNodeRef.current.gain.value = volume;
            }
            setPlaybackState(prev => ({ ...prev, volume }));
        }
    };
    
    return { audioDataRef, initFileAnalyzer, initMicAnalyzer, playbackState, controls };
};