import { query } from "./_generated/server";

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const lessonsCount = await ctx.db.query("lessons").collect();
        const categoriesCount = await ctx.db.query("categories").collect();
        // For published vs draft, we filter strictly in code or create specific indexes if performance needed

        return {
            lessonsCount: lessonsCount.length,
            categoriesCount: categoriesCount.length,
            publishedCount: lessonsCount.filter(l => l.isPublished).length,
            draftCount: lessonsCount.filter(l => !l.isPublished).length
        };
    },
});

export const getRecentLessons = query({
    args: {},
    handler: async (ctx) => {
        // Convex queries are naturally ordered by creation time if no index specified? 
        // Actually default order is creation time ascending. We want descending.
        // We can use .order("desc") if we had an index, or just reverse in memory for small datasets.
        const lessons = await ctx.db.query("lessons").collect();

        // Enrich with category name
        const lessonsWithCategory = await Promise.all(
            lessons.map(async (l) => {
                const category = await ctx.db.query("categories")
                    .withIndex("by_category_id", q => q.eq("id", l.category))
                    .first();
                return {
                    ...l,
                    categoryName: category?.name
                };
            })
        );

        // Sort by creation time desc (newest first)
        return lessonsWithCategory.sort((a, b) => b._creationTime - a._creationTime);
    },
});

export const getCategoryLessonCounts = query({
    args: {},
    handler: async (ctx) => {
        const lessons = await ctx.db.query("lessons").collect();
        const counts: Record<string, number> = {};

        for (const lesson of lessons) {
            if (lesson.category) {
                counts[lesson.category] = (counts[lesson.category] || 0) + 1;
            }
        }

        return counts;
    }
});
