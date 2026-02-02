import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Language = 'en' | 'ku';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    isRTL: boolean;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Global translations for common UI elements
export const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navigation
        'nav.home': 'Home',
        'nav.categories': 'Categories',
        'nav.courses': 'Courses',
        'nav.tools': 'Tools',
        'nav.search': 'Search',
        'nav.profile': 'My Profile',
        'nav.admin': 'Admin',
        'nav.dashboard': 'Dashboard',
        'nav.lessons': 'Lessons',
        'nav.logout': 'Sign Out',
        'nav.login': 'Sign In',
        'nav.signIn': 'Sign In',
        'nav.signOut': 'Sign Out',
        'nav.management': 'Management',
        'nav.openMenu': 'Open Menu',
        'nav.navigationMenu': 'Navigation Menu',
        'nav.navigation': 'Navigation',
        'nav.administration': 'Administration',

        // Tools
        'tools.title': 'Medical Tools',
        'tools.imageViewer': 'Medical Image Viewer',
        'tools.imageViewerDesc': 'View and analyze DICOM images',
        'tools.3dModel': '3D Body Model',
        'tools.3dModelDesc': 'Explore human anatomy',
        'tools.anatomyAtlas': 'Anatomy Atlas',
        'tools.anatomyAtlasDesc': 'Learn anatomy with multi-modality imaging',
        'tools.xrayCalculator': 'X-ray Calculator',
        'tools.xrayCalculatorDesc': 'Calculate mAs & kVp for radiography',

        // Common
        'common.loading': 'Loading...',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.search': 'Search',
        'common.viewAll': 'View All',
        'common.learnMore': 'Learn More',
        'common.close': 'Close',

        // Courses
        'courses.title': 'Courses',
        'courses.subtitle': 'Complete courses to learn radiology in an organized way',
        'courses.noCourses': 'No courses available',
        'courses.viewLessons': 'View Lessons',

        // Anatomy Atlas
        'anatomy.title': 'Anatomy Atlas',
        'anatomy.subtitle': 'Explore human anatomy with multi-modality medical imaging',
        'anatomy.normalAnatomy': 'Normal Anatomy',
        'anatomy.normalAnatomyDesc': 'Learn anatomy with colored illustrations',
        'anatomy.xrayAnatomy': 'X-Ray Anatomy',
        'anatomy.xrayAnatomyDesc': 'Study anatomy as seen in radiographs',
        'anatomy.ctAnatomy': 'CT Anatomy',
        'anatomy.ctAnatomyDesc': 'Cross-sectional anatomy with CT imaging',
        'anatomy.mriAnatomy': 'MRI Anatomy',
        'anatomy.mriAnatomyDesc': 'Detailed soft tissue anatomy with MRI',
        'anatomy.selectModality': 'Select Imaging Modality',
        'anatomy.keyStructures': 'Key Structures',
        'anatomy.clinicalNotes': 'Clinical Notes',
        'anatomy.modality': 'Imaging Modality',
        'anatomy.viewerTip': 'Use mouse wheel to zoom, drag to pan',
        'anatomy.noData': 'Part not found',
        'anatomy.fullscreen': 'Fullscreen',
        'anatomy.browseCategories': 'Browse by Category',
        'anatomy.allParts': 'All Anatomy',
        'anatomy.featured': 'Featured',
        'anatomy.startLearning': 'Start Learning',
        'anatomy.otherParts': 'Other Parts',

        // Modalities
        'modality.normal': 'Normal',
        'modality.normalDesc': 'Colored anatomical illustration',
        'modality.xray': 'X-Ray',
        'modality.xrayDesc': 'Radiograph showing bone structures',
        'modality.ct': 'CT Scan',
        'modality.ctDesc': 'Cross-sectional computed tomography',
        'modality.mri': 'MRI',
        'modality.mriDesc': 'Magnetic resonance imaging',

        // Index/Home
        'home.title': 'Medical Physics',
        'home.subtitle': 'Learn Medical Physics & Radiology',
        'home.heroTitle': 'Master Medical Physics',
        'home.heroSubtitle': 'Comprehensive learning platform for radiology and medical imaging',
        'home.getStarted': 'Get Started',
        'home.exploreCourses': 'Explore Courses',

        // Auth
        'auth.loginTitle': 'Sign In',
        'auth.registerTitle': 'Create Account',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.confirmPassword': 'Confirm Password',
        'auth.forgotPassword': 'Forgot Password?',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',

        // User roles
        'role.admin': 'Administrator',
        'role.user': 'User',

        // Language
        'language.toggle': 'Language',
        'language.name': 'English',

        // Theme
        'theme.toggle': 'Dark Mode',
        'theme.light': 'Light',
        'theme.dark': 'Dark',

        // Admin
        'admin.manageLessons': 'Manage Lessons',
        'admin.manageCategories': 'Manage Categories',

        // Categories Page
        'categories.pageTitle': 'Imaging Modalities',
        'categories.pageSubtitle': 'All types of medical imaging',
    },
    ku: {
        // Navigation
        'nav.home': 'سەرەتا',
        'nav.categories': 'بەشەکان',
        'nav.courses': 'کۆرسەکان',
        'nav.tools': 'ئامرازەکان',
        'nav.search': 'گەڕان',
        'nav.profile': 'پرۆفایلی من',
        'nav.admin': 'بەڕێوەبەر',
        'nav.dashboard': 'داشبۆرد',
        'nav.lessons': 'وانەکان',
        'nav.logout': 'چوونەدەرەوە',
        'nav.login': 'چوونەژوورەوە',
        'nav.signIn': 'چوونەژوورەوە',
        'nav.signOut': 'چوونەدەرەوە',
        'nav.management': 'بەڕێوەبردن',
        'nav.openMenu': 'کردنەوەی مێنو',
        'nav.navigationMenu': 'مێنوی گەشتکردن',
        'nav.navigation': 'گەشتکردن',
        'nav.administration': 'بەڕێوەبردن',

        // Tools
        'tools.title': 'ئامرازە پزیشکییەکان',
        'tools.imageViewer': 'بینەری وێنەی پزیشکی',
        'tools.imageViewerDesc': 'بینین و شیکردنەوەی وێنەکانی DICOM',
        'tools.3dModel': 'مۆدێلی 3Dی جەستە',
        'tools.3dModelDesc': 'گەڕان لە ئەناتۆمی جەستەی مرۆڤ',
        'tools.anatomyAtlas': 'ئەتلەسی ئەناتۆمی',
        'tools.anatomyAtlasDesc': 'فێربوونی ئەناتۆمی بە وێنەگرتنی فرەشێوە',
        'tools.xrayCalculator': 'حیسابکەری X-ray',
        'tools.xrayCalculatorDesc': 'حیساکردنی mAs و kVp بۆ ڕادیۆگرافی',

        // Common
        'common.loading': 'بارکردن...',
        'common.back': 'گەڕانەوە',
        'common.next': 'دواتر',
        'common.previous': 'پێشتر',
        'common.search': 'گەڕان',
        'common.viewAll': 'هەمووی ببینە',
        'common.learnMore': 'زیاتر بزانە',
        'common.close': 'داخستن',

        // Courses
        'courses.title': 'کۆرسەکان',
        'courses.subtitle': 'کۆرسی تەواو بۆ فێربوونی ڕادیۆلۆژی بە شێوەیەکی ڕێکخراو',
        'courses.noCourses': 'هیچ کۆرسێک نییە',
        'courses.viewLessons': 'وانەکان ببینە',

        // Anatomy Atlas
        'anatomy.title': 'ئەتلەسی ئەناتۆمی',
        'anatomy.subtitle': 'ئەناتۆمی مرۆڤ بکۆڵەوە بە وێنەگرتنی پزیشکی فرەشێوە',
        'anatomy.normalAnatomy': 'ئەناتۆمی ئاسایی',
        'anatomy.normalAnatomyDesc': 'فێربوونی ئەناتۆمی بە وێنەی ڕەنگاوڕەنگ',
        'anatomy.xrayAnatomy': 'ئەناتۆمی X-Ray',
        'anatomy.xrayAnatomyDesc': 'خوێندنەوەی ئەناتۆمی وەک چۆن لە ڕادیۆگرافدا دەردەکەوێت',
        'anatomy.ctAnatomy': 'ئەناتۆمی CT',
        'anatomy.ctAnatomyDesc': 'ئەناتۆمی بڕاوە بە وێنەگرتنی CT',
        'anatomy.mriAnatomy': 'ئەناتۆمی MRI',
        'anatomy.mriAnatomyDesc': 'ئەناتۆمی وردی شلی نەرم بە MRI',
        'anatomy.selectModality': 'شێوەی وێنەگرتن هەڵبژێرە',
        'anatomy.keyStructures': 'پێکهاتە سەرەکییەکان',
        'anatomy.clinicalNotes': 'تێبینییە کلینیکیەکان',
        'anatomy.modality': 'شێوەی وێنەگرتن',
        'anatomy.viewerTip': 'چەرخی ماوس بۆ زووم، ڕاکێشان بۆ جوڵاندن',
        'anatomy.noData': 'بەش نەدۆزرایەوە',
        'anatomy.fullscreen': 'شاشەی تەواو',
        'anatomy.browseCategories': 'بە پۆل بگەڕێ',
        'anatomy.allParts': 'هەموو ئەناتۆمیەکان',
        'anatomy.featured': 'هەڵبژێردراو',
        'anatomy.startLearning': 'دەست بکە بە فێربوون',
        'anatomy.otherParts': 'بەشەکانی تر',

        // Modalities
        'modality.normal': 'ئاسایی',
        'modality.normalDesc': 'وێنەی ئەناتۆمی ڕەنگاوڕەنگ',
        'modality.xray': 'تیشکی ئێکس',
        'modality.xrayDesc': 'ڕادیۆگراف کە پێکهاتەی ئێسک پیشان دەدات',
        'modality.ct': 'سکانی CT',
        'modality.ctDesc': 'تۆمۆگرافی کۆمپیوتەری بڕاوە',
        'modality.mri': 'MRI',
        'modality.mriDesc': 'وێنەگرتن بە ڕیزۆنانسی مەغناتیسی',

        // Index/Home
        'home.title': 'فیزیای پزیشکی',
        'home.subtitle': 'فێربوونی فیزیای پزیشکی و ڕادیۆلۆژی',
        'home.heroTitle': 'فیزیای پزیشکی فێربە',
        'home.heroSubtitle': 'پلاتفۆڕمی تەواو بۆ فێربوونی ڕادیۆلۆژی و وێنەگرتنی پزیشکی',
        'home.getStarted': 'دەست پێبکە',
        'home.exploreCourses': 'کۆرسەکان ببینە',

        // Auth
        'auth.loginTitle': 'چوونەژوورەوە',
        'auth.registerTitle': 'دروستکردنی هەژمار',
        'auth.email': 'ئیمەیڵ',
        'auth.password': 'وشەی نهێنی',
        'auth.confirmPassword': 'دووبارەکردنەوەی وشەی نهێنی',
        'auth.forgotPassword': 'وشەی نهێنیت لەبیرکردووە؟',
        'auth.noAccount': 'هەژمارت نییە؟',
        'auth.hasAccount': 'هەژمارت هەیە؟',

        // User roles
        'role.admin': 'بەڕێوەبەر',
        'role.user': 'بەکارهێنەر',

        // Language
        'language.toggle': 'زمان',
        'language.name': 'کوردی',

        // Theme
        'theme.toggle': 'دۆخی تاریک',
        'theme.light': 'ڕووناک',
        'theme.dark': 'تاریک',

        // Admin
        'admin.manageLessons': 'بەڕێوەبردنی وانەکان',
        'admin.manageCategories': 'بەڕێوەبردنی بەشەکان',

        // Categories Page
        'categories.pageTitle': 'بەشەکانی وێنەگرتن',
        'categories.pageSubtitle': 'هەموو جۆرەکانی وێنەگرتنی پزیشکی',
    }
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('language') as Language) || 'ku'; // Default to Kurdish
        }
        return 'ku';
    });

    const isRTL = language === 'ku';

    useEffect(() => {
        // Update document direction and font
        const root = document.documentElement;
        root.dir = isRTL ? 'rtl' : 'ltr';
        root.lang = language;

        // Add/remove RTL class for styling
        if (isRTL) {
            root.classList.add('rtl');
            root.classList.remove('ltr');
        } else {
            root.classList.add('ltr');
            root.classList.remove('rtl');
        }
    }, [isRTL, language]);

    const setLanguage = (lang: Language) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);
    };

    // Translation function
    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, isRTL, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
