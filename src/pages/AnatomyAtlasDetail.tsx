import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import PageLayout from '@/components/PageLayout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Stethoscope,
    Lightbulb, ZoomIn, ZoomOut, RotateCcw, RotateCw, Sun, Contrast, Eye,
    Maximize2, ScanLine, Layers, Magnet, Activity, LucideIcon, Loader2,
    Bone, Brain, Heart, Wind
} from 'lucide-react';
import { getDeviceById as getStaticDevice } from '@/data/anatomyAtlasData';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Icon mapping
const deviceIconMap: Record<string, LucideIcon> = {
    scan: ScanLine,
    layers: Layers,
    magnet: Magnet,
    activity: Activity
};

// Window Presets
const WINDOW_PRESETS = [
    { name: 'Default', nameKu: 'ئاسایی', icon: Layers, brightness: 100, contrast: 100, invert: false },
    { name: 'Bone', nameKu: 'ئێسک', icon: Bone, brightness: 60, contrast: 200, invert: false },
    { name: 'Soft Tissue', nameKu: 'شلی نەرم', icon: Heart, brightness: 100, contrast: 140, invert: false },
    { name: 'Brain', nameKu: 'مێشک', icon: Brain, brightness: 110, contrast: 160, invert: false },
    { name: 'Lung', nameKu: 'سی', icon: Wind, brightness: 130, contrast: 120, invert: false },
    { name: 'Negative', nameKu: 'نێگەتیڤ', icon: Eye, brightness: 100, contrast: 100, invert: true },
];

// UI Translations
const uiText = {
    en: {
        back: 'Back to Devices',
        keyStructures: 'Key Structures',
        clinicalNotes: 'Clinical Notes',
        viewerTip: 'Use mouse wheel to zoom, drag to pan',
        noData: 'Part not found',
        prevPart: 'Previous',
        nextPart: 'Next',
        selectPart: 'Select a part to view',
        parts: 'Available Parts',
        loading: 'Loading...',
        brightness: 'Brightness',
        contrast: 'Contrast',
        presets: 'Presets',
        controls: 'Image Controls',
        zoom: 'Zoom',
        rotate: 'Rotate',
        reset: 'Reset'
    },
    ku: {
        back: 'گەڕانەوە بۆ ئامێرەکان',
        keyStructures: 'پێکهاتە سەرەکییەکان',
        clinicalNotes: 'تێبینییە کلینیکییەکان',
        viewerTip: 'چەرخی ماوس بۆ زووم، ڕاکێشان بۆ جوڵاندن',
        noData: 'بەش نەدۆزرایەوە',
        prevPart: 'پێشتر',
        nextPart: 'دواتر',
        selectPart: 'بەشێک هەڵبژێرە بۆ بینین',
        parts: 'بەشە بەردەستەکان',
        loading: 'چاوەڕوانبە...',
        brightness: 'ڕووناکی',
        contrast: 'کۆنتراست',
        presets: 'مۆدەکان',
        controls: 'کۆنتڕۆڵی وێنە',
        zoom: 'زووم',
        rotate: 'سوڕانەوە',
        reset: 'ڕیسێت'
    }
};

