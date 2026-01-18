import { useQuery } from '@tanstack/react-query';
import { BookOpen, FolderOpen, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchLessons, fetchStats } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
  });

  const { data: recentLessons } = useQuery({
    queryKey: ['admin-recent-lessons'],
    queryFn: () => fetchLessons(false),
  });

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
      value: recentLessons?.filter(l => l.is_published).length || 0, 
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100'
    },
    { 
      title: 'وانە پێشنووسەکان', 
      value: recentLessons?.filter(l => !l.is_published).length || 0, 
      icon: Clock,
      color: 'text-orange-600 bg-orange-100'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">داشبۆرد</h1>
          <p className="text-muted-foreground mt-1">بەخێربێیت، ئەمە داشبۆردی بەڕێوەبەرییە</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
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
                  key={lesson.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={lesson.image_url} 
                      alt={lesson.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.categories?.name} • {lesson.instructor}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lesson.publish_date), 'yyyy/MM/dd')}
                    </span>
                    <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
                      {lesson.is_published ? 'بڵاوکراوە' : 'پێشنووس'}
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
