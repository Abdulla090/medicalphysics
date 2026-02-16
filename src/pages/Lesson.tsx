import { useParams, Link } from 'react-router-dom';
// import { useQuery } from '@tanstack/react-query';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, Clock, Calendar, User, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import ProgressButton from '@/components/ProgressButton';
import QuizCard from '@/components/QuizCard';
import PDFDownloadButton from '@/components/PDFDownloadButton';
import SocialShare from '@/components/SocialShare';
import { MarkdownPreview } from '@/components/admin/editor/MarkdownPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';

const getDifficultyName = (difficulty: string): string => {
  const names: Record<string, string> = {
    beginner: 'سەرەتایی',
    intermediate: 'ناوەندی',
    advanced: 'پێشکەوتوو',
  };
  return names[difficulty] || difficulty;
};

// Helper functions for video source detection
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] || url;
  }
  return null;
};

const extractGoogleDriveId = (url: string): string | null => {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^\/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /docs\.google\.com\/file\/d\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const extractVimeoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

type VideoSource = 'youtube' | 'drive' | 'vimeo' | 'direct' | 'youtube_id';

const detectVideoSource = (videoId: string): { source: VideoSource; id: string | null } => {
  if (!videoId) return { source: 'youtube_id', id: null };

  // Check if it's a Google Drive link
  const driveId = extractGoogleDriveId(videoId);
  if (driveId) return { source: 'drive', id: driveId };

  // Check if it's a YouTube URL
  const youtubeId = extractYouTubeId(videoId);
  if (youtubeId && videoId.includes('youtube') || videoId.includes('youtu.be')) {
    return { source: 'youtube', id: youtubeId };
  }

  // Check if it's a Vimeo link
  const vimeoId = extractVimeoId(videoId);
  if (vimeoId) return { source: 'vimeo', id: vimeoId };

  // Check if it's a direct video URL (mp4, webm, ogg)
  if (videoId.match(/\.(mp4|webm|ogg)$/i) || videoId.startsWith('http')) {
    // Make sure it's not a Google Drive or other embed URL
    if (!videoId.includes('drive.google') && !videoId.includes('youtube') && !videoId.includes('vimeo')) {
      return { source: 'direct', id: videoId };
    }
  }

  // Default: assume it's a YouTube ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { source: 'youtube_id', id: videoId };
  }

  return { source: 'youtube_id', id: videoId };
};

const categoryStyles: Record<string, string> = {
  xray: 'category-xray',
  ct: 'category-ct',
  mri: 'category-mri',
  ultrasound: 'category-ultrasound',
  nuclear: 'category-nuclear',
};

const difficultyStyles: Record<string, string> = {
  beginner: 'difficulty-beginner',
  intermediate: 'difficulty-intermediate',
  advanced: 'difficulty-advanced',
};

import MedicalImageViewer from '@/components/MedicalImageViewer';
import LessonActions from '@/components/LessonActions';
import { useState } from 'react';

