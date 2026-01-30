import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Stars, Center, useProgress, Html } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { HumanModel } from './HumanModel';
import * as THREE from 'three';

interface SceneProps {
    onPartSelect?: (part: string) => void;
    onPartHover?: (part: string | null) => void;
}

function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center justify-center">
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-white mt-4 text-sm font-medium">Loading 3D Model... {progress.toFixed(0)}%</p>
            </div>
        </Html>
    );
}

// Hover indicator component
function HoverIndicator({ position }: { position: THREE.Vector3 | null }) {
    if (!position) return null;

    return (
        <mesh position={position}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#ff3333" transparent opacity={0.9} />
        </mesh>
    );
}

export function Scene({ onPartSelect, onPartHover }: SceneProps) {
    const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

    const handlePartHover = (part: string | null, point: THREE.Vector3 | null) => {
        setHoverPoint(point);
        if (onPartHover) onPartHover(part);
    };

    return (
        <div className="w-full h-screen bg-gradient-to-b from-slate-950 to-slate-900">
            <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
                {/* Camera positioned close */}
                <PerspectiveCamera makeDefault position={[0, 0.5, 2]} fov={50} />

                {/* Cinematic Lighting */}
                <ambientLight intensity={1} color="#ffffff" />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={2.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-3, 3, -3]} intensity={1.5} color="#00ffff" />
                <pointLight position={[3, 1, 3]} intensity={1} color="#ff66ff" />
                <hemisphereLight intensity={0.5} groundColor="#1e293b" color="#ffffff" />

                <Suspense fallback={<Loader />}>
                    <Environment preset="city" />
                    <Center>
                        <HumanModel
                            onPartClick={onPartSelect}
                            onPartHover={handlePartHover}
                            scale={1}
                        />
                        <HoverIndicator position={hoverPoint} />
                    </Center>

                    <ContactShadows
                        resolution={512}
                        position={[0, -1, 0]}
                        scale={5}
                        blur={2}
                        opacity={0.5}
                        far={5}
                        color="#000000"
                    />
                </Suspense>

                <OrbitControls
                    minPolarAngle={Math.PI / 6}
                    maxPolarAngle={Math.PI / 1.2}
                    enablePan={true}
                    minDistance={0.5}
                    maxDistance={10}
                    autoRotate={false}
                    target={[0, 0, 0]}
                />

                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
}
