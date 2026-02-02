import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
    ZoomIn, ZoomOut, RotateCcw, RotateCw, Sun, Contrast, Eye,
    Maximize2, Circle, ArrowUpRight, Type, Eraser,
    Download, Bone, Brain, Heart, Wind, Layers,
    MousePointer2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

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
    icon: React.ElementType;
    brightness: number;
    contrast: number;
    invert: boolean;
}

interface MedicalImageViewerProps {
    src: string;
    alt: string;
    className?: string;
    enableAnnotations?: boolean;
    initialAnnotations?: Annotation[];
    onAnnotationsChange?: (annotations: Annotation[]) => void;
}

// ============================================
// WINDOW PRESETS
// ============================================

const WINDOW_PRESETS: WindowPreset[] = [
    { name: 'Default', nameKu: 'ئاسایی', icon: Layers, brightness: 100, contrast: 100, invert: false },
    { name: 'Bone', nameKu: 'ئێسک', icon: Bone, brightness: 60, contrast: 200, invert: false },
    { name: 'Soft Tissue', nameKu: 'شلی نەرم', icon: Heart, brightness: 100, contrast: 140, invert: false },
    { name: 'Brain', nameKu: 'مێشک', icon: Brain, brightness: 110, contrast: 160, invert: false },
    { name: 'Lung', nameKu: 'سی', icon: Wind, brightness: 130, contrast: 120, invert: false },
    { name: 'Negative', nameKu: 'نێگەتیڤ', icon: Eye, brightness: 100, contrast: 100, invert: true },
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);

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
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();

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
                        const textMetrics = ctx.measureText(ann.text);
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(
                            ann.points[0].x - 4,
                            ann.points[0].y - 16,
                            textMetrics.width + 8,
                            22
                        );
                        ctx.fillStyle = ann.color;
                        ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
                    }
                    break;
            }
        });
    }, [annotations, currentAnnotation]);

    // Download Image
    const downloadImage = () => {
        const link = document.createElement('a');
        link.download = `medical-image-${Date.now()}.png`;
        link.href = src;
        link.click();
    };

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
                disabled={currentTool !== 'pan'}
                panning={{ disabled: currentTool !== 'pan' }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <div className="flex flex-col gap-4">
                        {/* Image Container - Clean, no overlays */}
                        <div
                            ref={imageContainerRef}
                            className="relative overflow-hidden rounded-xl bg-black border border-border shadow-xl"
                        >
                            <TransformComponent
                                wrapperClass="!w-full"
                                contentClass="!w-full flex items-center justify-center min-h-[300px] md:min-h-[400px]"
                            >
                                <div className="relative">
                                    <img
                                        src={src}
                                        alt={alt}
                                        style={filterStyle}
                                        className="max-h-[400px] md:max-h-[500px] w-auto object-contain cursor-grab active:cursor-grabbing select-none"
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

                        {/* External Controls Panel */}
                        <div className="p-4 md:p-5 rounded-xl bg-card border border-border">
                            {/* Preset Buttons */}
                            <div className="mb-4">
                                <p className="text-xs text-muted-foreground mb-2">پەنجەرەی وێنەگرتن / Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {WINDOW_PRESETS.map((preset) => {
                                        const PresetIcon = preset.icon;
                                        return (
                                            <Button
                                                key={preset.name}
                                                variant={activePreset === preset.name ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => applyPreset(preset)}
                                                className={cn(
                                                    "gap-2 text-xs",
                                                    activePreset === preset.name && "bg-primary/20 border-primary/50"
                                                )}
                                            >
                                                <PresetIcon className="w-3 h-3" />
                                                <span className="hidden sm:inline">{preset.nameKu}</span>
                                                <span className="sm:hidden">{preset.name.slice(0, 4)}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Sun className="h-4 w-4" /> ڕووناکی
                                        </span>
                                        <span className="font-medium">{brightness}%</span>
                                    </div>
                                    <Slider
                                        value={[brightness]}
                                        onValueChange={(v) => { setBrightness(v[0]); setActivePreset('Custom'); }}
                                        min={20} max={200} step={5}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Contrast className="h-4 w-4" /> کۆنتراست
                                        </span>
                                        <span className="font-medium">{contrast}%</span>
                                    </div>
                                    <Slider
                                        value={[contrast]}
                                        onValueChange={(v) => { setContrast(v[0]); setActivePreset('Custom'); }}
                                        min={50} max={300} step={5}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => zoomOut()} className="h-8 w-8">
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => zoomIn()} className="h-8 w-8">
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="w-px h-6 bg-border" />
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => setRotation(r => r - 90)} className="h-8 w-8">
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setRotation(r => r + 90)} className="h-8 w-8">
                                        <RotateCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="w-px h-6 bg-border" />
                                <Button
                                    variant={inverted ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setInverted(!inverted)}
                                    className="gap-2"
                                >
                                    <Eye className="h-4 w-4" />
                                    {inverted ? 'نێگەتیڤ' : 'ئاسایی'}
                                </Button>
                                <div className="flex-1" />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={downloadImage}
                                    className="h-8 w-8"
                                    title="Download"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { resetTransform(); resetFilters(); }}
                                    className="gap-2"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                    ڕیسێت
                                </Button>
                            </div>
                        </div>

                        {/* Annotation Toolbar (Admin Only) - External */}
                        {enableAnnotations && (
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <p className="text-xs text-muted-foreground mb-3">ئامڕازەکانی نیشانەکردن / Annotation Tools</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant={currentTool === 'pan' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentTool('pan')}
                                        className="gap-2"
                                    >
                                        <MousePointer2 className="h-4 w-4" />
                                        <span className="hidden sm:inline">جوڵاندن</span>
                                    </Button>
                                    <Button
                                        variant={currentTool === 'arrow' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentTool('arrow')}
                                        className="gap-2"
                                    >
                                        <ArrowUpRight className="h-4 w-4" />
                                        <span className="hidden sm:inline">تیر</span>
                                    </Button>
                                    <Button
                                        variant={currentTool === 'circle' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentTool('circle')}
                                        className="gap-2"
                                    >
                                        <Circle className="h-4 w-4" />
                                        <span className="hidden sm:inline">بازنە</span>
                                    </Button>
                                    <Button
                                        variant={currentTool === 'freehand' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentTool('freehand')}
                                        className="gap-2"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        <span className="hidden sm:inline">کێشان</span>
                                    </Button>
                                    <Button
                                        variant={currentTool === 'text' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentTool('text')}
                                        className="gap-2"
                                    >
                                        <Type className="h-4 w-4" />
                                        <span className="hidden sm:inline">نووسین</span>
                                    </Button>

                                    <div className="w-px h-6 bg-border" />

                                    {/* Color Picker */}
                                    <div className="flex gap-1">
                                        {ANNOTATION_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => setAnnotationColor(color.value)}
                                                className={cn(
                                                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                                                    annotationColor === color.value ? "border-foreground scale-110" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color.value }}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex-1" />

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={clearAnnotations}
                                        className="gap-2"
                                    >
                                        <Eraser className="h-4 w-4" />
                                        <span className="hidden sm:inline">سڕینەوە</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </TransformWrapper>
        </div>
    );
};

export default MedicalImageViewer;
