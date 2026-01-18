import { Check, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProgressButtonProps {
  lessonId: string;
}

const ProgressButton = ({ lessonId }: ProgressButtonProps) => {
  const { user } = useAuth();
  const { isLessonCompleted, markComplete } = useProgress();
  
  const completed = isLessonCompleted(lessonId);

  const handleMarkComplete = () => {
    if (!user) {
      toast.error('تکایە سەرەتا بچۆ ژوورەوە');
      return;
    }
    
    markComplete.mutate(lessonId, {
      onSuccess: () => {
        toast.success('وانە تەواوکرا! 🎉');
      },
      onError: () => {
        toast.error('هەڵەیەک ڕوویدا');
      },
    });
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
      disabled={markComplete.isPending || !user}
      className="gap-2"
    >
      <Check className="h-4 w-4" />
      {markComplete.isPending ? 'چاوەڕوانبە...' : 'تەواوکردنی وانە'}
    </Button>
  );
};

export default ProgressButton;
