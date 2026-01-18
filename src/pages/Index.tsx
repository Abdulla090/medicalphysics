import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';
import CategoryCard from '@/components/CategoryCard';
import StatCard from '@/components/StatCard';
import { categories, lessons } from '@/data/lessons';

const Index = () => {
  const recentLessons = lessons.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            فێربوونی ڕادیۆلۆجی بە کوردی سۆرانی
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            پلاتفۆرمی تایبەت بۆ خوێندکارانی فیزیکی پزیشکی و ڕادیۆلۆجی. فێربوونی شوێنی نەخۆش و تەکنیکی وێنەگرتن لە هەموو ئامێرەکانی ڕادیۆلۆجی.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/categories">
              <Button size="lg" className="text-lg px-8">
                دەستپێکردن
              </Button>
            </Link>
            <Link to="/search">
              <Button size="lg" variant="outline" className="text-lg px-8">
                گەڕان لە وانەکان
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
            <StatCard value="٤١" label="وانە" />
            <StatCard value="٥" label="بەش" />
            <StatCard value="١٠+" label="کاتژمێر ڤیدیۆ" />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-card">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">بەشەکانی وێنەگرتن</h2>
              <p className="text-muted-foreground mt-2">هەموو جۆرەکانی وێنەگرتنی پزیشکی لەیەک شوێندا</p>
            </div>
            <Link to="/categories">
              <Button variant="outline">هەموو بەشەکان</Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} variant="compact" />
            ))}
          </div>
        </div>
      </section>

      {/* Recent Lessons Section */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">وانە تازەکان</h2>
              <p className="text-muted-foreground mt-2">نوێترین وانەکانی فێربوون</p>
            </div>
            <Link to="/search">
              <Button variant="outline">هەموو وانەکان</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">ئامادەیت بۆ فێربوون؟</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            هەموو وانەکان بەخۆڕایی و بە کوردی سۆرانین. ئێستا دەستپێبکە بە گەشەکردنی زانستت لە بواری ڕادیۆلۆجیدا.
          </p>
          <Link to="/categories">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              دەستپێکردن
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
