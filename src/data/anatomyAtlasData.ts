// Anatomy Atlas Data - Organized by Imaging Device/Modality

export type ImagingDevice = 'xray' | 'ct' | 'mri' | 'ultrasound';

export interface AnatomyPart {
  id: string;
  title: string;
  titleKu: string;
  description: string;
  descriptionKu: string;
  imageUrl: string;
  keyStructures: Array<{ en: string; ku: string }>;
  clinicalNotes: Array<{ en: string; ku: string }>;
}

export interface DeviceCategory {
  id: ImagingDevice;
  title: string;
  titleKu: string;
  description: string;
  descriptionKu: string;
  icon: string;
  color: string;
  parts: AnatomyPart[];
}

// Data organized by imaging device
export const deviceCategories: DeviceCategory[] = [
  {
    id: 'xray',
    title: 'X-Ray Imaging',
    titleKu: 'وێنەگرتنی تیشکی ئێکس',
    description: 'Radiographic images showing bone structures and dense tissues',
    descriptionKu: 'وێنەی ڕادیۆگرافی کە پێکهاتەی ئێسک و تەوێنە قورسەکان پیشان دەدات',
    icon: 'scan',
    color: 'from-slate-500 to-zinc-600',
    parts: [
      {
        id: 'xray-chest',
        title: 'Chest X-Ray',
        titleKu: 'X-Ray ی سنگ',
        description: 'Shows heart, lungs, ribs, and diaphragm. Most common radiograph.',
        descriptionKu: 'دڵ، سییەکان، پاراسووکەکان و پەردەپشت پیشان دەدات. باوترین ڕادیۆگراف.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Chest_Xray_PA_3-8-2010.png',
        keyStructures: [
          { en: 'Cardiac silhouette', ku: 'سێبەری دڵ' },
          { en: 'Lung fields', ku: 'کێڵگەی سییەکان' },
          { en: 'Ribs and clavicles', ku: 'پاراسووک و ئێسکی شان' },
          { en: 'Diaphragm', ku: 'پەردەپشت' }
        ],
        clinicalNotes: [
          { en: 'First-line imaging for pneumonia and heart failure', ku: 'یەکەم وێنەگرتن بۆ نەخۆشی سییەکان و شکستی دڵ' },
          { en: 'Evaluates cardiothoracic ratio', ku: 'ڕێژەی دڵ بۆ سنگ هەڵدەسەنگێنێت' }
        ]
      },
      {
        id: 'xray-hand',
        title: 'Hand X-Ray',
        titleKu: 'X-Ray ی دەست',
        description: 'Shows carpal, metacarpal, and phalangeal bones.',
        descriptionKu: 'ئێسکەکانی مەچەک، ناودەست و پەنجەکان پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/33/X-ray_of_normal_hand_by_dorridge_-_Uploaded_by_Angelus.jpg',
        keyStructures: [
          { en: 'Carpal bones (8)', ku: 'ئێسکەکانی مەچەک (٨)' },
          { en: 'Metacarpal bones (5)', ku: 'ئێسکەکانی ناودەست (٥)' },
          { en: 'Phalanges (14)', ku: 'ئێسکەکانی پەنجە (١٤)' }
        ],
        clinicalNotes: [
          { en: 'Essential for fracture detection', ku: 'گرنگە بۆ دۆزینەوەی شکان' },
          { en: 'Used for bone age assessment', ku: 'بۆ هەڵسەنگاندنی تەمەنی ئێسک بەکاردێت' }
        ]
      },
      {
        id: 'xray-skull',
        title: 'Skull X-Ray',
        titleKu: 'X-Ray ی کاسەی سەر',
        description: 'Shows cranial bones, facial bones, and sinuses.',
        descriptionKu: 'ئێسکەکانی کاسەی سەر، دەموچاو و سینەسەکان پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Skull_lateral.svg',
        keyStructures: [
          { en: 'Frontal bone', ku: 'ئێسکی ناوچەوانی' },
          { en: 'Parietal bones', ku: 'ئێسکەکانی سەرەوە' },
          { en: 'Occipital bone', ku: 'ئێسکی پشتەوە' },
          { en: 'Paranasal sinuses', ku: 'سینەسەکانی لووت' }
        ],
        clinicalNotes: [
          { en: 'Used for trauma evaluation', ku: 'بۆ هەڵسەنگاندنی برین بەکاردێت' }
        ]
      },
      {
        id: 'xray-spine',
        title: 'Spine X-Ray',
        titleKu: 'X-Ray ی ستوونی پشت',
        description: 'Shows vertebral alignment, disc spaces, and bony structures.',
        descriptionKu: 'ڕیزبەندی مەرەکان، بۆشاییی دیسکەکان و پێکهاتەی ئێسک پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Laterally_herniated_disc.png',
        keyStructures: [
          { en: 'Vertebral bodies', ku: 'جەستەی مەرەکان' },
          { en: 'Intervertebral disc spaces', ku: 'بۆشاییی نێوان دیسکەکان' },
          { en: 'Spinous processes', ku: 'دەرچووە ستوونییەکان' }
        ],
        clinicalNotes: [
          { en: 'First-line for spinal trauma', ku: 'یەکەم هەنگاو بۆ برینی ستوون' }
        ]
      },
      {
        id: 'xray-knee',
        title: 'Knee X-Ray',
        titleKu: 'X-Ray ی ئەژنۆ',
        description: 'Shows femur, tibia, patella, and joint space.',
        descriptionKu: 'ڕان، ساق، کەپ و بۆشاییی جومگە پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Knee_radiograph.jpg',
        keyStructures: [
          { en: 'Femoral condyles', ku: 'کۆندایلەکانی ڕان' },
          { en: 'Tibial plateau', ku: 'سەکۆی ساق' },
          { en: 'Patella', ku: 'کەپ' },
          { en: 'Joint space', ku: 'بۆشاییی جومگە' }
        ],
        clinicalNotes: [
          { en: 'Used for osteoarthritis assessment', ku: 'بۆ هەڵسەنگاندنی ئاماسی جومگە' }
        ]
      }
    ]
  },
  {
    id: 'ct',
    title: 'CT Scan',
    titleKu: 'سکانی CT',
    description: 'Cross-sectional computed tomography images',
    descriptionKu: 'وێنەی تۆمۆگرافی کۆمپیوتەری بڕاوە',
    icon: 'layers',
    color: 'from-blue-500 to-cyan-600',
    parts: [
      {
        id: 'ct-brain',
        title: 'Brain CT',
        titleKu: 'CT ی مێشک',
        description: 'Axial sections showing brain parenchyma, ventricles, and skull.',
        descriptionKu: 'بڕەکانی ئاسۆیی کە مادەی مێشک، ڤەنتریکلەکان و کاسەی سەر پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/CT_of_human_brain%2C_axial.jpg',
        keyStructures: [
          { en: 'Gray matter', ku: 'مادەی خۆڵەمێشی' },
          { en: 'White matter', ku: 'مادەی سپی' },
          { en: 'Ventricles', ku: 'ڤەنتریکلەکان' },
          { en: 'Basal ganglia', ku: 'گانگلیا بنەڕەتییەکان' }
        ],
        clinicalNotes: [
          { en: 'Gold standard for acute hemorrhage', ku: 'ستانداردی زێڕین بۆ خوێنڕشتنی تازە' },
          { en: 'Faster than MRI for emergencies', ku: 'خێراترە لە MRI بۆ فریاکەوتن' }
        ]
      },
      {
        id: 'ct-chest',
        title: 'Chest CT',
        titleKu: 'CT ی سنگ',
        description: 'High-resolution images of lungs, mediastinum, and chest wall.',
        descriptionKu: 'وێنەی ڕەزۆلوشنی بەرز بۆ سییەکان، ناوسینە و دیواری سنگ.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Thorax_CT_peripheres_Lungenkarzinom_li_OF_mit_Pleurainvasion.jpg',
        keyStructures: [
          { en: 'Lung parenchyma', ku: 'مادەی سییەکان' },
          { en: 'Bronchi and bronchioles', ku: 'برۆنک و برۆنکیولەکان' },
          { en: 'Pulmonary vessels', ku: 'شایینەکانی سییەکان' },
          { en: 'Mediastinal structures', ku: 'پێکهاتەکانی ناوسینە' }
        ],
        clinicalNotes: [
          { en: 'Essential for lung nodule detection', ku: 'گرنگە بۆ دۆزینەوەی گرێی سییەکان' },
          { en: 'COVID-19 pneumonia assessment', ku: 'هەڵسەنگاندنی نەخۆشی سییەی کۆڤید-١٩' }
        ]
      },
      {
        id: 'ct-abdomen',
        title: 'Abdomen CT',
        titleKu: 'CT ی سک',
        description: 'Shows liver, kidneys, spleen, pancreas, and intestines.',
        descriptionKu: 'جگەر، گورچیلە، سپڵ، پانکریاس و ڕیخۆڵە پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/CT_of_abdomen_and_pelvis%2C_coronal_view.jpg',
        keyStructures: [
          { en: 'Liver and gallbladder', ku: 'جگەر و کیسەی زەردە' },
          { en: 'Kidneys and adrenals', ku: 'گورچیلە و گڵاندی فۆقی گورچیلە' },
          { en: 'Spleen', ku: 'سپڵ' },
          { en: 'Pancreas', ku: 'پانکریاس' }
        ],
        clinicalNotes: [
          { en: 'Contrast-enhanced for tumor detection', ku: 'بە کۆنتراست بۆ دۆزینەوەی تومۆر' }
        ]
      },
      {
        id: 'ct-spine',
        title: 'Spine CT',
        titleKu: 'CT ی ستوونی پشت',
        description: 'Detailed vertebral anatomy and spinal canal.',
        descriptionKu: 'ئەناتۆمی وردی مەرەکان و کەناڵی ستوون.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Lumbar_vertebrae_anterior.png',
        keyStructures: [
          { en: 'Vertebral bodies', ku: 'جەستەی مەرەکان' },
          { en: 'Spinal canal', ku: 'کەناڵی ستوون' },
          { en: 'Facet joints', ku: 'جومگەکانی فاسێت' }
        ],
        clinicalNotes: [
          { en: 'Best for bony detail', ku: 'باشترینە بۆ وردەکاری ئێسک' }
        ]
      }
    ]
  },
  {
    id: 'mri',
    title: 'MRI',
    titleKu: 'MRI',
    description: 'Magnetic resonance imaging for soft tissue detail',
    descriptionKu: 'وێنەگرتنی ڕیزۆنانسی مەغناتیسی بۆ وردەکاری شلی نەرم',
    icon: 'magnet',
    color: 'from-purple-500 to-violet-600',
    parts: [
      {
        id: 'mri-brain',
        title: 'Brain MRI',
        titleKu: 'MRI ی مێشک',
        description: 'Superior soft tissue contrast showing detailed brain anatomy.',
        descriptionKu: 'کۆنتراستی باشتری شلی نەرم کە ئەناتۆمی وردی مێشک پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/MRI_of_Human_Brain.jpg',
        keyStructures: [
          { en: 'Cerebral cortex', ku: 'توێکەڵی مێشک' },
          { en: 'White matter tracts', ku: 'ڕێگاکانی مادەی سپی' },
          { en: 'Deep gray nuclei', ku: 'ناوکە خۆڵەمێشییە قووڵەکان' },
          { en: 'Brainstem and cerebellum', ku: 'قەدی مێشک و مێشکی بچووک' }
        ],
        clinicalNotes: [
          { en: 'Gold standard for brain tumors', ku: 'ستانداردی زێڕین بۆ تومۆری مێشک' },
          { en: 'Best for multiple sclerosis', ku: 'باشترینە بۆ MS' }
        ]
      },
      {
        id: 'mri-knee',
        title: 'Knee MRI',
        titleKu: 'MRI ی ئەژنۆ',
        description: 'Shows ligaments, menisci, cartilage, and soft tissues.',
        descriptionKu: 'لیگامێنتەکان، مەنیسکەکان، غوڕمچە و شلی نەرم پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Knee_MRI.jpg',
        keyStructures: [
          { en: 'ACL and PCL', ku: 'ACL و PCL' },
          { en: 'Medial and lateral menisci', ku: 'مەنیسکی ناوەکی و دەرەکی' },
          { en: 'Articular cartilage', ku: 'غوڕمچەی جومگە' },
          { en: 'Collateral ligaments', ku: 'لیگامێنتە لاوەکییەکان' }
        ],
        clinicalNotes: [
          { en: 'Gold standard for ligament tears', ku: 'ستانداردی زێڕین بۆ ڕزانی لیگامێنت' }
        ]
      },
      {
        id: 'mri-spine',
        title: 'Spine MRI',
        titleKu: 'MRI ی ستوونی پشت',
        description: 'Shows spinal cord, nerve roots, and intervertebral discs.',
        descriptionKu: 'کۆردی ستوون، ڕەگی دەمار و دیسکەکانی نێوان مەرە پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Lumbar_MRI_T2_sagittal.jpg',
        keyStructures: [
          { en: 'Spinal cord', ku: 'کۆردی ستوون' },
          { en: 'Intervertebral discs', ku: 'دیسکەکانی نێوان مەرە' },
          { en: 'Nerve roots', ku: 'ڕەگی دەمار' },
          { en: 'CSF spaces', ku: 'بۆشاییەکانی شلەی مێشکی ستوونی' }
        ],
        clinicalNotes: [
          { en: 'Best for disc herniation', ku: 'باشترینە بۆ دەرچوونی دیسک' },
          { en: 'Essential for spinal cord pathology', ku: 'گرنگە بۆ نەخۆشی کۆردی ستوون' }
        ]
      },
      {
        id: 'mri-shoulder',
        title: 'Shoulder MRI',
        titleKu: 'MRI ی شان',
        description: 'Shows rotator cuff, labrum, and shoulder joint structures.',
        descriptionKu: 'ماسولکەکانی سوڕانەوە، لابرۆم و پێکهاتەی جومگەی شان پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Knee_MRI.jpg',
        keyStructures: [
          { en: 'Rotator cuff muscles', ku: 'ماسولکەکانی سوڕانەوە' },
          { en: 'Glenoid labrum', ku: 'لابرۆمی گلێنۆید' },
          { en: 'Biceps tendon', ku: 'تەندۆنی بایسێپس' }
        ],
        clinicalNotes: [
          { en: 'Gold standard for rotator cuff tears', ku: 'ستانداردی زێڕین بۆ ڕزانی ماسولکەی سوڕانەوە' }
        ]
      }
    ]
  },
  {
    id: 'ultrasound',
    title: 'Ultrasound',
    titleKu: 'ئۆڵتراساوند',
    description: 'Sound wave imaging for soft tissues and real-time visualization',
    descriptionKu: 'وێنەگرتن بە شەپۆلی دەنگ بۆ شلی نەرم و بینینی ڕاستەوخۆ',
    icon: 'activity',
    color: 'from-green-500 to-emerald-600',
    parts: [
      {
        id: 'us-abdomen',
        title: 'Abdominal Ultrasound',
        titleKu: 'ئۆڵتراساوندی سک',
        description: 'Shows liver, gallbladder, kidneys, and other abdominal organs.',
        descriptionKu: 'جگەر، کیسەی زەردە، گورچیلە و ئەندامەکانی تری سک پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Chest_Xray_PA_3-8-2010.png',
        keyStructures: [
          { en: 'Liver parenchyma', ku: 'مادەی جگەر' },
          { en: 'Gallbladder', ku: 'کیسەی زەردە' },
          { en: 'Kidneys', ku: 'گورچیلە' },
          { en: 'Aorta and IVC', ku: 'ئەئۆرتا و IVC' }
        ],
        clinicalNotes: [
          { en: 'First-line for gallstones', ku: 'یەکەم هەنگاو بۆ بەردی کیسەی زەردە' },
          { en: 'No radiation exposure', ku: 'بەبێ تووشبوون بە تیشک' }
        ]
      },
      {
        id: 'us-thyroid',
        title: 'Thyroid Ultrasound',
        titleKu: 'ئۆڵتراساوندی تایرۆید',
        description: 'Shows thyroid gland structure and nodules.',
        descriptionKu: 'پێکهاتەی گڵاندی تایرۆید و گرێەکان پیشان دەدات.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Chest_Xray_PA_3-8-2010.png',
        keyStructures: [
          { en: 'Thyroid lobes', ku: 'لۆبەکانی تایرۆید' },
          { en: 'Isthmus', ku: 'ئیستموس' },
          { en: 'Parathyroid glands', ku: 'گڵاندەکانی پاراتایرۆید' }
        ],
        clinicalNotes: [
          { en: 'Essential for nodule evaluation', ku: 'گرنگە بۆ هەڵسەنگاندنی گرێ' }
        ]
      },
      {
        id: 'us-cardiac',
        title: 'Echocardiogram',
        titleKu: 'ئیکۆکاردیۆگرام',
        description: 'Real-time imaging of heart chambers and valves.',
        descriptionKu: 'وێنەگرتنی ڕاستەوخۆی ژوورەکان و دریچەکانی دڵ.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Chest_Xray_PA_3-8-2010.png',
        keyStructures: [
          { en: 'Heart chambers', ku: 'ژوورەکانی دڵ' },
          { en: 'Heart valves', ku: 'دریچەکانی دڵ' },
          { en: 'Pericardium', ku: 'پۆستەی دڵ' }
        ],
        clinicalNotes: [
          { en: 'Gold standard for valve disease', ku: 'ستانداردی زێڕین بۆ نەخۆشی دریچە' }
        ]
      }
    ]
  }
];

// Helper functions
export function getDeviceById(id: ImagingDevice): DeviceCategory | undefined {
  return deviceCategories.find(d => d.id === id);
}

export function getPartById(deviceId: ImagingDevice, partId: string): AnatomyPart | undefined {
  const device = getDeviceById(deviceId);
  return device?.parts.find(p => p.id === partId);
}

export function getAllParts(): AnatomyPart[] {
  return deviceCategories.flatMap(d => d.parts);
}
