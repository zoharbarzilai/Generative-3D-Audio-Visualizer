import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Settings, Palette, AudioData } from '../types';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../constants';

interface VisualizerProps {
    audioDataRef: React.RefObject<AudioData>;
    settings: Settings;
    palette: Palette;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioDataRef, settings, palette }) => {
    const mountRef = useRef<HTMLCanvasElement>(null);
    const threeRef = useRef<any>({});
    const latestPropsRef = useRef({ settings, palette });

    // This effect ensures the latest props are always available to the animation loop
    // without causing the main effect to re-run and rebuild the scene.
    useEffect(() => {
        latestPropsRef.current = { settings, palette };
    }, [settings, palette]);

    // This effect runs only ONCE on mount to set up the scene.
    useEffect(() => {
        if (!mountRef.current) return;

        const canvas = mountRef.current;
        let animationFrameId: number;
        
        const animationState = {
            prevBass: 0,
            distortionPump: 0,
            bloomPump: 0,
        };
        
        // --- ONE-TIME SETUP ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        // FIX: The RoomEnvironment constructor does not accept any arguments.
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 4;
        controls.maxDistance = 25;
        controls.autoRotate = true;

        const starVertices = [];
        for (let i = 0; i < 15000; i++) {
            const x = THREE.MathUtils.randFloatSpread(200);
            const y = THREE.MathUtils.randFloatSpread(200);
            const z = THREE.MathUtils.randFloatSpread(200);
            starVertices.push(x, y, z);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 0.05 });
        const starfield = new THREE.Points(starGeometry, starMaterial);
        scene.add(starfield);

        const geometry = new THREE.IcosahedronGeometry(3, 128);
        const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            uniforms: {
                u_time: { value: 0 },
                u_distortion: { value: 0 },
                u_organic_motion: { value: 0 },
                u_bass_color: { value: new THREE.Color() },
                u_mid_color: { value: new THREE.Color() },
                u_high_color: { value: new THREE.Color() },
                u_bass_intensity: { value: 0 },
                u_mid_intensity: { value: 0 },
                u_high_intensity: { value: 0 },
            },
        });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.radius = 0.5;
        composer.addPass(bloomPass);
        
        // Store persistent objects for cleanup and updates
        threeRef.current = {
            renderer, controls, geometry, material, starGeometry, starMaterial, pmremGenerator
        };
        
        const clock = new THREE.Clock();
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsedTime = clock.getElapsedTime();
            
            // Read latest props and audio data from refs
            const { settings, palette } = latestPropsRef.current;
            const audioData = audioDataRef.current;

            material.uniforms.u_time.value = elapsedTime;
            
            // --- LIVE UPDATES FROM SETTINGS ---
            starfield.visible = settings.showStarfield;
            material.uniforms.u_bass_color.value.set(palette.bass);
            material.uniforms.u_mid_color.value.set(palette.mid);
            material.uniforms.u_high_color.value.set(palette.high);
            
            // Audio reactive updates
            const isTransient = audioData.normalizedPeak > 0.8;
            const isBeat = audioData.bass > animationState.prevBass * 1.3 && audioData.bass > 0.4;
            animationState.prevBass = audioData.bass;

            if (isTransient) {
                animationState.distortionPump = 1.5 * settings.pumpSensitivity;
            }
            animationState.distortionPump = THREE.MathUtils.lerp(animationState.distortionPump, 0, 0.1);

            const baseDistortion = audioData.bass * settings.distortionIntensity;
            material.uniforms.u_distortion.value = baseDistortion + animationState.distortionPump;
            material.uniforms.u_organic_motion.value = settings.organicMotion;

            if (isBeat) {
                animationState.bloomPump = 0.25 * settings.pumpSensitivity;
            }
            animationState.bloomPump = THREE.MathUtils.lerp(animationState.bloomPump, 0, 0.4);

            const baseBloom = audioData.bass * settings.bloomIntensity;
            bloomPass.strength = baseBloom + animationState.bloomPump;

            const targetRotationSpeed = audioData.overallEnergy * settings.autoRotateSpeed;
            controls.autoRotateSpeed = THREE.MathUtils.lerp(controls.autoRotateSpeed, targetRotationSpeed, 0.8);
            controls.autoRotateSpeed = THREE.MathUtils.lerp(controls.autoRotateSpeed, 0.2, 0.1);

            material.uniforms.u_bass_intensity.value = THREE.MathUtils.lerp(material.uniforms.u_bass_intensity.value, audioData.bass, 0.6);
            material.uniforms.u_mid_intensity.value = THREE.MathUtils.lerp(material.uniforms.u_mid_intensity.value, audioData.mids, 0.7);
            material.uniforms.u_high_intensity.value = THREE.MathUtils.lerp(material.uniforms.u_high_intensity.value, audioData.treble, 0.7);

            controls.update();
            composer.render(delta);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- CLEANUP ON UNMOUNT ---
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            const { renderer, controls, geometry, material, starGeometry, starMaterial, pmremGenerator } = threeRef.current;
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            starGeometry.dispose();
            starMaterial.dispose();
            pmremGenerator.dispose();
            controls.dispose();
        };
    }, []); // Empty dependency array ensures this effect runs only once

    return <canvas ref={mountRef} className="absolute top-0 left-0 outline-none" />;
};

export default Visualizer;