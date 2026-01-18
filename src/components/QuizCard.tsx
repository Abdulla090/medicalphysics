import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuizCardProps {
  lessonId: string;
}

const QuizCard = ({ lessonId }: QuizCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quiz, questions, bestScore, hasPassed, submitQuiz, isLoading } = useQuiz(lessonId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; correctCount: number; totalQuestions: number } | null>(null);

  if (isLoading || !quiz || !questions || questions.length === 0) {
    return null;
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('تکایە سەرەتا بچۆ ژوورەوە');
      navigate('/auth');
      return;
    }

    if (Object.keys(answers).length < questions.length) {
      toast.error('تکایە هەموو پرسیارەکان وەڵام بدەرەوە');
      return;
    }

    try {
      const res = await submitQuiz.mutateAsync(answers);
      setResult({
        score: res.score,
        passed: res.passed,
        correctCount: res.correctCount,
        totalQuestions: res.totalQuestions,
      });
      setShowResults(true);
      
      if (res.passed) {
        toast.success('پیرۆزە! تاقیکردنەوەکەت سەرکەوتوو بوو! 🎉');
      } else {
        toast.info('هەوڵی دووبارە بدە!');
      }
    } catch {
      toast.error('هەڵەیەک ڕوویدا');
    }
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setResult(null);
  };

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResults && result) {
    return (
      <Card className="border-2">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {result.passed ? (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Award className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <RotateCcw className="h-10 w-10 text-orange-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {result.passed ? 'سەرکەوتن! 🎉' : 'هەوڵی دووبارە بدە'}
          </CardTitle>
          <CardDescription>
            {result.correctCount} لە {result.totalQuestions} پرسیار ڕاست بوو
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-5xl font-bold text-primary">{result.score}%</div>
          <p className="text-muted-foreground">
            نمرەی تێپەڕین: {quiz.passing_score}%
          </p>
          <Button onClick={resetQuiz} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            دووبارە هەوڵدانەوە
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="gap-1">
            <HelpCircle className="h-3 w-3" />
            تاقیکردنەوە
          </Badge>
          {hasPassed && (
            <Badge className="bg-green-100 text-green-700 gap-1">
              <CheckCircle className="h-3 w-3" />
              تێپەڕیوە
            </Badge>
          )}
        </div>
        <CardTitle>{quiz.title}</CardTitle>
        {quiz.description && (
          <CardDescription>{quiz.description}</CardDescription>
        )}
        {bestScore > 0 && (
          <p className="text-sm text-muted-foreground">
            باشترین نمرە: {bestScore}%
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>پرسیاری {currentQuestion + 1} لە {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{question.question_text}</h3>
          
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleAnswer(question.id, value)}
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border transition-colors ${
                  answers[question.id] === option
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
          >
            پێشوو
          </Button>
          
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!answers[question.id]}
            >
              دواتر
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitQuiz.isPending || !answers[question.id]}
            >
              {submitQuiz.isPending ? 'چاوەڕوانبە...' : 'ناردنی وەڵامەکان'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizCard;