export default function AnatomyAtlasDetail() {
    const { deviceId } = useParams<{ deviceId: string }>();
    const { language, isRTL } = useLanguage();
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
    const t = uiText[language];

    // Image adjustment states
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [inverted, setInverted] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [activePreset, setActivePreset] = useState('Default');

    // Fetch from Convex
    const convexDevice = useQuery(api.anatomy.getAnatomyDeviceById, deviceId ? { deviceId } : "skip");
    const convexParts = useQuery(api.anatomy.getPublishedAnatomyPartsByDevice, deviceId ? { deviceId } : "skip");

    // Fallback to static data
    const staticDevice = deviceId ? getStaticDevice(deviceId as any) : null;

    // Determine which data to use
    const device = convexDevice || (staticDevice ? {
        deviceId: staticDevice.id,
        title: staticDevice.title,
        titleKu: staticDevice.titleKu,
        description: staticDevice.description,
        descriptionKu: staticDevice.descriptionKu,
        icon: staticDevice.icon,
        color: staticDevice.color
    } : null);

    const parts = (convexParts && convexParts.length > 0)
        ? convexParts.map(p => ({
            id: p.partId,
            title: p.title,
            titleKu: p.titleKu,
            description: p.description,
            descriptionKu: p.descriptionKu,
            imageUrl: p.imageUrl || '',
            keyStructures: p.keyStructures,
            clinicalNotes: p.clinicalNotes
        }))
        : staticDevice?.parts || [];

    // Auto-select first part
    useEffect(() => {
        if (parts.length > 0 && !selectedPartId) {
            setSelectedPartId(parts[0].id);
        }
    }, [parts, selectedPartId]);

    // Apply preset
    const applyPreset = (preset: typeof WINDOW_PRESETS[0]) => {
        setBrightness(preset.brightness);
        setContrast(preset.contrast);
        setInverted(preset.invert);
        setActivePreset(preset.name);
    };

    // Reset all
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

    if (!device) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/50 text-xl mb-4">{t.loading}</p>
                    <Link to="/anatomy/atlas">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">{t.back}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const IconComponent = deviceIconMap[device.icon] || ScanLine;
    const selectedPart = selectedPartId ? parts.find((p: any) => p.id === selectedPartId) : null;
    const currentIndex = selectedPart ? parts.findIndex((p: any) => p.id === selectedPartId) : -1;
    const prevPart = currentIndex > 0 ? parts[currentIndex - 1] : null;
    const nextPart = currentIndex < parts.length - 1 ? parts[currentIndex + 1] : null;

    return (
        <PageLayout className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isRTL ? 'rtl' : 'ltr'}`} showBreadcrumbs={false}>

            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <main className="relative z-10">
                {/* Top Bar */}
                <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
                    <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        <Link to="/anatomy/atlas" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group">
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-sm font-medium hidden sm:inline">{t.back}</span>
                        </Link>

                        {/* Part Navigation */}
                        {selectedPart && (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" disabled={!prevPart} onClick={() => prevPart && setSelectedPartId(prevPart.id)}
                                    className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 gap-1">
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t.prevPart}</span>
                                </Button>
                                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                    <span className="text-sm text-white/80 font-medium">{currentIndex + 1} / {parts.length}</span>
                                </div>
                                <Button variant="ghost" size="sm" disabled={!nextPart} onClick={() => nextPart && setSelectedPartId(nextPart.id)}
                                    className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 gap-1">
                                    <span className="hidden sm:inline">{t.nextPart}</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <div className="w-[100px]" />
                    </div>
                </div>

                <div className="container max-w-7xl mx-auto px-4 py-6">
                    {/* Device Title */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${device.color} flex items-center justify-center text-white`}>
                                <IconComponent className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white">
                                    {language === 'ku' ? device.titleKu : device.title}
                                </h1>
                                <p className="text-sm text-white/50">{language === 'ku' ? device.descriptionKu : device.description}</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Parts Sidebar */}
                        <div className="lg:col-span-1">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                className="sticky top-24 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                                <h3 className="text-sm font-medium text-white/60 mb-3">{t.parts}</h3>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                    {parts.map((part: any, idx: number) => (
                                        <motion.button
                                            key={part.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => setSelectedPartId(part.id)}
                                            className={`w-full text-left p-3 rounded-xl transition-all ${selectedPartId === part.id
                                                ? `bg-gradient-to-r ${device.color} text-white`
                                                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{language === 'ku' ? part.titleKu : part.title}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-3">
                            <AnimatePresence mode="wait">
                                {selectedPart ? (
                                    <motion.div key={selectedPart.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                        {/* Part Title */}
                                        <div className="mb-4">
                                            <h2 className="text-xl md:text-2xl font-bold text-white">
                                                {language === 'ku' ? selectedPart.titleKu : selectedPart.title}
                                            </h2>
                                            <p className="text-sm text-white/60 mt-1">
                                                {language === 'ku' ? selectedPart.descriptionKu : selectedPart.description}
                                            </p>
                                        </div>

                                        {/* Image Viewer - Clean, no overlays */}
                                        {selectedPart.imageUrl && (
                                            <TransformWrapper
                                                initialScale={1}
                                                minScale={0.5}
                                                maxScale={8}
                                                centerOnInit
                                            >
                                                {({ zoomIn, zoomOut, resetTransform }) => (
                                                    <div className="space-y-4">
                                                        {/* Image Container */}
                                                        <div className="relative rounded-2xl overflow-hidden bg-black/50 backdrop-blur-xl border border-white/10">
                                                            <TransformComponent
                                                                wrapperClass="!w-full"
                                                                contentClass="!w-full flex items-center justify-center"
                                                            >
                                                                <img
                                                                    src={selectedPart.imageUrl}
                                                                    alt={selectedPart.title}
                                                                    style={filterStyle}
                                                                    className="w-full h-[400px] md:h-[500px] object-contain cursor-grab active:cursor-grabbing select-none"
                                                                    draggable={false}
                                                                />
                                                            </TransformComponent>
                                                        </div>

                                                        {/* External Controls Panel */}
                                                        <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                                                            <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                                                                <Layers className="w-4 h-4" />
                                                                {t.controls}
                                                            </h3>

                                                            {/* Preset Buttons */}
                                                            <div className="mb-5">
                                                                <p className="text-xs text-white/40 mb-2">{t.presets}</p>
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
                                                                                    "gap-2 text-white border border-white/10",
                                                                                    activePreset === preset.name && "bg-cyan-500/20 border-cyan-500/50"
                                                                                )}
                                                                            >
                                                                                <PresetIcon className="w-4 h-4" />
                                                                                {language === 'ku' ? preset.nameKu : preset.name}
                                                                            </Button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Sliders */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="flex items-center gap-2 text-white/70">
                                                                            <Sun className="h-4 w-4" /> {t.brightness}
                                                                        </span>
                                                                        <span className="text-white font-medium">{brightness}%</span>
                                                                    </div>
                                                                    <Slider
                                                                        value={[brightness]}
                                                                        onValueChange={(v) => { setBrightness(v[0]); setActivePreset('Custom'); }}
                                                                        min={20} max={200} step={5}
                                                                        className="py-1"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="flex items-center gap-2 text-white/70">
                                                                            <Contrast className="h-4 w-4" /> {t.contrast}
                                                                        </span>
                                                                        <span className="text-white font-medium">{contrast}%</span>
                                                                    </div>
                                                                    <Slider
                                                                        value={[contrast]}
                                                                        onValueChange={(v) => { setContrast(v[0]); setActivePreset('Custom'); }}
                                                                        min={50} max={300} step={5}
                                                                        className="py-1"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
                                                                <div className="flex items-center gap-1">
                                                                    <Button size="icon" variant="ghost" onClick={() => zoomOut()} className="h-9 w-9 text-white hover:bg-white/10">
                                                                        <ZoomOut className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" onClick={() => zoomIn()} className="h-9 w-9 text-white hover:bg-white/10">
                                                                        <ZoomIn className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="w-px h-6 bg-white/20" />
                                                                <div className="flex items-center gap-1">
                                                                    <Button size="icon" variant="ghost" onClick={() => setRotation(r => r - 90)} className="h-9 w-9 text-white hover:bg-white/10">
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" onClick={() => setRotation(r => r + 90)} className="h-9 w-9 text-white hover:bg-white/10">
                                                                        <RotateCw className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="w-px h-6 bg-white/20" />
                                                                <Button
                                                                    variant={inverted ? "secondary" : "ghost"}
                                                                    size="sm"
                                                                    onClick={() => setInverted(!inverted)}
                                                                    className="gap-2 text-white hover:bg-white/10"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    {inverted ? 'نێگەتیڤ' : 'ئاسایی'}
                                                                </Button>
                                                                <div className="flex-1" />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => { resetTransform(); resetFilters(); }}
                                                                    className="gap-2 border-white/20 text-white hover:bg-white/10"
                                                                >
                                                                    <Maximize2 className="h-4 w-4" />
                                                                    {t.reset}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </TransformWrapper>
                                        )}

                                        {/* Info Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                            {/* Key Structures */}
                                            {selectedPart.keyStructures && selectedPart.keyStructures.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                                    className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/20">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                                            <BookOpen className="w-4 h-4 text-cyan-400" />
                                                        </div>
                                                        <h3 className="font-semibold text-white">{t.keyStructures}</h3>
                                                    </div>
                                                    <ul className="space-y-2">
                                                        {selectedPart.keyStructures.map((structure: any, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                                                                <span>{language === 'ku' ? structure.ku : structure.en}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </motion.div>
                                            )}

                                            {/* Clinical Notes */}
                                            {selectedPart.clinicalNotes && selectedPart.clinicalNotes.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                                    className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-xl border border-amber-500/20">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                                            <Stethoscope className="w-4 h-4 text-amber-400" />
                                                        </div>
                                                        <h3 className="font-semibold text-white">{t.clinicalNotes}</h3>
                                                    </div>
                                                    <ul className="space-y-3">
                                                        {selectedPart.clinicalNotes.map((note: any, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2">
                                                                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                                <span className="text-sm text-white/80">{language === 'ku' ? note.ku : note.en}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${device.color} flex items-center justify-center text-white mb-4`}>
                                            <IconComponent className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">{t.selectPart}</h3>
                                        <p className="text-sm text-white/50">Choose a part from the list to view details</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </PageLayout>
    );
}
