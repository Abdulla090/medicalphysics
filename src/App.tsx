import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import BackToTop from "@/components/BackToTop";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import Search from "./pages/Search";
import Lesson from "./pages/Lesson";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLessons from "./pages/admin/AdminLessons";
import LessonEditor from "./pages/admin/LessonEditor";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import QuizEditor from "./pages/admin/QuizEditor";
import AdminCourses from "./pages/admin/AdminCourses";
import CourseEditor from "./pages/admin/CourseEditor";
import AdminAnatomyAtlas from "./pages/admin/AdminAnatomyAtlas";
import ImageViewerDemo from "./pages/ImageViewerDemo";
import NotFound from "./pages/NotFound";
import AnatomyViewer from "./pages/AnatomyViewer";
import AnatomyAtlas from "./pages/AnatomyAtlas";
import AnatomyAtlasDetail from "./pages/AnatomyAtlasDetail";
import XrayCalculator from "./pages/XrayCalculator";
import Tools from "./pages/Tools";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import AdminArticles from "./pages/admin/AdminArticles";
import ArticleEditor from "./pages/admin/ArticleEditor";
import ScrollToTop from "./components/ScrollToTop";

const App = () => {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('splash_shown') === 'true'
  );

  const handleSplashFinished = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <BookmarkProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />

            {/* Splash Screen */}
            {!splashDone && <SplashScreen onFinished={handleSplashFinished} />}

            <BrowserRouter>
              <ScrollToTop />
              <KeyboardShortcuts />
              <BackToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/category/:id" element={<CategoryDetail />} />
                <Route path="/search" element={<Search />} />
                <Route path="/lesson/:id" element={<Lesson />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/course/:id" element={<CourseDetail />} />

                {/* Articles (Blog) */}
                <Route path="/articles" element={<Articles />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />

                {/* Demo Pages */}
                <Route path="/demo/image-viewer" element={<ImageViewerDemo />} />

                {/* Anatomy Routes */}
                <Route path="/anatomy" element={<AnatomyViewer />} />
                <Route path="/anatomy/atlas" element={<AnatomyAtlas />} />
                <Route path="/anatomy/atlas/:deviceId" element={<AnatomyAtlasDetail />} />

                {/* Tools */}
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/xray-calculator" element={<XrayCalculator />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/lessons" element={<AdminLessons />} />
                <Route path="/admin/lessons/:id/edit" element={<LessonEditor />} />
                <Route path="/admin/lessons/new" element={<LessonEditor />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/quizzes" element={<AdminQuizzes />} />
                <Route path="/admin/quizzes/new" element={<QuizEditor />} />
                <Route path="/admin/quizzes/:id/edit" element={<QuizEditor />} />

                <Route path="/admin/courses" element={<AdminCourses />} />
                <Route path="/admin/courses/new" element={<CourseEditor />} />
                <Route path="/admin/courses/:id/edit" element={<CourseEditor />} />
                <Route path="/admin/anatomy" element={<AdminAnatomyAtlas />} />
                <Route path="/admin/articles" element={<AdminArticles />} />
                <Route path="/admin/articles/new" element={<ArticleEditor />} />
                <Route path="/admin/articles/:id/edit" element={<ArticleEditor />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BookmarkProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
