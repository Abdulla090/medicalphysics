import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { BookOpen, FileText, Wrench, ArrowLeft, Brain } from 'lucide-react';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    gradient: string;
    delay: number;
}

const FeatureCard = ({ title, description, icon: Icon, path, gradient, delay }: FeatureCardProps) => {
    return (
        <Link
            to={path}
            className="block group relative h-full animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            <div className={`absolute -inset-px bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition duration-500 will-change-transform`} />
            <div className="relative h-full bg-card border border-border/40 rounded-2xl p-8 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:group-hover:shadow-primary/5">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-700 opacity-20 bg-gradient-to-br ${gradient}`} />

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                            <Icon className="w-8 h-8" />
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <h3 className="text-2xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-blue-600 group-hover:to-primary transition-all duration-300">
                            {title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                            {description}
                        </p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-dashed border-border/60 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-primary font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
                            <span>کردنەوە</span>
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default function Explore() {
    const features = [
        {
            title: "وانەکان (Lessons)",
            description: "فێربوونی هەموو بەشەکانی ڕادیۆلۆجی و وێنەگرتنی پزیشکی بە شێوازێکی زانستی و ئەکادیمی.",
            icon: BookOpen,
            path: "/categories",
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            title: "زانیاری و بابەتەکان (Articles)",
            description: "خوێندنەوەی نوێترین بابەتەکان و بڵاوکراوەکانی بواری پزیشکی و ڕادیۆلۆژی.",
            icon: FileText,
            path: "/articles",
            gradient: "from-purple-500 to-pink-500"
        },
        {
            title: "ئامرازە پزیشکییەکان (Tools)",
            description: "بەشێکی تایبەت بە حیسابکەری پزیشکی و بینەری وێنەی DICOM بۆ خوێندکاران و پزیشکان.",
            icon: Wrench,
            path: "/tools",
            gradient: "from-orange-500 to-red-500"
        },
        {
            title: "ئەتلەسی ئەناتۆمی (Anatomy)",
            description: "ئەتلەسی وێنەگرتنی فرەشێوە بۆ فێربوونی ئەناتۆمی مرۆڤ بەشێوازێکی پێشکەوتوو.",
            icon: Brain,
            path: "/anatomy",
            gradient: "from-green-500 to-emerald-500"
        }
    ];

    return (
        <PageLayout>
            <section className="py-20 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2" />

                <div className="container relative z-10">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
                            گەڕان لە <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">تایبەتمەندییەکان</span>
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            هەموو بەشەکانی وێبسایتەکە لێرەدا کۆکراونەتەوە بۆ ئەوەی بە ئاسانی دەستت بە زانیارییەکان و ئامرازەکان بگات.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                path={feature.path}
                                gradient={feature.gradient}
                                delay={index * 100}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </PageLayout>
    );
}
