import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
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
import ImageViewerDemo from "./pages/ImageViewerDemo";
import NotFound from "./pages/NotFound";
import AnatomyViewer from "./pages/AnatomyViewer";

const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
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

          {/* Demo Pages */}
          <Route path="/demo/image-viewer" element={<ImageViewerDemo />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/lessons" element={<AdminLessons />} />
          <Route path="/admin/lessons/new" element={<LessonEditor />} />
          <Route path="/admin/lessons/:id/edit" element={<LessonEditor />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/quizzes" element={<AdminQuizzes />} />
          <Route path="/admin/quizzes/new" element={<QuizEditor />} />
          <Route path="/admin/quizzes/:id/edit" element={<QuizEditor />} />
          <Route path="/anatomy" element={<AnatomyViewer />} />

          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/new" element={<CourseEditor />} />
          <Route path="/admin/courses/:id/edit" element={<CourseEditor />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
