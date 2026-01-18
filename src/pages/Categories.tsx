import Navbar from '@/components/Navbar';
import CategoryCard from '@/components/CategoryCard';
import { categories } from '@/data/lessons';

const Categories = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">بەشەکانی وێنەگرتن</h1>
            <p className="text-lg text-muted-foreground">هەموو جۆرەکانی وێنەگرتنی پزیشکی</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Categories;
