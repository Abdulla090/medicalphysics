import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Loader2, Upload, Layers3, RotateCw, ZoomIn, ZoomOut, Box, Grid3X3, Maximize2, Download, ChevronDown, Brain, FlaskConical, Scan, CircleDot, Hospital } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface DicomViewer3DProps {
    className?: string;
    onLoad?: (data: any) => void;
}

interface VolumeData {
    dimensions: [number, number, number];
    spacing: [number, number, number];
    origin: [number, number, number];
    data: Float32Array | Uint8Array;
}

// ============================================
// LOCAL DICOM DATASETS IN PUBLIC FOLDER
// ============================================

const LOCAL_DICOM_SERIES = {
    // Path structure: /DICOM/DICOM/ST000000/SE000000/MR000000
    basePath: '/DICOM/DICOM/ST000000',
    series: [
        { id: 'se000000', name: 'MRI Series 1', folder: 'SE000000', count: 5 },
        { id: 'se000001', name: 'MRI Series 2', folder: 'SE000001', count: 27 },
        { id: 'se000002', name: 'MRI Series 3', folder: 'SE000002', count: 32 },
    ]
};

// ============================================
// SLICE VIEW COMPONENT (2D slices through 3D volume)
// ============================================

interface SliceViewProps {
    volumeData: VolumeData | null;
    axis: 'axial' | 'sagittal' | 'coronal';
    sliceIndex: number;
    onSliceChange: (index: number) => void;
    windowLevel: number;
    windowWidth: number;
}

const SliceView: React.FC<SliceViewProps> = ({
    volumeData,
    axis,
    sliceIndex,
    onSliceChange,
    windowLevel,
    windowWidth,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!volumeData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const [dimX, dimY, dimZ] = volumeData.dimensions;
        const [spacingX, spacingY, spacingZ] = volumeData.spacing;

        // Calculate the Z scale factor to make sagittal/coronal views proportional
        // This accounts for non-isotropic voxels (typical in MRI/CT where slice thickness differs)
        const zScale = Math.max(1, Math.round((dimX / dimZ) * (spacingZ / spacingX)));

        let sliceWidth: number, sliceHeight: number;
        let displayWidth: number, displayHeight: number;
        let sliceData: Float32Array;

        // Extract slice based on axis
        switch (axis) {
            case 'axial': // XY plane - viewing from top/bottom
                sliceWidth = dimX;
                sliceHeight = dimY;
                displayWidth = dimX;
                displayHeight = dimY;
                sliceData = new Float32Array(sliceWidth * sliceHeight);
                for (let y = 0; y < sliceHeight; y++) {
                    for (let x = 0; x < sliceWidth; x++) {
                        const idx = x + y * dimX + sliceIndex * dimX * dimY;
                        sliceData[x + y * sliceWidth] = volumeData.data[idx] || 0;
                    }
                }
                break;
            case 'sagittal': // YZ plane - viewing from left/right
                sliceWidth = dimY;
                sliceHeight = dimZ;
                displayWidth = dimY;
                // Scale height to match proper aspect ratio
                displayHeight = dimZ * zScale;
                sliceData = new Float32Array(sliceWidth * sliceHeight);
                for (let z = 0; z < sliceHeight; z++) {
                    for (let y = 0; y < sliceWidth; y++) {
                        const idx = sliceIndex + y * dimX + z * dimX * dimY;
                        sliceData[y + z * sliceWidth] = volumeData.data[idx] || 0;
                    }
                }
                break;
            case 'coronal': // XZ plane - viewing from front/back
                sliceWidth = dimX;
                sliceHeight = dimZ;
                displayWidth = dimX;
                // Scale height to match proper aspect ratio
                displayHeight = dimZ * zScale;
                sliceData = new Float32Array(sliceWidth * sliceHeight);
                for (let z = 0; z < sliceHeight; z++) {
                    for (let x = 0; x < sliceWidth; x++) {
                        const idx = x + sliceIndex * dimX + z * dimX * dimY;
                        sliceData[x + z * sliceWidth] = volumeData.data[idx] || 0;
                    }
                }
                break;
            default:
                return;
        }

        // Set canvas to display dimensions (scaled for sagittal/coronal)
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Create image data at original slice dimensions
        const imageData = ctx.createImageData(sliceWidth, sliceHeight);
        const minVal = windowLevel - windowWidth / 2;
        const maxVal = windowLevel + windowWidth / 2;

        for (let i = 0; i < sliceData.length; i++) {
            let value = sliceData[i];
            // Apply window/level
            value = ((value - minVal) / (maxVal - minVal)) * 255;
            value = Math.max(0, Math.min(255, value));

            const pixelIndex = i * 4;
            imageData.data[pixelIndex] = value;     // R
            imageData.data[pixelIndex + 1] = value; // G
            imageData.data[pixelIndex + 2] = value; // B
            imageData.data[pixelIndex + 3] = 255;   // A
        }

        // For sagittal/coronal, we need to scale the image up
        if (axis !== 'axial' && displayHeight !== sliceHeight) {
            // Create a temporary canvas for the original size
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sliceWidth;
            tempCanvas.height = sliceHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.putImageData(imageData, 0, 0);
                // Draw scaled to main canvas
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(tempCanvas, 0, 0, sliceWidth, sliceHeight, 0, 0, displayWidth, displayHeight);
            }
        } else {
            ctx.putImageData(imageData, 0, 0);
        }
    }, [volumeData, axis, sliceIndex, windowLevel, windowWidth]);

    if (!volumeData) return null;

    const maxSlice = axis === 'axial'
        ? volumeData.dimensions[2] - 1
        : axis === 'sagittal'
            ? volumeData.dimensions[0] - 1
            : volumeData.dimensions[1] - 1;

    const axisLabels = {
        axial: 'ئاسۆیی (Axial)',
        sagittal: 'تەنیشتەوانە (Sagittal)',
        coronal: 'پێشەوانە (Coronal)',
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-center text-muted-foreground">
                {axisLabels[axis]}
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'auto' }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-white/70 bg-black/50 px-1 rounded">
                    {sliceIndex + 1} / {maxSlice + 1}
                </div>
            </div>
            <Slider
                value={[sliceIndex]}
                onValueChange={([v]) => onSliceChange(v)}
                min={0}
                max={maxSlice}
                step={1}
                className="w-full"
            />
        </div>
    );
};


