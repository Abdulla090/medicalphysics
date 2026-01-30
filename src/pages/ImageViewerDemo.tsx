import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import MedicalImageViewer from '@/components/MedicalImageViewer';
import DicomViewer3D from '@/components/DicomViewer3D';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Info, Lightbulb, Layers3, Image as ImageIcon, Stethoscope } from 'lucide-react';

// ============================================
// SAMPLE MEDICAL IMAGES (Public Domain / Educational)
// ============================================

const SAMPLE_IMAGES = {
    ct: [
        {
            id: 'ct-brain',
            title: 'CT سەر - Brain CT',
            titleKu: 'CT ی مێشک',
            description: 'Axial CT scan of the brain showing normal anatomy',
            descriptionKu: 'وێنەی CT ی مێشک بە شێوازی ئاسۆیی',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/CT_of_human_brain%2C_axial.jpg/800px-CT_of_human_brain%2C_axial.jpg',
            modality: 'CT',
            bodyPart: 'Brain',
            recommendedWindow: 'Brain Window',
        },
        {
            id: 'ct-chest',
            title: 'CT Chest - سینە',
            titleKu: 'CT ی سینە',
            description: 'Axial CT scan of the thorax showing lungs and mediastinum',
            descriptionKu: 'وێنەی CT ی سینە کە سییەکان و ناوسینە دەرکەوێت',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Thorax_CT_peripheres_Lungenkarzinom_li_OF_mit_Pleurainvasion.jpg/800px-Thorax_CT_peripheres_Lungenkarzinom_li_OF_mit_Pleurainvasion.jpg',
            modality: 'CT',
            bodyPart: 'Chest',
            recommendedWindow: 'Lung Window',
        },
        {
            id: 'ct-abdomen',
            title: 'CT Abdomen - سک',
            titleKu: 'CT ی سک',
            description: 'Abdominal CT showing liver, spleen and kidneys',
            descriptionKu: 'CT ی سک کە جگەر، تاف و گورچیلەکان دەرکەوێت',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/CT_of_abdomen_and_pelvis%2C_coronal_view.jpg/407px-CT_of_abdomen_and_pelvis%2C_coronal_view.jpg',
            modality: 'CT',
            bodyPart: 'Abdomen',
            recommendedWindow: 'Soft Tissue',
        },
    ],
    mri: [
        {
            id: 'mri-brain-t1',
            title: 'MRI Brain T1',
            titleKu: 'MRI مێشک - T1',
            description: 'T1-weighted MRI of the brain, sagittal view',
            descriptionKu: 'وێنەی MRI ی مێشک بە کێشەی T1 - تەنیشتەوانە',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/MRI_of_Human_Brain.jpg/800px-MRI_of_Human_Brain.jpg',
            modality: 'MRI',
            bodyPart: 'Brain',
            recommendedWindow: 'Default',
        },
        {
            id: 'mri-spine',
            title: 'MRI Spine - پشتیلکە',
            titleKu: 'MRI پشتیلکە',
            description: 'Sagittal MRI of the lumbar spine',
            descriptionKu: 'وێنەی MRI ی پشتیلکەی ناوەڕاستی قەد',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Lumbar_MRI_T2_sagittal.jpg/250px-Lumbar_MRI_T2_sagittal.jpg',
            modality: 'MRI',
            bodyPart: 'Spine',
            recommendedWindow: 'Default',
        },
        {
            id: 'mri-knee',
            title: 'MRI Knee - ئەژنۆ',
            titleKu: 'MRI ئەژنۆ',
            description: 'Sagittal MRI of the knee joint',
            descriptionKu: 'وێنەی MRI ی ئەژنۆ - دەرکەوتنی خرۆشەکان',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Knee_MRI.jpg/220px-Knee_MRI.jpg',
            modality: 'MRI',
            bodyPart: 'Knee',
            recommendedWindow: 'Default',
        },
    ],
    xray: [
        {
            id: 'xray-chest',
            title: 'X-Ray Chest - سینە',
            titleKu: 'X-Ray سینە',
            description: 'PA chest X-ray showing normal cardiopulmonary anatomy',
            descriptionKu: 'وێنەی X-Ray ی سینە بە شێوازی PA',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chest_Xray_PA_3-8-2010.png/440px-Chest_Xray_PA_3-8-2010.png',
            modality: 'X-Ray',
            bodyPart: 'Chest',
            recommendedWindow: 'Negative/Invert',
        },
        {
            id: 'xray-hand',
            title: 'X-Ray Hand - دەست',
            titleKu: 'X-Ray دەست',
            description: 'AP X-ray of the hand showing bone structures',
            descriptionKu: 'وێنەی X-Ray ی دەست - ئێسکەکان',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/X-ray_of_normal_hand_by_dorridge_-_Uploaded_by_Angelus.jpg/406px-X-ray_of_normal_hand_by_dorridge_-_Uploaded_by_Angelus.jpg',
            modality: 'X-Ray',
            bodyPart: 'Hand',
            recommendedWindow: 'Bone Window',
        },
        {
            id: 'xray-spine',
            title: 'X-Ray Spine - پشتیلکە',
            titleKu: 'X-Ray پشتیلکە',
            description: 'Lateral X-ray of the lumbar spine',
            descriptionKu: 'وێنەی X-Ray ی پشتیلکە - تەنیشتەوانە',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Laterally_herniated_disc.png/300px-Laterally_herniated_disc.png',
            modality: 'X-Ray',
            bodyPart: 'Spine',
            recommendedWindow: 'Bone Window',
        },
    ],
};

