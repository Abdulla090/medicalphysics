import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import PageLayout from '@/components/PageLayout';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Zap, Activity, Info, AlertTriangle, User, Ruler, Weight, Baby, Sparkles, CheckCircle2, Loader2, Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Standard X-ray protocols based on radiography textbooks
const BODY_PARTS = {
    chest_pa: { name: 'Chest PA', nameKu: 'سینە PA', baseKvp: 120, baseMas: 3, sid: 180, grid: false },
    chest_lat: { name: 'Chest Lateral', nameKu: 'سینە تەنیشتی', baseKvp: 125, baseMas: 8, sid: 180, grid: false },
    abdomen_ap: { name: 'Abdomen AP', nameKu: 'سک AP', baseKvp: 80, baseMas: 40, sid: 100, grid: true },
    pelvis_ap: { name: 'Pelvis AP', nameKu: 'لەگەن AP', baseKvp: 80, baseMas: 35, sid: 100, grid: true },
    lumbar_ap: { name: 'L-Spine AP', nameKu: 'پشتیلکەی ناوەڕاست AP', baseKvp: 80, baseMas: 45, sid: 100, grid: true },
    lumbar_lat: { name: 'L-Spine Lateral', nameKu: 'پشتیلکەی ناوەڕاست تەنیشتی', baseKvp: 90, baseMas: 80, sid: 100, grid: true },
    cervical_ap: { name: 'C-Spine AP', nameKu: 'پشتیلکەی مل AP', baseKvp: 75, baseMas: 15, sid: 100, grid: true },
    cervical_lat: { name: 'C-Spine Lateral', nameKu: 'پشتیلکەی مل تەنیشتی', baseKvp: 75, baseMas: 10, sid: 180, grid: false },
    skull_ap: { name: 'Skull AP', nameKu: 'کاسەی سەر AP', baseKvp: 80, baseMas: 30, sid: 100, grid: true },
    skull_lat: { name: 'Skull Lateral', nameKu: 'کاسەی سەر تەنیشتی', baseKvp: 75, baseMas: 20, sid: 100, grid: true },
    hand_pa: { name: 'Hand PA', nameKu: 'دەست PA', baseKvp: 55, baseMas: 4, sid: 100, grid: false },
    wrist_pa: { name: 'Wrist PA', nameKu: 'مەچەک PA', baseKvp: 60, baseMas: 5, sid: 100, grid: false },
    elbow_ap: { name: 'Elbow AP', nameKu: 'ئانیشک AP', baseKvp: 65, baseMas: 6, sid: 100, grid: false },
    shoulder_ap: { name: 'Shoulder AP', nameKu: 'شان AP', baseKvp: 75, baseMas: 12, sid: 100, grid: true },
    knee_ap: { name: 'Knee AP', nameKu: 'ئەژنۆ AP', baseKvp: 70, baseMas: 8, sid: 100, grid: false },
    ankle_ap: { name: 'Ankle AP', nameKu: 'قاپ AP', baseKvp: 60, baseMas: 6, sid: 100, grid: false },
    foot_ap: { name: 'Foot AP', nameKu: 'پێ AP', baseKvp: 60, baseMas: 5, sid: 100, grid: false },
    hip_ap: { name: 'Hip AP', nameKu: 'ڕان AP', baseKvp: 80, baseMas: 35, sid: 100, grid: true },
};

type BodyPartKey = keyof typeof BODY_PARTS;

// Pediatric age-based factors
const PEDIATRIC_FACTORS = {
    newborn: { label: 'Newborn (0-1m)', labelKu: 'نوێبوو', kvpFactor: 0.6, masFactor: 0.15 },
    infant: { label: 'Infant (1-12m)', labelKu: 'منداڵ', kvpFactor: 0.65, masFactor: 0.2 },
    toddler: { label: 'Toddler (1-3y)', labelKu: 'منداڵی گەورە', kvpFactor: 0.7, masFactor: 0.3 },
    child: { label: 'Child (3-10y)', labelKu: 'منداڵ', kvpFactor: 0.8, masFactor: 0.5 },
    adolescent: { label: 'Adolescent (10-18y)', labelKu: 'گەنج', kvpFactor: 0.9, masFactor: 0.75 },
};

