import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// === Categories ===
export const getCategories = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("categories").collect();
    },
});

export const getCategoryById = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", args.id))
            .first();
    },
});

// === Courses ===
export const getCourses = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("courses").collect();
    },
});

export const getCourseBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("courses")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
    },
});

export const getCoursesByCategory = query({
    args: { categoryId: v.string() },
    handler: async (ctx, args) => {
        // This requires a join-like operation or a specific schema design
        // For now, assuming direct link or filtering in application layer if needed
        // But wait, lessons link to categories, not directly courses? 
        // Let's assume for now we list all courses or filter client-side if schema doesn't support direct link
        return await ctx.db.query("courses").collect();
    }
});


// === Lessons ===
export const getLessonById = query({
    args: { id: v.id("lessons") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getLessonsByCourse = query({
    args: { courseId: v.id("courses") },
    handler: async (ctx, args) => {
        const courseLessons = await ctx.db
            .query("course_lessons")
            .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
            .collect();

        // Fetch actual lessons
        const lessons = await Promise.all(
            courseLessons.map(async (cl) => await ctx.db.get(cl.lessonId))
        );

        return lessons.filter(l => l !== null);
    },
});

// === User Progress (Simple) ===
export const getUser = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    }
});

export const createUser = mutation({
    args: { userId: v.string(), email: v.string(), fullName: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (!existing) {
            await ctx.db.insert("profiles", {
                userId: args.userId,
                fullName: args.fullName,
            });

            // Default role user
            await ctx.db.insert("user_roles", {
                userId: args.userId,
                role: "user"
            });
        }
    }
});

export const getLessonBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const lesson = await ctx.db
            .query("lessons")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!lesson) return null;

        // Join with category to get categoryName
        const category = await ctx.db
            .query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", lesson.category))
            .first();

        // Resolve storage URLs if available
        let imageUrl = lesson.imageUrl;
        if (!imageUrl && lesson.imageStorageId) {
            imageUrl = await ctx.storage.getUrl(lesson.imageStorageId) || "";
        }

        let videoId = lesson.videoId;
        // If it's a storage ID, we might treating "videoId" as the URL field for playback
        if (!videoId && lesson.videoStorageId) {
            videoId = await ctx.storage.getUrl(lesson.videoStorageId) || "";
        }

        return {
            ...lesson,
            imageUrl,
            videoId,
            categoryName: category?.name,
        };
    },
});

export const getLessonsByCategory = query({
    args: { categoryId: v.string() },
    handler: async (ctx, args) => {
        const lessons = await ctx.db
            .query("lessons")
            .withIndex("by_category", (q) => q.eq("category", args.categoryId))
            .collect();

        // Enrich with category name
        // Since all lessons have same categoryId, we can just fetch category once
        const category = await ctx.db
            .query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", args.categoryId))
            .first();

        // return lessons with category object attached or flattened
        return await Promise.all(lessons.map(async (l) => {
            let imageUrl = l.imageUrl;
            if (!imageUrl && l.imageStorageId) {
                imageUrl = await ctx.storage.getUrl(l.imageStorageId) || "";
            }

            return {
                ...l,
                imageUrl,
                categoryName: category?.name,
                // Add a mock or real category object structure for compatibility if needed
                categories: category ? { name: category.name } : undefined
            };
        }));
    }
});
export const getAllLessons = query({
    args: {},
    handler: async (ctx) => {
        const lessons = await ctx.db.query("lessons").collect();

        // Enrich with category name and storage URLs
        return await Promise.all(lessons.map(async (l) => {
            const category = await ctx.db
                .query("categories")
                .withIndex("by_category_id", (q) => q.eq("id", l.category))
                .first();

            let imageUrl = l.imageUrl;
            if (!imageUrl && l.imageStorageId) {
                imageUrl = await ctx.storage.getUrl(l.imageStorageId) || "";
            }

            return {
                ...l,
                imageUrl,
                categoryName: category?.name,
                categories: category ? { name: category.name } : undefined
            };
        }));
    }
});

