import {useState} from 'react';
import type {ClinicalSession} from './clinicalSession';
import {useClinicalLocale} from './i18n';
import {calculateMetrics} from '../physics';

const NOTES={
 'chest-pa':[
  ['Face the wall receptor. Align the midline, move the shoulders forward, and keep the chin clear of the lung apices.','ڕوو لە وەرگری دیوار بکە. ناوەڕاست ڕێک بخە، شانەکان بەرەو پێش ببە و چەناگە لە لووتکەی سییەکان دوور بخەرەوە.'],
  ['Review the apices, both costophrenic angles, clavicular symmetry, inspiration, and scapular overlap.','لووتکەکان، هەردوو گۆشەی سییەکان، هاوسەنگی کلیلەکان، هەناسە و سەریەککەوتنی شانەکان بپشکنە.']],
 'chest-lateral':[
  ['Place the left side toward the receptor. Align shoulders and hips and lift both arms clear of the thorax within comfortable movement.','لای چەپ بەرەو وەرگر بێت. شان و حەوز ڕێک بخە و باڵەکان بە ئاسوودەیی لە سنگ دوور بخەرەوە.'],
  ['Review posterior rib alignment, the retrocardiac region, lung boundaries, arm clearance, and motion.','ڕێکخستنی پەراسووەکانی دواوە، ناوچەی پشت دڵ، سنووری سییەکان، باڵەکان و جوڵە بپشکنە.']],
 'chest-ap':[
  ['Support the supine transfer and check comfort. Align the chest with the table receptor; AP geometry changes apparent magnification.','گواستنەوە بۆ پاڵکەوتن یارمەتی بدە و ئاسوودەیی بپشکنە. سنگ لەگەڵ وەرگری مێز ڕێک بخە؛ ئەندازەی AP گەورەیی دیار دەگۆڕێت.'],
  ['Review lung inclusion, rotation, inspiration, and projection. Apparent cardiac size in AP is not directly interchangeable with PA.','داپۆشینی سییەکان، سووڕان، هەناسە و ئاڕاستە بپشکنە. قەبارەی دیاری دڵ لە AP ڕاستەوخۆ جێگای PA ناگرێتەوە.']],
 'abdomen-ap':[
  ['Review justification and screening before positioning. Support a straight supine midline and choose field boundaries from the actual request.','هۆکاری پشکنین و پشکنینە سەرەتاییەکان بپشکنە. لە پاڵکەوتندا ناوەڕاست ڕێک بخە و سنووری بوار بە داواکارییەکە دیاری بکە.'],
  ['Review abdominal inclusion, pelvic symmetry, waist artifacts, and motion. Use the modeled expiration instruction for this case.','داپۆشینی سک، هاوسەنگی حەوز، کەلوپەلی ناوقەد و جوڵە بپشکنە. بۆ ئەم کەیسە ڕێنمایی دەرکردنی هەناسە بەکاربهێنە.']],
 'pelvis-ap':[
  ['Explain draping and supine positioning respectfully. Check comfort and align the pelvic midline; do not force rotation if injury is suspected.','داپۆشین و پاڵکەوتن بە ڕێزەوە ڕوون بکەرەوە. ئاسوودەیی و ناوەڕاستی حەوز ڕێک بخە؛ لە گومانی برینداربووندا سووڕان مەسەپێنە.'],
  ['Review pelvic ring and proximal femora inclusion, symmetry of iliac wings and obturator foramina, artifacts, and motion.','داپۆشینی بازنەی حەوز و سەرەوەی ئێسکی ڕان، هاوسەنگی حەوز، کەلوپەل و جوڵە بپشکنە.']],
} as const;

export function EncounterLearning({session}:{session:ClinicalSession}){
 const{language,t}=useClinicalLocale(),ku=language==='ku',copy=(en:string,ks:string)=>ku?ks:en;
 const [topic,setTopic]=useState('distance'),[sid,setSid]=useState(180),[spot,setSpot]=useState(.6),[field,setField]=useState(30);
 const expected=session.caseSnapshot.expected,notes=NOTES[session.caseSnapshot.requested];
 const experiment={...session.state,sid,focalSpot:spot,collimationWidth:field};
 const metric=calculateMetrics(experiment),value=topic==='distance'?(180/sid)**2:topic==='sharpness'?metric.unsharpness:field*session.state.collimationHeight;
 const maximum=topic==='distance'?5.0625:topic==='sharpness'?calculateMetrics({...experiment,focalSpot:1.2}).unsharpness:35*session.state.collimationHeight;
 return <>
  <h3>{copy('Position & image critique','ڕێکخستن و ڕەخنەی وێنە')}</h3><p>{notes[0][ku?1:0]}</p><p>{notes[1][ku?1:0]}</p>
  <details><summary>{copy('Exercise technique reference','سەرچاوەی تەکنیکی ڕاهێنان')}</summary><p className="cg-note">{t('practiceOnly')}</p><dl className="cg-technique" dir="ltr"><div><dt>kVp</dt><dd>{expected.kvp.join('–')}</dd></div><div><dt>mAs</dt><dd>{expected.mas.join('–')}</dd></div><div><dt>SID · cm</dt><dd>{expected.sid.join('–')}</dd></div></dl></details>
  <h3>{copy('Predict, adjust, observe','پێشبینی بکە، ڕێک بخە، تێبینی بکە')}</h3>
  <label>{t('physics')}<select value={topic} onChange={e=>setTopic(e.target.value)}><option value="distance">{copy('Distance & fluence','دووری و تیشک')}</option><option value="sharpness">{copy('Focal spot & sharpness','خاڵی فوکەس و وردی')}</option><option value="field">{copy('Collimation & field area','سنووردارکردن و ڕووبەری بوار')}</option></select></label>
  <p>{copy('Predict which way the result will move before changing the control. This experiment leaves the room settings unchanged.','پێش گۆڕینی کۆنترۆڵ پێشبینی ئەنجام بکە. ئەم تاقیکردنەوەیە ڕێکخستنی ژوور ناگۆڕێت.')}</p>
  {topic==='distance'?<label>{t('distance')}<input dir="ltr" type="range" min="80" max="200" value={sid} onChange={e=>setSid(+e.target.value)}/><output dir="ltr">{sid} cm</output></label>:topic==='sharpness'?<label>{t('focalSpot')}<select dir="ltr" value={spot} onChange={e=>setSpot(+e.target.value)}><option value=".6">0.6 mm</option><option value="1.2">1.2 mm</option></select></label>:<label>{t('collimationWidth')}<input dir="ltr" type="range" min="8" max="35" value={field} onChange={e=>setField(+e.target.value)}/><output dir="ltr">{field} cm</output></label>}
  <div className="cg-experiment-result" dir="ltr"><meter aria-label={copy('Modeled result','ئەنجامی مۆدێل')} min={0} max={maximum} value={value}/><output>{value.toFixed(topic==='field'?0:2)} {topic==='distance'?'×':topic==='sharpness'?'mm':'cm²'}</output></div>
  <p className="cg-note">{topic==='distance'?t('inverseSquare'):topic==='sharpness'?copy('At fixed geometry, a larger focal spot increases geometric unsharpness.','لە ئەندازەی نەگۆڕدا، خاڵی فوکەسی گەورەتر ناڕوونی زیاد دەکات.'):copy('A smaller field may exclude required anatomy. Inspect the coverage before acquiring.','بواری بچووکتر لەوانەیە ئەناتۆمی پێویست دەر بکات. پێش وێنەگرتن داپۆشین بپشکنە.')}</p>
 </>;
}
