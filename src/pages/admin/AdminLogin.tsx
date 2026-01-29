import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminLogin = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-none bg-transparent">
        <div className="flex justify-center mb-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full max-w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">چوونە ژوورەوە</TabsTrigger>
              <TabsTrigger value="signup">تۆمارکردن</TabsTrigger>
            </TabsList>

            <div className="mt-6 flex justify-center">
              <TabsContent value="login">
                <SignIn afterSignInUrl="/admin" />
              </TabsContent>
              <TabsContent value="signup">
                <SignUp afterSignUpUrl="/admin" />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            گەڕانەوە بۆ سەرەتا
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