// === User Progress ===
export const markLessonComplete = mutation({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("lesson_progress")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                completed: true,
                completedAt: new Date().toISOString(),
                progressPercent: 100,
            });
        } else {
            await ctx.db.insert("lesson_progress", {
                userId: args.userId,
                lessonId: args.lessonId,
                completed: true,
                completedAt: new Date().toISOString(),
                progressPercent: 100,
            });
        }
    },
});

export const unmarkLessonComplete = mutation({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("lesson_progress")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                completed: false,
                progressPercent: 0,
            });
        }
    },
});

export const getUserProgress = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("lesson_progress")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const isLessonCompleted = query({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const progress = await ctx.db
            .query("lesson_progress")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();
        return progress?.completed || false;
    },
});

// === Bookmarks ===
export const addBookmark = mutation({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();

        if (!existing) {
            await ctx.db.insert("bookmarks", {
                userId: args.userId,
                lessonId: args.lessonId,
                createdAt: new Date().toISOString(),
            });
        }
    },
});

export const removeBookmark = mutation({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const getUserBookmarks = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        // Fetch full lesson details
        return await Promise.all(
            bookmarks.map(async (b) => {
                const lesson = await ctx.db.get(b.lessonId);
                return { ...b, lesson };
            })
        );
    },
});

export const isLessonBookmarked = query({
    args: { userId: v.string(), lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        const bookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_lesson", (q) =>
                q.eq("userId", args.userId).eq("lessonId", args.lessonId)
            )
            .first();
        return !!bookmark;
    },
});

// === QUIZZES ===
export const getQuizzes = query({
    args: {},
    handler: async (ctx) => {
        const quizzes = await ctx.db.query("quizzes").collect();
        return await Promise.all(quizzes.map(async (quiz) => {
            const lesson = await ctx.db.get(quiz.lessonId);
            const questionsCount = (await ctx.db.query("quiz_questions")
                .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
                .collect()).length;
            return { ...quiz, lesson, questionsCount };
        }));
    },
});

export const getQuizById = query({
    args: { id: v.id("quizzes") },
    handler: async (ctx, args) => {
        const quiz = await ctx.db.get(args.id);
        if (!quiz) return null;
        const questions = await ctx.db.query("quiz_questions")
            .withIndex("by_quiz", (q) => q.eq("quizId", args.id))
            .collect();
        const lesson = await ctx.db.get(quiz.lessonId);
        return { ...quiz, questions: questions.sort((a, b) => a.orderIndex - b.orderIndex), lesson };
    },
});

export const getQuizzesByLesson = query({
    args: { lessonId: v.id("lessons") },
    handler: async (ctx, args) => {
        return await ctx.db.query("quizzes")
            .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
            .collect();
    },
});

// === COURSE QUERIES ===
export const getCourseById = query({
    args: { id: v.id("courses") },
    handler: async (ctx, args) => {
        const course = await ctx.db.get(args.id);
        if (!course) return null;

        const courseLessons = await ctx.db.query("course_lessons")
            .withIndex("by_course", (q) => q.eq("courseId", args.id))
            .collect();

        const lessons = await Promise.all(
            courseLessons.sort((a, b) => a.orderIndex - b.orderIndex).map(async (cl) => {
                const lesson = await ctx.db.get(cl.lessonId);
                return { ...cl, lesson };
            })
        );

        return { ...course, lessons };
    },
});

export const getCourseLessons = query({
    args: { courseId: v.id("courses") },
    handler: async (ctx, args) => {
        const courseLessons = await ctx.db.query("course_lessons")
            .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
            .collect();

        return await Promise.all(
            courseLessons.sort((a, b) => a.orderIndex - b.orderIndex).map(async (cl) => {
                const lesson = await ctx.db.get(cl.lessonId);
                return { ...cl, lesson };
            })
        );
    },
});

