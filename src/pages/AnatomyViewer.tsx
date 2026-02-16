import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scene } from '../components/3d/Scene';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Search, Menu, Activity, Heart, Brain, Bone, Wind, Utensils, Languages, Image as ImageIcon, Mouse, MousePointerClick, Move, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Language type
type Lang = 'en' | 'ku';

// UI Translations
const uiTranslations = {
    en: {
        title: 'ANATOMY',
        titleAccent: 'X',
        searchPlaceholder: 'Search body parts...',
        clickForDetails: 'Click for details',
        bodySystems: 'Body Systems',
        viewControls: 'View Controls',
        explode: 'Explode',
        xray: 'X-Ray',
        muscles: 'Muscles',
        organs: 'Organs',
        interactiveMode: 'Interactive Mode',
        interactiveDesc: 'Hover over any area to see which body part it is. Click for detailed information.',
        active: 'Active',
        currentlyHovering: 'Currently Hovering',
        controls: 'Controls',
        controlRotate: 'Left click + drag to rotate',
        controlZoom: 'Scroll to zoom in/out',
        controlPan: 'Right click + drag to pan',
        controlClick: 'Click on body part for info',
        learnMore: 'Learn More',
        viewDiagram: 'View Diagram',
        keyFunctions: 'Key Functions',
        system: 'System',
        systems: {
            skeletal: 'Skeletal System',
            muscular: 'Muscular System',
            nervous: 'Nervous System',
            circulatory: 'Circulatory System',
            digestive: 'Digestive System',
            respiratory: 'Respiratory System',
        }
    },
    ku: {
        title: 'ئەناتۆمی',
        titleAccent: 'X',
        searchPlaceholder: 'گەڕان بۆ بەشەکانی جەستە...',
        clickForDetails: 'کرتە بکە بۆ وردەکاری',
        bodySystems: 'سیستەمەکانی جەستە',
        viewControls: 'کۆنترۆڵی بینین',
        explode: 'تێکشکاندن',
        xray: 'تیشکی ئێکس',
        muscles: 'ماسولکەکان',
        organs: 'ئەندامەکان',
        interactiveMode: 'دۆخی کارلێکردن',
        interactiveDesc: 'ماوسەکە ببە بەسەر هەر ناوچەیەکدا بۆ بینینی ناوی بەشی جەستە. کرتە بکە بۆ زانیاری.',
        active: 'چالاک',
        currentlyHovering: 'ئێستا لەسەری',
        controls: 'کۆنترۆڵەکان',
        controlRotate: 'کرتەی چەپ + ڕاکێشان بۆ سوڕاندن',
        controlZoom: 'سکرۆڵ بۆ گەورەکردن/بچووککردن',
        controlPan: 'کرتەی ڕاست + ڕاکێشان بۆ جوڵاندن',
        controlClick: 'کرتە لەسەر بەشی جەستە بۆ زانیاری',
        learnMore: 'زیاتر بزانە',
        viewDiagram: 'دیاگرام ببینە',
        keyFunctions: 'کاری سەرەکی',
        system: 'سیستەم',
        systems: {
            skeletal: 'سیستەمی ئێسک',
            muscular: 'سیستەمی ماسولکە',
            nervous: 'سیستەمی دەمار',
            circulatory: 'سیستەمی گەردەنی خوێن',
            digestive: 'سیستەمی هەرسکردن',
            respiratory: 'سیستەمی هەناسە',
        }
    }
};

