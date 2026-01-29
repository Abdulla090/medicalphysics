import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
    ZoomIn, ZoomOut, RotateCcw, RotateCw, Sun, Contrast, Eye,
    Maximize2, Move, Circle, ArrowUpRight, Type, Eraser,
    Download, Bone, Brain, Heart, Wind, Layers, ChevronDown,
    MousePointer2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ============================================
// TYPES
// ============================================

interface Annotation {
    id: string;
    type: 'arrow' | 'circle' | 'text' | 'freehand';
    points: { x: number; y: number }[];
    text?: string;
    color: string;
}

interface WindowPreset {
    name: string;
    nameKu: string;
    icon: React.ReactNode;
    brightness: number;
    contrast: number;
    invert: boolean;
    description: string;
}

interface MedicalImageViewerProps {
    src: string;
    alt: string;
    className?: string;
    enableAnnotations?: boolean; // Admin feature
    initialAnnotations?: Annotation[];
    onAnnotationsChange?: (annotations: Annotation[]) => void;
}

// ============================================
// WINDOW PRESETS (Simulating CT/MRI Windows)
// ============================================

const WINDOW_PRESETS: WindowPreset[] = [
    {
        name: 'Default',
        nameKu: 'ئاسایی',
        icon: <Layers className="h-4 w-4" />,
        brightness: 100,
        contrast: 100,
        invert: false,
        description: 'Standard view'
    },
    {
        name: 'Bone Window',
        nameKu: 'پەنجەرەی ئێسک',
        icon: <Bone className="h-4 w-4" />,
        brightness: 60,
        contrast: 200,
        invert: false,
        description: 'High contrast for bone structures (WW: 2000, WL: 500)'
    },
    {
        name: 'Soft Tissue',
        nameKu: 'شلی نەرم',
        icon: <Heart className="h-4 w-4" />,
        brightness: 100,
        contrast: 140,
        invert: false,
        description: 'Optimal for soft tissue visualization (WW: 400, WL: 40)'
    },
    {
        name: 'Brain Window',
        nameKu: 'پەنجەرەی مێشک',
        icon: <Brain className="h-4 w-4" />,
        brightness: 110,
        contrast: 160,
        invert: false,
        description: 'Optimized for brain CT (WW: 80, WL: 40)'
    },
    {
        name: 'Lung Window',
        nameKu: 'پەنجەرەی سییەکان',
        icon: <Wind className="h-4 w-4" />,
        brightness: 130,
        contrast: 120,
        invert: false,
        description: 'Wide window for lung parenchyma (WW: 1500, WL: -600)'
    },
    {
        name: 'Negative/Invert',
        nameKu: 'نێگەتیڤ',
        icon: <Eye className="h-4 w-4" />,
        brightness: 100,
        contrast: 100,
        invert: true,
        description: 'Inverted colors like traditional X-ray film'
    },
];

// ============================================
// ANNOTATION COLORS
// ============================================

const ANNOTATION_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'White', value: '#ffffff' },
];

// ============================================
// MAIN COMPONENT
// ============================================