const ImageViewerDemo = () => {
    const [selectedImage, setSelectedImage] = useState(SAMPLE_IMAGES.ct[0]);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [viewerTab, setViewerTab] = useState<'2d' | '3d'>('2d');

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        گەڕانەوە بۆ سەرەتا
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                                بینەری وێنەی پزیشکی پێشکەوتوو
                            </h1>
                            <p className="text-muted-foreground mt-2 text-lg">
                                Advanced Medical Image Viewer Demo
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant={isAdminMode ? "default" : "outline"}
                                onClick={() => setIsAdminMode(!isAdminMode)}
                                className="gap-2"
                            >
                                {isAdminMode ? '🛠️ مۆدی ئەدمین چالاکە' : 'چالاککردنی مۆدی ئەدمین'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Viewer Type Tabs */}
                <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6 w-full sm:w-fit overflow-x-auto">
                    <Button
                        variant={viewerTab === '2d' ? 'default' : 'ghost'}
                        onClick={() => setViewerTab('2d')}
                        className="gap-2 rounded-lg flex-1 sm:flex-none min-w-fit"
                        size="sm"
                    >
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">بینەری</span> 2D
                    </Button>
                    <Button
                        variant={viewerTab === '3d' ? 'default' : 'ghost'}
                        onClick={() => setViewerTab('3d')}
                        className="gap-2 rounded-lg flex-1 sm:flex-none min-w-fit"
                        size="sm"
                    >
                        <Layers3 className="h-4 w-4" />
                        <span className="hidden sm:inline">بینەری</span> 3D
                    </Button>
                </div>

                {/* Info Cards - Hidden on mobile */}
                <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <Lightbulb className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">پەنجەرەی وێنەگرتن</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Window Presets بۆ دیتنی ئێسک، شلی نەرم، سییەکان و مێشک
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <Stethoscope className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">
                                        {viewerTab === '2d' ? 'نزیککردنەوە و سوڕاندن' : 'MPR (سلایسی سێ ڕوو)'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {viewerTab === '2d'
                                            ? 'Zoom بۆ نزیککردنەوە و بینینی وردەکارییەکان'
                                            : 'بینینی Axial، Sagittal و Coronal'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <Info className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">
                                        {viewerTab === '2d' ? 'ئەدمین: نیشانەکردن' : 'بارکردنی فایل'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {viewerTab === '2d'
                                            ? 'کێشانی تیر، بازنە و نووسین بۆ پیشاندانی نەخۆشییەکان'
                                            : 'پشتگیری NIfTI (.nii.gz) و DICOM (.dcm)'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3D DICOM Viewer */}
                {viewerTab === '3d' && (
                    <DicomViewer3D className="mb-8" />
                )}

                {/* 2D Image Viewer */}
                {viewerTab === '2d' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                        {/* Image Selection Sidebar - Horizontal scroll on mobile */}
                        <div className="lg:col-span-1 order-2 lg:order-1">
                            <Card className="sticky top-24">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">هەڵبژاردنی وێنە</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Tabs defaultValue="ct" className="w-full">
                                        <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                                            <TabsTrigger value="ct" className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                                CT
                                            </TabsTrigger>
                                            <TabsTrigger value="mri" className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                                MRI
                                            </TabsTrigger>
                                            <TabsTrigger value="xray" className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                                X-Ray
                                            </TabsTrigger>
                                        </TabsList>

                                        {Object.entries(SAMPLE_IMAGES).map(([key, images]) => (
                                            <TabsContent key={key} value={key} className="p-2 space-y-2 mt-0">
                                                {images.map((img) => (
                                                    <button
                                                        key={img.id}
                                                        onClick={() => setSelectedImage(img)}
                                                        className={`w-full p-3 rounded-lg text-right transition-all ${selectedImage.id === img.id
                                                            ? 'bg-primary/10 border-2 border-primary'
                                                            : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                                                <img
                                                                    src={img.src}
                                                                    alt={img.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium truncate">{img.titleKu}</p>
                                                                <p className="text-xs text-muted-foreground">{img.bodyPart}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Viewer */}
                        <div className="lg:col-span-3 order-1 lg:order-2">
                            <Card className="overflow-hidden">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <CardTitle>{selectedImage.titleKu}</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {selectedImage.descriptionKu}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline">{selectedImage.modality}</Badge>
                                            <Badge variant="secondary">{selectedImage.bodyPart}</Badge>
                                            {isAdminMode && (
                                                <Badge className="bg-orange-500">مۆدی ئەدمین</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <MedicalImageViewer
                                        key={selectedImage.id}
                                        src={selectedImage.src}
                                        alt={selectedImage.title}
                                        className="w-full h-[350px] sm:h-[450px] md:h-[500px] lg:h-[600px]"
                                        enableAnnotations={isAdminMode}
                                    />
                                </CardContent>
                            </Card>

                            {/* Usage Tips - Hidden on small mobile */}
                            <Card className="mt-4 lg:mt-6 hidden sm:block">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                                        ڕێنوێنییەکان
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-2">
                                            <h4 className="font-medium">کۆنترۆڵی بینەر:</h4>
                                            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                                                <li>بۆ نزیککردنەوە: دوگمەی + یان چەرخی ماوس</li>
                                                <li>بۆ جوڵاندن: ڕاکێشان بە ماوس</li>
                                                <li>بۆ سوڕاندن: دوگمەی سوڕاندن</li>
                                                <li>پەنجەرەی وێنەگرتن: لە لیستی سەرەوە</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium">مۆدی ئەدمین (نیشانەکردن):</h4>
                                            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                                                <li>تیر: بۆ ئاماژەکردن بۆ شتێک</li>
                                                <li>بازنە: بۆ دەوردانی ناحییەیەک</li>
                                                <li>نووسین: بۆ زیادکردنی تێبینی</li>
                                                <li>ڕەنگ: گۆڕینی ڕەنگی نیشانە</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageViewerDemo;
