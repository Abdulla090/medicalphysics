import { ArrowRightIcon, CheckCircledIcon, CursorArrowIcon, KeyboardIcon, PersonIcon } from '@radix-ui/react-icons';
import type { ClinicalSession } from './clinicalSession';
import { useClinicalLocale } from './i18n';
import { Station } from './Workstations';
import { getProtocol } from '../protocols';

export function ControlGuide(){
  const {t}=useClinicalLocale();
  return <ol className="cg-control-guide">
    <li><KeyboardIcon/><div><strong>W A S D</strong><p>{t('controlMove')}</p></div></li>
    <li><CursorArrowIcon/><div><strong>{t('look')}</strong><p>{t('controlLook')}</p></div></li>
    <li><PersonIcon/><div><strong>E</strong><p>{t('controlAct')}</p></div></li>
    <li><KeyboardIcon/><div><strong>Esc</strong><p>{t('controlPause')}</p></div></li>
  </ol>;
}

export function FestivalWelcome({session,onStart}:{session:ClinicalSession;onStart:()=>void}){
  const {t,language,setLanguage}=useClinicalLocale();
  return <Station title={t('welcome')} description={t('festival')} onClose={onStart} className="cg-welcome">
    <p className="cg-welcome-note">{t('welcomeNote')}</p>
    <div className="cg-welcome-case"><span>{t('case')}</span><strong>{getProtocol(session.state.protocol).name}</strong><span>{session.caseSnapshot.name} · {session.caseSnapshot.accession}</span></div>
    <ControlGuide/>
    <div className="cg-welcome-actions"><button className="cg-primary" onClick={onStart}>{t('enterRoom')}<ArrowRightIcon/></button><button onClick={()=>setLanguage(language==='en'?'ku':'en')}>{language==='en'?'کوردی':'English'}</button></div>
    <p className="cg-note">{t('synthetic')}</p>
  </Station>;
}

export function EncounterComplete({session,saving,paused,onSave,onNext,onReview,onExport}:{session:ClinicalSession;saving:boolean;paused:boolean;onSave:()=>void;onNext?:()=>void;onReview:()=>void;onExport:()=>void}){
  const {t}=useClinicalLocale();
  const images=session.acquisitions.filter(a=>a.status==='ready');
  const demo=session.actions.some(e=>e.action.type==='festival-skip');
  return <section className="cg-completion" aria-label={t('complete')}>
    <CheckCircledIcon className="cg-completion-mark"/>
    <h1>{t('complete')}</h1><p>{t('completionNote')}</p>
    <dl className="cg-completion-summary"><div><dt>{t('imageCount')}</dt><dd>{images.length}</dd></div><div><dt>{t('repeatCount')}</dt><dd>{images.filter(a=>a.review?.decision==='repeat').length}</dd></div></dl>
    {demo&&<p className="cg-note">{t('demoEncounter')}</p>}
    <div className="cg-completion-actions">
      {session.submission==='draft'?<button className="cg-primary" onClick={onSave} disabled={saving||paused}>{t(session.mode==='assessment'?'submit':'savePractice')}</button>:onNext?<button className="cg-primary" onClick={onNext}>{t('nextPatient')}<ArrowRightIcon/></button>:<p role="status">{t('submitted')}</p>}
      <div className="cg-actions"><button onClick={onReview}>{t('debrief')}</button><button onClick={onExport}>{t('export')}</button></div>
    </div>
  </section>;
}
