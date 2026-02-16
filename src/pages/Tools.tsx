import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { ArrowLeft, Zap, Image as ImageIcon, ScanLine, Box, Calculator, Activity, Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Tool {
    id: string;
    name: string;
    nameKu: string;
    description: string;
    descriptionKu: string;
    icon: React.ElementType;
    path: string;
    category: 'calculators' | 'viewers' | 'education';
    badge?: string;
}

const tools: Tool[] = [
    {
        id: 'xray-calculator',
        name: 'X-ray Calculator',
        nameKu: 'حیسابکەری X-ray',
        description: 'Calculate optimal exposure parameters (mAs, kVp) with AI verification.',
        descriptionKu: 'حیساکردنی mAs و kVp بە پارامەترەکانی نەخۆش و پشتڕاستکردنەوەی AI.',
        icon: Zap,
        path: '/tools/xray-calculator',
        category: 'calculators',
        badge: 'New'
    },
    {
        id: 'anatomy-atlas',
        name: 'Anatomy Atlas',
        nameKu: 'ئەتلەسی ئەناتۆمی',
        description: 'Interactive multi-modality imaging atlas for anatomy learning.',
        descriptionKu: 'ئەتلەسی وێنەگرتنی فرەشێوە بۆ فێربوونی ئەناتۆمی.',
        icon: ImageIcon,
        path: '/anatomy/atlas',
        category: 'education',
        badge: 'Popular'
    },
    {
        id: 'image-viewer',
        name: 'Medical Viewer',
        nameKu: 'بینەری وێنەی پزیشکی',
        description: 'View and analyze DICOM and medical images with advanced controls.',
        descriptionKu: 'بینین و شیکردنەوەی وێنەکانی DICOM بە کۆنترۆڵی پێشکەوتوو.',
        icon: ScanLine,
        path: '/demo/image-viewer',
        category: 'viewers',
    },
    {
        id: '3d-model',
        name: '3D Body Model',
        nameKu: 'مۆدێلی 3D ی جەستە',
        description: 'Explore interactive 3D human anatomy model.',
        descriptionKu: 'گەڕان لە مۆدێلی 3D ی ئەناتۆمی مرۆڤ.',
        icon: Box,
        path: '/anatomy',
        category: 'education',
    },
];

const ToolCard = ({ tool, index }: { tool: Tool; index: number }) => {
    const { language } = useLanguage();
    const Icon = tool.icon;

    return (
        <Link
            to={tool.path}
            className="block group relative h-full"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Background Glow Effect */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary/50 to-blue-600/50 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition duration-500 will-change-transform" />

            {/* Main Card Content */}
            <div className="relative h-full bg-card border border-border/40 rounded-2xl p-6 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:group-hover:shadow-primary/5">

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-700 group-hover:bg-primary/10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 blur-xl transition-all duration-700 group-hover:bg-blue-500/10" />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header: Icon & Name */}
                    <div className="flex justify-between items-start mb-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                            <Icon className="w-7 h-7" />
                        </div>
                        {tool.badge && (
                            <span className={cn(
                                "text-[10px] font-mono font-bold px-2 py-1 rounded border uppercase tracking-widest transition-colors",
                                tool.badge === 'New'
                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            )}>
                                {tool.badge}
                            </span>
                        )}
                    </div>

                    {/* Title & Description */}
                    <div className="flex-1 space-y-3">
                        <h3 className="text-2xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-blue-600 group-hover:to-primary transition-all duration-300">
                            {language === 'ku' ? tool.nameKu : tool.name}
                        </h3>
                        <p className="text-sm text-foreground/60 line-clamp-2 leading-relaxed group-hover:text-foreground/80 transition-colors">
                            {language === 'ku' ? tool.descriptionKu : tool.description}
                        </p>
                    </div>

                    {/* Footer: Action */}
                    <div className="mt-8 pt-4 border-t border-dashed border-border/60 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary/80 transition-colors">
                            {tool.category === 'calculators' ? <Calculator className="w-4 h-4" /> :
                                tool.category === 'education' ? <Brain className="w-4 h-4" /> :
                                    <Activity className="w-4 h-4" />}
                            <span className="font-medium capitalize">{tool.category}</span>
                        </div>

                        <div className="flex items-center gap-2 text-primary font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
                            <span>{language === 'ku' ? 'کردنەوە' : 'Open'}</span>
                            <ArrowLeft className={cn("w-4 h-4", language !== 'ku' && "rotate-180")} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default function Tools() {
    const { language } = useLanguage();

    const t = {
        title: language === 'ku' ? 'ئامرازە پزیشکییەکان' : 'Medical Physics Tools',
        subtitle: language === 'ku' ? 'ئامرازە پرۆفیشناڵەکان بۆ فێربوون و کار' : 'Professional tools for education and practice',
    };

    return (
        <PageLayout>

            <section className="py-16">
                <div className="container">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.title}</h1>
                        <p className="text-lg text-muted-foreground">{t.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {tools.map((tool, index) => (
                            <ToolCard key={tool.id} tool={tool} index={index} />
                        ))}
                    </div>
                </div>
            </section>
        </PageLayout>
    );
}
