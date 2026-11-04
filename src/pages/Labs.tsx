import { Link } from 'react-router-dom';
import { ArrowTopRightIcon, ArrowRightIcon, ClockIcon } from '@radix-ui/react-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import LabShell from '@/labs/LabShell';
import { labText } from '@/labs/i18n';
import { experiments } from '@/labs/catalog';

export default function Labs() {
  const { language } = useLanguage();
  const t = labText[language];
  const featured = experiments[0];
  return <LabShell catalog><section className="lab-catalog-intro"><div><h1>{t.catalogTitle}</h1><p>{t.stage}</p></div></section>
    <section className="lab-featured"><div className="lab-featured-content"><h2>{language === 'ku' ? featured.titleKu : featured.title}</h2><p>{language === 'ku' ? featured.descriptionKu : featured.description}</p><span className="lab-featured-equation" dir="ltr">T = 2π<span className="lab-root">√<span>L/g</span></span></span><Link className="lab-button lab-primary" to="/labs/stage-1/simple-pendulum">{t.open}<ArrowTopRightIcon/></Link><span className="lab-duration"><ClockIcon/>{featured.duration} {t.minutes}</span></div>
      <Link to="/labs/stage-1/simple-pendulum" className="lab-catalog-art" aria-label={`${t.open}: ${language === 'ku' ? featured.titleKu : featured.title}`}><svg viewBox="0 0 600 400" fill="none" aria-hidden="true"><defs><pattern id="catalog-grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="transparent"/></pattern><radialGradient id="catalog-bob" cx=".3" cy=".2" r=".8"><stop stopColor="#e7e6e1"/><stop offset=".4" stopColor="#aaa9a2"/><stop offset="1" stopColor="#43474a"/></radialGradient><linearGradient id="catalog-rod"><stop stopColor="#76867e"/><stop offset=".4" stopColor="#e1e6e0"/><stop offset="1" stopColor="#82948a"/></linearGradient></defs><rect width="600" height="400" fill="url(#catalog-grid)"/><path d="M62 359h480" stroke="#c6d0c9"/><rect x="143" y="45" width="10" height="310" rx="3" fill="url(#catalog-rod)"/><rect x="137" y="61" width="198" height="8" rx="3" fill="url(#catalog-rod)"/><path d="M119 354h61l17 10h-94Z" fill="#686c70"/><path d="M325 68v256" stroke="#bcbec1" strokeDasharray="4 5"/><path d="M235 306a254 254 0 0 0 178 0" stroke="#b5b8bc" strokeDasharray="3 5"/><path d="M325 68l78 242" stroke="#75797c" strokeWidth="1.5"/><circle cx="403" cy="310" r="24" fill="url(#catalog-bob)"/><circle cx="325" cy="68" r="4" fill="#494e52"/><path d="M325 118a50 50 0 0 0 16-2" stroke="#4b5056"/><text x="352" y="131" fill="#4b5056" className="lab-svg-label">θ</text><path d="M474 68v256m-5 0h10M469 68h10" stroke="#a6a9ad"/><text x="489" y="204" fill="#4b5056" className="lab-svg-label">L</text><text x="428" y="347" className="lab-svg-small">m</text></svg></Link>
    </section>
    <section className="lab-catalog-list" aria-label={t.back}><div className="lab-section-heading"><h2>{t.stage} <span className="lab-heading-light">/ {t.back}</span></h2></div>{experiments.map((exp, i) => <Link key={exp.id} className="lab-experiment-row" to={`/labs/stage-1/${exp.id}`}><span className="lab-row-number">0{i + 1}</span><div className="lab-row-title"><h3>{language === 'ku' ? exp.titleKu : exp.title}</h3><span>{language === 'ku' ? exp.topicKu : exp.topic}</span></div><p>{language === 'ku' ? exp.descriptionKu : exp.description}</p><span className="lab-row-equation" dir="ltr">{exp.equation}</span><ArrowRightIcon className="lab-row-arrow"/></Link>)}</section>

  </LabShell>;
}
