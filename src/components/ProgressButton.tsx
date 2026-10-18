import { Check, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import type { Id } from '../../convex/_generated/dataModel';

interface ProgressButtonProps {
  lessonId: Id<'lessons'>;
}

const ProgressButton = ({ lessonId }: ProgressButtonProps) => {
  const { user } = useAuth();
  const { isLessonCompleted, markComplete } = useProgress();
  const [pending,setPending]=useState(false);

  const completed = isLessonCompleted(lessonId);

  const handleMarkComplete = async () => {
    if (!user) {
      toast.error('تکایە سەرەتا بچۆ ژوورەوە');
      return;
    }

    setPending(true);
    try{await markComplete.mutateAsync(lessonId);toast.success('وانە تەواوکرا!');}
    catch{toast.error('هەڵەیەک ڕوویدا');}
    finally{setPending(false);}
  };

  if (completed) {
    return (
      <Button
        variant="outline"
        className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
        disabled
      >
        <CheckCircle className="h-4 w-4" />
        تەواوکراوە
      </Button>
    );
  }

  return (
    <Button
      onClick={handleMarkComplete}
      disabled={pending || !user}
      className="gap-2"
    >
      <Check className="h-4 w-4" />
      {pending ? 'چاوەڕوانبە...' : 'تەواوکردنی وانە'}
    </Button>
  );
};

export default ProgressButton;
