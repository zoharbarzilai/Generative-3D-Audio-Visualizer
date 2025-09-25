# Application Architecture

This document outlines the high-level architecture of the Generative 3D Audio Visualizer, explaining the roles of the key components and how they interact.

## Core Components

The application is built around a few key React components and a custom hook that encapsulates the audio processing logic.

### `App.tsx` - The Main Controller

This is the top-level component that acts as the application's orchestrator. Its primary responsibilities are:

*   **State Management**: It holds and manages the global application state, including:
    *   `settings`: The current visualizer settings (color palette, distortion, etc.).
    *   `playlist`: The list of audio tracks.
    *   `currentTrackIndex`: The index of the currently playing track.
    *   `audioSourceType`: Whether the audio is from a 'file' or 'mic'.
*   **Event Handling**: It contains the logic for handling user interactions, such as file selection, microphone activation, and playlist management (adding, removing, reordering tracks).
*   **Component Composition**: It renders the `Visualizer` and `UI` components, passing down the necessary state and callbacks as props.
*   **Audio Element Management**: It creates and manages the `<audio>` element used for file playback.

### `components/UI.tsx` - The User Interface

This component is responsible for rendering all the interactive UI elements of the application. It is a "dumb" component that receives state and event handlers from `App.tsx`.

*   **Initial Prompt**: Displays the initial choice between file and microphone input.
*   **Playback Controls**: Renders the player controls (play, pause, next, previous, seek bar, volume). This section is only visible when using file-based audio.
*   **Playlist**: Displays the list of loaded audio tracks, handles track selection, removal, and drag-and-drop reordering.
*   **Settings Panel**: A slide-out panel that allows users to customize the visual parameters of the experience.
*   **State**: It manages its own internal state for UI-specific concerns, like the visibility of the settings panel and playlist.

### `components/Visualizer.tsx` - The 3D Scene

This component is dedicated to rendering the 3D scene using Three.js.

*   **Three.js Setup**: It initializes the `WebGLRenderer`, `Scene`, `Camera`, and `OrbitControls` on mount. This setup is performed only once to avoid performance issues.
*   **Scene Objects**: It creates and manages all 3D objects, including:
    *   The central generative sphere (`IcosahedronGeometry` with a `ShaderMaterial`).
    *   The starfield background (`Points` with `PointsMaterial`).
*   **Animation Loop**: It contains the `requestAnimationFrame` loop (`animate` function) which updates the scene on every frame.
*   **Audio-Reactive Logic**: Inside the animation loop, it reads the latest audio data from `audioDataRef` and updates the shader uniforms and post-processing effects accordingly. This is where the audio data is translated into visual changes.
*   **Performance Optimization**: It uses `useRef` extensively to hold references to Three.js objects and the latest props, preventing re-renders and ensuring the animation loop has access to the most current data without re-triggering expensive setup effects.

## Custom Hooks

### `hooks/useAudioAnalyzer.ts`

This custom hook encapsulates all the logic related to the Web Audio API. This separation of concerns keeps the `App.tsx` component cleaner and focused on state management.

*   **Audio Context Setup**: Initializes the `AudioContext`, `AnalyserNode`, and `GainNode`.
*   **Source Management**: Contains functions to initialize and switch between different audio sources:
    *   `initFileAnalyzer`: Connects the `<audio>` element to the `AnalyserNode`.
    *   `initMicAnalyzer`: Gets user media (microphone) and connects it to the `AnalyserNode`.
*   **Analysis Loop**: Runs a `requestAnimationFrame` loop to continuously analyze the audio data from the `AnalyserNode`. It calculates metrics like bass, mids, treble, and overall energy.
*   **Data Exposure**: It exposes the analyzed audio data through a `ref` (`audioDataRef`) to avoid triggering re-renders in the `Visualizer` component on every audio frame.
*   **Playback State & Controls**: It monitors the `<audio>` element to provide playback state (isPlaying, currentTime, duration) and exposes controls (play, pause, seek, setVolume).

## Data Flow

1.  **User Interaction (`UI.tsx`)**: A user clicks a button (e.g., "Upload File", "Play", changes a setting).
2.  **Event Handling (`App.tsx`)**: The event handler in `App.tsx` is triggered. It updates the application state (e.g., sets the new playlist, changes the settings object).
3.  **State Propagation (`App.tsx` -> `UI.tsx` / `Visualizer.tsx`)**: React re-renders the `UI` and `Visualizer` components with the new props.
4.  **Audio Analysis (`useAudioAnalyzer.ts`)**:
    *   If the source changes, `App.tsx` calls `initFileAnalyzer` or `initMicAnalyzer`.
    *   The hook's analysis loop continuously processes the audio and updates `audioDataRef.current`.
5.  **Visual Update (`Visualizer.tsx`)**:
    *   The `Visualizer`'s animation loop reads the latest `settings` from its props and the latest audio data from `audioDataRef.current`.
    *   It updates the shader uniforms (`u_distortion`, `u_bass_intensity`, etc.) and post-processing effects.
    *   Three.js renders the new frame to the canvas.
