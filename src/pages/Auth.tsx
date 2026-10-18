import { SignIn, useUser } from '@clerk/clerk-react';
import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import PageLayout from '@/components/PageLayout';

export default function Auth(){
  const {isLoaded,isSignedIn}=useUser();
  const {language}=useLanguage();
  const ku=language==='ku';
  if(isLoaded&&isSignedIn)return <Navigate to="/training" replace/>;
  return <PageLayout><div className="container flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-12">
    {!isLoaded?<p role="status">{ku?'بارکردنی چوونەژوورەوە…':'Loading sign in…'}</p>:<SignIn routing="hash" fallbackRedirectUrl="/training"/>}
    <Link className="text-sm underline underline-offset-4" to="/tools/xray-simulator?festival&case=outpatient-chest">{ku?'ڕاهێنان بەبێ هەژمار':'Practice without an account'}</Link>
  </div></PageLayout>;
}
