import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import PageLayout from '@/components/PageLayout';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft, Search, ScanLine, Layers, Magnet, Activity,
    Atom, Scan, Waves, Zap, Bone, FileImage, LucideIcon, BookOpen
} from 'lucide-react';
import { deviceCategories as staticDevices } from '@/data/anatomyAtlasData';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Enhanced Icon mapping to match CategoryCard and handle variations
const deviceIconMap: Record<string, LucideIcon> = {
    // Standard matches
    xray: Atom,
    'x-ray': Atom,
    radiography: Atom,

    ct: Scan,
    'computed-tomography': Scan,

    mri: Activity,
    'magnetic-resonance': Activity,

    ultrasound: Waves,
    us: Waves,

    nuclear: Zap,
    nm: Zap,

    dexa: Bone,
    dxa: Bone,
    'bone-densitometry': Bone,

    // Static data maps (legacy keys)
    scan: Atom,      // mapped to Atom for consistency with X-ray
    layers: Scan,    // mapped to Scan for consistency with CT
    magnet: Activity,// mapped to Activity for consistency with MRI
    activity: Waves, // mapped to Waves for Ultrasound (if static data uses 'activity' for US)

};


// ... uiText remains mostly same ...
const uiText = {
    en: {
        title: 'Anatomy Atlas',
        subtitle: 'Explore human anatomy organized by imaging modality',
        searchPlaceholder: 'Search anatomy parts...',
        selectDevice: 'Select Imaging Modality',
        parts: 'parts',
        back: 'Back',
        viewParts: 'View Parts',
        noResults: 'No results found',
        loading: 'Loading...'
    },
    ku: {
        title: 'ئەتلەسی ئەناتۆمی',
        subtitle: 'ئەناتۆمی مرۆڤ بکۆڵەوە بەپێی ئامێری وێنەگرتن',
        searchPlaceholder: 'گەڕان بەدوای بەشەکانی ئەناتۆمی...',
        selectDevice: 'ئامێری وێنەگرتن هەڵبژێرە',
        parts: 'بەش',
        back: 'گەڕانەوە',
        viewParts: 'بەشەکان ببینە',
        noResults: 'هیچ ئەنجامێک نەدۆزرایەوە',
        loading: 'چاوەڕوانبە...'
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function AnatomyAtlas() {
    const { language, isRTL } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const t = uiText[language];

    // Try to fetch from Convex, fallback to static data
    const convexDevices = useQuery(api.anatomy.getPublishedAnatomyDevices);

    // Use Convex data if available and has items, otherwise use static data
    const devices = (convexDevices && convexDevices.length > 0)
        ? convexDevices.map(d => ({
            id: d.deviceId,
            title: d.title,
            titleKu: d.titleKu,
            description: d.description,
            descriptionKu: d.descriptionKu,
            icon: d.icon,
            color: d.color,
            parts: [] // Parts will be loaded on detail page
        }))
        : staticDevices;

    // Filter devices based on search
    const filteredDevices = devices.filter(device => {
        const query = searchQuery.toLowerCase();
        return device.title.toLowerCase().includes(query) ||
            device.titleKu.includes(query);
    });

    return (
        <PageLayout className={`text-foreground ${isRTL ? 'rtl' : 'ltr'}`}>

            <main className="container px-4 py-8 md:py-16 mx-auto">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">{t.title}</h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">{t.subtitle}</p>

                    {/* Search Bar */}
                    <div className="relative mt-8 max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-4 bg-background border-border shadow-sm rounded-xl focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {convexDevices === undefined && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-70">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                        <p>{t.loading}</p>
                    </div>
                )}

                {/* Device Categories Grid */}
                {convexDevices !== undefined && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="devices"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
                        >
                            {filteredDevices.map((device, index) => {
                                // Resolve icon
                                const IconComponent = deviceIconMap[device.icon] || deviceIconMap[device.icon.toLowerCase()] || Atom;

                                return (
                                    <Link
                                        key={device.id}
                                        to={`/anatomy/atlas/${device.id}`}
                                        className="block group relative h-full"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        {/* Background Glow Effect - Matched CategoryCard */}
                                        <div className="absolute -inset-px bg-gradient-to-r from-primary/50 to-blue-600/50 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition duration-500 will-change-transform" />

                                        {/* Main Card Content */}
                                        <div className="relative h-full bg-card border border-border/40 rounded-2xl p-6 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:group-hover:shadow-primary/5">

                                            {/* Decorative Background Elements */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-700 group-hover:bg-primary/10" />
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 blur-xl transition-all duration-700 group-hover:bg-blue-500/10" />

                                            <div className="relative z-10 flex flex-col h-full">
                                                {/* Header: Icon & English Name */}
                                                <div className="flex justify-between items-start mb-5">
                                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                                                        <IconComponent className="w-7 h-7" />
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-mono font-bold px-2 py-1 rounded border uppercase tracking-widest transition-colors",
                                                        "bg-muted/50 border-border/50 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                                                    )}>
                                                        {device.parts?.length || 0} {t.parts}
                                                    </span>
                                                </div>

                                                {/* Title & Description */}
                                                <div className="flex-1 space-y-3">
                                                    <h3 className="text-2xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-blue-600 group-hover:to-primary transition-all duration-300">
                                                        {language === 'ku' ? device.titleKu : device.title}
                                                    </h3>
                                                    <p className="text-sm text-foreground/60 line-clamp-2 leading-relaxed group-hover:text-foreground/80 transition-colors">
                                                        {language === 'ku' ? device.descriptionKu : device.description}
                                                    </p>
                                                </div>

                                                {/* Footer: Action */}
                                                <div className="mt-8 pt-4 border-t border-dashed border-border/60 flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary/80 transition-colors">
                                                        <BookOpen className="w-4 h-4" />
                                                        <span className="font-medium">{t.viewParts}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-primary font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
                                                        <ArrowLeft className={cn("w-4 h-4", !isRTL && "rotate-180")} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                )}

                {filteredDevices.length === 0 && convexDevices !== undefined && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                        <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground/60">{t.noResults}</p>
                    </motion.div>
                )}
            </main>
        </PageLayout>
    );
}
