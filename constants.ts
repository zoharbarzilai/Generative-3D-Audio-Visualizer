
import * as THREE from 'three';
import type { Palettes } from './types';

export const VERTEX_SHADER = `
    uniform float u_time;
    uniform float u_distortion;
    uniform float u_organic_motion;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    varying vec3 v_position;
    varying float v_noise;

    void main() {
        v_position = position;
        
        float organic_noise = snoise(position * u_organic_motion + u_time * 0.1);
        float distortion_noise = snoise(position * 1.5 + u_time * 0.5) * u_distortion;
        
        float displacement = organic_noise + distortion_noise;
        vec3 newPosition = position + normal * displacement;
        
        v_noise = organic_noise;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

export const FRAGMENT_SHADER = `
    uniform vec3 u_bass_color;
    uniform vec3 u_mid_color;
    uniform vec3 u_high_color;
    uniform float u_bass_intensity;
    uniform float u_mid_intensity;
    uniform float u_high_intensity;

    varying vec3 v_position;
    varying float v_noise;
    
    void main() {
        float color_mix_factor = (v_noise + 1.0) / 2.0;
        vec3 color = mix(u_bass_color, u_mid_color, smoothstep(0.3, 0.7, color_mix_factor));
        color = mix(color, u_high_color, smoothstep(0.6, 0.9, color_mix_factor));

        vec3 final_color = color * (u_bass_intensity * 0.7 + u_mid_intensity * 0.5 + u_high_intensity * 1.2);

        vec3 view_direction = normalize(cameraPosition - v_position);
        float fresnel = 1.0 - dot(normalize(v_position), view_direction);
        fresnel = pow(fresnel, 2.0);
        
        final_color += u_high_color * fresnel * u_high_intensity * 2.0;

        gl_FragColor = vec4(final_color, 1.0);
    }
`;

export const PALETTES: Palettes = {
    Synthwave: { bass: new THREE.Color('#4a0d66'), mid: new THREE.Color('#d11da2'), high: new THREE.Color('#00e8f7') },
    Oceanic: { bass: new THREE.Color('#002951'), mid: new THREE.Color('#0085a1'), high: new THREE.Color('#ffffff') },
    Magma: { bass: new THREE.Color('#3d0000'), mid: new THREE.Color('#ff4d00'), high: new THREE.Color('#ffff00') },
    Forest: { bass: new THREE.Color('#0a2b0a'), mid: new THREE.Color('#38761d'), high: new THREE.Color('#b6d7a8') },
};