// ============================================
// MAIN 3D DICOM VIEWER
// ============================================

const DicomViewer3D: React.FC<DicomViewer3DProps> = ({ className, onLoad }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
    const [loadProgress, setLoadProgress] = useState(0);

    // Slice indices
    const [axialSlice, setAxialSlice] = useState(0);
    const [sagittalSlice, setSagittalSlice] = useState(0);
    const [coronalSlice, setCoronalSlice] = useState(0);

    // Window/Level for contrast adjustment
    const [windowLevel, setWindowLevel] = useState(128);
    const [windowWidth, setWindowWidth] = useState(256);

    // View mode
    const [viewMode, setViewMode] = useState<'multiplanar' | '3d'>('multiplanar');

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate synthetic 3D volume for testing (simulated brain-like structure)
    const generateSyntheticVolume = useCallback((type: 'brain' | 'phantom' | 'sphere') => {
        setIsLoading(true);
        setError(null);
        setLoadProgress(20);

        setTimeout(() => {
            const dimX = 64;
            const dimY = 64;
            const dimZ = 48;
            const numVoxels = dimX * dimY * dimZ;
            const data = new Float32Array(numVoxels);

            const centerX = dimX / 2;
            const centerY = dimY / 2;
            const centerZ = dimZ / 2;

            setLoadProgress(50);

            for (let z = 0; z < dimZ; z++) {
                for (let y = 0; y < dimY; y++) {
                    for (let x = 0; x < dimX; x++) {
                        const idx = x + y * dimX + z * dimX * dimY;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const dz = z - centerZ;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        if (type === 'brain') {
                            // Simulate brain-like ellipsoid with internal structures
                            const outerRadius = 28;
                            const innerRadius = 22;

                            // Outer skull
                            if (dist < outerRadius && dist > innerRadius) {
                                data[idx] = 200 + Math.random() * 55;
                            }
                            // Brain matter with variations
                            else if (dist < innerRadius) {
                                // Gray matter (outer brain)
                                if (dist > innerRadius - 5) {
                                    data[idx] = 120 + Math.random() * 30;
                                }
                                // White matter (inner)
                                else if (dist > 8) {
                                    data[idx] = 170 + Math.random() * 20;
                                }
                                // Ventricles (dark center)
                                else if (dist < 6) {
                                    const ventricleShape = Math.abs(dy) < 3 && Math.abs(dz) < 4;
                                    data[idx] = ventricleShape ? 30 + Math.random() * 10 : 150 + Math.random() * 20;
                                }
                                else {
                                    data[idx] = 140 + Math.random() * 25;
                                }
                            }
                            else {
                                data[idx] = Math.random() * 10;
                            }
                        } else if (type === 'phantom') {
                            // Shepp-Logan-like phantom with multiple ellipsoids
                            const r1 = Math.sqrt((dx / 25) ** 2 + (dy / 30) ** 2 + (dz / 25) ** 2);
                            const r2 = Math.sqrt(((dx - 5) / 8) ** 2 + ((dy - 5) / 8) ** 2 + ((dz) / 12) ** 2);
                            const r3 = Math.sqrt(((dx + 5) / 8) ** 2 + ((dy - 5) / 8) ** 2 + ((dz) / 12) ** 2);
                            const r4 = Math.sqrt(((dx) / 4) ** 2 + ((dy + 10) / 4) ** 2 + ((dz) / 8) ** 2);

                            if (r4 < 1) data[idx] = 255;
                            else if (r2 < 1) data[idx] = 180;
                            else if (r3 < 1) data[idx] = 180;
                            else if (r1 < 1) data[idx] = 100;
                            else data[idx] = 0;
                        } else {
                            // Simple sphere
                            const radius = 20;
                            if (dist < radius) {
                                data[idx] = 200 * (1 - dist / radius) + Math.random() * 20;
                            } else {
                                data[idx] = Math.random() * 5;
                            }
                        }
                    }
                }
            }

            setLoadProgress(80);

            const volume: VolumeData = {
                dimensions: [dimX, dimY, dimZ],
                spacing: [1, 1, 1.5],
                origin: [0, 0, 0],
                data: data,
            };

            setVolumeData(volume);
            setAxialSlice(Math.floor(dimZ / 2));
            setSagittalSlice(Math.floor(dimX / 2));
            setCoronalSlice(Math.floor(dimY / 2));
            setWindowLevel(128);
            setWindowWidth(256);
            setLoadProgress(100);
            onLoad?.(volume);
            setIsLoading(false);
        }, 100);
    }, [onLoad]);

    // Load NIfTI file (simplified parser)
    const loadNiftiFile = useCallback(async (arrayBuffer: ArrayBuffer, filename: string) => {
        setIsLoading(true);
        setError(null);
        setLoadProgress(10);

        try {
            // Check for gzip magic number
            const view = new DataView(arrayBuffer);
            let data = arrayBuffer;

            // Check if gzipped (magic number 0x1f8b)
            if (view.getUint8(0) === 0x1f && view.getUint8(1) === 0x8b) {
                // Decompress gzip
                const compressed = new Uint8Array(arrayBuffer);
                const decompressed = await new Promise<ArrayBuffer>((resolve, reject) => {
                    // Use DecompressionStream if available
                    if ('DecompressionStream' in window) {
                        const ds = new (window as any).DecompressionStream('gzip');
                        const stream = new Blob([compressed]).stream().pipeThrough(ds);
                        new Response(stream).arrayBuffer().then(resolve).catch(reject);
                    } else {
                        reject(new Error('Gzip decompression not supported in this browser'));
                    }
                });
                data = decompressed;
                setLoadProgress(30);
            }

            // Parse NIfTI header
            const headerView = new DataView(data);

            // Check for NIfTI magic
            const sizeof_hdr = headerView.getInt32(0, true);
            if (sizeof_hdr !== 348 && sizeof_hdr !== 540) {
                throw new Error('Invalid NIfTI file: incorrect header size');
            }

            // Get dimensions
            const dimX = headerView.getInt16(42, true);
            const dimY = headerView.getInt16(44, true);
            const dimZ = headerView.getInt16(46, true);

            // Get data type
            const datatype = headerView.getInt16(70, true);

            // Get voxel offset
            const vox_offset = headerView.getFloat32(108, true);

            // Get spacing (pixdim)
            const spacingX = headerView.getFloat32(80, true);
            const spacingY = headerView.getFloat32(84, true);
            const spacingZ = headerView.getFloat32(88, true);

            setLoadProgress(50);

            // Read image data
            const numVoxels = dimX * dimY * dimZ;
            let imageData: Float32Array;

            const dataStart = Math.floor(vox_offset);

            switch (datatype) {
                case 2: // UINT8
                    imageData = new Float32Array(numVoxels);
                    for (let i = 0; i < numVoxels; i++) {
                        imageData[i] = new Uint8Array(data, dataStart + i, 1)[0];
                    }
                    break;
                case 4: // INT16
                    imageData = new Float32Array(numVoxels);
                    const int16View = new DataView(data, dataStart);
                    for (let i = 0; i < numVoxels; i++) {
                        imageData[i] = int16View.getInt16(i * 2, true);
                    }
                    break;
                case 8: // INT32
                    imageData = new Float32Array(numVoxels);
                    const int32View = new DataView(data, dataStart);
                    for (let i = 0; i < numVoxels; i++) {
                        imageData[i] = int32View.getInt32(i * 4, true);
                    }
                    break;
                case 16: // FLOAT32
                    imageData = new Float32Array(data, dataStart, numVoxels);
                    break;
                case 512: // UINT16
                    imageData = new Float32Array(numVoxels);
                    const uint16View = new DataView(data, dataStart);
                    for (let i = 0; i < numVoxels; i++) {
                        imageData[i] = uint16View.getUint16(i * 2, true);
                    }
                    break;
                default:
                    throw new Error(`Unsupported data type: ${datatype}`);
            }

            setLoadProgress(80);

            // Normalize data for display
            let minVal = Infinity, maxVal = -Infinity;
            for (let i = 0; i < imageData.length; i++) {
                if (imageData[i] < minVal) minVal = imageData[i];
                if (imageData[i] > maxVal) maxVal = imageData[i];
            }

            // Normalize to 0-255 range
            const normalizedData = new Float32Array(imageData.length);
            const range = maxVal - minVal || 1;
            for (let i = 0; i < imageData.length; i++) {
                normalizedData[i] = ((imageData[i] - minVal) / range) * 255;
            }

            const volume: VolumeData = {
                dimensions: [dimX, dimY, dimZ],
                spacing: [spacingX, spacingY, spacingZ],
                origin: [0, 0, 0],
                data: normalizedData,
            };

            setVolumeData(volume);

            // Set initial slice positions to middle
            setAxialSlice(Math.floor(dimZ / 2));
            setSagittalSlice(Math.floor(dimX / 2));
            setCoronalSlice(Math.floor(dimY / 2));

            // Set window/level based on data range
            setWindowLevel(128);
            setWindowWidth(256);

            setLoadProgress(100);
            onLoad?.(volume);

        } catch (err: any) {
            console.error('Error loading file:', err);
            setError(err.message || 'Failed to load file');
        } finally {
            setIsLoading(false);
        }
    }, [onLoad]);

    // Load from URL
    const loadFromUrl = useCallback(async (url: string) => {
        setIsLoading(true);
        setError(null);
        setLoadProgress(0);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch file');

            const arrayBuffer = await response.arrayBuffer();
            await loadNiftiFile(arrayBuffer, url.split('/').pop() || 'volume');
        } catch (err: any) {
            console.error('Error loading from URL:', err);
            setError(err.message || 'Failed to load from URL');
            setIsLoading(false);
        }
    }, [loadNiftiFile]);

    // Load single DICOM file
    const loadDicomFile = useCallback(async (arrayBuffer: ArrayBuffer, filename: string) => {
        setIsLoading(true);
        setError(null);
        setLoadProgress(10);

        try {
            const view = new DataView(arrayBuffer);

            // Check for DICOM magic number at offset 128
            let startOffset = 0;
            let isDicom = false;

            if (arrayBuffer.byteLength > 132) {
                const magic = String.fromCharCode(
                    view.getUint8(128),
                    view.getUint8(129),
                    view.getUint8(130),
                    view.getUint8(131)
                );
                if (magic === 'DICM') {
                    isDicom = true;
                    startOffset = 132;
                }
            }

            // Try without preamble - check for group 0008 (common DICOM start)
            if (!isDicom && arrayBuffer.byteLength > 8) {
                const group = view.getUint16(0, true);
                if (group === 0x0008 || group === 0x0002) {
                    isDicom = true;
                    startOffset = 0;
                }
            }

            if (!isDicom) {
                throw new Error('Invalid DICOM file: DICM magic number not found');
            }

            setLoadProgress(30);

            // Parse DICOM header
            let offset = startOffset;
            let rows = 256, cols = 256;
            let bitsAllocated = 16;
            let bitsStored = 12;
            let pixelRepresentation = 0;
            let rescaleIntercept = 0;
            let rescaleSlope = 1;
            let pixelDataOffset = -1;
            let isImplicitVR = false;

            // First pass: try explicit VR
            while (offset < Math.min(arrayBuffer.byteLength - 8, 50000)) {
                const group = view.getUint16(offset, true);
                const element = view.getUint16(offset + 2, true);

                // Check for valid VR characters (uppercase letters)
                const char1 = view.getUint8(offset + 4);
                const char2 = view.getUint8(offset + 5);
                const isValidVR = (char1 >= 65 && char1 <= 90) && (char2 >= 65 && char2 <= 90);

                if (!isValidVR && offset === startOffset) {
                    isImplicitVR = true;
                    break;
                }

                const vr = String.fromCharCode(char1, char2);
                let valueLength: number, headerLength: number;

                if (['OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN', 'OD', 'OL'].includes(vr)) {
                    valueLength = view.getUint32(offset + 8, true);
                    headerLength = 12;
                } else {
                    valueLength = view.getUint16(offset + 6, true);
                    headerLength = 8;
                }

                // Rows (0028,0010)
                if (group === 0x0028 && element === 0x0010) {
                    rows = view.getUint16(offset + headerLength, true);
                }
                // Cols (0028,0011)
                if (group === 0x0028 && element === 0x0011) {
                    cols = view.getUint16(offset + headerLength, true);
                }
                // Bits Allocated (0028,0100)
                if (group === 0x0028 && element === 0x0100) {
                    bitsAllocated = view.getUint16(offset + headerLength, true);
                }
                // Bits Stored (0028,0101)
                if (group === 0x0028 && element === 0x0101) {
                    bitsStored = view.getUint16(offset + headerLength, true);
                }
                // Pixel Representation (0028,0103)
                if (group === 0x0028 && element === 0x0103) {
                    pixelRepresentation = view.getUint16(offset + headerLength, true);
                }
                // Rescale Intercept (0028,1052)
                if (group === 0x0028 && element === 0x1052) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    rescaleIntercept = parseFloat(str) || 0;
                }
                // Rescale Slope (0028,1053)
                if (group === 0x0028 && element === 0x1053) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    rescaleSlope = parseFloat(str) || 1;
                }
                // Pixel Data (7FE0,0010)
                if (group === 0x7FE0 && element === 0x0010) {
                    pixelDataOffset = offset + headerLength;
                    break;
                }

                offset += headerLength + valueLength;
                if (valueLength === 0xFFFFFFFF || valueLength > arrayBuffer.byteLength) break;
            }

            // If explicit VR didn't work, try implicit VR
            if (pixelDataOffset < 0 && isImplicitVR) {
                offset = startOffset;
                while (offset < arrayBuffer.byteLength - 8) {
                    const group = view.getUint16(offset, true);
                    const element = view.getUint16(offset + 2, true);
                    const valueLength = view.getUint32(offset + 4, true);
                    const headerLength = 8;

                    if (group === 0x0028 && element === 0x0010) rows = view.getUint16(offset + headerLength, true);
                    if (group === 0x0028 && element === 0x0011) cols = view.getUint16(offset + headerLength, true);
                    if (group === 0x0028 && element === 0x0100) bitsAllocated = view.getUint16(offset + headerLength, true);
                    if (group === 0x7FE0 && element === 0x0010) {
                        pixelDataOffset = offset + headerLength;
                        break;
                    }

                    offset += headerLength + valueLength;
                    if (valueLength > arrayBuffer.byteLength) break;
                }
            }

            setLoadProgress(50);

            // Fallback: calculate pixel data offset from expected size
            if (pixelDataOffset < 0 && rows > 0 && cols > 0) {
                const expectedPixelSize = rows * cols * (bitsAllocated / 8);
                if (arrayBuffer.byteLength > expectedPixelSize + 100) {
                    pixelDataOffset = arrayBuffer.byteLength - expectedPixelSize;
                }
            }

            if (pixelDataOffset < 0 || pixelDataOffset >= arrayBuffer.byteLength) {
                throw new Error('Could not locate pixel data in DICOM file');
            }

            console.log(`DICOM parsed: ${rows}x${cols}, ${bitsAllocated} bits, offset: ${pixelDataOffset}`);

            // Read pixel data
            const pixelCount = rows * cols;
            const imageData = new Float32Array(pixelCount);
            const bytesPerPixel = bitsAllocated / 8;

            setLoadProgress(70);

            for (let i = 0; i < pixelCount; i++) {
                const byteOffset = pixelDataOffset + i * bytesPerPixel;
                if (byteOffset >= arrayBuffer.byteLength - bytesPerPixel + 1) break;

                let value: number;
                if (bitsAllocated === 16) {
                    if (pixelRepresentation === 1) {
                        value = view.getInt16(byteOffset, true);
                    } else {
                        value = view.getUint16(byteOffset, true);
                    }
                } else if (bitsAllocated === 8) {
                    value = view.getUint8(byteOffset);
                } else if (bitsAllocated === 32) {
                    value = view.getFloat32(byteOffset, true);
                } else {
                    value = view.getUint16(byteOffset, true);
                }

                // Apply rescale
                imageData[i] = value * rescaleSlope + rescaleIntercept;
            }

            setLoadProgress(85);

            // Normalize for display
            let minVal = Infinity, maxVal = -Infinity;
            for (let i = 0; i < imageData.length; i++) {
                if (imageData[i] < minVal) minVal = imageData[i];
                if (imageData[i] > maxVal) maxVal = imageData[i];
            }

            const normalizedData = new Float32Array(imageData.length);
            const range = maxVal - minVal || 1;
            for (let i = 0; i < imageData.length; i++) {
                normalizedData[i] = ((imageData[i] - minVal) / range) * 255;
            }

            // Create a single-slice volume (2D image treated as 3D with depth 1)
            const volume: VolumeData = {
                dimensions: [cols, rows, 1],
                spacing: [1, 1, 1],
                origin: [0, 0, 0],
                data: normalizedData,
            };

            setVolumeData(volume);
            setAxialSlice(0);
            setSagittalSlice(Math.floor(cols / 2));
            setCoronalSlice(Math.floor(rows / 2));
            setWindowLevel(128);
            setWindowWidth(256);
            setLoadProgress(100);
            onLoad?.(volume);

        } catch (err: any) {
            console.error('Error loading DICOM file:', err);
            setError(err.message || 'Failed to load DICOM file');
        } finally {
            setIsLoading(false);
        }
    }, [onLoad]);

    // Parse a single DICOM slice and return its data along with position info
    const parseDicomSlice = useCallback(async (arrayBuffer: ArrayBuffer): Promise<{
        data: Float32Array;
        rows: number;
        cols: number;
        sliceLocation: number;
        instanceNumber: number;
    } | null> => {
        try {
            const view = new DataView(arrayBuffer);

            // Check for DICOM magic number at offset 128
            let startOffset = 0;
            let isDicom = false;

            if (arrayBuffer.byteLength > 132) {
                const magic = String.fromCharCode(
                    view.getUint8(128),
                    view.getUint8(129),
                    view.getUint8(130),
                    view.getUint8(131)
                );
                if (magic === 'DICM') {
                    isDicom = true;
                    startOffset = 132;
                }
            }

            if (!isDicom && arrayBuffer.byteLength > 8) {
                const group = view.getUint16(0, true);
                if (group === 0x0008 || group === 0x0002) {
                    isDicom = true;
                    startOffset = 0;
                }
            }

            if (!isDicom) return null;

            // Parse DICOM header
            let offset = startOffset;
            let rows = 256, cols = 256;
            let bitsAllocated = 16;
            let pixelRepresentation = 0;
            let rescaleIntercept = 0;
            let rescaleSlope = 1;
            let sliceLocation = 0;
            let instanceNumber = 0;
            let pixelDataOffset = -1;
            let isImplicitVR = false;

            while (offset < Math.min(arrayBuffer.byteLength - 8, 50000)) {
                const group = view.getUint16(offset, true);
                const element = view.getUint16(offset + 2, true);

                const char1 = view.getUint8(offset + 4);
                const char2 = view.getUint8(offset + 5);
                const isValidVR = (char1 >= 65 && char1 <= 90) && (char2 >= 65 && char2 <= 90);

                if (!isValidVR && offset === startOffset) {
                    isImplicitVR = true;
                    break;
                }

                const vr = String.fromCharCode(char1, char2);
                let valueLength: number, headerLength: number;

                if (['OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN', 'OD', 'OL'].includes(vr)) {
                    valueLength = view.getUint32(offset + 8, true);
                    headerLength = 12;
                } else {
                    valueLength = view.getUint16(offset + 6, true);
                    headerLength = 8;
                }

                if (group === 0x0028 && element === 0x0010) rows = view.getUint16(offset + headerLength, true);
                if (group === 0x0028 && element === 0x0011) cols = view.getUint16(offset + headerLength, true);
                if (group === 0x0028 && element === 0x0100) bitsAllocated = view.getUint16(offset + headerLength, true);
                if (group === 0x0028 && element === 0x0103) pixelRepresentation = view.getUint16(offset + headerLength, true);

                // Slice Location (0020,1041)
                if (group === 0x0020 && element === 0x1041) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    sliceLocation = parseFloat(str) || 0;
                }
                // Instance Number (0020,0013)
                if (group === 0x0020 && element === 0x0013) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    instanceNumber = parseInt(str) || 0;
                }
                // Rescale Intercept (0028,1052)
                if (group === 0x0028 && element === 0x1052) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    rescaleIntercept = parseFloat(str) || 0;
                }
                // Rescale Slope (0028,1053)
                if (group === 0x0028 && element === 0x1053) {
                    const str = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim();
                    rescaleSlope = parseFloat(str) || 1;
                }
                // Pixel Data (7FE0,0010)
                if (group === 0x7FE0 && element === 0x0010) {
                    pixelDataOffset = offset + headerLength;
                    break;
                }

                offset += headerLength + valueLength;
                if (valueLength === 0xFFFFFFFF || valueLength > arrayBuffer.byteLength) break;
            }

            // Try implicit VR if explicit didn't work
            if (pixelDataOffset < 0 && isImplicitVR) {
                offset = startOffset;
                while (offset < arrayBuffer.byteLength - 8) {
                    const group = view.getUint16(offset, true);
                    const element = view.getUint16(offset + 2, true);
                    const valueLength = view.getUint32(offset + 4, true);
                    const headerLength = 8;

                    if (group === 0x0028 && element === 0x0010) rows = view.getUint16(offset + headerLength, true);
                    if (group === 0x0028 && element === 0x0011) cols = view.getUint16(offset + headerLength, true);
                    if (group === 0x0028 && element === 0x0100) bitsAllocated = view.getUint16(offset + headerLength, true);
                    if (group === 0x0020 && element === 0x0013) instanceNumber = parseInt(new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + headerLength, valueLength)).trim()) || 0;
                    if (group === 0x7FE0 && element === 0x0010) {
                        pixelDataOffset = offset + headerLength;
                        break;
                    }

                    offset += headerLength + valueLength;
                    if (valueLength > arrayBuffer.byteLength) break;
                }
            }

            if (pixelDataOffset < 0) {
                const expectedPixelSize = rows * cols * (bitsAllocated / 8);
                if (arrayBuffer.byteLength > expectedPixelSize + 100) {
                    pixelDataOffset = arrayBuffer.byteLength - expectedPixelSize;
                }
            }

            if (pixelDataOffset < 0 || pixelDataOffset >= arrayBuffer.byteLength) return null;

            // Read pixel data
            const pixelCount = rows * cols;
            const imageData = new Float32Array(pixelCount);
            const bytesPerPixel = bitsAllocated / 8;

            for (let i = 0; i < pixelCount; i++) {
                const byteOffset = pixelDataOffset + i * bytesPerPixel;
                if (byteOffset >= arrayBuffer.byteLength - bytesPerPixel + 1) break;

                let value: number;
                if (bitsAllocated === 16) {
                    value = pixelRepresentation === 1 ? view.getInt16(byteOffset, true) : view.getUint16(byteOffset, true);
                } else if (bitsAllocated === 8) {
                    value = view.getUint8(byteOffset);
                } else {
                    value = view.getUint16(byteOffset, true);
                }

                imageData[i] = value * rescaleSlope + rescaleIntercept;
            }

            return { data: imageData, rows, cols, sliceLocation, instanceNumber };
        } catch {
            return null;
        }
    }, []);

    // Load multiple DICOM files as a 3D volume
    const loadDicomSeries = useCallback(async (files: File[]) => {
        setIsLoading(true);
        setError(null);
        setLoadProgress(5);

        try {
            const slices: { data: Float32Array; rows: number; cols: number; sliceLocation: number; instanceNumber: number }[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const arrayBuffer = await file.arrayBuffer();
                const slice = await parseDicomSlice(arrayBuffer);

                if (slice) {
                    slices.push(slice);
                }

                setLoadProgress(Math.floor((i / files.length) * 70) + 10);
            }

            if (slices.length === 0) {
                throw new Error('No valid DICOM slices found in selected files');
            }

            // Sort by slice location or instance number
            slices.sort((a, b) => {
                if (a.sliceLocation !== b.sliceLocation) return a.sliceLocation - b.sliceLocation;
                return a.instanceNumber - b.instanceNumber;
            });

            console.log(`Loaded ${slices.length} DICOM slices`);

            const { rows, cols } = slices[0];
            const dimZ = slices.length;

            // Combine into 3D volume
            const volumeData = new Float32Array(cols * rows * dimZ);
            for (let z = 0; z < dimZ; z++) {
                const sliceData = slices[z].data;
                for (let i = 0; i < sliceData.length && i < cols * rows; i++) {
                    volumeData[i + z * cols * rows] = sliceData[i];
                }
            }

            setLoadProgress(85);

            // Normalize for display
            let minVal = Infinity, maxVal = -Infinity;
            for (let i = 0; i < volumeData.length; i++) {
                if (volumeData[i] < minVal) minVal = volumeData[i];
                if (volumeData[i] > maxVal) maxVal = volumeData[i];
            }

            const normalizedData = new Float32Array(volumeData.length);
            const range = maxVal - minVal || 1;
            for (let i = 0; i < volumeData.length; i++) {
                normalizedData[i] = ((volumeData[i] - minVal) / range) * 255;
            }

            const volume: VolumeData = {
                dimensions: [cols, rows, dimZ],
                spacing: [1, 1, 1],
                origin: [0, 0, 0],
                data: normalizedData,
            };

            setVolumeData(volume);
            setAxialSlice(Math.floor(dimZ / 2));
            setSagittalSlice(Math.floor(cols / 2));
            setCoronalSlice(Math.floor(rows / 2));
            setWindowLevel(128);
            setWindowWidth(256);
            setLoadProgress(100);
            onLoad?.(volume);

        } catch (err: any) {
            console.error('Error loading DICOM series:', err);
            setError(err.message || 'Failed to load DICOM series');
        } finally {
            setIsLoading(false);
        }
    }, [parseDicomSlice, onLoad]);

    // Handle file upload - detect file type and route appropriately
    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // If multiple DICOM files selected, load as series
        if (files.length > 1) {
            const fileArray = Array.from(files);
            await loadDicomSeries(fileArray);
            return;
        }

        // Single file upload
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const filename = file.name.toLowerCase();
        const view = new DataView(arrayBuffer);

        // Check for NIfTI: .nii, .nii.gz
        const isNifti = filename.endsWith('.nii') || filename.endsWith('.nii.gz');

        // Check for DICOM: .dcm extension or DICM magic at offset 128
        const isDicomExt = filename.endsWith('.dcm');
        let hasDicomMagic = false;
        if (arrayBuffer.byteLength > 132) {
            const magic = String.fromCharCode(
                view.getUint8(128),
                view.getUint8(129),
                view.getUint8(130),
                view.getUint8(131)
            );
            hasDicomMagic = magic === 'DICM';
        }

        // Check for DICOM without preamble
        let hasDicomGroup = false;
        if (arrayBuffer.byteLength > 8) {
            const group = view.getUint16(0, true);
            hasDicomGroup = group === 0x0008 || group === 0x0002;
        }

        if (isNifti) {
            await loadNiftiFile(arrayBuffer, file.name);
        } else if (isDicomExt || hasDicomMagic || hasDicomGroup) {
            await loadDicomFile(arrayBuffer, file.name);
        } else {
            try {
                await loadDicomFile(arrayBuffer, file.name);
            } catch {
                await loadNiftiFile(arrayBuffer, file.name);
            }
        }
    }, [loadNiftiFile, loadDicomFile, loadDicomSeries]);

    // Load DICOM series from public folder
    const loadLocalDicomSeries = useCallback(async (seriesId: string) => {
        const series = LOCAL_DICOM_SERIES.series.find(s => s.id === seriesId);
        if (!series) return;

        setIsLoading(true);
        setError(null);
        setLoadProgress(5);

        try {
            // Load all DICOM files in the series
            const slices: { data: Uint8Array; index: number }[] = [];

            for (let i = 0; i < series.count; i++) {
                const filename = `MR${String(i).padStart(6, '0')}`;
                const url = `${LOCAL_DICOM_SERIES.basePath}/${series.folder}/${filename}`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) continue;

                    const buffer = await response.arrayBuffer();
                    const view = new DataView(buffer);

                    // Check DICOM magic number (DICM at offset 128)
                    let startOffset = 0;
                    let isDicom = false;

                    if (buffer.byteLength > 132) {
                        const magic = String.fromCharCode(
                            view.getUint8(128),
                            view.getUint8(129),
                            view.getUint8(130),
                            view.getUint8(131)
                        );
                        if (magic === 'DICM') {
                            isDicom = true;
                            startOffset = 132;
                        }
                    }

                    // Try without preamble - check for group 0008 (common DICOM start)
                    if (!isDicom && buffer.byteLength > 8) {
                        const group = view.getUint16(0, true);
                        // Group 0008 or 0002 are common starting groups
                        if (group === 0x0008 || group === 0x0002) {
                            isDicom = true;
                            startOffset = 0;
                        }
                    }

                    if (isDicom || buffer.byteLength > 50000) {
                        // Assume it's valid if large enough
                        // Simple DICOM parser - find pixel data
                        let offset = startOffset;
                        let rows = 256, cols = 256;
                        let bitsAllocated = 16;
                        let pixelDataOffset = -1;
                        let isImplicitVR = false;

                        // First pass: try explicit VR
                        while (offset < Math.min(buffer.byteLength - 8, 10000)) {
                            const group = view.getUint16(offset, true);
                            const element = view.getUint16(offset + 2, true);

                            // Check for valid VR characters (uppercase letters)
                            const char1 = view.getUint8(offset + 4);
                            const char2 = view.getUint8(offset + 5);
                            const isValidVR = (char1 >= 65 && char1 <= 90) && (char2 >= 65 && char2 <= 90);

                            if (!isValidVR && offset === startOffset) {
                                // Might be implicit VR
                                isImplicitVR = true;
                                break;
                            }

                            const vr = String.fromCharCode(char1, char2);
                            let valueLength, headerLength;

                            if (['OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN', 'OD', 'OL'].includes(vr)) {
                                valueLength = view.getUint32(offset + 8, true);
                                headerLength = 12;
                            } else {
                                valueLength = view.getUint16(offset + 6, true);
                                headerLength = 8;
                            }

                            // Rows (0028,0010)
                            if (group === 0x0028 && element === 0x0010) {
                                rows = view.getUint16(offset + headerLength, true);
                            }
                            // Cols (0028,0011)
                            if (group === 0x0028 && element === 0x0011) {
                                cols = view.getUint16(offset + headerLength, true);
                            }
                            // Bits Allocated (0028,0100)
                            if (group === 0x0028 && element === 0x0100) {
                                bitsAllocated = view.getUint16(offset + headerLength, true);
                            }
                            // Pixel Data (7FE0,0010)
                            if (group === 0x7FE0 && element === 0x0010) {
                                pixelDataOffset = offset + headerLength;
                                break;
                            }

                            offset += headerLength + valueLength;
                            if (valueLength === 0xFFFFFFFF || valueLength > buffer.byteLength) break;
                        }

                        // If explicit VR didn't work, try implicit VR
                        if (pixelDataOffset < 0 && isImplicitVR) {
                            offset = startOffset;
                            while (offset < buffer.byteLength - 8) {
                                const group = view.getUint16(offset, true);
                                const element = view.getUint16(offset + 2, true);
                                const valueLength = view.getUint32(offset + 4, true);
                                const headerLength = 8;

                                if (group === 0x0028 && element === 0x0010) {
                                    rows = view.getUint16(offset + headerLength, true);
                                }
                                if (group === 0x0028 && element === 0x0011) {
                                    cols = view.getUint16(offset + headerLength, true);
                                }
                                if (group === 0x0028 && element === 0x0100) {
                                    bitsAllocated = view.getUint16(offset + headerLength, true);
                                }
                                if (group === 0x7FE0 && element === 0x0010) {
                                    pixelDataOffset = offset + headerLength;
                                    break;
                                }

                                offset += headerLength + valueLength;
                                if (valueLength > buffer.byteLength) break;
                            }
                        }

                        // Fallback: assume pixel data is at a fixed offset from end
                        if (pixelDataOffset < 0 && rows > 0 && cols > 0) {
                            const expectedPixelSize = rows * cols * (bitsAllocated / 8);
                            if (buffer.byteLength > expectedPixelSize) {
                                pixelDataOffset = buffer.byteLength - expectedPixelSize;
                            }
                        }

                        if (pixelDataOffset > 0 && pixelDataOffset < buffer.byteLength) {
                            const pixelCount = rows * cols;
                            const pixelData = new Uint8Array(pixelCount);

                            for (let p = 0; p < pixelCount; p++) {
                                const byteOffset = pixelDataOffset + p * (bitsAllocated / 8);
                                if (byteOffset >= buffer.byteLength - 1) break;

                                if (bitsAllocated === 16) {
                                    const val = view.getInt16(byteOffset, true);
                                    // MRI typically uses different windowing
                                    pixelData[p] = Math.max(0, Math.min(255, val / 16 + 128));
                                } else {
                                    pixelData[p] = view.getUint8(byteOffset);
                                }
                            }

                            slices.push({ data: pixelData, index: i });
                            console.log(`Loaded slice ${i}: ${rows}x${cols}, ${slices.length} total`);
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to load slice ${i}`, e);
                }

                setLoadProgress(Math.floor((i / series.count) * 80) + 10);
            }

            if (slices.length === 0) {
                throw new Error('No valid DICOM slices found');
            }

            // Sort slices by index
            slices.sort((a, b) => a.index - b.index);

            // Assume square images for now, detect from first slice
            const firstSliceSize = slices[0].data.length;
            const dim = Math.sqrt(firstSliceSize);
            const dimX = Math.floor(dim);
            const dimY = Math.floor(dim);
            const dimZ = slices.length;

            // Combine into 3D volume
            const volumeData = new Float32Array(dimX * dimY * dimZ);
            for (let z = 0; z < dimZ; z++) {
                const sliceData = slices[z].data;
                for (let i = 0; i < sliceData.length && i < dimX * dimY; i++) {
                    volumeData[i + z * dimX * dimY] = sliceData[i];
                }
            }

            setLoadProgress(90);

            const volume: VolumeData = {
                dimensions: [dimX, dimY, dimZ],
                spacing: [1, 1, 1],
                origin: [0, 0, 0],
                data: volumeData,
            };

            setVolumeData(volume);
            setAxialSlice(Math.floor(dimZ / 2));
            setSagittalSlice(Math.floor(dimX / 2));
            setCoronalSlice(Math.floor(dimY / 2));
            setWindowLevel(128);
            setWindowWidth(256);
            setLoadProgress(100);
            onLoad?.(volume);

        } catch (err: any) {
            console.error('Error loading DICOM series:', err);
            setError(err.message || 'Failed to load DICOM series');
        } finally {
            setIsLoading(false);
        }
    }, [onLoad]);

    // Presets for window/level
    const applyPreset = (level: number, width: number) => {
        setWindowLevel(level);
        setWindowWidth(width);
    };

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {/* Toolbar - Responsive Layout */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-card border rounded-lg shadow-sm mb-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".nii,.nii.gz,.dcm"
                    multiple
                    className="hidden"
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 h-9">
                            <Upload className="h-4 w-4" />
                            <span className="hidden sm:inline">فایل</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>بارکردن</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            <div className="flex flex-col items-start gap-0.5">
                                <span>بارکردنی لە کۆمپیوتەر</span>
                                <span className="text-xs text-muted-foreground">بۆ 3D: چەند فایلێک هەڵبژێرە</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                            const url = prompt('URL ی فایل بنووسە:');
                            if (url) loadFromUrl(url);
                        }}>
                            <Download className="h-4 w-4 mr-2" />
                            بارکردن لە URL
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => generateSyntheticVolume('brain')}>
                            <Brain className="h-4 w-4 mr-2" />
                            مێشکی نموونە
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.open('https://www.rubomedical.com/dicom_files/', '_blank')}>
                            <div className="flex flex-col items-start gap-1">
                                <span className="font-medium">Rubo Medical (بەخۆڕایی)</span>
                                <span className="text-xs text-muted-foreground">نموونەی DICOM بەخۆڕایی</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open('https://www.cancerimagingarchive.net/', '_blank')}>
                            <div className="flex flex-col items-start gap-1">
                                <span className="font-medium">Cancer Imaging Archive</span>
                                <span className="text-xs text-muted-foreground">ئەرشیفی وێنەی پزیشکی (بەخۆڕایی)</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* View Mode Toggle - Icons only on mobile */}
                <div className="flex gap-1 p-1 bg-muted rounded-lg flex-1 sm:flex-none justify-center">
                    <Button
                        variant={viewMode === 'multiplanar' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('multiplanar')}
                        className="gap-1 flex-1 sm:flex-none h-8"
                    >
                        <Grid3X3 className="h-4 w-4" />
                        <span className="hidden sm:inline">MPR</span>
                    </Button>
                    <Button
                        variant={viewMode === '3d' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('3d')}
                        className="gap-1 flex-1 sm:flex-none h-8"
                        disabled
                    >
                        <Box className="h-4 w-4" />
                        <span className="hidden sm:inline">3D</span>
                    </Button>
                </div>

                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* Window/Level - Dropdown on small screens */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-9 ml-auto sm:ml-0">
                            <Layers3 className="h-4 w-4" />
                            <span className="hidden sm:inline">پەنجەرە</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Presets</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => applyPreset(128, 256)}>ئاسایی (Default)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset(40, 80)}>مێشک (Brain)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset(50, 350)}>شلی نەرم (Soft)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset(400, 1800)}>ئێسک (Bone)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset(-600, 1500)}>سییەکان (Lung)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Loading State */}
            {
                isLoading && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium">بارکردن...</p>
                            <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${loadProgress}%` }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{loadProgress}%</p>
                        </CardContent>
                    </Card>
                )
            }

            {/* Error State */}
            {
                error && (
                    <Card className="border-destructive">
                        <CardContent className="py-8 text-center">
                            <p className="text-destructive font-medium">هەڵە: {error}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                تکایە فایلێکی NIfTI (.nii, .nii.gz) یان DICOM (.dcm) بارکە
                            </p>
                        </CardContent>
                    </Card>
                )
            }

            {/* Empty State */}
            {
                !isLoading && !error && !volumeData && (
                    <Card className="mt-4">
                        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
                                <Layers3 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-2 text-center">بینەری 3D ی DICOM/NIfTI</h3>
                            <p className="text-muted-foreground text-center max-w-md mb-6 text-sm sm:text-base">
                                بارکردنی فایل یان بەکارهێنانی داتای تاقیکردنەوەی دروستکراو
                            </p>

                            {/* Test Volumes - No Download Required */}
                            <div className="mb-6">
                                <p className="text-sm font-medium mb-3 text-center flex items-center justify-center gap-1.5"><FlaskConical className="w-4 h-4 text-primary" /> داتای تاقیکردنەوە (بەبێ داگرتن):</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <Button
                                        onClick={() => generateSyntheticVolume('brain')}
                                        variant="default"
                                        className="gap-2"
                                    >
                                        <Brain className="w-4 h-4" /> مێشکی نموونە
                                    </Button>
                                    <Button
                                        onClick={() => generateSyntheticVolume('phantom')}
                                        variant="secondary"
                                        className="gap-2"
                                    >
                                        <Scan className="w-4 h-4" /> فانتۆم (CT)
                                    </Button>
                                    <Button
                                        onClick={() => generateSyntheticVolume('sphere')}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <CircleDot className="w-4 h-4" /> گۆی سادە
                                    </Button>
                                </div>
                            </div>

                            <div className="h-px w-full max-w-md bg-border my-4" />

                            {/* Real DICOM Data from Public Folder */}
                            <div className="mb-6">
                                <p className="text-sm font-medium mb-3 text-center flex items-center justify-center gap-1.5"><Hospital className="w-4 h-4 text-primary" /> داتای DICOM ی ڕاستەقینە (MRI):</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {LOCAL_DICOM_SERIES.series.map((series) => (
                                        <Button
                                            key={series.id}
                                            onClick={() => loadLocalDicomSeries(series.id)}
                                            variant="default"
                                            size="sm"
                                            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 w-full sm:w-auto text-xs sm:text-sm"
                                        >
                                            <Brain className="w-4 h-4" /> {series.name} ({series.count})
                                        </Button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    ئەم داتایەی لە فۆڵدەری public/DICOM دایە
                                </p>
                            </div>

                            <div className="h-px w-full max-w-xs bg-border my-4" />

                            {/* File Upload */}
                            <p className="text-sm text-muted-foreground mb-2">یان فایلی خۆت بار بکە:</p>
                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                                <Upload className="h-4 w-4" />
                                بارکردنی فایل
                            </Button>
                        </CardContent>
                    </Card>
                )
            }

            {/* Multiplanar View */}
            {
                !isLoading && volumeData && viewMode === 'multiplanar' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <SliceView
                                    volumeData={volumeData}
                                    axis="axial"
                                    sliceIndex={axialSlice}
                                    onSliceChange={setAxialSlice}
                                    windowLevel={windowLevel}
                                    windowWidth={windowWidth}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <SliceView
                                    volumeData={volumeData}
                                    axis="sagittal"
                                    sliceIndex={sagittalSlice}
                                    onSliceChange={setSagittalSlice}
                                    windowLevel={windowLevel}
                                    windowWidth={windowWidth}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <SliceView
                                    volumeData={volumeData}
                                    axis="coronal"
                                    sliceIndex={coronalSlice}
                                    onSliceChange={setCoronalSlice}
                                    windowLevel={windowLevel}
                                    windowWidth={windowWidth}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Window/Level Controls - Stack on mobile */}
            {
                volumeData && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Window Level (ئاست)</span>
                                        <span className="font-mono">{windowLevel}</span>
                                    </div>
                                    <Slider
                                        value={[windowLevel]}
                                        onValueChange={([v]) => setWindowLevel(v)}
                                        min={0}
                                        max={255}
                                        step={1}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Window Width (پانی)</span>
                                        <span className="font-mono">{windowWidth}</span>
                                    </div>
                                    <Slider
                                        value={[windowWidth]}
                                        onValueChange={([v]) => setWindowWidth(v)}
                                        min={1}
                                        max={512}
                                        step={1}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
};

export default DicomViewer3D;