const Lesson = () => {
  const { id } = useParams<{ id: string }>(); // 'id' here is actually the slug based on route /lesson/:slug
  const { user } = useAuth();
  const { isLessonCompleted } = useProgress();
  const [activeMedia, setActiveMedia] = useState<'video' | 'image' | null>(null);

  // Convex Migration
  // Note: Route is /lesson/:id but conventionally we used slug. 
  // API fetchLessonBySlug(id) suggests 'id' param is the slug.

  const lesson = useQuery(api.api.getLessonBySlug, { slug: id || '' });
  const isLoading = lesson === undefined;

  // We need the category ID to fetch related lessons. 
  // In Convex, lesson.category is the category ID string.

  const relatedLessons = useQuery(api.api.getLessonsByCategory,
    lesson ? { categoryId: lesson.category } : "skip" // Wait, getLessonsByCategory argument name?
  );

  // Note: api.api.getLessonsByCategory(args: { categoryId: string }) check api.ts

  const filteredRelatedLessons = relatedLessons?.filter((l: any) => l._id !== lesson?._id).slice(0, 3) || [];
  // const completed = lesson ? isLessonCompleted(lesson._id) : false; // TODO: Fix isLessonCompleted to take Convex ID
  const completed = false; // logic paused until progress hook is migrated

  if (isLoading) {
    return (
      <PageLayout showReadingProgress={true}>
        <div className="container py-16 text-center">بارکردن...</div>
      </PageLayout>
    );
  }

  if (!lesson) {
    return (
      <PageLayout showReadingProgress={true}>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold">وانە نەدۆزرایەوە</h1>
          <Link to="/search" className="text-primary hover:underline mt-4 inline-block">
            گەڕانەوە بۆ وانەکان
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showReadingProgress={true}>

      <section className="py-8">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary">سەرەتا</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to="/categories" className="hover:text-primary">بەشەکان</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to={`/category/${lesson.category}`} className="hover:text-primary">
              {lesson.categoryName /* We updated fetchLessonBySlug to return categoryName */}
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground line-clamp-1">{lesson.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={categoryStyles[lesson.category]}>
                    {lesson.categoryName}
                  </Badge>
                  <Badge className={difficultyStyles[lesson.difficulty]}>
                    {getDifficultyName(lesson.difficulty)}
                  </Badge>
                  {completed && (
                    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> تەواوکراوە
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
                <p className="text-lg text-muted-foreground">{lesson.description}</p>

                <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {lesson.instructor}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {lesson.duration}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {lesson.publishDate /* CamelCase */}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {user && (
                    <>
                      <LessonActions lessonId={lesson._id} />
                      <PDFDownloadButton
                        title={lesson.title}
                        content={lesson.content}
                        instructor={lesson.instructor}
                        category={lesson.categoryName}
                      />
                    </>
                  )}
                  <SocialShare
                    title={lesson.title}
                    description={lesson.description}
                  />
                </div>
              </div>

              {/* Media Section: Tabs for Video/Image */}
              <div className="mb-8">
                {(lesson.videoId && lesson.imageUrl) ? (
                  <div className="flex gap-4 mb-4 border-b">
                    <button
                      className={`pb-2 px-4 font-medium ${!activeMedia || activeMedia === 'video' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                      onClick={() => setActiveMedia('video')}
                    >
                      ڤیدیۆ
                    </button>
                    <button
                      className={`pb-2 px-4 font-medium ${activeMedia === 'image' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                      onClick={() => setActiveMedia('image')}
                    >
                      وێنەی پزیشکی (Advanced Viewer)
                    </button>
                  </div>
                ) : null}

                {/* Video Player */}
                {(!activeMedia || activeMedia === 'video') && lesson.videoId && (() => {
                  const { source, id } = detectVideoSource(lesson.videoId);
                  return (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                      {source === 'youtube' || source === 'youtube_id' ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${id}`}
                          title={lesson.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : source === 'drive' ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://drive.google.com/file/d/${id}/preview`}
                          title={lesson.title}
                          frameBorder="0"
                          allow="autoplay; fullscreen"
                          allowFullScreen
                        />
                      ) : source === 'vimeo' ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://player.vimeo.com/video/${id}`}
                          title={lesson.title}
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={lesson.videoId}
                          controls
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Medical Image Viewer */}
                {(activeMedia === 'image' || (!lesson.videoId && lesson.imageUrl)) && lesson.imageUrl && (
                  <div className="w-full">
                    <MedicalImageViewer
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="aspect-video md:aspect-[16/9] w-full h-[500px]"
                    />
                    <p className="text-sm text-center text-muted-foreground mt-2">
                      دەتوانێت وێنەکە نزیک بکەیتەوە (Zoom) و مۆدەکانی Contrast بەکاربهێنیت
                    </p>
                  </div>
                )}
              </div>

              {/* Content */}
              <Card className="mb-8">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  <MarkdownPreview content={lesson.content} />
                </CardContent>
              </Card>

              {/* Quiz Section */}
              <div className="mb-8">
                {/* <QuizCard lessonId={lesson._id} /> TODO: Migrate */}
              </div>

              {/* Tags */}
              <div className="mb-8">
                <h3 className="font-semibold mb-3">تاگەکان:</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Next Lesson */}
              {filteredRelatedLessons.length > 0 && (
                <Link to={`/lesson/${filteredRelatedLessons[0].slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">وانەی دواتر</p>
                        <p className="font-semibold">{filteredRelatedLessons[0].title}</p>
                      </div>
                      <ChevronLeft className="h-5 w-5" />
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="font-bold text-lg mb-4">وانەکانی تر لە ئەم بەشە</h3>
                <div className="space-y-3">
                  {filteredRelatedLessons.map((related: any) => (
                    <Link key={related._id} to={`/lesson/${related.slug}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <p className="font-medium line-clamp-2">{related.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{related.duration}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Lesson;