// Anatomy data with translations
const anatomyData: Record<string, {
    en: { title: string; description: string; system: string; functions: string[] };
    ku: { title: string; description: string; system: string; functions: string[] };
}> = {
    'Head': {
        en: {
            title: 'Head (Cranium)',
            description: 'The head contains the brain, eyes, ears, nose, and mouth. The skull protects the brain and provides attachment points for facial muscles.',
            system: 'Skeletal',
            functions: ['Protects the brain', 'Houses sensory organs', 'Enables facial expression']
        },
        ku: {
            title: 'سەر (کاسەی سەر)',
            description: 'سەر مێشک، چاو، گوێ، لووت و دەم لەخۆ دەگرێت. کاسەی سەر مێشک دەپارێزێت و شوێنی پەیوەستبوونی ماسولکەکانی دەموچاوە.',
            system: 'ئێسکی',
            functions: ['پاراستنی مێشک', 'جێگای ئەندامە هەستیارەکان', 'هێزدانی دەربڕینی دەموچاو']
        }
    },
    'Brain': {
        en: {
            title: 'Brain',
            description: 'The brain is the central organ of the nervous system. It controls thought, memory, emotion, touch, motor skills, vision, breathing, temperature, hunger, and every process that regulates our body.',
            system: 'Nervous',
            functions: ['Controls all body functions', 'Processes sensory information', 'Stores memories', 'Enables consciousness']
        },
        ku: {
            title: 'مێشک',
            description: 'مێشک ئەندامی ناوەندی سیستەمی دەماریە. کۆنترۆڵی بیرکردنەوە، یادەوەری، هەست، پەیوەستبوون، جوڵەی جەستە، بینین، هەناسەدان، گەرمی، برسییەتی و هەموو پرۆسەیەک کە جەستەمان بەڕێوە دەبات.',
            system: 'سیستەمی دەمار',
            functions: ['کۆنترۆڵی هەموو کارەکانی جەستە', 'پرۆسەکردنی زانیاری هەستەکان', 'پاشەکەوتکردنی یادەوەری', 'هێزدانی هۆشیاری']
        }
    },
    'Neck': {
        en: {
            title: 'Neck (Cervical Region)',
            description: 'The neck connects the head to the torso and contains the cervical spine, trachea, esophagus, and major blood vessels.',
            system: 'Musculoskeletal',
            functions: ['Supports head movement', 'Contains vital airways', 'Houses thyroid gland']
        },
        ku: {
            title: 'مل (ناوچەی گەردن)',
            description: 'مل سەر بە لاشەوە دەبەستێتەوە و بڕی ملی ستوون، نەفەسەڕۆ، خواردنەڕۆ و شایینە سەرەکیەکانی خوێن لەخۆ دەگرێت.',
            system: 'ماسولکە و ئێسکی',
            functions: ['پشتگیری جوڵەی سەر', 'ڕێگای هەناسەدان لەخۆ دەگرێت', 'گڵاندی تایرۆید لەخۆ دەگرێت']
        }
    },
    'Chest': {
        en: {
            title: 'Thorax (Chest)',
            description: 'The thoracic cavity contains the heart, lungs, and major blood vessels. The ribcage provides protection for these vital organs.',
            system: 'Cardiovascular',
            functions: ['Protects heart and lungs', 'Enables breathing mechanics', 'Houses major blood vessels']
        },
        ku: {
            title: 'سنگ (سینە)',
            description: 'بۆشاییی سنگ دڵ، سییەکان و شایینە سەرەکییەکانی خوێن لەخۆ دەگرێت. قەفەزەی سنگ پاراستن بۆ ئەم ئەندامە گرنگانە دابین دەکات.',
            system: 'سیستەمی دڵ و خوێن',
            functions: ['پاراستنی دڵ و سییەکان', 'هێزدانی مێکانیزمی هەناسەدان', 'شایینە سەرەکییەکانی خوێن لەخۆ دەگرێت']
        }
    },
    'Heart': {
        en: {
            title: 'Heart',
            description: 'The heart is a muscular organ that pumps blood throughout the body. It has four chambers and beats about 100,000 times per day.',
            system: 'Cardiovascular',
            functions: ['Pumps blood', 'Maintains circulation', 'Delivers oxygen to tissues']
        },
        ku: {
            title: 'دڵ',
            description: 'دڵ ئەندامێکی ماسولکەییە کە خوێن بۆ هەموو جەستە پەمپ دەکات. چوار ژووری هەیە و نزیکەی ١٠٠،٠٠٠ جار لە ڕۆژێکدا دەتەپێ.',
            system: 'سیستەمی دڵ و خوێن',
            functions: ['پەمپکردنی خوێن', 'پاراستنی گەردەنی خوێن', 'گەیاندنی ئۆکسجین بۆ تەوێنەکان']
        }
    },
    'Lungs': {
        en: {
            title: 'Lungs',
            description: 'The lungs are paired organs for gas exchange. The right lung has three lobes, the left has two. They contain about 300 million alveoli.',
            system: 'Respiratory',
            functions: ['Gas exchange', 'Oxygenates blood', 'Removes carbon dioxide']
        },
        ku: {
            title: 'سییەکان',
            description: 'سییەکان دوو ئەندامن بۆ ئاڵوگۆڕی گاز. سییەی ڕاست سێ لۆبی هەیە، چەپیش دوو. نزیکەی ٣٠٠ ملیۆن ئەلڤیولی لەخۆ دەگرێت.',
            system: 'سیستەمی هەناسە',
            functions: ['ئاڵوگۆڕی گاز', 'داخستنی ئۆکسجین بە خوێن', 'لابردنی کاربۆن دای ئۆکساید']
        }
    },
    'Abdomen': {
        en: {
            title: 'Abdomen',
            description: 'The abdominal cavity contains digestive organs including the stomach, intestines, liver, and kidneys. It is protected by abdominal muscles.',
            system: 'Digestive',
            functions: ['Contains digestive organs', 'Protects kidneys', 'Enables core movement']
        },
        ku: {
            title: 'سک',
            description: 'بۆشایی سک ئەندامەکانی هەرسکردن لەخۆ دەگرێت وەک گەدە، ڕیخۆڵە، جگەر و گورچیلە. بە ماسولکەکانی سک پارێزراوە.',
            system: 'سیستەمی هەرسکردن',
            functions: ['ئەندامەکانی هەرسکردن لەخۆ دەگرێت', 'پاراستنی گورچیلە', 'هێزدانی جوڵەی ناوەند']
        }
    },
    'Liver': {
        en: {
            title: 'Liver',
            description: 'The liver is the largest internal organ, weighing about 1.5 kg. It performs over 500 vital functions including detoxification, protein synthesis, and bile production.',
            system: 'Digestive',
            functions: ['Detoxification', 'Produces bile', 'Metabolizes nutrients', 'Stores vitamins']
        },
        ku: {
            title: 'جگەر',
            description: 'جگەر گەورەترین ئەندامی ناوەکییە، نزیکەی ١.٥ کگ کێشی هەیە. زیاتر لە ٥٠٠ کاری گرنگ ئەنجام دەدات وەک پاککردنەوە، دروستکردنی پڕۆتین و بەرهەمهێنانی بایل.',
            system: 'سیستەمی هەرسکردن',
            functions: ['پاککردنەوە لە ژەهر', 'دروستکردنی بایل', 'مێتابۆلیزەکردنی خواردن', 'پاشەکەوتکردنی ڤیتامین']
        }
    },
    'Stomach': {
        en: {
            title: 'Stomach',
            description: 'The stomach is a muscular organ that receives food from the esophagus and breaks it down using acid and enzymes.',
            system: 'Digestive',
            functions: ['Stores food', 'Digests proteins', 'Kills bacteria', 'Mixes food with digestive juices']
        },
        ku: {
            title: 'گەدە',
            description: 'گەدە ئەندامێکی ماسولکەییە کە خواردن لە خواردنەڕۆ وەردەگرێت و بە ئەسید و ئینزایم شیی دەکاتەوە.',
            system: 'سیستەمی هەرسکردن',
            functions: ['پاشەکەوتکردنی خواردن', 'هەرسکردنی پڕۆتین', 'کوشتنی باکتریا', 'تێکەڵکردنی خواردن بە شلە هەرسکەرەکان']
        }
    },
    'Kidneys': {
        en: {
            title: 'Kidneys',
            description: 'The kidneys are paired bean-shaped organs that filter blood, removing waste and excess fluid to produce urine. They filter about 180 liters of blood daily.',
            system: 'Urinary',
            functions: ['Filter blood', 'Produce urine', 'Regulate blood pressure', 'Balance electrolytes']
        },
        ku: {
            title: 'گورچیلە',
            description: 'گورچیلەکان دوو ئەندامی شێوە باقلا وەکن کە خوێن فلتەر دەکەن، پاشماوە و شلەی زیادە لادەبەن بۆ دروستکردنی میز. نزیکەی ١٨٠ لیتر خوێن بە ڕۆژانە فلتەر دەکەن.',
            system: 'سیستەمی میز',
            functions: ['فلتەرکردنی خوێن', 'دروستکردنی میز', 'ڕێکخستنی فشاری خوێن', 'هاوسەنگکردنی ئیلێکتڕۆلایت']
        }
    },
    'Spine': {
        en: {
            title: 'Spinal Column',
            description: 'The spine consists of 33 vertebrae divided into cervical, thoracic, lumbar, sacral, and coccygeal regions. It protects the spinal cord and provides structural support.',
            system: 'Skeletal',
            functions: ['Protects spinal cord', 'Provides structural support', 'Enables flexibility', 'Supports body weight']
        },
        ku: {
            title: 'ستوونی پشت',
            description: 'ستوونی پشت پێکدێت لە ٣٣ مەرە کە دابەشکراون بۆ ناوچەکانی ملی، سینەیی، ناوەڕاست، ساکرۆم و کۆکسیکس. لەدەمی پاراستن بۆ کۆردی ستوون و پشتگیری پێکهاتە.',
            system: 'ئێسکی',
            functions: ['پاراستنی کۆردی ستوون', 'پشتگیری پێکهاتە', 'هێزدانی نەرمی', 'هەڵگرتنی کێشی جەستە']
        }
    },
    'Pelvis': {
        en: {
            title: 'Pelvis',
            description: 'The pelvic region contains the hip bones, bladder, and reproductive organs. It supports the weight of the upper body and protects internal organs.',
            system: 'Skeletal',
            functions: ['Supports body weight', 'Protects reproductive organs', 'Enables hip movement']
        },
        ku: {
            title: 'لانک',
            description: 'ناوچەی لانک ئێسکی لانک، گەردیلە و ئەندامەکانی زاوزێ لەخۆ دەگرێت. کێشی لاشەی سەرەوە هەڵدەگرێت و ئەندامە ناوەکییەکان دەپارێزێت.',
            system: 'ئێسکی',
            functions: ['هەڵگرتنی کێشی جەستە', 'پاراستنی ئەندامەکانی زاوزێ', 'هێزدانی جوڵەی لانک']
        }
    },
    'Shoulder': {
        en: {
            title: 'Shoulder Joint',
            description: 'The shoulder is the most mobile joint in the body, formed by the humerus, scapula, and clavicle. It allows for a wide range of arm movements.',
            system: 'Musculoskeletal',
            functions: ['Arm rotation', 'Lifting movements', 'Reaching and throwing']
        },
        ku: {
            title: 'جومگەی شان',
            description: 'شان جووڵترین جومگەی جەستەیە، پێکدێت لە ئێسکی بازوو، شانەپەڕ و ئێسکی شان. ڕێگا بە کۆمەڵێک جوڵەی باڵ دەدات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['سوڕانەوەی باڵ', 'جوڵەکانی بەرزکردنەوە', 'گەیشتن و هاویشتن']
        }
    },
    'Left Arm': {
        en: {
            title: 'Left Upper Limb',
            description: 'The arm consists of the humerus, radius, ulna, and numerous muscles enabling reaching and manipulation.',
            system: 'Musculoskeletal',
            functions: ['Reaching and grasping', 'Fine motor control', 'Carrying objects']
        },
        ku: {
            title: 'باڵی چەپ',
            description: 'باڵ پێکدێت لە ئێسکی بازوو، ڕادیەس، ئەلنا و ژمارەیەکی زۆر ماسولکە کە هێزی گەیشتن و گرتن دەدات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['گەیشتن و گرتن', 'کۆنترۆڵی ورد', 'هەڵگرتنی شتەکان']
        }
    },
    'Right Arm': {
        en: {
            title: 'Right Upper Limb',
            description: 'The arm consists of the humerus, radius, ulna, and numerous muscles enabling reaching and manipulation.',
            system: 'Musculoskeletal',
            functions: ['Reaching and grasping', 'Fine motor control', 'Carrying objects']
        },
        ku: {
            title: 'باڵی ڕاست',
            description: 'باڵ پێکدێت لە ئێسکی بازوو، ڕادیەس، ئەلنا و ژمارەیەکی زۆر ماسولکە کە هێزی گەیشتن و گرتن دەدات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['گەیشتن و گرتن', 'کۆنترۆڵی ورد', 'هەڵگرتنی شتەکان']
        }
    },
    'Elbow': {
        en: {
            title: 'Elbow Joint',
            description: 'The elbow is a hinge joint formed by the humerus, radius, and ulna. It allows flexion and extension of the forearm.',
            system: 'Musculoskeletal',
            functions: ['Forearm flexion', 'Forearm extension', 'Rotational movement']
        },
        ku: {
            title: 'جومگەی ئانیشک',
            description: 'ئانیشک جومگەیەکی دەروازەییە کە لە ئێسکی بازوو، ڕادیەس و ئەلنا پێکدێت. ڕێگا بە چەماندن و ڕاستکردنەوەی ساعید دەدات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['چەماندنی ساعید', 'ڕاستکردنەوەی ساعید', 'جوڵەی سوڕانەوە']
        }
    },
    'Left Hand': {
        en: {
            title: 'Left Hand',
            description: 'The hand contains 27 bones and enables precise manipulation. The opposable thumb is unique to primates.',
            system: 'Musculoskeletal',
            functions: ['Fine motor control', 'Grip and manipulation', 'Tactile sensation']
        },
        ku: {
            title: 'دەستی چەپ',
            description: 'دەست ٢٧ ئێسک لەخۆ دەگرێت و هێزی کارکردنی ورد دەدات. پەنجەی گەورە تایبەتییە بە شادیارەکان.',
            system: 'ماسولکە و ئێسکی',
            functions: ['کۆنترۆڵی ورد', 'گرتن و کارکردن', 'هەستی پێوەبەستن']
        }
    },
    'Right Hand': {
        en: {
            title: 'Right Hand',
            description: 'The hand contains 27 bones and enables precise manipulation. The opposable thumb is unique to primates.',
            system: 'Musculoskeletal',
            functions: ['Fine motor control', 'Grip and manipulation', 'Tactile sensation']
        },
        ku: {
            title: 'دەستی ڕاست',
            description: 'دەست ٢٧ ئێسک لەخۆ دەگرێت و هێزی کارکردنی ورد دەدات. پەنجەی گەورە تایبەتییە بە شادیارەکان.',
            system: 'ماسولکە و ئێسکی',
            functions: ['کۆنترۆڵی ورد', 'گرتن و کارکردن', 'هەستی پێوەبەستن']
        }
    },
    'Hip': {
        en: {
            title: 'Hip Joint',
            description: 'The hip is a ball-and-socket joint connecting the femur to the pelvis. It is one of the most stable joints in the body.',
            system: 'Musculoskeletal',
            functions: ['Weight bearing', 'Walking and running', 'Leg rotation']
        },
        ku: {
            title: 'جومگەی لانک',
            description: 'لانک جومگەیەکی تۆپ و کاسەییە کە ڕان بە لانک دەبەستێتەوە. یەکێکە لە جێگیرترین جومگەکانی جەستە.',
            system: 'ماسولکە و ئێسکی',
            functions: ['هەڵگرتنی کێش', 'ڕۆیشتن و ڕاکردن', 'سوڕانەوەی لاق']
        }
    },
    'Left Upper Leg': {
        en: {
            title: 'Left Thigh (Femoral Region)',
            description: 'The thigh contains the femur, the largest bone in the body, and powerful muscles for walking and running.',
            system: 'Musculoskeletal',
            functions: ['Weight bearing', 'Walking and running', 'Hip flexion']
        },
        ku: {
            title: 'ڕانی چەپ',
            description: 'ڕان ئێسکی ڕان لەخۆ دەگرێت کە گەورەترین ئێسکی جەستەیە، و ماسولکە بەهێزەکان بۆ ڕۆیشتن و ڕاکردن.',
            system: 'ماسولکە و ئێسکی',
            functions: ['هەڵگرتنی کێش', 'ڕۆیشتن و ڕاکردن', 'چەماندنی لانک']
        }
    },
    'Right Upper Leg': {
        en: {
            title: 'Right Thigh (Femoral Region)',
            description: 'The thigh contains the femur, the largest bone in the body, and powerful muscles for walking and running.',
            system: 'Musculoskeletal',
            functions: ['Weight bearing', 'Walking and running', 'Hip flexion']
        },
        ku: {
            title: 'ڕانی ڕاست',
            description: 'ڕان ئێسکی ڕان لەخۆ دەگرێت کە گەورەترین ئێسکی جەستەیە، و ماسولکە بەهێزەکان بۆ ڕۆیشتن و ڕاکردن.',
            system: 'ماسولکە و ئێسکی',
            functions: ['هەڵگرتنی کێش', 'ڕۆیشتن و ڕاکردن', 'چەماندنی لانک']
        }
    },
    'Knee': {
        en: {
            title: 'Knee Joint',
            description: 'The knee is the largest joint in the body, connecting the femur to the tibia. It contains important ligaments (ACL, PCL, MCL, LCL) and menisci.',
            system: 'Musculoskeletal',
            functions: ['Leg flexion and extension', 'Weight bearing', 'Stability during movement']
        },
        ku: {
            title: 'جومگەی ئەژنۆ',
            description: 'ئەژنۆ گەورەترین جومگەی جەستەیە کە ڕان بە ساق دەبەستێتەوە. لیگامێنتە گرنگەکان (ACL، PCL، MCL، LCL) و مەنیسکەکان لەخۆ دەگرێت.',
            system: 'ماسولکە و ئێسکی',
            functions: ['چەماندن و ڕاستکردنەوەی لاق', 'هەڵگرتنی کێش', 'جێگیری لە کاتی جوڵاندا']
        }
    },
    'Left Lower Leg': {
        en: {
            title: 'Left Lower Leg (Crural Region)',
            description: 'The lower leg contains the tibia and fibula bones, along with calf muscles for ankle movement.',
            system: 'Musculoskeletal',
            functions: ['Balance maintenance', 'Ankle movement', 'Propulsion in walking']
        },
        ku: {
            title: 'ساقی چەپ',
            description: 'ساق ئێسکی تیبیا و فیبولا لەخۆ دەگرێت، لەگەڵ ماسولکەی پاڵپشت بۆ جوڵەی قاپی پێ.',
            system: 'ماسولکە و ئێسکی',
            functions: ['پاراستنی هاوسەنگی', 'جوڵەی قاپی پێ', 'هەڵکردن لە ڕۆیشتندا']
        }
    },
    'Right Lower Leg': {
        en: {
            title: 'Right Lower Leg (Crural Region)',
            description: 'The lower leg contains the tibia and fibula bones, along with calf muscles for ankle movement.',
            system: 'Musculoskeletal',
            functions: ['Balance maintenance', 'Ankle movement', 'Propulsion in walking']
        },
        ku: {
            title: 'ساقی ڕاست',
            description: 'ساق ئێسکی تیبیا و فیبولا لەخۆ دەگرێت، لەگەڵ ماسولکەی پاڵپشت بۆ جوڵەی قاپی پێ.',
            system: 'ماسولکە و ئێسکی',
            functions: ['پاراستنی هاوسەنگی', 'جوڵەی قاپی پێ', 'هەڵکردن لە ڕۆیشتندا']
        }
    },
    'Ankle': {
        en: {
            title: 'Ankle Joint',
            description: 'The ankle connects the lower leg to the foot. It is a complex joint involving the tibia, fibula, and talus bones.',
            system: 'Musculoskeletal',
            functions: ['Foot movement', 'Balance', 'Weight transfer during walking']
        },
        ku: {
            title: 'جومگەی قاپی پێ',
            description: 'قاپی پێ ساق بە پێ دەبەستێتەوە. جومگەیەکی ئاڵۆزە کە ئێسکی تیبیا، فیبولا و تالەس تێیدا بەشداری دەکەن.',
            system: 'ماسولکە و ئێسکی',
            functions: ['جوڵەی پێ', 'هاوسەنگی', 'گواستنەوەی کێش لە کاتی ڕۆیشتندا']
        }
    },
    'Left Foot': {
        en: {
            title: 'Left Foot',
            description: 'The foot contains 26 bones arranged in arches. It provides balance, support, and propulsion during movement.',
            system: 'Musculoskeletal',
            functions: ['Weight distribution', 'Balance and stability', 'Propulsion']
        },
        ku: {
            title: 'پێی چەپ',
            description: 'پێ ٢٦ ئێسک لەخۆ دەگرێت کە بە شێوەی کەوانە ڕێکخراون. هاوسەنگی، پشتگیری و هەڵکردن لە جوڵەدا دابین دەکات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['دابەشکردنی کێش', 'هاوسەنگی و جێگیری', 'هەڵکردن']
        }
    },
    'Right Foot': {
        en: {
            title: 'Right Foot',
            description: 'The foot contains 26 bones arranged in arches. It provides balance, support, and propulsion during movement.',
            system: 'Musculoskeletal',
            functions: ['Weight distribution', 'Balance and stability', 'Propulsion']
        },
        ku: {
            title: 'پێی ڕاست',
            description: 'پێ ٢٦ ئێسک لەخۆ دەگرێت کە بە شێوەی کەوانە ڕێکخراون. هاوسەنگی، پشتگیری و هەڵکردن لە جوڵەدا دابین دەکات.',
            system: 'ماسولکە و ئێسکی',
            functions: ['دابەشکردنی کێش', 'هاوسەنگی و جێگیری', 'هەڵکردن']
        }
    },
    'Ribcage': {
        en: {
            title: 'Ribcage',
            description: 'The ribcage consists of 12 pairs of ribs that protect the heart, lungs, and other vital organs. It also assists in breathing.',
            system: 'Skeletal',
            functions: ['Protects vital organs', 'Assists in breathing', 'Provides muscle attachment']
        },
        ku: {
            title: 'قەفەزەی سنگ',
            description: 'قەفەزەی سنگ پێکدێت لە ١٢ جوێت پاراسووک کە دڵ، سییەکان و ئەندامە گرنگەکانی تر دەپارێزن. هاوکاریی هەناسەدانیش دەکات.',
            system: 'ئێسکی',
            functions: ['پاراستنی ئەندامە گرنگەکان', 'هاوکاری لە هەناسەدان', 'شوێنی پەیوەستبوونی ماسولکە']
        }
    },
    'Intestines': {
        en: {
            title: 'Intestines',
            description: 'The intestines consist of the small and large intestine. The small intestine is about 6 meters long, while the large intestine is about 1.5 meters.',
            system: 'Digestive',
            functions: ['Nutrient absorption', 'Water absorption', 'Waste elimination']
        },
        ku: {
            title: 'ڕیخۆڵە',
            description: 'ڕیخۆڵە پێکدێت لە ڕیخۆڵەی بچووک و گەورە. ڕیخۆڵەی بچووک نزیکەی ٦ مەتر درێژییە، ڕیخۆڵەی گەورەش نزیکەی ١.٥ مەتر.',
            system: 'سیستەمی هەرسکردن',
            functions: ['هەڵمژینی خواردن', 'هەڵمژینی ئاو', 'دەرکردنی پاشماوە']
        }
    },
    'Bladder': {
        en: {
            title: 'Urinary Bladder',
            description: 'The bladder is a muscular sac that stores urine. It can hold about 400-600 ml of urine and is controlled by sphincter muscles.',
            system: 'Urinary',
            functions: ['Stores urine', 'Controls urination', 'Maintains continence']
        },
        ku: {
            title: 'گەردیلە',
            description: 'گەردیلە گویزەیەکی ماسولکەییە کە میز پاشەکەوت دەکات. دەتوانێت نزیکەی ٤٠٠-٦٠٠ مل میز هەڵبگرێت و بە ماسولکەی سفینکتەر کۆنترۆڵ دەکرێت.',
            system: 'سیستەمی میز',
            functions: ['پاشەکەوتکردنی میز', 'کۆنترۆڵی میزکردن', 'پاراستنی گرتنەوەی میز']
        }
    },
    'Body': {
        en: {
            title: 'Human Body',
            description: 'The human body is an incredible system of interconnected organs, bones, muscles, and tissues working together.',
            system: 'Multiple',
            functions: ['Movement', 'Homeostasis', 'Survival']
        },
        ku: {
            title: 'جەستەی مرۆڤ',
            description: 'جەستەی مرۆڤ سیستەمێکی نایابە لە ئەندام، ئێسک، ماسولکە و تەوێنەکان کە پێکەوە کار دەکەن.',
            system: 'فرەسیستەم',
            functions: ['جوڵان', 'هاوسەنگی ناوەکی', 'مانەوە']
        }
    }
};