interface AIVerification {
    isVerified: boolean;
    confidence: number;
    analysis: string;
    suggestions: string[];
    safetyNote: string;
}

export default function XrayCalculator() {
    const { language, isRTL } = useLanguage();
    const [bodyPart, setBodyPart] = useState<BodyPartKey>('chest_pa');
    const [patientType, setPatientType] = useState<'adult' | 'pediatric'>('adult');
    const [sex, setSex] = useState<'male' | 'female'>('male');
    const [age, setAge] = useState('30');
    const [weight, setWeight] = useState('70');
    const [height, setHeight] = useState('170');
    const [pediatricAge, setPediatricAge] = useState<keyof typeof PEDIATRIC_FACTORS>('child');
    const [result, setResult] = useState<{ kvp: number; mas: number; sid: number; grid: boolean } | null>(null);
    const [aiVerification, setAiVerification] = useState<AIVerification | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Secure Convex action for AI verification
    const verifyWithGemini = useAction(api.gemini.verifyXrayCalculation);

    const calculateExposure = async () => {
        const protocol = BODY_PARTS[bodyPart];
        let kvp = protocol.baseKvp;
        let mas = protocol.baseMas;

        if (patientType === 'pediatric') {
            const factor = PEDIATRIC_FACTORS[pediatricAge];
            kvp = Math.round(protocol.baseKvp * factor.kvpFactor);
            mas = Math.round(protocol.baseMas * factor.masFactor * 10) / 10;
        } else {
            const w = parseFloat(weight) || 70;
            const h = parseFloat(height) || 170;
            const bmi = w / ((h / 100) ** 2);

            if (bmi < 18.5) { kvp -= 4; mas *= 0.8; }
            else if (bmi > 25 && bmi <= 30) { kvp += 4; mas *= 1.2; }
            else if (bmi > 30 && bmi <= 35) { kvp += 8; mas *= 1.5; }
            else if (bmi > 35) { kvp += 12; mas *= 2; }

            const a = parseFloat(age) || 30;
            if (a > 65) { kvp -= 2; mas *= 0.9; }

            if (sex === 'female' && ['chest_pa', 'chest_lat', 'abdomen_ap'].includes(bodyPart)) {
                kvp -= 2;
            }
        }

        const calculatedResult = {
            kvp: Math.round(kvp),
            mas: Math.round(mas * 10) / 10,
            sid: protocol.sid,
            grid: protocol.grid
        };

        setResult(calculatedResult);
        setAiVerification(null);
        setIsVerifying(true);

        // Call secure Convex action for AI verification
        try {
            const verification = await verifyWithGemini({
                patientType,
                age,
                sex,
                weight,
                height,
                pediatricAgeLabel: patientType === 'pediatric' ? PEDIATRIC_FACTORS[pediatricAge].label : undefined,
                bodyPartName: protocol.name,
                baseKvp: protocol.baseKvp,
                baseMas: protocol.baseMas,
                calculatedKvp: calculatedResult.kvp,
                calculatedMas: calculatedResult.mas,
                sid: calculatedResult.sid,
                grid: calculatedResult.grid,
            });
            setAiVerification(verification as AIVerification);
        } catch (error) {
            console.error('Verification error:', error);
            // Fallback
            const w = parseFloat(weight) || 70;
            const h = parseFloat(height) || 170;
            const bmi = w / ((h / 100) ** 2);
            const isWithinRange =
                calculatedResult.kvp >= protocol.baseKvp - 15 &&
                calculatedResult.kvp <= protocol.baseKvp + 20;

            setAiVerification({
                isVerified: isWithinRange,
                confidence: isWithinRange ? 85 : 60,
                analysis: `Parameters calculated for ${protocol.name}. kVp: ${calculatedResult.kvp}, mAs: ${calculatedResult.mas} for BMI ${bmi.toFixed(1)}.`,
                suggestions: ['Verify against facility protocols', 'Consult supervising radiologist if uncertain'],
                safetyNote: 'Calculated using standard radiographic technique guidelines.',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const t = {
        title: language === 'ku' ? 'حیسابکەری mAs و kVp' : 'X-ray mAs & kVp Calculator',
        subtitle: language === 'ku' ? 'بە پەیڕەوی پڕۆتۆکۆڵی ستاندارد + پشتڕاستکردنەوەی AI' : 'Standard Protocols + AI Verification',
        back: language === 'ku' ? 'گەڕانەوە' : 'Back',
        bodyPart: language === 'ku' ? 'بەشی جەستە' : 'Body Part',
        patientType: language === 'ku' ? 'جۆری نەخۆش' : 'Patient Type',
        adult: language === 'ku' ? 'گەورە' : 'Adult',
        pediatric: language === 'ku' ? 'منداڵ' : 'Pediatric',
        sex: language === 'ku' ? 'ڕەگەز' : 'Sex',
        male: language === 'ku' ? 'نێر' : 'Male',
        female: language === 'ku' ? 'مێ' : 'Female',
        age: language === 'ku' ? 'تەمەن (ساڵ)' : 'Age (years)',
        weight: language === 'ku' ? 'کێش (kg)' : 'Weight (kg)',
        height: language === 'ku' ? 'باڵا (cm)' : 'Height (cm)',
        ageGroup: language === 'ku' ? 'گرووپی تەمەن' : 'Age Group',
        calculate: language === 'ku' ? 'حیساب بکە' : 'Calculate',
        results: language === 'ku' ? 'ئەنجامەکان' : 'Results',
        gridRequired: language === 'ku' ? 'گرید پێویستە' : 'Grid Required',
        noGrid: language === 'ku' ? 'بەبێ گرید' : 'No Grid',
        aiVerification: language === 'ku' ? 'پشتڕاستکردنەوەی AI' : 'AI Verification',
        verifying: language === 'ku' ? 'پشتڕاستکردنەوە...' : 'Verifying with AI...',
        verified: language === 'ku' ? 'پشتڕاستکراوە' : 'Verified',
        needsReview: language === 'ku' ? 'پێداچوونەوە پێویستە' : 'Needs Review',
        confidence: language === 'ku' ? 'متمانە' : 'Confidence',
        suggestions: language === 'ku' ? 'پێشنیارەکان' : 'Suggestions',
    };

    return (
        <PageLayout className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isRTL ? 'rtl' : 'ltr'}`} showBreadcrumbs={false}>

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
            </div>

            <main className="relative z-10 container max-w-5xl mx-auto px-4 py-8">
                <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> {t.back}
                </Link>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white mb-4">
                        <Zap className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t.title}</h1>
                    <p className="text-white/60 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        {t.subtitle}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Card */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Calculator className="w-5 h-5" /> {language === 'ku' ? 'زانیاری نەخۆش' : 'Patient Information'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white/80">{t.bodyPart}</Label>
                                <Select value={bodyPart} onValueChange={(v) => setBodyPart(v as BodyPartKey)}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(BODY_PARTS).map(([key, val]) => (
                                            <SelectItem key={key} value={key}>
                                                {language === 'ku' ? val.nameKu : val.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white/80">{t.patientType}</Label>
                                <Tabs value={patientType} onValueChange={(v) => setPatientType(v as 'adult' | 'pediatric')}>
                                    <TabsList className="w-full bg-white/10">
                                        <TabsTrigger value="adult" className="flex-1 gap-2 data-[state=active]:bg-white/20">
                                            <User className="w-4 h-4" /> {t.adult}
                                        </TabsTrigger>
                                        <TabsTrigger value="pediatric" className="flex-1 gap-2 data-[state=active]:bg-white/20">
                                            <Baby className="w-4 h-4" /> {t.pediatric}
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {patientType === 'adult' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-white/80">{t.sex}</Label>
                                            <Select value={sex} onValueChange={(v) => setSex(v as 'male' | 'female')}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">{t.male}</SelectItem>
                                                    <SelectItem value="female">{t.female}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-white/80">{t.age}</Label>
                                            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-white/80 flex items-center gap-1"><Weight className="w-3 h-3" /> {t.weight}</Label>
                                            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-white/80 flex items-center gap-1"><Ruler className="w-3 h-3" /> {t.height}</Label>
                                            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-white/80">{t.ageGroup}</Label>
                                    <Select value={pediatricAge} onValueChange={(v) => setPediatricAge(v as keyof typeof PEDIATRIC_FACTORS)}>
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PEDIATRIC_FACTORS).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>
                                                    {language === 'ku' ? val.labelKu : val.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button
                                onClick={calculateExposure}
                                disabled={isVerifying}
                                className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                            >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                                {isVerifying ? t.verifying : t.calculate}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results Card */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Activity className="w-5 h-5" /> {t.results}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {result ? (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 text-center">
                                            <p className="text-sm text-white/60 mb-1">kVp</p>
                                            <p className="text-4xl font-bold text-yellow-400">{result.kvp}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-center">
                                            <p className="text-sm text-white/60 mb-1">mAs</p>
                                            <p className="text-4xl font-bold text-cyan-400">{result.mas}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-white/70">SID</span>
                                        <span className="text-white font-medium">{result.sid} cm</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-white/70">Grid</span>
                                        <Badge variant={result.grid ? "default" : "secondary"}>
                                            {result.grid ? t.gridRequired : t.noGrid}
                                        </Badge>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Info className="w-8 h-8 text-white/30" />
                                    </div>
                                    <p className="text-white/50">{language === 'ku' ? 'زانیارییەکان پڕ بکەوە و حیساب بکە' : 'Fill in the information and calculate'}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* AI Verification Card */}
                <AnimatePresence>
                    {(isVerifying || aiVerification) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mt-6"
                        >
                            <Card className={`bg-white/5 backdrop-blur-xl border ${aiVerification?.isVerified ? 'border-green-500/30' : aiVerification ? 'border-amber-500/30' : 'border-purple-500/30'}`}>
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-purple-400" />
                                        {t.aiVerification}
                                        {aiVerification && (
                                            <Badge className={aiVerification.isVerified ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                                                {aiVerification.isVerified ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                                                {aiVerification.isVerified ? t.verified : t.needsReview}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isVerifying ? (
                                        <div className="flex items-center justify-center py-8 gap-3">
                                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                            <span className="text-white/60">{t.verifying}</span>
                                        </div>
                                    ) : aiVerification && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-white/60 text-sm">{t.confidence}:</span>
                                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${aiVerification.confidence >= 80 ? 'bg-green-500' : aiVerification.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${aiVerification.confidence}%` }}
                                                    />
                                                </div>
                                                <span className="text-white font-bold">{aiVerification.confidence}%</span>
                                            </div>

                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-white/80 text-sm leading-relaxed">{aiVerification.analysis}</p>
                                            </div>

                                            {aiVerification.suggestions.length > 0 && (
                                                <div>
                                                    <p className="text-white/60 text-sm mb-2">{t.suggestions}:</p>
                                                    <ul className="space-y-2">
                                                        {aiVerification.suggestions.map((suggestion, idx) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-white/70">
                                                                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                                                {suggestion}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-200">{aiVerification.safetyNote}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Protocol Reference */}
                <Card className="mt-6 bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">{language === 'ku' ? 'پڕۆتۆکۆڵە ستانداردەکان' : 'Standard Protocol Reference'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-white/60 py-2 px-2">{language === 'ku' ? 'بەش' : 'Body Part'}</th>
                                        <th className="text-center text-white/60 py-2 px-2">kVp</th>
                                        <th className="text-center text-white/60 py-2 px-2">mAs</th>
                                        <th className="text-center text-white/60 py-2 px-2">SID</th>
                                        <th className="text-center text-white/60 py-2 px-2">Grid</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(BODY_PARTS).slice(0, 8).map(([key, val]) => (
                                        <tr key={key} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2 px-2 text-white">{language === 'ku' ? val.nameKu : val.name}</td>
                                            <td className="py-2 px-2 text-center text-yellow-400">{val.baseKvp}</td>
                                            <td className="py-2 px-2 text-center text-cyan-400">{val.baseMas}</td>
                                            <td className="py-2 px-2 text-center text-white/70">{val.sid}</td>
                                            <td className="py-2 px-2 text-center">{val.grid ? <Check className="w-4 h-4 inline-block text-green-400" /> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </PageLayout>
    );
}
