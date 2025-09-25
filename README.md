# Generative 3D Audio Visualizer

An immersive, real-time 3D audio visualizer that brings your music to life. Built with React, Three.js, and the Web Audio API, this application transforms audio from local files or your microphone into a dynamic visual experience featuring a generative sphere and a starfield background.

## ✨ Features

*   **Real-time 3D Visualization**: A central sphere dynamically distorts and pulses in response to audio frequencies (bass, mids, treble).
*   **Dual Audio Sources**: Use local audio files (MP3, WAV, etc.) or your computer's microphone as the input.
*   **Full Playlist Control**:
    *   Upload multiple files to create a playlist.
    *   Add more songs at any time.
    *   Remove songs with a single click.
    *   Reorder the playlist using intuitive drag-and-drop.
*   **Advanced Playback Controls**: Full control over your music with play/pause, next/previous track, a seekable progress bar, and volume adjustment.
*   **Deep Visual Customization**: Fine-tune the visuals through a comprehensive settings panel:
    *   **Color Palettes**: Choose from presets like Synthwave, Oceanic, Magma, and Forest.
    *   **Distortion & Motion**: Control the intensity of audio-reactive distortion and the fluid, organic motion of the sphere.
    *   **Bloom Effect**: Adjust the glow intensity for a more cinematic feel.
    *   **Rotation Speed**: Change how fast the camera orbits the sphere.
    *   **Pump Sensitivity**: Control how strongly the visuals react to beats.
*   **Collapsible UI**: Minimize the playlist and settings panels to focus on the visuals.
*   **Dynamic Starfield**: Toggle a background of thousands of stars for an immersive space-like environment.
*   **Progressive Web App (PWA)**: Installable on your device for an app-like experience and offline access.

## 🚀 How to Use

### 1. Choose Your Audio Source

When you first launch the application, you'll be prompted to select an audio source:
*   **Upload Audio File(s)**: Click to open your file explorer and select one or more audio files. This will create a playlist.
*   **Use Microphone**: Click to use your microphone as the audio input. You will need to grant permission in your browser.

### 2. Playing from Files (Playlist Mode)

If you chose to upload files, a playlist will appear in the top-left corner.

*   **Playing Music**: Click on any track in the playlist to start playing it. Use the playback controls at the bottom of the screen to play, pause, skip, seek, and adjust the volume.
*   **Managing the Playlist**:
    *   **Add Songs**: Click the `+` button in the playlist header to add more files.
    *   **Remove a Song**: Hover over a track and click the trash can icon that appears.
    *   **Reorder Songs**: Click and hold a track, then drag it to a new position in the list.
    *   **Minimize Playlist**: Click the playlist header or the chevron icon to collapse and expand the track list.

### 3. Interacting with the Visualizer

*   **Rotate**: Left-click and drag your mouse to orbit the camera around the sphere.
*   **Zoom**: Use your mouse scroll wheel to zoom in and out.
*   **Pan**: Right-click and drag to pan the camera.

### 4. Customizing the Visuals

1.  Click the **Settings icon** (⚙️) in the top-right corner to open the settings panel.
2.  Use the sliders and dropdowns to adjust the visual parameters in real-time.
3.  Click the **Close icon** (X) or the settings icon again to hide the panel.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript
*   **3D Rendering**: Three.js
*   **Audio Processing**: Web Audio API
*   **Styling**: Tailwind CSS

## 📄 Documentation & Internals

For those interested in a deeper understanding of how the visualizer works, detailed documentation is available in the `/docs` folder:

*   **[`docs/architecture.md`](./docs/architecture.md)**: An overview of the application's structure and the roles of its main components.
*   **[`docs/visuals.md`](./docs/visuals.md)**: A deep dive into the Three.js scene, custom GLSL shaders, and post-processing effects.
*   **[`docs/audio-processing.md`](./docs/audio-processing.md)**: An explanation of how the Web Audio API is used to analyze audio in real-time.