function getAnatomyInfo(partName: string, lang: Lang) {
    const data = anatomyData[partName] || anatomyData['Body'];
    return data[lang];
}

const systemIcons: Record<string, React.ReactNode> = {
    'Skeletal': <Bone className="w-5 h-5" />,
    'ئێسکی': <Bone className="w-5 h-5" />,
    'Musculoskeletal': <Activity className="w-5 h-5" />,
    'ماسولکە و ئێسکی': <Activity className="w-5 h-5" />,
    'Muscular': <Activity className="w-5 h-5" />,
    'Nervous': <Brain className="w-5 h-5" />,
    'Cardiovascular': <Heart className="w-5 h-5" />,
    'سیستەمی دڵ و خوێن': <Heart className="w-5 h-5" />,
    'Respiratory': <Wind className="w-5 h-5" />,
    'Digestive': <Utensils className="w-5 h-5" />,
    'سیستەمی هەرسکردن': <Utensils className="w-5 h-5" />,
    'Multiple': <Activity className="w-5 h-5" />,
    'فرەسیستەم': <Activity className="w-5 h-5" />,
};

export default function AnatomyViewer() {
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [hoveredPart, setHoveredPart] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lang, setLang] = useState<Lang>('en');

    const t = uiTranslations[lang];
    const anatomyInfo = selectedPart ? getAnatomyInfo(selectedPart, lang) : null;

    const isRTL = lang === 'ku';

    return (
        <div className={`relative w-full h-screen overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* 3D Scene Background */}
            <div className="absolute inset-0 z-0">
                <Scene onPartSelect={setSelectedPart} onPartHover={setHoveredPart} />
            </div>

            {/* Language Toggle & Atlas Button */}
            <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
                {/* 2D Atlas Button */}
                <Link to="/anatomy/atlas">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-cyan-500/20 gap-1 sm:gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 px-2 sm:px-3 shadow-lg shadow-cyan-500/10"
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{lang === 'en' ? '2D Atlas' : 'ئەتلەسی 2D'}</span>
                        <span className="sm:hidden">2D</span>
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLang(lang === 'en' ? 'ku' : 'en')}
                    className="text-white hover:bg-white/10 gap-1 sm:gap-2 bg-black/30 backdrop-blur-xl border border-white/10 px-2 sm:px-3"
                >
                    <Languages className="w-4 h-4" />
                    <span className="hidden sm:inline">{lang === 'en' ? 'کوردی' : 'English'}</span>
                    <span className="sm:hidden">{lang === 'en' ? 'KU' : 'EN'}</span>
                </Button>
            </div>

            {/* Hover Tooltip */}
            <AnimatePresence>
                {hoveredPart && !selectedPart && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 w-full sm:w-auto"
                    >
                        <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 px-3 sm:px-4 py-2 rounded-full shadow-xl shadow-red-500/10 text-center">
                            <span className="text-red-400 font-medium text-xs sm:text-sm">
                                {lang === 'ku' && anatomyData[hoveredPart] ? anatomyData[hoveredPart].ku.title : hoveredPart}
                            </span>
                            <span className="text-white/50 text-xs mx-1 sm:mx-2 hidden sm:inline">•</span>
                            <span className="text-white/50 text-xs hidden sm:inline">{t.clickForDetails}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Navigation Bar */}
            <nav className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-4">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider">{t.title}<span className="text-cyan-400">{t.titleAccent}</span></h1>
                </div>

                <div className="pointer-events-auto items-center gap-3 hidden md:flex">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64 transition-all"
                        />
                    </div>
                </div>
            </nav>

            {/* Selected Part Details Overlay */}
            <AnimatePresence>
                {selectedPart && anatomyInfo && (
                    <motion.div
                        initial={{ opacity: 0, x: 30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 30, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`absolute bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto ${isRTL ? 'sm:left-4 sm:right-auto' : 'sm:right-4 sm:left-auto'} z-20 sm:w-[380px] md:w-[400px] sm:max-w-[calc(100vw-340px)] pointer-events-auto`}
                    >
                        <div className="bg-black/50 backdrop-blur-2xl border border-white/10 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-cyan-500/10 max-h-[60vh] sm:max-h-none overflow-y-auto">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                                        {systemIcons[anatomyInfo.system] || <Activity className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{anatomyInfo.title}</h2>
                                        <span className="text-xs text-cyan-400 font-medium uppercase tracking-wider">{anatomyInfo.system} {t.system}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => setSelectedPart(null)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Description */}
                            <p className="text-white/80 text-sm leading-relaxed mb-4">
                                {anatomyInfo.description}
                            </p>

                            {/* Functions */}
                            <div className="mb-4">
                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{t.keyFunctions}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {anatomyInfo.functions.map((func, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/70">
                                            {func}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-none shadow-lg shadow-cyan-500/20">
                                    <Info className="w-4 h-4 mr-2" /> {t.learnMore}
                                </Button>
                                <Button size="sm" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
                                    {t.viewDiagram}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ x: isRTL ? 320 : -320 }}
                        animate={{ x: 0 }}
                        exit={{ x: isRTL ? 320 : -320 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`absolute top-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} h-full w-[280px] sm:w-80 bg-black/60 sm:bg-black/40 backdrop-blur-2xl border-white/10 z-10 pt-16 sm:pt-20 pointer-events-auto overflow-y-auto`}
                    >
                        <div className="h-full px-3 sm:px-4 pb-4">
                            {/* Mobile Close Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 sm:hidden text-white hover:bg-white/10 h-8 w-8"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">{t.bodySystems}</h3>
                                    <ul className="space-y-1">
                                        {[
                                            { nameEn: 'skeletal', icon: Bone },
                                            { nameEn: 'muscular', icon: Activity },
                                            { nameEn: 'nervous', icon: Brain },
                                            { nameEn: 'circulatory', icon: Heart },
                                            { nameEn: 'digestive', icon: Utensils },
                                            { nameEn: 'respiratory', icon: Wind },
                                        ].map((sys) => (
                                            <li key={sys.nameEn}>
                                                <button className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm font-medium group">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 flex items-center justify-center transition-colors">
                                                        <sys.icon className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    {t.systems[sys.nameEn as keyof typeof t.systems]}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">{t.viewControls}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50">
                                            {t.explode}
                                        </Button>
                                        <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50">
                                            {t.xray}
                                        </Button>
                                        <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50">
                                            {t.muscles}
                                        </Button>
                                        <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50">
                                            {t.organs}
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-xl border border-cyan-500/20">
                                    <h4 className="text-white font-semibold mb-1">{t.interactiveMode}</h4>
                                    <p className="text-xs text-white/60 mb-3">{t.interactiveDesc}</p>
                                    <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                        </span>
                                        {t.active}
                                    </div>
                                </div>

                                {/* Current Hover Info */}
                                {hoveredPart && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-red-500/10 rounded-xl border border-red-500/30"
                                    >
                                        <h4 className="text-red-400 font-medium text-sm mb-1">{t.currentlyHovering}</h4>
                                        <p className="text-white font-bold text-lg">
                                            {lang === 'ku' && anatomyData[hoveredPart] ? anatomyData[hoveredPart].ku.title : hoveredPart}
                                        </p>
                                    </motion.div>
                                )}

                                {/* Instructions */}
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <h4 className="text-white font-medium mb-2 text-sm">{t.controls}</h4>
                                    <ul className="text-xs text-white/50 space-y-1">
                                        <li className="flex items-center gap-2"><Mouse className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> <span className="text-white/70">{t.controlRotate}</span></li>
                                        <li className="flex items-center gap-2"><ZoomIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> <span className="text-white/70">{t.controlZoom}</span></li>
                                        <li className="flex items-center gap-2"><Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> <span className="text-white/70">{t.controlPan}</span></li>
                                        <li className="flex items-center gap-2"><MousePointerClick className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> <span className="text-white/70">{t.controlClick}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
