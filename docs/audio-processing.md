# Audio Processing with Web Audio API

This document details how the application uses the Web Audio API to capture, analyze, and control audio from both file and microphone sources. This logic is encapsulated within the `useAudioAnalyzer` custom hook.

## Core Concepts

The Web Audio API allows for advanced audio operations within the browser. We use a simple graph of **Audio Nodes** to process the sound.

**Our Audio Graph:**

`Source Node` -> `AnalyserNode` -> `GainNode` -> `Destination (Speakers)`

*   **Source Node**: This is the origin of the audio. It can be a `<audio>` element (`MediaElementAudioSourceNode`) or a microphone stream (`MediaStreamAudioSourceNode`).
*   **AnalyserNode**: This is the powerhouse of the visualizer. It doesn't alter the sound, but it provides methods to capture real-time frequency and time-domain data.
*   **GainNode**: This node controls the volume of the audio before it reaches the speakers. It's connected to our volume slider.
*   **Destination**: This is the final output, typically your computer's speakers.

## Initialization and Context

1.  **`AudioContext`**: The first step is to create an `AudioContext`. A single context is created and reused throughout the application's lifecycle. We include a robust `try/catch` block to handle inconsistencies in how different browsers instantiate the context (some require an options object, older ones do not). The context is resumed if it's in a `suspended` state, which can happen if it's created before any user interaction.
2.  **`AnalyserNode` Setup**: An `AnalyserNode` is created with specific properties:
    *   `fftSize`: The Fast Fourier Transform size. A value of `2048` provides a good balance between performance and frequency resolution.
    *   `smoothingTimeConstant`: A value from 0 to 1 that averages the analysis data over time. `0.8` provides a smooth but still responsive output.

## Source Handling

The hook can switch between two types of audio sources.

### File Analysis (`initFileAnalyzer`)

*   This function is called when using local audio files.
*   It creates a `MediaElementAudioSourceNode` from the `<audio>` element passed in via a `ref`.
*   **Crucial Optimization**: The `MediaElementAudioSourceNode` for a given `<audio>` element can only be created **once**. The hook caches this node in a `ref` (`mediaElementSourceRef`) to prevent errors when the playlist changes or new songs are added.
*   The source node is then connected to our analysis graph.

### Microphone Analysis (`initMicAnalyzer`)

*   This function uses `navigator.mediaDevices.getUserMedia({ audio: true })` to request microphone access from the user.
*   If access is granted, it creates a `MediaStreamAudioSourceNode` from the incoming audio stream.
*   This source node is then connected to the analysis graph.

## The Analysis Loop (`analyze` function)

This function runs inside a `requestAnimationFrame` loop, executing on every frame to provide real-time data to the `Visualizer`.

1.  **Get Frequency Data**: It calls `analyserRef.current.getByteFrequencyData()`. This fills a `Uint8Array` with integer values (from 0 to 255) representing the volume of each frequency band, from low (bass) to high (treble).
2.  **Calculate Frequency Ranges**: The large frequency array is simplified into three key metrics:
    *   **Bass**: The average value of the first few frequency bins.
    *   **Mids**: The average value of a range of bins in the middle of the spectrum.
    *   **Treble**: The average value of a higher range of bins.
3.  **Normalization**: These raw values are then normalized to a `0-1` range using a `mapRange` function. The input ranges (e.g., `0-150` for bass) were determined through empirical testing to provide a good dynamic range.
4.  **Get Peak Data**: It also calls `analyserRef.current.getByteTimeDomainData()` to get waveform data. It calculates the peak amplitude in the current buffer, which is useful for detecting sharp transients like drum hits.
5.  **Update `audioDataRef`**: The final calculated values (`bass`, `mids`, `treble`, `overallEnergy`, `normalizedPeak`) are stored in `audioDataRef.current`. Using a `ref` here is a key performance optimization: it allows the `Visualizer` to access the latest data on every animation frame without causing any React re-renders.

## Playback Control

The hook also provides state and controls for file playback.

*   **State (`playbackState`)**: It listens to events on the `<audio>` element (`play`, `pause`, `timeupdate`, `loadedmetadata`) to keep a React state object updated with the current `isPlaying` status, `currentTime`, and `duration`. This state is used to drive the UI.
*   **Controls (`controls`)**: It exposes a `controls` object with functions (`togglePlayPause`, `stop`, `seek`, `setVolume`) that programmatically control the `<audio>` element or the `GainNode` for volume. This decouples the UI components from direct manipulation of the audio element.
