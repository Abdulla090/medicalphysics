import { useState } from 'react';
import { useMutation,useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useClinicalLocale } from './i18n';
export function FacultyCourses(){
 const {language}=useClinicalLocale(),tr=(a:string,b:string)=>language==='ku'?b:a;
 const courses=useQuery(api.training.editableCourses,{}),save=useMutation(api.training.saveCourse);
 const [id,setId]=useState<Id<'courses'>|undefined>(),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[published,setPublished]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 return <details><summary>{tr('Course modules','بابەتەکانی کۆرس')}</summary><div className="training-controls"><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{setId(await save({id,title,description,published}));setStatus(tr('Saved.','پاشەکەوت کرا.'));}catch{setStatus(tr('Unable to save this course.','ناتوانرێت کۆرسەکە پاشەکەوت بکرێت.'));}finally{setBusy(false);}}}>
  <label>{tr('Edit course','دەستکاریکردنی کۆرس')}<select value={id??''} onChange={e=>{const c=courses?.find(x=>x._id===e.target.value);setId(c?._id);setTitle(c?.title??'');setDescription(c?.description??'');setPublished(c?.isPublished??false);}}><option value="">{tr('New course','کۆرسی نوێ')}</option>{courses?.map(c=><option key={c._id} value={c._id}>{c.title}</option>)}</select></label>
  <label>{tr('Course title','ناونیشانی کۆرس')}<input required value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{tr('Description','ڕوونکردنەوە')}<textarea required value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <label>{tr('Publish course','بڵاوکردنەوەی کۆرس')}<input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/></label><button disabled={busy}>{tr('Save course','پاشەکەوتکردنی کۆرس')}</button><p role="status">{status}</p>
 </form>{id&&<Modules key={id} id={id}/>}</div></details>;
}
function Modules({id}:{id:Id<'courses'>}){
 const {language}=useClinicalLocale(),tr=(a:string,b:string)=>language==='ku'?b:a;
 const modules=useQuery(api.training.courseModules,{courseId:id}),save=useMutation(api.training.saveModule);
 const [lessonId,setLessonId]=useState<Id<'lessons'>|undefined>(),[title,setTitle]=useState(''),[content,setContent]=useState(''),[order,setOrder]=useState(0),[published,setPublished]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{setLessonId(await save({courseId:id,lessonId,title,content,order,published}));setStatus(tr('Saved.','پاشەکەوت کرا.'));}catch{setStatus(tr('Unable to save this module.','ناتوانرێت بابەتەکە پاشەکەوت بکرێت.'));}finally{setBusy(false);}}}>
 <label>{tr('Module','بابەت')}<select value={lessonId??''} onChange={e=>{const m=modules?.find(m=>m.lesson?._id===e.target.value);setLessonId(m?.lesson?._id);setTitle(m?.lesson?.title??'');setContent(m?.lesson?.content??'');setOrder(m?.link.orderIndex??modules?.length??0);setPublished(m?.lesson?.isPublished??false);}}><option value="">{tr('New module','بابەتی نوێ')}</option>{modules?.map(m=><option key={m.link._id} value={m.lesson?._id}>{m.lesson?.title}</option>)}</select></label>
 <label>{tr('Module title','ناونیشانی بابەت')}<input required value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{tr('Lesson content','ناوەڕۆکی وانە')}<textarea rows={8} required value={content} onChange={e=>setContent(e.target.value)}/></label><label>{tr('Order','ڕیز')}<input type="number" min="0" max="500" value={order} onChange={e=>setOrder(Number(e.target.value))}/></label><label>{tr('Publish module','بڵاوکردنەوەی بابەت')}<input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/></label><button disabled={busy}>{tr('Save module','پاشەکەوتکردنی بابەت')}</button><p role="status">{status}</p>
 </form>;
}
