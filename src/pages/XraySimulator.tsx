import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PracticeEntry, AssessmentEntry } from '@/simulator/session/SessionEntry';
const LegacyStudio = lazy(() => import('@/simulator/LegacyStudio'));
export default function XraySimulator() {
  const [params] = useSearchParams();
  return <Suspense fallback={<div className="cg-loading">MedicalPhysics…</div>}>
    {params.has('studio') ? <LegacyStudio /> : params.has('attempt') ? <AssessmentEntry attemptId={params.get('attempt')!} /> : <PracticeEntry />}
  </Suspense>;
}
