import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, GlobeIcon } from '@radix-ui/react-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { labText } from './i18n';
import '@fontsource-variable/dm-sans';
import '@fontsource/ibm-plex-mono/400.css';
import './labs.css';

export function LabMark() {
  return <svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true"><path d="M7 5h18M16 5v7m0 0L8 26h16l-8-14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 21h10" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="5" r="2" fill="currentColor"/></svg>;
}

export default function LabShell({ children, catalog = false }: { children: ReactNode; catalog?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = labText[language];
  return <div className="physics-labs" dir={language === 'ku' ? 'rtl' : 'ltr'}>
    <a className="lab-skip" href="#lab-main">{t.workspace}</a>
    <header className="lab-header">
      <Link className="lab-brand" to="/labs" aria-label={t.labs}><LabMark/><strong>{t.labs}</strong></Link>
      <nav aria-label={t.labs} className="lab-header-nav"><Link aria-label={catalog ? t.home : t.back} to={catalog ? '/tools' : '/labs'}>{language === 'ku' ? <ArrowRightIcon/> : <ArrowLeftIcon/>}<span>{catalog ? t.home : t.back}</span></Link><span className="lab-header-divider"/><button onClick={() => setLanguage(language === 'en' ? 'ku' : 'en')} aria-label={language === 'en' ? 'گۆڕینی زمان بۆ کوردی' : 'Change language to English'}><GlobeIcon/><span>{language === 'en' ? 'کوردی' : 'English'}</span></button></nav>
    </header>
    <main id="lab-main" className="lab-main">{children}</main>
  </div>;
}
