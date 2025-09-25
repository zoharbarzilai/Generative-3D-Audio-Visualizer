# 3D Visuals and Shaders

This document provides a detailed explanation of the 3D rendering pipeline, including the scene setup, the generative sphere, custom GLSL shaders, and post-processing effects.

## Scene Setup (`Visualizer.tsx`)

The core of the visual experience is a Three.js scene managed within the `Visualizer` React component.

*   **Renderer**: A `THREE.WebGLRenderer` is used with `ACESFilmicToneMapping` to achieve a more cinematic and realistic color range.
*   **Camera**: A `THREE.PerspectiveCamera` provides the 3D viewpoint.
*   **Controls**: `OrbitControls` are used to allow the user to interact with the scene (rotate, pan, zoom). They are configured with `enableDamping` for smooth camera movements. The `autoRotate` feature is also enabled and its speed is linked to the audio's overall energy.
*   **Environment**: A `RoomEnvironment` is used to provide basic, physically-based lighting and reflections on the sphere, giving it more depth.

## The Generative Sphere

The central object is a high-resolution `THREE.IcosahedronGeometry`. An Icosahedron is chosen for its uniform triangular faces, which distort more evenly than the poles of a standard UV sphere.

The sphere's appearance and behavior are controlled entirely by a custom `ShaderMaterial`.

### `ShaderMaterial` and Uniforms

A `ShaderMaterial` allows us to define the exact appearance and vertex positions of the geometry using custom GLSL (OpenGL Shading Language) code. Data is passed from our JavaScript code to the shaders via **uniforms**.

Key uniforms include:

*   `u_time`: The elapsed time, used for continuous, non-audio-reactive motion.
*   `u_distortion`: Controls the overall magnitude of vertex displacement based on audio.
*   `u_organic_motion`: Controls the frequency of the underlying simplex noise, creating more or less detailed patterns on the sphere's surface.
*   `u_bass_color`, `u_mid_color`, `u_high_color`: The three main colors of the current palette.
*   `u_bass_intensity`, `u_mid_intensity`, `u_high_intensity`: The normalized energy values for each frequency band from the audio analysis.

## GLSL Shaders

### Vertex Shader (`constants.ts:VERTEX_SHADER`)

The vertex shader is responsible for calculating the final position of each vertex of the sphere.

1.  **Simplex Noise**: It includes a function for `snoise` (Simplex Noise), a type of gradient noise that produces natural-looking, smooth patterns.
2.  **Organic Motion**: It first calculates a base `organic_noise` using the vertex's original position, the `u_organic_motion` setting, and `u_time`. This creates a constantly shifting, fluid base shape.
3.  **Audio-Reactive Distortion**: It then calculates a `distortion_noise`. This noise is driven by `u_time` at a faster rate and is scaled by the `u_distortion` uniform, which is directly linked to the audio's bass and peak transients.
4.  **Displacement**: The two noise values are combined to create a final `displacement` value. This value is used to push each vertex outwards along its normal (the direction pointing away from the sphere's center).
5.  **Final Position**: The new, displaced position is calculated and passed to the GPU to be rendered.

### Fragment Shader (`constants.ts:FRAGMENT_SHADER`)

The fragment shader is responsible for calculating the final color of each pixel on the sphere's surface.

1.  **Color Mixing**: It uses the noise value (`v_noise`) passed from the vertex shader to mix the three palette colors.
    *   It uses `smoothstep` to create smooth transitions between the `u_bass_color`, `u_mid_color`, and `u_high_color`. This results in the colors being mapped to different "altitudes" of the noise pattern.
2.  **Intensity Scaling**: The resulting color is then multiplied by a combination of the audio intensity uniforms (`u_bass_intensity`, etc.). This makes the sphere glow brighter in response to the music.
3.  **Fresnel Effect**: A Fresnel effect is calculated. This effect adds more light to the edges of the sphere (where the surface is at a grazing angle to the camera). This gives the sphere a sense of volume and a glowing rim-light effect, which is enhanced by high-frequency audio (`u_high_intensity`).
4.  **Final Color**: The final color is outputted for the pixel.

## Post-Processing

Post-processing effects are applied to the entire rendered scene to enhance the final image.

*   **`EffectComposer`**: This Three.js helper manages the chain of post-processing passes.
*   **`RenderPass`**: The first pass simply renders the scene as-is.
*   **`UnrealBloomPass`**: This is the key effect. It takes the rendered image, extracts the brightest areas, and blurs them to create a realistic glow or "bloom" effect. The `strength` of this pass is dynamically linked to the audio's bass level and beat detection, causing the entire scene to flash and glow in time with the music.

## Starfield

The background is a simple but effective `THREE.Points` object. It consists of thousands of vertices, each rendered as a small square. The vertices are randomly distributed within a large cube surrounding the main scene to create the illusion of a distant field of stars. Its visibility can be toggled via the settings panel.