const MedicalImageViewer: React.FC<MedicalImageViewerProps> = ({
    src,
    alt,
    className,
    enableAnnotations = false,
    initialAnnotations = [],
    onAnnotationsChange
}) => {
    // Image adjustment states
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [inverted, setInverted] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [activePreset, setActivePreset] = useState<string>('Default');

    // Annotation states
    const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
    const [currentTool, setCurrentTool] = useState<'pan' | 'arrow' | 'circle' | 'text' | 'freehand'>('pan');
    const [annotationColor, setAnnotationColor] = useState('#ef4444');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Apply window preset
    const applyPreset = (preset: WindowPreset) => {
        setBrightness(preset.brightness);
        setContrast(preset.contrast);
        setInverted(preset.invert);
        setActivePreset(preset.name);
    };

    // Reset all adjustments
    const resetFilters = () => {
        setBrightness(100);
        setContrast(100);
        setInverted(false);
        setRotation(0);
        setActivePreset('Default');
    };

    // Rotate image
    const rotateImage = (degrees: number) => {
        setRotation((prev) => (prev + degrees) % 360);
    };

    // Filter style for the image
    const filterStyle = {
        filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${inverted ? 1 : 0})`,
        transform: `rotate(${rotation}deg)`,
        transition: 'filter 0.2s ease-out, transform 0.3s ease-out',
    };

    // ============================================
    // ANNOTATION DRAWING LOGIC
    // ============================================

    const getRelativeCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * canvas.width,
            y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
    }, []);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentTool === 'pan') return;

        const coords = getRelativeCoords(e);
        setIsDrawing(true);

        if (currentTool === 'text') {
            setTextPosition(coords);
            return;
        }

        const newAnnotation: Annotation = {
            id: Date.now().toString(),
            type: currentTool,
            points: [coords],
            color: annotationColor,
        };
        setCurrentAnnotation(newAnnotation);
    }, [currentTool, annotationColor, getRelativeCoords]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentAnnotation || currentTool === 'pan' || currentTool === 'text') return;

        const coords = getRelativeCoords(e);

        if (currentTool === 'freehand') {
            setCurrentAnnotation(prev => prev ? {
                ...prev,
                points: [...prev.points, coords]
            } : null);
        } else {
            // For arrow and circle, we only need start and end points
            setCurrentAnnotation(prev => prev ? {
                ...prev,
                points: [prev.points[0], coords]
            } : null);
        }
    }, [isDrawing, currentAnnotation, currentTool, getRelativeCoords]);

    const handleCanvasMouseUp = useCallback(() => {
        if (currentAnnotation && currentTool !== 'text') {
            const newAnnotations = [...annotations, currentAnnotation];
            setAnnotations(newAnnotations);
            onAnnotationsChange?.(newAnnotations);
        }
        setIsDrawing(false);
        setCurrentAnnotation(null);
    }, [currentAnnotation, annotations, currentTool, onAnnotationsChange]);

    const handleTextSubmit = () => {
        if (textInput && textPosition) {
            const newAnnotation: Annotation = {
                id: Date.now().toString(),
                type: 'text',
                points: [textPosition],
                text: textInput,
                color: annotationColor,
            };
            const newAnnotations = [...annotations, newAnnotation];
            setAnnotations(newAnnotations);
            onAnnotationsChange?.(newAnnotations);
            setTextInput('');
            setTextPosition(null);
        }
    };

    const clearAnnotations = () => {
        setAnnotations([]);
        onAnnotationsChange?.([]);
    };

    // ============================================
    // CANVAS RENDERING
    // ============================================

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all saved annotations
        [...annotations, currentAnnotation].filter(Boolean).forEach((ann) => {
            if (!ann) return;

            ctx.strokeStyle = ann.color;
            ctx.fillStyle = ann.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            switch (ann.type) {
                case 'arrow':
                    if (ann.points.length >= 2) {
                        const [start, end] = ann.points;
                        // Draw line
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();

                        // Draw arrowhead
                        const angle = Math.atan2(end.y - start.y, end.x - start.x);
                        const headLength = 15;
                        ctx.beginPath();
                        ctx.moveTo(end.x, end.y);
                        ctx.lineTo(
                            end.x - headLength * Math.cos(angle - Math.PI / 6),
                            end.y - headLength * Math.sin(angle - Math.PI / 6)
                        );
                        ctx.moveTo(end.x, end.y);
                        ctx.lineTo(
                            end.x - headLength * Math.cos(angle + Math.PI / 6),
                            end.y - headLength * Math.sin(angle + Math.PI / 6)
                        );
                        ctx.stroke();
                    }
                    break;

                case 'circle':
                    if (ann.points.length >= 2) {
                        const [center, edge] = ann.points;
                        const radius = Math.sqrt(
                            Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
                        );
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                    break;

                case 'freehand':
                    if (ann.points.length >= 2) {
                        ctx.beginPath();
                        ctx.moveTo(ann.points[0].x, ann.points[0].y);
                        ann.points.forEach((point) => {
                            ctx.lineTo(point.x, point.y);
                        });
                        ctx.stroke();
                    }
                    break;

                case 'text':
                    if (ann.points.length >= 1 && ann.text) {
                        ctx.font = 'bold 16px Inter, sans-serif';
                        // Draw background
                        const textMetrics = ctx.measureText(ann.text);
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(
                            ann.points[0].x - 4,
                            ann.points[0].y - 16,
                            textMetrics.width + 8,
                            22
                        );
                        // Draw text
                        ctx.fillStyle = ann.color;
                        ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
                    }
                    break;
            }
        });
    }, [annotations, currentAnnotation]);

    // ============================================
    // DOWNLOAD IMAGE
    // ============================================

    const downloadImage = () => {
        const container = imageContainerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        // For now, just download the original with a note
        const link = document.createElement('a');
        link.download = `medical-image-${Date.now()}.png`;
        link.href = src;
        link.click();
    };

    return (
        <div className={cn("relative overflow-hidden rounded-xl bg-black border border-border shadow-xl", className)}>
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
                disabled={currentTool !== 'pan'}
                panning={{ disabled: currentTool !== 'pan' }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <div className="relative w-full h-full flex flex-col">
                        {/* Main Image Area */}
                        <div
                            ref={imageContainerRef}
                            className="flex-1 w-full relative bg-gradient-to-br from-gray-900 to-black"
                        >
                            <TransformComponent
                                wrapperClass="!w-full !h-full flex items-center justify-center min-h-[400px]"
                                contentClass="!w-full !h-full flex items-center justify-center relative"
                            >
                                <div className="relative">
                                    <img
                                        src={src}
                                        alt={alt}
                                        style={filterStyle}
                                        className="max-h-[600px] w-auto object-contain cursor-grab active:cursor-grabbing select-none"
                                        draggable={false}
                                    />
                                    {/* Annotation Canvas Overlay */}
                                    {enableAnnotations && (
                                        <canvas
                                            ref={canvasRef}
                                            width={800}
                                            height={600}
                                            className={cn(
                                                "absolute inset-0 w-full h-full",
                                                currentTool !== 'pan' && "cursor-crosshair"
                                            )}
                                            onMouseDown={handleCanvasMouseDown}
                                            onMouseMove={handleCanvasMouseMove}
                                            onMouseUp={handleCanvasMouseUp}
                                            onMouseLeave={handleCanvasMouseUp}
                                        />
                                    )}
                                </div>
                            </TransformComponent>

                            {/* Text Input Modal */}
                            {textPosition && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 p-4 rounded-lg border border-white/20 z-50">
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Enter annotation text..."
                                        className="bg-white/10 text-white px-3 py-2 rounded border border-white/20 focus:outline-none focus:border-primary w-64"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <Button size="sm" onClick={handleTextSubmit}>Add</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setTextPosition(null)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Toolbar */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
                            {/* Window Presets Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-black/70 backdrop-blur border-white/20 text-white hover:bg-black/90 gap-2"
                                    >
                                        <Layers className="h-4 w-4" />
                                        {activePreset}
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 bg-black/95 border-white/20 text-white">
                                    <DropdownMenuLabel className="text-gray-400">
                                        پەنجەرەی وێنەگرتن / Window Presets
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    {WINDOW_PRESETS.map((preset) => (
                                        <DropdownMenuItem
                                            key={preset.name}
                                            onClick={() => applyPreset(preset)}
                                            className={cn(
                                                "flex items-center gap-3 cursor-pointer hover:bg-white/10",
                                                activePreset === preset.name && "bg-primary/20 text-primary"
                                            )}
                                        >
                                            {preset.icon}
                                            <div className="flex-1">
                                                <div className="font-medium">{preset.nameKu}</div>
                                                <div className="text-xs text-gray-400">{preset.name}</div>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Right side controls */}
                            <div className="flex gap-2">
                                {/* Download */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="bg-black/70 backdrop-blur border-white/20 text-white hover:bg-black/90 h-8 w-8"
                                    onClick={downloadImage}
                                    title="Download Image"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>

                                {/* Toggle Controls */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-black/70 backdrop-blur border-white/20 text-white hover:bg-black/90"
                                    onClick={() => setIsControlsVisible(!isControlsVisible)}
                                >
                                    {isControlsVisible ? 'Hide' : 'Show'} Controls
                                </Button>
                            </div>
                        </div>

                        {/* Annotation Toolbar (Admin Only) */}
                        {enableAnnotations && (
                            <div className="absolute top-16 left-4 flex flex-col gap-2 z-20">
                                <div className="bg-black/80 backdrop-blur-md rounded-xl p-2 border border-white/10 flex flex-col gap-1">
                                    <Button
                                        variant={currentTool === 'pan' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        onClick={() => setCurrentTool('pan')}
                                        className="h-9 w-9 text-white"
                                        title="Pan/Move"
                                    >
                                        <MousePointer2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={currentTool === 'arrow' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        onClick={() => setCurrentTool('arrow')}
                                        className="h-9 w-9 text-white"
                                        title="Draw Arrow"
                                    >
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={currentTool === 'circle' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        onClick={() => setCurrentTool('circle')}
                                        className="h-9 w-9 text-white"
                                        title="Draw Circle"
                                    >
                                        <Circle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={currentTool === 'freehand' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        onClick={() => setCurrentTool('freehand')}
                                        className="h-9 w-9 text-white"
                                        title="Freehand Draw"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={currentTool === 'text' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        onClick={() => setCurrentTool('text')}
                                        className="h-9 w-9 text-white"
                                        title="Add Text"
                                    >
                                        <Type className="h-4 w-4" />
                                    </Button>

                                    <div className="h-px bg-white/20 my-1" />

                                    {/* Color Picker */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9"
                                            >
                                                <div
                                                    className="h-5 w-5 rounded-full border-2 border-white"
                                                    style={{ backgroundColor: annotationColor }}
                                                />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-black/95 border-white/20 min-w-0">
                                            <div className="flex gap-1 p-1">
                                                {ANNOTATION_COLORS.map((color) => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => setAnnotationColor(color.value)}
                                                        className={cn(
                                                            "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                                                            annotationColor === color.value ? "border-white scale-110" : "border-transparent"
                                                        )}
                                                        style={{ backgroundColor: color.value }}
                                                    />
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div className="h-px bg-white/20 my-1" />

                                    {/* Clear Annotations */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={clearAnnotations}
                                        className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                        title="Clear All Annotations"
                                    >
                                        <Eraser className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Bottom Controls Panel */}
                        <div className={cn(
                            "absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white transition-all duration-300 w-[95%] max-w-[600px] z-10",
                            !isControlsVisible && "opacity-0 pointer-events-none translate-y-4"
                        )}>
                            <div className="flex flex-col gap-4">
                                {/* Top Row: Zoom, Rotate & Quick Actions */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => zoomOut()} className="h-8 w-8 hover:bg-white/20 text-white">
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => zoomIn()} className="h-8 w-8 hover:bg-white/20 text-white">
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                        <div className="w-px h-6 bg-white/20 mx-1" />
                                        <Button size="icon" variant="ghost" onClick={() => rotateImage(-90)} className="h-8 w-8 hover:bg-white/20 text-white" title="Rotate Left">
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => rotateImage(90)} className="h-8 w-8 hover:bg-white/20 text-white" title="Rotate Right">
                                            <RotateCw className="h-4 w-4" />
                                        </Button>
                                        <div className="w-px h-6 bg-white/20 mx-1" />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => { resetTransform(); resetFilters(); }}
                                            className="h-8 w-8 hover:bg-white/20 text-white"
                                            title="Reset All"
                                        >
                                            <Maximize2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={inverted ? "secondary" : "ghost"}
                                        onClick={() => setInverted(!inverted)}
                                        className="text-white hover:bg-white/20 h-8 text-xs gap-2"
                                    >
                                        <Eye className="h-3 w-3" />
                                        {inverted ? 'نێگەتیڤ' : 'ئاسایی'}
                                    </Button>
                                </div>

                                {/* Bottom Row: Sliders */}
                                <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/10">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> ڕووناکی / Brightness</span>
                                            <span>{brightness}%</span>
                                        </div>
                                        <Slider
                                            value={[brightness]}
                                            onValueChange={(v) => { setBrightness(v[0]); setActivePreset('Custom'); }}
                                            min={20} max={200} step={5}
                                            className="py-1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><Contrast className="h-3 w-3" /> کۆنتراست / Contrast</span>
                                            <span>{contrast}%</span>
                                        </div>
                                        <Slider
                                            value={[contrast]}
                                            onValueChange={(v) => { setContrast(v[0]); setActivePreset('Custom'); }}
                                            min={50} max={300} step={5}
                                            className="py-1"
                                        />
                                    </div>
                                </div>

                                {/* Active Preset Indicator */}
                                <div className="text-center text-xs text-gray-500">
                                    مۆدی ئێستا: <span className="text-primary font-medium">{activePreset}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </TransformWrapper>
        </div>
    );
};

export default MedicalImageViewer;
