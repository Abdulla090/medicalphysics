import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('ئیمەیڵی دروست بنووسە'),
  password: z.string().min(6, 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت'),
});

type AuthFormData = z.infer<typeof authSchema>;

const AdminLogin = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onLogin = async (data: AuthFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        title: 'هەڵە',
        description: error.message === 'Invalid login credentials' 
          ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە'
          : error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'سەرکەوتوو',
      description: 'چوویە ژوورەوە',
    });
    navigate('/admin');
    setIsLoading(false);
  };

  const onSignUp = async (data: AuthFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password);
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'ئەم ئیمەیڵە پێشتر تۆمارکراوە';
      }
      toast({
        title: 'هەڵە',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'سەرکەوتوو',
      description: 'هەژمارەکەت دروستکرا. ئێستا دەتوانیت بچیتە ژوورەوە.',
    });
    setActiveTab('login');
    setIsLoading(false);
  };

  const handleSubmit = (data: AuthFormData) => {
    if (activeTab === 'login') {
      onLogin(data);
    } else {
      onSignUp(data);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">پانێڵی بەڕێوەبەر</CardTitle>
          <CardDescription>بۆ بەڕێوەبردنی ناوەڕۆک</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">چوونە ژوورەوە</TabsTrigger>
              <TabsTrigger value="signup">تۆمارکردن</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ئیمەیڵ</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وشەی نهێنی</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TabsContent value="login" className="mt-0 p-0">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    چوونە ژوورەوە
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 p-0">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    تۆمارکردن
                  </Button>
                </TabsContent>
              </form>
            </Form>
          </Tabs>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              گەڕانەوە بۆ سەرەتا
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
