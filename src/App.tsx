import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import BackToTop from "@/components/BackToTop";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "./components/ScrollToTop";

// Route-level boundaries keep pages, editors, atlases and their dependencies out
// of the entry bundle until a visitor actually navigates to that route.
// The shared Suspense boundary below preserves the existing loading experience.
const Index = lazy(() => import('./pages/Index'));
const Explore = lazy(() => import('./pages/Explore'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'));
const Search = lazy(() => import('./pages/Search'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Articles = lazy(() => import('./pages/Articles'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const AnatomyAtlas = lazy(() => import('./pages/AnatomyAtlas'));
const AnatomyAtlasDetail = lazy(() => import('./pages/AnatomyAtlasDetail'));
const Tools = lazy(() => import('./pages/Tools'));
const XrayCalculator = lazy(() => import('./pages/XrayCalculator'));
const XraySimulator = lazy(() => import('./pages/XraySimulator'));
const ImageViewerDemo = lazy(() => import('./pages/ImageViewerDemo'));
const AnatomyViewer = lazy(() => import('./pages/AnatomyViewer'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLessons = lazy(() => import('./pages/admin/AdminLessons'));
const LessonEditor = lazy(() => import('./pages/admin/LessonEditor'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'));
const QuizEditor = lazy(() => import('./pages/admin/QuizEditor'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const CourseEditor = lazy(() => import('./pages/admin/CourseEditor'));
const AdminAnatomyAtlas = lazy(() => import('./pages/admin/AdminAnatomyAtlas'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const NotFound = lazy(() => import('./pages/NotFound'));

function WorkspaceExtras() {
  const { pathname } = useLocation();
  if (pathname === '/tools/xray-simulator') return null;
  return <><PWAInstallPrompt /><BackToTop /></>;
}

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

            {/* Splash Screen */}
            {!splashDone && <SplashScreen onFinished={handleSplashFinished} />}

            <BrowserRouter>
              <ScrollToTop />
              <KeyboardShortcuts />
              <WorkspaceExtras />
              <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground text-sm">Loading workspace…</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/explore" element={<Explore />} />
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
                <Route path="/tools/xray-simulator" element={<Suspense fallback={<div dir="ltr" className="min-h-[100dvh] flex items-center justify-center bg-[#f4f6f3] text-[#647264] text-sm">Opening radiography studio…</div>}><XraySimulator /></Suspense>} />

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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </BookmarkProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
