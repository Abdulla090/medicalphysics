// import { useQuery } from '@tanstack/react-query';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BookOpen, FolderOpen, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { fetchLessons, fetchStats } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const AdminDashboard = () => {
  // Convex Migration
  const stats = useQuery(api.admin.getStats);
  const recentLessons = useQuery(api.admin.getRecentLessons);

  const statCards = [
    {
      title: 'کۆی وانەکان',
      value: stats?.lessonsCount || 0,
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'کۆی بەشەکان',
      value: stats?.categoriesCount || 0,
      icon: FolderOpen,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'وانە بڵاوکراوەکان',
      value: stats?.publishedCount || 0,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'وانە پێشنووسەکان',
      value: stats?.draftCount || 0,
      icon: Clock,
      color: 'text-orange-600 bg-orange-100'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">داشبۆرد</h1>
          <p className="text-muted-foreground mt-1">بەخێربێیت، ئەمە داشبۆردی بەڕێوەبەرییە</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 lg:p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="h-4 w-4 lg:h-6 lg:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>نوێترین وانەکان</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLessons?.slice(0, 5).map((lesson) => (
                <div
                  key={lesson._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.categoryName} • {lesson.instructor}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {lesson.publishDate ? format(new Date(lesson.publishDate), 'yyyy/MM/dd') : '-'}
                    </span>
                    <Badge variant={lesson.isPublished ? 'default' : 'secondary'}>
                      {lesson.isPublished ? 'بڵاوکراوە' : 'پێشنووس'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
