import { useRef, useState, useMemo, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_PATH = '/3dmodel/2mbButLowQuality.glb';

// Define body regions based on normalized Y coordinate (0 = bottom, 1 = top)
interface BodyRegion {
    name: string;
    yMin: number;
    yMax: number;
    xRange?: [number, number]; // Optional x-range for left/right distinction
}

const BODY_REGIONS: BodyRegion[] = [
    { name: 'Head', yMin: 0.85, yMax: 1.0 },
    { name: 'Neck', yMin: 0.80, yMax: 0.85 },
    { name: 'Chest', yMin: 0.60, yMax: 0.80 },
    { name: 'Abdomen', yMin: 0.45, yMax: 0.60 },
    { name: 'Pelvis', yMin: 0.38, yMax: 0.45 },
    { name: 'Upper Leg', yMin: 0.20, yMax: 0.38 },
    { name: 'Lower Leg', yMin: 0.05, yMax: 0.20 },
    { name: 'Foot', yMin: 0.0, yMax: 0.05 },
];

function getBodyRegionFromPoint(point: THREE.Vector3, modelBounds: THREE.Box3): string {
    const size = modelBounds.getSize(new THREE.Vector3());
    const min = modelBounds.min;

    // Normalize the Y coordinate (0-1 scale)
    const normalizedY = (point.y - min.y) / size.y;

    // Determine left or right side
    const isLeftSide = point.x < 0;

    // Find matching region
    for (const region of BODY_REGIONS) {
        if (normalizedY >= region.yMin && normalizedY <= region.yMax) {
            // Add left/right distinction for limbs
            if (region.name === 'Upper Leg' || region.name === 'Lower Leg' || region.name === 'Foot') {
                return `${isLeftSide ? 'Left' : 'Right'} ${region.name}`;
            }
            // Check if it's an arm based on X position
            if ((region.name === 'Chest' || region.name === 'Abdomen') && Math.abs(point.x) > size.x * 0.3) {
                if (normalizedY > 0.55) {
                    return `${isLeftSide ? 'Left' : 'Right'} Arm`;
                }
                return `${isLeftSide ? 'Left' : 'Right'} Hand`;
            }
            return region.name;
        }
    }

    return 'Body';
}

interface HumanModelProps {
    onPartClick?: (partName: string) => void;
    onPartHover?: (partName: string | null, point: THREE.Vector3 | null) => void;
}

export function HumanModel({ onPartClick, onPartHover, ...props }: HumanModelProps & JSX.IntrinsicElements['group']) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF(MODEL_PATH);
    const [isHovering, setIsHovering] = useState(false);

    // Clone the scene and get bounds
    const { clonedScene, bounds } = useMemo(() => {
        const cloned = scene.clone(true);

        cloned.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                if (mesh.material) {
                    const clonedMaterial = (mesh.material as THREE.Material).clone();
                    mesh.material = clonedMaterial;
                }
            }
        });

        // Get bounds before centering
        const box = new THREE.Box3().setFromObject(cloned);
        const center = box.getCenter(new THREE.Vector3());
        cloned.position.sub(center);

        // Recalculate bounds after centering
        const newBounds = new THREE.Box3().setFromObject(cloned);

        return { clonedScene: cloned, bounds: newBounds };
    }, [scene]);

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();
        if (e.point) {
            const regionName = getBodyRegionFromPoint(e.point, bounds);
            if (onPartHover) onPartHover(regionName, e.point);
        }
    }, [bounds, onPartHover]);

    const handlePointerOver = useCallback((e: any) => {
        e.stopPropagation();
        setIsHovering(true);
        document.body.style.cursor = 'pointer';

        if (e.point) {
            const regionName = getBodyRegionFromPoint(e.point, bounds);
            if (onPartHover) onPartHover(regionName, e.point);
        }
    }, [bounds, onPartHover]);

    const handlePointerOut = useCallback((e: any) => {
        e.stopPropagation();
        setIsHovering(false);
        document.body.style.cursor = 'auto';
        if (onPartHover) onPartHover(null, null);
    }, [onPartHover]);

    const handleClick = useCallback((e: any) => {
        e.stopPropagation();
        if (e.point) {
            const regionName = getBodyRegionFromPoint(e.point, bounds);
            if (onPartClick) onPartClick(regionName);
        }
    }, [bounds, onPartClick]);

    return (
        <group
            ref={group}
            {...props}
            dispose={null}
            onPointerMove={handlePointerMove}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            <primitive object={clonedScene} />
        </group>
    );
}

useGLTF.preload(MODEL_PATH);
